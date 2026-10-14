/**
 * File này định nghĩa các "tín hiệu" nội bộ trong trang web: một phần của trang hô lên
 * (ví dụ "đã gửi xong cảnh báo"), phần khác nghe thấy và cập nhật màn hình.
 * Thuộc phần services/ (gửi/nhận dữ liệu).
 */
// Các thông báo trong trang (CustomEvent của window) giúp các màn hình phản ứng với
// việc đồng bộ dữ liệu mà không phải nhập (import) lẫn nhau. Các tên tín hiệu là một
// phần hành vi của ứng dụng, không được tự ý đổi.

/** Tên tín hiệu báo trạng thái kết nối máy giám thị (đã kết nối / mất kết nối). */
export const HUB_STATUS_SIGNAL = 'examguard-hub-status';
/** Tên tín hiệu báo một cảnh báo đã được gửi tới nơi. */
export const DELIVERY_SIGNAL = 'examguard-delivery';
/** Tên tín hiệu báo danh sách cảnh báo lưu trong trình duyệt vừa thay đổi. */
export const LOCAL_EVENTS_SIGNAL = 'examguard-events';
/** Tên tín hiệu báo danh sách máy thí sinh lưu trong trình duyệt vừa thay đổi. */
export const LOCAL_STATIONS_SIGNAL = 'examguard-stations';

/** Trạng thái kết nối tới máy giám thị: 'connected' (đã nối) hoặc 'disconnected' (mất nối). */
export type HubStatus = 'connected' | 'disconnected';

/**
 * Đây là gì: hàm hô lên trạng thái kết nối tới hub (máy trung tâm của giám thị, nơi mọi
 *   máy thí sinh gửi cảnh báo về).
 * Mục tiêu: để các màn hình biết đang nối được hay đã mất nối mà hiện cho người dùng.
 * Chức năng: phát tín hiệu HUB_STATUS_SIGNAL kèm trạng thái; nếu đang chạy ngoài trình
 *   duyệt (không có window) thì bỏ qua.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: services/hub/hub-transport.ts, services/hub/hub-client.ts,
 *   services/exam-sync.ts, services/firebase/firestore-sync.ts.
 * Liên kết với: features/candidate/hooks/use-hub-connection.ts và
 *   features/proctor/hooks/use-proctor-feed.ts nghe tín hiệu này.
 */
export function emitHubStatus(status: HubStatus) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(HUB_STATUS_SIGNAL, { detail: status }));
}

/**
 * Đây là gì: hàm hô lên "cảnh báo có mã id đã gửi tới nơi".
 * Mục tiêu: để màn hình thí sinh biết cảnh báo nào đã đến máy giám thị hoặc đám mây.
 * Chức năng: phát tín hiệu DELIVERY_SIGNAL kèm mã cảnh báo và delivered: true.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: services/hub/outbox.ts (gửi qua LAN xong) và
 *   services/firebase/firestore-sync.ts (lưu lên Firebase xong).
 * Liên kết với: features/candidate/hooks/use-delivery-status.ts nghe tín hiệu này.
 */
export function emitDelivered(id: string) {
  window.dispatchEvent(new CustomEvent(DELIVERY_SIGNAL, { detail: { id, delivered: true } }));
}

/**
 * Đây là gì: hàm đọc an toàn dữ liệu dạng chữ JSON (cách ghi dữ liệu thành chữ).
 * Mục tiêu: không để trang bị lỗi khi dữ liệu đã lưu bị hỏng hoặc chưa có.
 * Chức năng: nếu chuỗi rỗng hoặc đọc lỗi thì trả về giá trị dự phòng; nếu đọc được thì
 *   trả về dữ liệu đã giải mã.
 * Đầu ra: dữ liệu đọc được, hoặc giá trị dự phòng fallback.
 * Dùng ở đâu: services/hub/outbox.ts và services/local-demo/local-store.ts khi đọc
 *   localStorage (bộ nhớ nhỏ của trình duyệt, tắt máy vẫn còn).
 * Liên kết với: hàm có sẵn JSON.parse của JavaScript.
 */
export function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
