/**
 * Ghi đoạn hình ngắn quanh lúc cảnh báo: vài giây trước + vài giây trong lúc xảy ra.
 * Cách làm: giữ vòng đệm khung hình trên canvas, khi có cảnh báo thì quay lại một file
 * video ngắn (MediaRecorder) rồi gửi data-URL. Chạy được với webcam lẫn file video thử.
 */

const TARGET_WIDTH = 320;
const PRE_ALERT_MS = 3000;
const POST_ALERT_MS = 2000;
const FRAME_INTERVAL_MS = 125; // ~8 fps trong vòng đệm và khi encode
const VIDEO_BITS_PER_SECOND = 200_000;
/** Base64 data-URL tối đa — chừa chỗ cho JSON cảnh báo trong giới hạn ~1 MB của hub. */
const MAX_CLIP_DATA_URL_CHARS = 700_000;

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function pickRecorderMimeType() {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  return candidates.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) ?? '';
}

/**
 * Đây là gì: bộ ghi đoạn hình ngắn quanh cảnh báo.
 * Mục tiêu: giám thị xem lại được vài giây trước và trong lúc sự kiện xảy ra.
 */
export class AlertClipRecorder {
  private bufferCanvas: HTMLCanvasElement | null = null;
  private bufferCtx: CanvasRenderingContext2D | null = null;
  /** Vòng đệm khung hình (data URL JPEG nhỏ) trước cảnh báo. */
  private frames: string[] = [];
  private lastPumpAt = 0;
  private running = false;
  private finalizing = false;

  get active() {
    return this.running;
  }

  start(video: HTMLVideoElement) {
    this.stop();
    const width = TARGET_WIDTH;
    const height = Math.max(1, Math.round((video.videoHeight || 180) * (width / Math.max(video.videoWidth || 320, 1))));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.bufferCanvas = canvas;
    this.bufferCtx = ctx;
    this.frames = [];
    this.lastPumpAt = 0;
    this.running = true;
  }

  /** Sao chép khung hình hiện tại vào vòng đệm (gọi mỗi vòng AI). */
  pump(video: HTMLVideoElement) {
    if (!this.running || !this.bufferCtx || !this.bufferCanvas || this.finalizing) return;
    if (video.readyState < 2) return;
    const now = Date.now();
    if (now - this.lastPumpAt < FRAME_INTERVAL_MS) return;
    this.lastPumpAt = now;
    this.bufferCtx.drawImage(video, 0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    const maxFrames = Math.ceil(PRE_ALERT_MS / FRAME_INTERVAL_MS);
    try {
      this.frames = [...this.frames, this.bufferCanvas.toDataURL('image/jpeg', 0.55)].slice(-maxFrames);
    } catch {
      /* canvas bị tainted hoặc lỗi đọc — bỏ qua khung này */
    }
  }

  stop() {
    this.running = false;
    this.finalizing = false;
    this.bufferCanvas = null;
    this.bufferCtx = null;
    this.frames = [];
  }

  /**
   * Chốt đoạn hình: phát lại vòng đệm (~3 giây trước) rồi ghi tiếp ~2 giây live từ webcam/video.
   * Trả về data-URL; undefined nếu không ghi được hoặc quá lớn.
   */
  async finalizeAroundAlert(video: HTMLVideoElement): Promise<string | undefined> {
    if (!this.running || this.finalizing) return undefined;
    if (typeof MediaRecorder === 'undefined') return undefined;
    const mimeType = pickRecorderMimeType();
    if (!mimeType) return undefined;

    this.finalizing = true;
    const preFrames = [...this.frames];
    const width = this.bufferCanvas?.width || TARGET_WIDTH;
    const height = this.bufferCanvas?.height || Math.max(1, Math.round((video.videoHeight || 180) * (width / Math.max(video.videoWidth || 320, 1))));

    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;

      const stream = canvas.captureStream(8);
      if (!stream.getVideoTracks().length) return undefined;

      const chunks: Blob[] = [];
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: VIDEO_BITS_PER_SECOND });
      } catch {
        stream.getTracks().forEach((track) => track.stop());
        return undefined;
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };

      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.onerror = () => resolve();
      });

      recorder.start(250);

      // 1) Phát lại phần trước cảnh báo từ vòng đệm.
      for (const frame of preFrames) {
        if (!this.running) break;
        await drawDataUrl(ctx, frame, width, height);
        await sleep(FRAME_INTERVAL_MS);
      }

      // 2) Ghi tiếp phần trong lúc xảy ra từ nguồn đang chạy.
      const liveUntil = Date.now() + POST_ALERT_MS;
      while (this.running && Date.now() < liveUntil) {
        if (video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, width, height);
        }
        await sleep(FRAME_INTERVAL_MS);
      }

      if (recorder.state === 'recording') {
        try { recorder.requestData(); } catch { /* ignore */ }
        try { recorder.stop(); } catch { /* ignore */ }
      }
      await stopped;
      stream.getTracks().forEach((track) => track.stop());

      if (!chunks.length) return undefined;
      const blob = new Blob(chunks, { type: mimeType });
      if (!blob.size) return undefined;
      const dataUrl = await blobToDataUrl(blob);
      if (!dataUrl || dataUrl.length > MAX_CLIP_DATA_URL_CHARS) return undefined;
      return dataUrl;
    } finally {
      this.finalizing = false;
    }
  }
}

function drawDataUrl(ctx: CanvasRenderingContext2D, dataUrl: string, width: number, height: number) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => {
      try { ctx.drawImage(image, 0, 0, width, height); } catch { /* ignore */ }
      resolve();
    };
    image.onerror = () => resolve();
    image.src = dataUrl;
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string | undefined>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(blob);
  });
}
