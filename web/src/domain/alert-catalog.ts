/**
 * File này là "danh mục cảnh báo" của AI ExamGuard: tên tiếng Việt của từng loại cảnh báo
 * và mức độ nghiêm trọng của nó. Thuộc phần luật nghiệp vụ (web/src/domain/), dùng chung
 * cho màn hình thí sinh và các bài kiểm thử.
 */
import type { AlertSeverity, AlertType } from './exam-types';

// Tên hiển thị tiếng Việt cho từng loại cảnh báo (mã loại cảnh báo -> câu dễ đọc).
// Danh sách mã phải khớp "alertTypes" trong shared/hub-contract.json
// (web/tests/unit/contract.test.cjs kiểm tra điều này).
export const ALERT_LABELS: Record<AlertType, string> = {
  no_face: 'Không có mặt trước máy',
  multiple_faces: 'Xuất hiện nhiều khuôn mặt',
  head_turn: 'Quay đầu trái/phải kéo dài',
  head_pose: 'Cúi/ngẩng đầu bất thường',
  gaze_away: 'Hướng mắt lệch màn hình',
  focus_lost: 'Rời khỏi cửa sổ bài thi',
  restricted_input: 'Thao tác bàn phím bị hạn chế',
};

/**
 * Đây là gì: hàm cho biết một loại cảnh báo nặng hay nhẹ.
 * Mục tiêu: giúp giám thị nhìn màu là biết cảnh báo nào cần xem trước.
 * Chức năng: "không có mặt" và "nhiều khuôn mặt" là mức nặng (đỏ); các loại còn lại là
 *   mức cần chú ý (vàng).
 * Đầu ra: 'critical' (nặng, màu đỏ) hoặc 'warning' (cần chú ý, màu vàng).
 * Dùng ở đâu: emitAlert trong web/src/features/candidate/hooks/use-monitoring-session.ts,
 *   khi tạo một cảnh báo mới; và web/tests/unit/domain.test.cjs.
 * Liên kết với: kiểu AlertSeverity, AlertType trong exam-types.ts.
 */
export function alertSeverity(type: AlertType): AlertSeverity {
  return type === 'no_face' || type === 'multiple_faces' ? 'critical' : 'warning';
}
