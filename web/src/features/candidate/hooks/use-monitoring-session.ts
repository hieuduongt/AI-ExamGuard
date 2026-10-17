/**
 * File này là "bộ não" của phiên giám sát trên máy thí sinh: mở webcam, cho AI đọc từng khung
 * hình, chấm hành vi, phát cảnh báo và đều đặn báo trạng thái máy về cho giám thị.
 * Thuộc phần logic thí sinh (web/src/features/candidate/hooks/). AI nhìn ảnh camera để ước
 * lượng hướng đầu, hướng mắt. Khi nhà trường bật lưu đoạn hình, gửi kèm clip ngắn quanh cảnh báo.
 */
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { drawOverlay } from '@/ai/face-overlay';
import { loadFaceLandmarker } from '@/ai/face-landmarker-loader';
import { EMPTY_METRICS, metricsFromVisionResult } from '@/ai/vision-provider';
import { ALERT_LABELS, alertSeverity } from '@/domain/alert-catalog';
import { BehaviorEngine, behaviorDetail, type BehaviorProgress } from '@/domain/behavior-engine';
import type { AlertType, BehaviorThresholds, ExamEvent, VisionMetrics } from '@/domain/exam-types';
import { classifyMetrics } from '@/domain/station-health';
import { DEFAULT_THRESHOLDS, SETTINGS_STORAGE_KEY, parseSavedPrivacy, parseSavedThresholds } from '@/domain/thresholds';
import { hasFirebaseConfig, makeId, publishEvent, publishStation } from '@/services/exam-sync';
import { fetchHubSettings } from '@/services/hub/hub-settings';
import { activeHubUrl } from '@/services/hub/hub-url';
import { cameraErrorMessage } from '../camera-errors';
import { AlertClipRecorder } from './alert-clip-recorder';
import { useBrowserGuard } from './use-browser-guard';
import type { HubState } from './use-hub-connection';

// Tình trạng AI: chưa chạy, đang tải mô hình, sẵn sàng, chỉ có camera (AI không tải được), lỗi.
export type ModelState = 'idle' | 'loading' | 'ready' | 'camera-only' | 'error';
// "Hình dạng" của hàm phát cảnh báo: loại cảnh báo, câu mô tả, và nguồn (mặc định là AI).
export type EmitAlert = (type: AlertType, detail: string, source?: ExamEvent['source']) => void;
// Ghi lại thời điểm gửi gần nhất của từng loại cảnh báo, để không báo lặp quá dày.
type CooldownTimer = Partial<Record<AlertType, number>>;

// Các con số AI lúc chưa có khung hình nào (mọi giá trị bằng 0).
const initialMetrics: VisionMetrics = EMPTY_METRICS;
// Chuỗi ảnh JPEG dự phòng (khi không ghi được clip): mỗi 0,5 giây một khung, giữ 6 khung (~3 giây).
const SNAPSHOT_INTERVAL_MS = 500;
const SNAPSHOT_COUNT = 6;

// Thông tin trang thí sinh truyền vào: tình trạng kết nối máy giám thị, hàm đếm lại
// số cảnh báo còn chờ gửi, và (tùy chọn) chế độ chạy video thử nghiệm.
type Options = { hubState: HubState; refreshPendingCount: () => void; experimentMode?: boolean };

/**
 * Đây là gì: hook (hàm đặc biệt của React giúp màn hình nhớ dữ liệu và tự vẽ lại khi dữ liệu
 *   đổi) điều khiển một phiên giám sát trên máy thí sinh.
 * Mục tiêu: theo dõi thí sinh suốt giờ thi bằng camera và trình duyệt, rồi báo cho giám thị.
 * Chức năng: một phiên giám sát đi theo dây chuyền: webcam -> điểm mốc khuôn mặt -> bộ máy
 *   chấm hành vi -> cảnh báo; song song, cứ 2 giây gửi "nhịp tim" trạng thái máy về giám thị.
 *   Hook nhớ thông tin thí sinh, tình trạng AI, các con số, cảnh báo gần đây; cung cấp các
 *   hàm bắt đầu, dừng, tạo cảnh báo thử.
 * Đầu ra: một gói dữ liệu và hàm cho màn hình: thông tin thí sinh (kèm hàm đổi), running,
 *   modelState, metrics, statusText, recentEvents, errorMessage, lowPowerMode,
 *   behaviorProgress, activeThresholds, analysisStalled, health, videoRef, canvasRef,
 *   startMonitoring, stopMonitoring, createTestAlert.
 * Dùng ở đâu: CandidateScreen trong web/src/features/candidate/candidate-screen.tsx.
 * Liên kết với: web/src/ai/ (tải mô hình, tính con số, vẽ điểm mốc), web/src/domain/ (bộ máy
 *   chấm hành vi, ngưỡng, danh mục cảnh báo), publishEvent/publishStation
 *   (web/src/services/exam-sync.ts) để gửi đi, useBrowserGuard (use-browser-guard.ts).
 */
export function useMonitoringSession({ hubState, refreshPendingCount, experimentMode = false }: Options) {
  const [candidateName, setCandidateName] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [stationId, setStationId] = useState('');
  const [roomId, setRoomId] = useState('PHONG-01');
  const [consented, setConsented] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [modelState, setModelState] = useState<ModelState>('idle');
  const [metrics, setMetrics] = useState<VisionMetrics>(initialMetrics);
  const [statusText, setStatusText] = useState('Sẵn sàng kiểm tra thiết bị');
  const [recentEvents, setRecentEvents] = useState<ExamEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [behaviorProgress, setBehaviorProgress] = useState<BehaviorProgress[]>([]);
  const [activeThresholds, setActiveThresholds] = useState(DEFAULT_THRESHOLDS);
  const [analysisStalled, setAnalysisStalled] = useState(false);

  // Các "ngăn nhớ" (ref): giữ giá trị giữa các lần vẽ lại màn hình mà không làm màn hình vẽ
  // lại. Vòng lặp AI chạy liên tục nên đọc dữ liệu mới nhất từ đây thay vì từ state.
  // sessionRef là số thứ tự phiên: tăng mỗi lần bắt đầu/dừng, để việc chờ của phiên cũ biết
  // mình đã lỗi thời mà dừng lại.
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationRef = useRef(0);
  const detectionLoopRef = useRef<() => void>(() => undefined);
  const runningRef = useRef(false);
  const identityRef = useRef({ candidateName, candidateId, stationId, roomId });
  const metricsRef = useRef(initialMetrics);
  const engineRef = useRef(new BehaviorEngine());
  const progressRef = useRef<BehaviorProgress[]>([]);
  const lastAnalyzedRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const modelStateRef = useRef<ModelState>('idle');
  const analysisErrorRef = useRef('');
  const sessionRef = useRef(0);
  const cooldownsRef = useRef<CooldownTimer>({});
  const lastFrameRef = useRef({ timestamp: 0, frameCount: 0, fpsStarted: 0, fps: 0 });
  const alertCountRef = useRef(0);
  const thresholdsRef = useRef<BehaviorThresholds>(DEFAULT_THRESHOLDS);
  const storeSnapshotsRef = useRef(false);
  const snapshotsRef = useRef<string[]>([]);
  const lastSnapshotAtRef = useRef(0);
  const snapshotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const clipRecorderRef = useRef(new AlertClipRecorder());

  // Khi mở trang: nếu Quản trị yêu cầu tự tích đồng ý thì bắt đầu ở trạng thái chưa đồng ý.
  useEffect(() => {
    const privacy = parseSavedPrivacy(localStorage.getItem(SETTINGS_STORAGE_KEY));
    if (privacy.requireConsent) setConsented(false);
  }, []);

  // Mỗi khi thí sinh sửa thông tin, chép thông tin mới vào ngăn nhớ identityRef.
  useEffect(() => { identityRef.current = { candidateName, candidateId, stationId, roomId }; }, [candidateId, candidateName, roomId, stationId]);

  /**
   * Đây là gì: giá trị "sức khỏe" tức thời của máy, được tính lại khi con số AI thay đổi.
   * Mục tiêu: tô màu khung camera và chấm trạng thái trên trang thí sinh.
   * Chức năng: chưa giám sát thì là 'idle'; đang giám sát thì chấm theo khung hình hiện tại.
   * Đầu ra: 'idle', 'normal', 'warning' hoặc 'critical'.
   * Dùng ở đâu: trả ra cho candidate-screen.tsx (màu statusTone) và components/camera-panel.tsx.
   * Liên kết với: classifyMetrics (web/src/domain/station-health.ts).
   */
  const health = useMemo(() => {
    if (!running) return 'idle';
    return classifyMetrics(metrics);
  }, [metrics, running]);

  /**
   * Đây là gì: hàm con phát một cảnh báo mới.
   * Mục tiêu: tạo cảnh báo đầy đủ thông tin và gửi về giám thị, nhưng không báo lặp quá dày.
   * Chức năng: với cảnh báo thật (không phải 'demo'), nếu cùng loại vừa gửi chưa quá
   *   cooldownSeconds giây thì bỏ qua, ngược lại ghi lại thời điểm gửi. Khi nhà trường bật
   *   lưu đoạn hình và nguồn là AI: chốt clip ~3 giây trước + ~2 giây trong lúc xảy ra
   *   (hoặc chuỗi ảnh JPEG dự phòng). Sau đó gửi cảnh báo, đếm lại hàng chờ, đưa lên danh sách gần nhất.
   * Đầu ra: không trả về gì (phần chốt clip chạy nền vài giây).
   * Dùng ở đâu: evaluateBehavior và createTestAlert trong file này; useBrowserGuard
   *   (use-browser-guard.ts) cho cảnh báo từ trình duyệt.
   * Liên kết với: alertSeverity, ALERT_LABELS (web/src/domain/alert-catalog.ts); makeId,
   *   publishEvent (web/src/services/exam-sync.ts); AlertClipRecorder; refreshPendingCount.
   */
  const emitAlert = useCallback((type: AlertType, detail: string, source: ExamEvent['source'] = 'ai') => {
    const now = Date.now();
    const lastSent = cooldownsRef.current[type] ?? 0;
    if (source !== 'demo' && now - lastSent < thresholdsRef.current.cooldownSeconds * 1000) return;
    if (source !== 'demo') cooldownsRef.current[type] = now;
    alertCountRef.current += 1;
    const identity = identityRef.current;
    const severity = alertSeverity(type);
    const eventId = makeId();
    const wantMedia = storeSnapshotsRef.current && source === 'ai';
    const snapshotFallback = wantMedia && snapshotsRef.current.length ? [...snapshotsRef.current] : undefined;

    void (async () => {
      let clip: string | undefined;
      if (wantMedia && videoRef.current) {
        clip = await clipRecorderRef.current.finalizeAroundAlert(videoRef.current);
      }
      const event: ExamEvent = {
        id: eventId,
        ...identity,
        type,
        severity,
        title: ALERT_LABELS[type],
        detail,
        timestamp: now,
        reviewed: false,
        source,
        ...(clip ? { clip } : {}),
        // Chỉ gửi chuỗi ảnh khi không có clip (trình duyệt không ghi được video).
        ...(!clip && snapshotFallback ? { snapshots: snapshotFallback } : {}),
      };
      publishEvent(event);
      refreshPendingCount();
      setRecentEvents((events) => [event, ...events].slice(0, 6));
    })();
  }, [refreshPendingCount]);

  /**
   * Đây là gì: hàm con chấm hành vi cho một khung hình vừa phân tích.
   * Mục tiêu: biến các con số AI thành tiến trình hành vi và cảnh báo khi đủ thời gian.
   * Chức năng: đưa con số mới và ngưỡng đang dùng vào bộ máy chấm hành vi; lưu tiến trình
   *   vào ngăn nhớ và lên màn hình; với mỗi hành vi đã đủ thời gian thì phát cảnh báo kèm câu
   *   mô tả chi tiết.
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: detectionLoop ngay bên dưới, sau mỗi khung hình phân tích thành công.
   * Liên kết với: BehaviorEngine.update và behaviorDetail (web/src/domain/behavior-engine.ts),
   *   emitAlert ở trên.
   */
  const evaluateBehavior = useCallback((nextMetrics: VisionMetrics, now: number) => {
    const result = engineRef.current.update(nextMetrics, now, thresholdsRef.current);
    progressRef.current = result.progress;
    setBehaviorProgress(result.progress);
    for (const item of result.triggered) emitAlert(item.type, behaviorDetail(item, nextMetrics));
  }, [emitAlert]);

  /**
   * Đây là gì: hàm con gửi "nhịp tim" trạng thái máy thí sinh về giám thị.
   * Mục tiêu: giám thị luôn thấy máy này còn sống, AI có chạy không, và các con số mới nhất.
   * Chức năng: xem AI có khung hình mới trong 3 giây qua không: AI sẵn sàng mà không có khung
   *   hình mới là "tạm dừng" (stalled); AI đang tải là 'loading'; còn lại là 'error'. Nếu AI
   *   không ở trạng thái sẵn sàng thì màu máy là vàng, ngược lại chấm màu theo khung hình.
   *   Gửi trạng thái đi (kèm tiến trình hành vi chỉ khi dữ liệu còn mới); nếu AI tạm dừng thì
   *   báo cho thí sinh và xóa thanh tiến trình; cuối cùng đếm lại hàng chờ gửi.
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: hiệu ứng chạy mỗi 2 giây khi đang giám sát (bên dưới trong file này).
   * Liên kết với: classifyMetrics (web/src/domain/station-health.ts), publishStation
   *   (web/src/services/exam-sync.ts), kiểu StationStatus (web/src/domain/exam-types.ts).
   */
  const updateStation = useCallback((nextMetrics: VisionMetrics) => {
    const identity = identityRef.current;
    const fresh = lastAnalyzedRef.current > 0 && Date.now() - lastAnalyzedRef.current < 3000;
    const analysisState = modelStateRef.current === 'ready' ? (fresh ? 'ready' : 'stalled')
      : modelStateRef.current === 'loading' ? 'loading' : 'error';
    setAnalysisStalled(analysisState === 'stalled');
    const state = analysisState !== 'ready' ? 'warning' : classifyMetrics(nextMetrics);
    publishStation({ ...identity, state, metrics: nextMetrics, lastSeen: Date.now(), alertCount: alertCountRef.current,
      analysisState, lastAnalyzedAt: lastAnalyzedRef.current, behaviorProgress: fresh ? progressRef.current : [],
      analysisMessage: analysisState === 'stalled' ? 'Camera không có khung hình AI mới' : analysisErrorRef.current,
    });
    if (analysisState === 'stalled') {
      setStatusText('Phân tích đang tạm dừng — kiểm tra webcam hoặc dừng rồi bắt đầu lại');
      setBehaviorProgress([]);
    }
    refreshPendingCount();
  }, [refreshPendingCount]);

  /**
   * Đây là gì: hàm con "vòng lặp AI", chạy lặp đi lặp lại suốt phiên giám sát.
   * Mục tiêu: liên tục cho AI đọc khung hình camera mới nhất.
   * Chức năng: dừng nếu phiên đã tắt. Nếu video, lớp vẽ và mô hình đều sẵn sàng và có khung
   *   hình mới thì: đếm số khung hình mỗi giây (fps); cho AI tìm điểm mốc khuôn mặt; vẽ điểm
   *   mốc lên lớp vẽ; tính các con số; lưu lại, xóa lỗi cũ, cập nhật màn hình và chấm hành
   *   vi. Nếu AI lỗi thì ghi lỗi và báo cho thí sinh. Cuối cùng hẹn lần chạy tiếp sau 80 mili
   *   giây (160 mili giây ở chế độ máy cấu hình thấp).
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: qua ngăn nhớ detectionLoopRef: startMonitoring gọi lần đầu, rồi vòng lặp tự
   *   hẹn giờ gọi lại chính nó.
   * Liên kết với: calculateMetrics (web/src/ai/face-metrics.ts), drawOverlay
   *   (web/src/ai/face-overlay.ts), FaceLandmarker của MediaPipe (mô hình nhận diện điểm mốc
   *   khuôn mặt), evaluateBehavior ở trên.
   */
  const detectionLoop = useCallback(() => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    const now = performance.now();
    const frameInterval = lowPowerMode ? 160 : 80;

    if (video && canvas && landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastFrameRef.current.timestamp = now;
      if (!lastFrameRef.current.fpsStarted) lastFrameRef.current.fpsStarted = now;
      lastFrameRef.current.frameCount += 1;
      if (now - lastFrameRef.current.fpsStarted >= 1000) {
        lastFrameRef.current.fps = Math.round(lastFrameRef.current.frameCount * 1000 / (now - lastFrameRef.current.fpsStarted));
        lastFrameRef.current.frameCount = 0;
        lastFrameRef.current.fpsStarted = now;
      }
      try {
        const result = landmarker.detectForVideo(video, now);
        lastVideoTimeRef.current = video.currentTime;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        drawOverlay(canvas, result);
        // Tầng NHÌN (MediaPipe → con số). Tầng QUYẾT ĐỊNH cảnh báo là evaluateBehavior bên dưới.
        const nextMetrics = metricsFromVisionResult(result, lastFrameRef.current.fps);
        metricsRef.current = nextMetrics;
        lastAnalyzedRef.current = Date.now();
        analysisErrorRef.current = '';
        setErrorMessage('');
        setStatusText(experimentMode && videoObjectUrlRef.current ? 'AI đang phân tích video thử nghiệm' : 'AI đang phân tích cục bộ trên thiết bị');
        setMetrics(nextMetrics);
        // Ghi đoạn hình ngắn (canvas → MediaRecorder) và chuỗi ảnh JPEG dự phòng.
        if (storeSnapshotsRef.current) {
          clipRecorderRef.current.pump(video);
          if (now - lastSnapshotAtRef.current >= SNAPSHOT_INTERVAL_MS) {
            lastSnapshotAtRef.current = now;
            const snap = snapshotCanvasRef.current ?? document.createElement('canvas');
            snapshotCanvasRef.current = snap;
            const width = 320;
            const height = Math.max(1, Math.round((video.videoHeight || 180) * (width / Math.max(video.videoWidth || 320, 1))));
            snap.width = width;
            snap.height = height;
            const ctx = snap.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, width, height);
              snapshotsRef.current = [...snapshotsRef.current, snap.toDataURL('image/jpeg', 0.45)].slice(-SNAPSHOT_COUNT);
            }
          }
        }
        evaluateBehavior(nextMetrics, Date.now());
      } catch (error) {
        analysisErrorRef.current = error instanceof Error ? error.message : 'Không phân tích được khung hình';
        setErrorMessage(`AI gặp lỗi: ${analysisErrorRef.current}`);
        setStatusText('AI gặp lỗi — chưa thể phát hiện hành vi');
      }
    }
    animationRef.current = window.setTimeout(() => detectionLoopRef.current(), frameInterval);
  }, [evaluateBehavior, experimentMode, lowPowerMode]);

  // Luôn giữ bản mới nhất của vòng lặp AI trong ngăn nhớ (ví dụ khi bật/tắt chế độ máy yếu),
  // để lần hẹn giờ tiếp theo gọi đúng bản mới.
  useEffect(() => { detectionLoopRef.current = detectionLoop; }, [detectionLoop]);

  /**
   * Đây là gì: hàm con dừng phiên giám sát.
   * Mục tiêu: tắt camera, tắt AI gọn gàng và báo cho giám thị biết máy này đã dừng.
   * Chức năng: tăng số thứ tự phiên (để mọi việc đang chờ của phiên cũ tự bỏ), dừng vòng lặp
   *   AI, tắt webcam, đóng mô hình AI, xóa bộ máy chấm hành vi và tiến trình, đưa màn hình về
   *   trạng thái "đã dừng". Nếu trước đó đang chạy thì gửi trạng thái 'offline' về giám thị.
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: nút Dừng trong components/camera-panel.tsx; tự gọi khi rời trang (hiệu ứng
   *   ngay bên dưới).
   * Liên kết với: BehaviorEngine.reset (web/src/domain/behavior-engine.ts), publishStation
   *   (web/src/services/exam-sync.ts).
   */
  const stopMonitoring = useCallback(() => {
    const wasRunning = runningRef.current;
    sessionRef.current += 1;
    runningRef.current = false;
    window.clearTimeout(animationRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.onended = null;
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    if (videoObjectUrlRef.current) {
      URL.revokeObjectURL(videoObjectUrlRef.current);
      videoObjectUrlRef.current = null;
    }
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    modelStateRef.current = 'idle';
    engineRef.current.reset();
    progressRef.current = [];
    snapshotsRef.current = [];
    clipRecorderRef.current.stop();
    setRunning(false);
    setModelState('idle');
    setStatusText('Phiên giám sát đã dừng');
    const identity = identityRef.current;
    if (wasRunning) publishStation({ ...identity, state: 'offline', analysisState: 'stopped', analysisMessage: 'Phiên giám sát đã dừng', metrics: metricsRef.current, lastSeen: Date.now(), alertCount: alertCountRef.current });
  }, []);

  // Khi rời trang thí sinh thì tự dừng phiên, để camera không bị bỏ mở.
  useEffect(() => () => stopMonitoring(), [stopMonitoring]);

  // Canh trình duyệt (rời cửa sổ, phím tắt bị hạn chế) trong lúc giám sát; tắt khi chạy video thử.
  useBrowserGuard(running, emitAlert, experimentMode);

  // Khi đang giám sát: gửi nhịp tim trạng thái máy ngay, rồi cứ 2 giây gửi lại một lần.
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => updateStation(metricsRef.current), 2000);
    updateStation(metricsRef.current);
    return () => window.clearInterval(timer);
  }, [running, updateStation]);

  /**
   * Đây là gì: hàm con bắt đầu phiên giám sát.
   * Mục tiêu: mở webcam, tải AI và bắt đầu theo dõi khi thí sinh bấm nút bắt đầu.
   * Chức năng: chỉ chạy khi đã đồng ý giám sát, AI không đang tải, và (nếu không dùng Firebase)
   *   đã nối được máy giám thị. Chuẩn hóa thông tin thí sinh (bỏ khoảng trắng thừa, số báo
   *   danh/phòng/máy viết hoa); tạo số thứ tự phiên mới; xóa sạch dữ liệu phiên cũ; đọc ngưỡng
   *   do quản trị lưu. Sau đó xin quyền mở webcam (việc cần chờ), gắn hình vào thẻ video và bật
   *   lên; rồi tải mô hình AI và chạy vòng lặp AI. Nếu AI không tải được thì vẫn giữ camera
   *   ("chỉ có camera") và báo lỗi; nếu webcam không mở được thì tắt mọi thứ và báo lỗi dễ
   *   hiểu. Sau mỗi bước phải chờ, nếu số thứ tự phiên đã đổi (thí sinh bấm dừng giữa chừng)
   *   thì bỏ ngang và tắt những gì vừa mở.
   * Đầu ra: việc cần chờ, không mang giá trị; kết quả thể hiện qua running, modelState,
   *   statusText, errorMessage.
   * Dùng ở đâu: nút "Kiểm tra webcam và bắt đầu" trong components/session-form-card.tsx.
   * Liên kết với: parseSavedThresholds, SETTINGS_STORAGE_KEY (web/src/domain/thresholds.ts);
   *   loadFaceLandmarker (web/src/ai/face-landmarker-loader.ts); cameraErrorMessage
   *   (../camera-errors.ts); detectionLoop ở trên.
   */
  async function startMonitoring() {
    if (!consented || modelStateRef.current === 'loading') return;
    if (!hasFirebaseConfig && hubState !== 'connected') {
      setErrorMessage('Bạn phải kết nối thành công với máy giám thị trước khi bắt đầu.');
      return;
    }
    const identity = {
      candidateName: candidateName.trim(),
      candidateId: candidateId.trim().toUpperCase(),
      roomId: roomId.trim().toUpperCase(),
      stationId: stationId.trim().toUpperCase(),
    };
    identityRef.current = identity;
    const session = ++sessionRef.current;
    engineRef.current.reset();
    progressRef.current = [];
    cooldownsRef.current = {};
    lastAnalyzedRef.current = 0;
    lastVideoTimeRef.current = -1;
    lastFrameRef.current = { timestamp: 0, frameCount: 0, fpsStarted: 0, fps: 0 };
    metricsRef.current = initialMetrics;
    analysisErrorRef.current = '';
    setBehaviorProgress([]);
    setAnalysisStalled(false);
    setMetrics(initialMetrics);
    setCandidateName(identity.candidateName);
    setCandidateId(identity.candidateId);
    setRoomId(identity.roomId);
    setStationId(identity.stationId);
    const settingsRaw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    thresholdsRef.current = parseSavedThresholds(settingsRaw);
    const localPrivacy = parseSavedPrivacy(settingsRaw);
    storeSnapshotsRef.current = localPrivacy.storeSnapshots;
    // Ưu tiên công tắc trên hub (do trang Quản trị đẩy lên) nếu có — để máy thí sinh khác vẫn nhận được.
    const hubSettings = await fetchHubSettings(activeHubUrl());
    if (hubSettings) storeSnapshotsRef.current = hubSettings.storeSnapshots || localPrivacy.storeSnapshots;
    setActiveThresholds(thresholdsRef.current);
    snapshotsRef.current = [];
    lastSnapshotAtRef.current = 0;
    clipRecorderRef.current.stop();
    setErrorMessage('');
    setModelState('loading');
    modelStateRef.current = 'loading';
    const useVideoFile = experimentMode && videoFile;
    setStatusText(useVideoFile ? 'Đang mở video thử nghiệm…' : 'Đang xin quyền sử dụng webcam…');
    try {
      if (!videoRef.current) throw new Error('Không tìm thấy vùng hiển thị camera.');
      if (useVideoFile) {
        const objectUrl = URL.createObjectURL(videoFile);
        videoObjectUrlRef.current = objectUrl;
        videoRef.current.srcObject = null;
        videoRef.current.src = objectUrl;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.onended = () => {
          if (session === sessionRef.current) stopMonitoring();
        };
        await videoRef.current.play();
      } else {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Trình duyệt này không hỗ trợ truy cập webcam. Hãy dùng phiên bản Chrome hoặc Edge mới nhất.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 }, facingMode: 'user' }, audio: false });
        if (session !== sessionRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (session !== sessionRef.current) return;
      // Chờ có kích thước khung hình rồi mới mở bộ ghi đoạn hình (nếu nhà trường bật).
      if (storeSnapshotsRef.current) {
        await new Promise<void>((resolve) => {
          const video = videoRef.current;
          if (!video) { resolve(); return; }
          if (video.videoWidth > 0) { resolve(); return; }
          const onReady = () => { video.removeEventListener('loadeddata', onReady); resolve(); };
          video.addEventListener('loadeddata', onReady);
          window.setTimeout(() => { video.removeEventListener('loadeddata', onReady); resolve(); }, 1500);
        });
        if (session !== sessionRef.current) return;
        if (videoRef.current) clipRecorderRef.current.start(videoRef.current);
      }
      setRunning(true);
      runningRef.current = true;
      setStatusText('Đang tải mô hình nhận diện khuôn mặt…');

      try {
        const detector = await loadFaceLandmarker(() => session !== sessionRef.current);
        if (!detector) return;
        if (session !== sessionRef.current) { detector.close(); return; }
        landmarkerRef.current = detector;
        modelStateRef.current = 'ready';
        setModelState('ready');
        setStatusText(useVideoFile ? 'AI đang phân tích video thử nghiệm' : 'AI đang phân tích cục bộ trên thiết bị');
        detectionLoopRef.current();
      } catch (error) {
        if (session !== sessionRef.current) return;
        modelStateRef.current = 'camera-only';
        analysisErrorRef.current = error instanceof Error ? error.message : 'Không tải được mô hình MediaPipe';
        setModelState('camera-only');
        setStatusText(useVideoFile ? 'Video chạy; mô hình AI chưa tải được' : 'Camera hoạt động; mô hình AI chưa tải được');
        setErrorMessage(`Chưa có AI nhận diện. ${analysisErrorRef.current}`);
      }
    } catch (error) {
      if (session !== sessionRef.current) return;
      modelStateRef.current = 'error';
      setModelState('error');
      setRunning(false);
      runningRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
        videoObjectUrlRef.current = null;
      }
      setStatusText(useVideoFile ? 'Không thể mở video thử nghiệm' : 'Không thể khởi động webcam');
      setErrorMessage(useVideoFile
        ? (error instanceof Error ? error.message : 'Không mở được file video.')
        : cameraErrorMessage(error));
    }
  }

  /**
   * Đây là gì: hàm con tạo một cảnh báo thử.
   * Mục tiêu: giúp kiểm tra đường truyền cảnh báo từ máy thí sinh tới máy giám thị.
   * Chức năng: phát cảnh báo với nguồn 'demo' (không bị giới hạn khoảng nghỉ giữa hai lần
   *   báo) và câu mô tả ghi rõ đây là sự kiện thử.
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: hai nút "Thử cảnh báo vàng/đỏ" trong components/recent-events-card.tsx.
   * Liên kết với: emitAlert ở trên.
   */
  function createTestAlert(type: AlertType) {
    emitAlert(type, 'Sự kiện thử do thí sinh tạo để kiểm tra đường truyền.', 'demo');
  }

  return {
    candidateName, setCandidateName, candidateId, setCandidateId, roomId, setRoomId, stationId, setStationId,
    consented, setConsented, videoFile, setVideoFile, experimentMode, running, modelState, metrics, statusText, recentEvents, errorMessage,
    lowPowerMode, setLowPowerMode, behaviorProgress, activeThresholds, analysisStalled, health,
    videoRef, canvasRef, startMonitoring, stopMonitoring, createTestAlert,
  };
}
