/**
 * File này chấm "sức khỏe" tức thời của một máy thí sinh dựa trên khung hình camera hiện tại,
 * để tô màu (xanh, vàng, đỏ). Thuộc phần luật nghiệp vụ (web/src/domain/).
 */
import type { VisionMetrics } from './exam-types';
import { exceedsVisionLimits } from './thresholds';

// Ba mức màu của một máy: bình thường (xanh), cần chú ý (vàng), nghiêm trọng (đỏ).
export type MetricsHealth = 'normal' | 'warning' | 'critical';

/**
 * Đây là gì: hàm chấm màu tức thời cho một máy thí sinh.
 * Mục tiêu: cho biết ngay khung hình này trông ổn hay đáng chú ý.
 * Chức năng: chỉ xét từng khung hình một: không có mặt hoặc nhiều khuôn mặt là đỏ; có
 *   một khuôn mặt nhưng góc đầu/hướng mắt vượt giới hạn là vàng; còn lại là xanh. Đây chỉ
 *   là màu tức thời; muốn thành cảnh báo thì vẫn phải qua luật tính thời gian trong
 *   behavior-engine.ts.
 * Đầu ra: 'normal', 'warning' hoặc 'critical'.
 * Dùng ở đâu: web/src/features/candidate/hooks/use-monitoring-session.ts (màu khung camera và
 *   trạng thái gửi về máy giám thị); web/tests/unit/domain.test.cjs.
 * Liên kết với: exceedsVisionLimits trong thresholds.ts.
 */
export function classifyMetrics(metrics: VisionMetrics): MetricsHealth {
  if (metrics.faceCount === 0 || metrics.faceCount > 1) return 'critical';
  if (exceedsVisionLimits(metrics)) return 'warning';
  return 'normal';
}
