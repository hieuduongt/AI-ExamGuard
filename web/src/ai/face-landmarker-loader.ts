/**
 * File này tải bộ não AI nhận diện khuôn mặt (MediaPipe Face Landmarker: mô hình nhận
 * diện điểm mốc khuôn mặt) về trình duyệt của thí sinh. Thuộc phần AI (web/src/ai/).
 */
import type { FaceLandmarker } from '@mediapipe/tasks-vision';

// Các bản sao đi kèm ứng dụng (thư mục public/mediapipe) được thử trước, để ứng dụng
// vẫn chạy khi không có Internet. Nếu hỏng mới tải từ mạng (CDN).
/** Thư mục chứa phần chạy (wasm) của MediaPipe ngay trên máy. */
const WASM_LOCAL = '/mediapipe/wasm';
/** Địa chỉ dự phòng trên Internet của phần chạy (wasm) MediaPipe. */
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
/** Danh sách nơi lấy file mô hình khuôn mặt: bản trên máy trước, bản trên mạng sau. */
const MODEL_URLS = [
  '/mediapipe/face_landmarker.task',
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
];

/**
 * Đây là gì: hàm tải và chuẩn bị bộ nhận diện khuôn mặt.
 * Mục tiêu: có sẵn AI để đọc camera, kể cả khi máy không có Internet.
 * Chức năng: tải phần chạy (bản trên máy, hỏng thì bản trên mạng); rồi thử lần lượt từng
 *   nơi chứa mô hình, mỗi nơi thử chạy bằng card đồ họa (GPU) trước, hỏng thì bằng bộ xử
 *   lý (CPU). Cài đặt: theo dõi tối đa 2 khuôn mặt, chế độ video. Trả về null khi
 *   isCancelled cho biết phiên thi đã kết thúc trong lúc đang tải.
 * Đầu ra: việc cần chờ cho ra bộ nhận diện; null nếu phiên đã bị hủy; báo lỗi
 *   "Không tải được mô hình nhận diện" nếu thử hết mà vẫn hỏng.
 * Dùng ở đâu: web/src/features/candidate/hooks/use-monitoring-session.ts khi thí sinh
 *   bắt đầu làm bài.
 * Liên kết với: thư mục web/public/mediapipe (bản sao mô hình); calculateMetrics() trong
 *   ./face-metrics.ts dùng kết quả của bộ nhận diện này.
 */
export async function loadFaceLandmarker(isCancelled: () => boolean): Promise<FaceLandmarker | null> {
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
  let fileset;
  try {
    fileset = await FilesetResolver.forVisionTasks(WASM_LOCAL);
  } catch {
    fileset = await FilesetResolver.forVisionTasks(WASM_CDN);
  }

  let detector: FaceLandmarker | null = null;
  let modelError: unknown;
  for (const modelAssetPath of MODEL_URLS) {
    for (const delegate of ['GPU', 'CPU'] as const) {
      if (isCancelled()) return null;
      try {
        detector = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath, delegate }, runningMode: 'VIDEO', numFaces: 2,
          minFaceDetectionConfidence: 0.55, minFacePresenceConfidence: 0.55, minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
        });
        break;
      } catch (error) { modelError = error; }
    }
    if (detector) break;
  }
  if (!detector) throw modelError ?? new Error('Không tải được mô hình nhận diện');
  return detector;
}
