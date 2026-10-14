/**
 * File này biến kết quả AI đọc camera thành các con số dễ dùng: có mấy khuôn mặt, đầu
 * quay ngang/cúi bao nhiêu độ, mắt liếc về đâu. Thuộc phần AI (web/src/ai/); các con số
 * này được bộ máy chấm hành vi (web/src/domain/) dùng để quyết định có cảnh báo hay không.
 */
import type { FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { VisionMetrics } from '@/domain/exam-types';

/** Bộ số đo "trống": không thấy khuôn mặt nào, mọi góc bằng 0. */
export const EMPTY_METRICS: VisionMetrics = { faceCount: 0, gazeX: 0, gazeY: 0, headYaw: 0, headPitch: 0, fps: 0 };

/**
 * Đây là gì: hàm tính trung bình cộng của một dãy số.
 * Mục tiêu: lấy điểm giữa (ví dụ giữa hai má, giữa hai mắt).
 * Chức năng: cộng tất cả rồi chia cho số lượng; dãy rỗng thì chia cho 1 để không lỗi.
 * Đầu ra: một con số.
 * Dùng ở đâu: calculateMetrics() trong file này.
 * Liên kết với: không có.
 */
function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

/**
 * Đây là gì: hàm lấy một điểm mốc trên khuôn mặt theo số thứ tự.
 * Mục tiêu: không bị lỗi khi điểm mốc cần lấy không có.
 * Chức năng: trả về điểm mốc thứ index; nếu thiếu thì trả về điểm giữa khung hình.
 * Đầu ra: một điểm có tọa độ x, y, z (x, y tính từ 0 đến 1 theo chiều ngang, dọc ảnh).
 * Dùng ở đâu: calculateMetrics() trong file này và drawOverlay() trong ./face-overlay.ts.
 * Liên kết với: lưới 478 điểm khuôn mặt của MediaPipe.
 */
export function point(landmarks: NormalizedLandmark[], index: number) {
  return landmarks[index] ?? { x: 0.5, y: 0.5, z: 0, visibility: 0 };
}

/**
 * Đây là gì: hàm tính một giá trị nằm ở đâu giữa hai mốc min và max.
 * Mục tiêu: biết tròng mắt lệch về phía nào trong khóe mắt, mũi ở đâu giữa trán và cằm.
 * Chức năng: tính (value - min) / (max - min); khoảng cách quá nhỏ thì dùng 0,001 để
 *   không chia cho 0.
 * Đầu ra: một con số; 0 là sát min, 1 là sát max, 0,5 là chính giữa.
 * Dùng ở đâu: calculateMetrics() trong file này.
 * Liên kết với: không có.
 */
function ratio(value: number, min: number, max: number) {
  return (value - min) / Math.max(max - min, 0.001);
}

/**
 * Đây là gì: hàm tính bộ số đo hành vi từ kết quả AI đọc một khung hình camera.
 * Mục tiêu: chuyển hàng trăm điểm mốc khuôn mặt thành vài con số để chấm hành vi.
 * Chức năng: đếm số khuôn mặt; với khuôn mặt đầu tiên thì tính góc quay ngang của đầu
 *   (headYaw: mũi lệch khỏi giữa hai má), góc cúi/ngẩng (headPitch: mũi ở đâu giữa trán
 *   và cằm), và hướng mắt (gazeX, gazeY: tròng mắt lệch trong khóe mắt, từ -1 đến 1).
 *   Số thứ tự điểm mốc theo lưới 478 điểm khuôn mặt của MediaPipe. Các góc chỉ là ước
 *   lượng gần đúng để so với ngưỡng, không phải số đo chính xác đã hiệu chỉnh.
 * Đầu ra: bộ số đo VisionMetrics; không thấy mặt thì trả EMPTY_METRICS kèm fps.
 * Dùng ở đâu: web/src/features/candidate/hooks/use-monitoring-session.ts; được kiểm thử
 *   trong web/tests/unit/face-metrics.test.cjs.
 * Liên kết với: kiểu VisionMetrics trong web/src/domain/exam-types.ts; bộ máy chấm hành vi
 *   trong web/src/domain/ dùng các con số này.
 */
export function calculateMetrics(result: FaceLandmarkerResult, fps: number): VisionMetrics {
  const faceCount = result.faceLandmarks.length;
  if (!faceCount) return { ...EMPTY_METRICS, fps };
  const landmarks = result.faceLandmarks[0];
  const nose = point(landmarks, 1);
  const leftCheek = point(landmarks, 234);
  const rightCheek = point(landmarks, 454);
  const forehead = point(landmarks, 10);
  const chin = point(landmarks, 152);

  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
  const headYaw = ((nose.x - average([leftCheek.x, rightCheek.x])) / Math.max(faceWidth, 0.01)) * 110;
  const headPitch = (ratio(nose.y, forehead.y, chin.y) - 0.54) * 95;

  const leftIris = point(landmarks, 468);
  const rightIris = point(landmarks, 473);
  const leftX = ratio(leftIris.x, point(landmarks, 33).x, point(landmarks, 133).x);
  const rightX = ratio(rightIris.x, point(landmarks, 362).x, point(landmarks, 263).x);
  const leftY = ratio(leftIris.y, point(landmarks, 159).y, point(landmarks, 145).y);
  const rightY = ratio(rightIris.y, point(landmarks, 386).y, point(landmarks, 374).y);

  return {
    faceCount,
    gazeX: (average([leftX, rightX]) - 0.5) * 2,
    gazeY: (average([leftY, rightY]) - 0.5) * 2,
    headYaw,
    headPitch,
    fps,
  };
}
