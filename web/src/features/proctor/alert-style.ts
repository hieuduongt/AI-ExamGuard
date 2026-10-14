// File này quy định "trang phục" của cảnh báo trên trang giám thị: mỗi loại cảnh báo
// dùng biểu tượng nào, mỗi mức độ (đỏ, vàng, thông tin) dùng màu nào.

import { Eye, MonitorCheck, RefreshCw, ShieldAlert, SlidersHorizontal, UsersRound } from 'lucide-react';
import type { AlertSeverity, AlertType } from '@/domain/exam-types';

// Bảng chọn biểu tượng cho từng loại cảnh báo. Thêm loại cảnh báo mới (AlertType) thì phải
// thêm biểu tượng ở đây, nếu không chương trình sẽ báo lỗi kiểu dữ liệu.
export const alertIcons: Record<AlertType, typeof Eye> = {
  no_face: ShieldAlert,
  multiple_faces: UsersRound,
  head_turn: RefreshCw,
  head_pose: RefreshCw,
  gaze_away: Eye,
  focus_lost: MonitorCheck,
  restricted_input: SlidersHorizontal,
};

/**
 * Đây là gì: hàm chọn bộ màu theo mức độ cảnh báo.
 * Mục tiêu: để giám thị nhìn màu là biết cảnh báo nặng hay nhẹ.
 * Chức năng: "critical" (ưu tiên kiểm tra) dùng màu đỏ hồng, "warning" (cảnh báo) dùng màu
 *   vàng, còn lại (thông tin) dùng màu xanh ngọc.
 * Đầu ra: nhóm tên lớp màu (dot: chấm tròn, text: chữ, surface: nền, ring: viền) để tô giao diện.
 * Dùng ở đâu: components/event-feed.tsx và components/event-detail-drawer.tsx.
 * Liên kết với: kiểu AlertSeverity trong web/src/domain/exam-types.ts.
 */
export function severityClasses(severity: AlertSeverity) {
  if (severity === 'critical') return { dot: 'bg-rose-500', text: 'text-rose-700', surface: 'bg-rose-50', ring: 'ring-rose-200' };
  if (severity === 'warning') return { dot: 'bg-amber-400', text: 'text-amber-700', surface: 'bg-amber-50', ring: 'ring-amber-200' };
  return { dot: 'bg-cyan-500', text: 'text-cyan-700', surface: 'bg-cyan-50', ring: 'ring-cyan-200' };
}
