/**
 * File này là "cửa vào" phần nhận diện hình ảnh (perception) của AI ExamGuard.
 *
 * Tách rõ hai tầng — rất quan trọng khi giải thích với giám khảo:
 *
 * 1) Tầng NHÌN (file này + face-metrics / MediaPipe):
 *    Webcam → điểm mốc khuôn mặt → vài con số (số mặt, góc đầu, hướng mắt).
 *    MediaPipe Face Landmarker của Google chỉ làm việc này. Nó KHÔNG kết luận
 *    thí sinh có gian lận / sai phạm hay không.
 *
 * 2) Tầng QUYẾT ĐỊNH CẢNH BÁO (web/src/domain/behavior-engine.ts):
 *    Nhận các con số ở trên, đếm thời gian kéo dài, so với ngưỡng (ví dụ cúi/ngẩng
 *    headPoseSeconds = 6 giây), rồi mới tạo cảnh báo để giám thị xem.
 *    Đây mới là luật do nhóm thiết kế. Giám thị vẫn là người kết luận cuối.
 *
 * Dự phòng mở rộng:
 *    Sau này muốn dùng thuật toán khác (pose toàn thân, phát hiện điện thoại,
 *    mô hình tự huấn luyện…) thì viết thêm một nhà cung cấp mới, miễn đầu ra
 *    vẫn là VisionMetrics (hoặc mở rộng có kiểm soát). BehaviorEngine không cần
 *    viết lại từ đầu — chỉ cần các con số đầu vào đủ tốt hơn.
 */
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type { VisionMetrics } from '@/domain/exam-types';
import { EMPTY_METRICS, calculateMetrics as calculateMediaPipeMetrics } from './face-metrics';

/** Mã nhà cung cấp phần "nhìn". Thêm mã mới khi gắn thuật toán khác. */
export type VisionProviderId = 'mediapipe-face-landmarker' | 'future-custom';

/** Thông tin nhà cung cấp đang dùng — dùng để ghi log / giải thích trong tài liệu. */
export interface VisionProviderInfo {
  id: VisionProviderId;
  displayName: string;
  /** MediaPipe chỉ nhìn; không phán quyết sai phạm. */
  does: string;
  doesNot: string;
}

/**
 * Nhà cung cấp hiện tại: MediaPipe Face Landmarker (chạy ngay trên máy thí sinh).
 * future-custom: chỗ dành sẵn — chưa gắn thuật toán thật.
 */
export const ACTIVE_VISION_PROVIDER: VisionProviderInfo = {
  id: 'mediapipe-face-landmarker',
  displayName: 'MediaPipe Face Landmarker (Google)',
  does: 'Tìm khuôn mặt và 478 điểm mốc; ước lượng số mặt, góc quay đầu, cúi/ngẩng, hướng mắt.',
  doesNot: 'Không nhận diện danh tính, không phát hiện điện thoại/tài liệu, không kết luận gian lận.',
};

/**
 * Đây là gì: hàm đổi kết quả mô hình "nhìn" thành VisionMetrics dùng chung.
 * Mục tiêu: một cửa duy nhất — sau này đổi thuật toán thì sửa ở đây, không sửa BehaviorEngine.
 * Chức năng: hiện chỉ gọi calculateMetrics của MediaPipe. Nhánh future-custom cố ý để trống
 *   (ném lỗi rõ ràng) để không ai nhầm là đã có thuật toán thứ hai.
 * Đầu ra: VisionMetrics.
 * Dùng ở đâu: use-monitoring-session.ts (vòng lặp AI).
 */
export function metricsFromVisionResult(
  result: FaceLandmarkerResult,
  fps: number,
  provider: VisionProviderId = ACTIVE_VISION_PROVIDER.id,
): VisionMetrics {
  if (provider === 'mediapipe-face-landmarker') {
    return calculateMediaPipeMetrics(result, fps);
  }
  // Dự phòng: gắn thuật toán khác tại đây (đọc result riêng hoặc nguồn khác → VisionMetrics).
  throw new Error('Nhà cung cấp nhận diện future-custom chưa được gắn thuật toán.');
}

export { EMPTY_METRICS };
