import type { AlertSeverity, AlertType } from './exam-types';

export const ALERT_LABELS: Record<AlertType, string> = {
  no_face: 'Không có mặt trước máy',
  multiple_faces: 'Xuất hiện nhiều khuôn mặt',
  head_turn: 'Quay đầu trái/phải kéo dài',
  head_pose: 'Cúi/ngẩng đầu bất thường',
  gaze_away: 'Hướng mắt lệch màn hình',
  focus_lost: 'Rời khỏi cửa sổ bài thi',
  restricted_input: 'Thao tác bàn phím bị hạn chế',
};

export function alertSeverity(type: AlertType): AlertSeverity {
  return type === 'no_face' || type === 'multiple_faces' ? 'critical' : 'warning';
}
