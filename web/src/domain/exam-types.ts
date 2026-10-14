/**
 * File này định nghĩa "hình dạng" chung của dữ liệu trong một phiên thi: cảnh báo, trạng thái
 * máy thí sinh, các con số AI đọc từ camera, ngưỡng thời gian. Thuộc phần luật nghiệp vụ
 * (web/src/domain/).
 * Các tên trường ở đây cũng là "hợp đồng" của API (cửa giao tiếp giữa hai chương trình) qua
 * mạng LAN với desktop-hub/ (chương trình Python trên máy giám thị, nơi mọi máy thí sinh gửi
 * cảnh báo về; xem docs/ky-thuat/api-lan.md). Không được đổi tên trường nào ở đây nếu chưa
 * sửa tương ứng bên desktop hub.
 */

// Mức độ của cảnh báo: thông tin, cần chú ý (vàng), nghiêm trọng (đỏ).
export type AlertSeverity = 'info' | 'warning' | 'critical';

// Các loại cảnh báo: không có mặt, nhiều khuôn mặt, quay đầu, cúi/ngẩng đầu, mắt nhìn lệch,
// rời cửa sổ bài thi, bấm tổ hợp phím bị hạn chế.
export type AlertType =
  | 'no_face'
  | 'multiple_faces'
  | 'head_turn'
  | 'head_pose'
  | 'gaze_away'
  | 'focus_lost'
  | 'restricted_input';

// Trạng thái một máy thí sinh trên màn hình giám thị: mất kết nối, bình thường, cần chú ý, nghiêm trọng.
export type StationState = 'offline' | 'normal' | 'warning' | 'critical';

// Các con số AI đọc được từ một khung hình camera: số khuôn mặt, hướng mắt ngang/dọc,
// góc quay đầu trái/phải (yaw), góc cúi/ngẩng (pitch), số khung hình AI xử lý mỗi giây (fps).
export interface VisionMetrics {
  faceCount: number;
  gazeX: number;
  gazeY: number;
  headYaw: number;
  headPitch: number;
  fps: number;
}

// Một cảnh báo gửi từ máy thí sinh về giám thị: mã riêng, phòng, máy, thí sinh, loại,
// mức độ, tiêu đề, mô tả, thời điểm, giám thị đã xem chưa, và nguồn tạo ra
// ('ai' từ camera, 'browser' từ trình duyệt, 'demo' là cảnh báo thử).
export interface ExamEvent {
  id: string;
  roomId: string;
  stationId: string;
  candidateId: string;
  candidateName: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  timestamp: number;
  reviewed: boolean;
  source: 'ai' | 'browser' | 'demo';
}

// "Nhịp tim" của một máy thí sinh gửi về đều đặn: ai đang thi, máy đang ở trạng thái nào,
// lần cuối liên lạc, AI có đang chạy không, tiến trình hành vi, các con số AI, số cảnh báo.
export interface StationStatus {
  stationId: string;
  roomId: string;
  candidateId: string;
  candidateName: string;
  state: StationState;
  lastSeen: number;
  serverSeenAt?: number;
  analysisState?: 'loading' | 'ready' | 'stalled' | 'error' | 'stopped';
  analysisMessage?: string;
  lastAnalyzedAt?: number;
  behaviorProgress?: Array<{ type: AlertType; elapsedSeconds: number; requiredSeconds: number }>;
  metrics: VisionMetrics;
  alertCount: number;
}

// Ngưỡng thời gian (giây) mỗi hành vi phải kéo dài mới thành cảnh báo, và thời gian
// "nghỉ" (cooldown) trước khi được báo lại cùng một loại.
export interface BehaviorThresholds {
  noFaceSeconds: number;
  multipleFacesSeconds: number;
  headTurnSeconds: number;
  gazeAwaySeconds: number;
  cooldownSeconds: number;
}
