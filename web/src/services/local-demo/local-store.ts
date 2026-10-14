/**
 * File này là kênh chạy thử trên một trình duyệt: cảnh báo và trạng thái máy thí sinh được
 * cất ngay trong trình duyệt, nên hai thẻ (tab) của cùng trình duyệt thấy dữ liệu của nhau.
 * Thuộc phần chạy thử cục bộ (local-demo).
 */
import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { LOCAL_EVENTS_SIGNAL, LOCAL_STATIONS_SIGNAL, safeParse } from '@/services/browser-signals';

// Kênh chạy thử trong một trình duyệt: hai thẻ của cùng trình duyệt chia sẻ dữ liệu qua
// localStorage (bộ nhớ nhỏ của trình duyệt, tắt máy vẫn còn) cộng với BroadcastChannel
// (kênh nhắn tin giữa các thẻ). Kênh này không nối được hai máy tính khác nhau.
/** Tên ngăn lưu danh sách cảnh báo. */
const EVENT_KEY = 'examguard:events:v2';
/** Tên ngăn lưu danh sách máy thí sinh. */
const STATION_KEY = 'examguard:stations:v2';
/** Tên kênh nhắn tin giữa các thẻ trình duyệt. */
const CHANNEL = 'examguard:live:v2';

/**
 * Đây là gì: hàm đọc danh sách cảnh báo đã cất trong trình duyệt.
 * Mục tiêu: hiện cảnh báo khi chạy thử mà không cần máy giám thị.
 * Chức năng: đọc ngăn EVENT_KEY; chạy ngoài trình duyệt hoặc dữ liệu hỏng thì trả mảng rỗng.
 * Đầu ra: mảng cảnh báo (ExamEvent).
 * Dùng ở đâu: saveLocalEvent(), markLocalEventReviewed() trong file này;
 *   subscribeExamData() trong services/exam-sync.ts.
 * Liên kết với: safeParse() trong services/browser-signals.ts.
 */
export function localEvents() {
  if (typeof window === 'undefined') return [] as ExamEvent[];
  return safeParse<ExamEvent[]>(localStorage.getItem(EVENT_KEY), []);
}

/**
 * Đây là gì: hàm đọc danh sách máy thí sinh đã cất trong trình duyệt.
 * Mục tiêu: hiện các máy thí sinh khi chạy thử.
 * Chức năng: đọc ngăn STATION_KEY; chạy ngoài trình duyệt hoặc dữ liệu hỏng thì trả mảng rỗng.
 * Đầu ra: mảng trạng thái máy thí sinh (StationStatus).
 * Dùng ở đâu: saveLocalStation() trong file này; subscribeExamData() trong
 *   services/exam-sync.ts.
 * Liên kết với: safeParse() trong services/browser-signals.ts.
 */
export function localStations() {
  if (typeof window === 'undefined') return [] as StationStatus[];
  return safeParse<StationStatus[]>(localStorage.getItem(STATION_KEY), []);
}

/**
 * Đây là gì: hàm nhắn một tin cho các thẻ trình duyệt khác.
 * Mục tiêu: thẻ khác biết dữ liệu vừa đổi để cập nhật màn hình.
 * Chức năng: mở kênh CHANNEL, gửi tin, rồi đóng kênh; trình duyệt không hỗ trợ thì bỏ qua.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: saveLocalEvent(), saveLocalStation(), markLocalEventReviewed() trong file này.
 * Liên kết với: subscribeLocalData() (bên nhận tin).
 */
function broadcast(payload: unknown) {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage(payload);
  channel.close();
}

/**
 * Đây là gì: hàm cất một cảnh báo vào trình duyệt.
 * Mục tiêu: lưu cảnh báo để màn hình giám thị chạy thử nhìn thấy.
 * Chức năng: đặt cảnh báo mới lên đầu danh sách, bỏ bản cũ cùng mã (id), giữ tối đa 500
 *   cảnh báo; rồi hô tín hiệu cho thẻ này và nhắn tin cho các thẻ khác.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: publishEvent() trong services/exam-sync.ts.
 * Liên kết với: localEvents(), broadcast(); LOCAL_EVENTS_SIGNAL trong
 *   services/browser-signals.ts.
 */
export function saveLocalEvent(event: ExamEvent) {
  const next = [event, ...localEvents().filter((item) => item.id !== event.id)].slice(0, 500);
  localStorage.setItem(EVENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(LOCAL_EVENTS_SIGNAL));
  broadcast({ kind: 'event', event });
}

/**
 * Đây là gì: hàm cất trạng thái một máy thí sinh vào trình duyệt.
 * Mục tiêu: màn hình giám thị chạy thử thấy máy thí sinh mới nhất.
 * Chức năng: mỗi máy được nhận ra bằng "phòng::máy"; đặt bản mới lên đầu, bỏ bản cũ của
 *   cùng máy, giữ tối đa 150 máy; rồi hô tín hiệu và nhắn tin cho các thẻ khác.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: publishStation() trong services/exam-sync.ts.
 * Liên kết với: localStations(), broadcast(); LOCAL_STATIONS_SIGNAL trong
 *   services/browser-signals.ts.
 */
export function saveLocalStation(station: StationStatus) {
  const stations = localStations();
  const key = `${station.roomId}::${station.stationId}`;
  const next = [station, ...stations.filter((item) => `${item.roomId}::${item.stationId}` !== key)].slice(0, 150);
  localStorage.setItem(STATION_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(LOCAL_STATIONS_SIGNAL));
  broadcast({ kind: 'station', station });
}

/**
 * Đây là gì: hàm đánh dấu một cảnh báo đã cất trong trình duyệt là "đã xem"/"chưa xem".
 * Mục tiêu: giám thị ghi nhận đã xem xét cảnh báo khi chạy thử.
 * Chức năng: sửa trường reviewed của cảnh báo có mã id, lưu lại, rồi hô tín hiệu và nhắn
 *   tin cho các thẻ khác.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: markEventReviewed() trong services/exam-sync.ts.
 * Liên kết với: localEvents(), broadcast().
 */
export function markLocalEventReviewed(id: string, reviewed: boolean) {
  const next = localEvents().map((event) => event.id === id ? { ...event, reviewed } : event);
  localStorage.setItem(EVENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(LOCAL_EVENTS_SIGNAL));
  broadcast({ kind: 'review', id, reviewed });
}

/**
 * Đây là gì: hàm đăng ký theo dõi dữ liệu chạy thử trong trình duyệt.
 * Mục tiêu: màn hình tự cập nhật khi thẻ này hoặc thẻ khác thay đổi dữ liệu.
 * Chức năng: gọi lại ngay một lần, sau đó gọi lại mỗi khi thẻ khác hoặc chính thẻ này đổi
 *   dữ liệu (nghe kênh nhắn tin, sự kiện "storage" của localStorage và hai tín hiệu
 *   LOCAL_EVENTS_SIGNAL, LOCAL_STATIONS_SIGNAL).
 * Đầu ra: một hàm "ngừng theo dõi" để gỡ hết các chỗ đang nghe.
 * Dùng ở đâu: subscribeExamData() trong services/exam-sync.ts.
 * Liên kết với: broadcast() và các hàm save... ở trên (bên gửi tin).
 */
export function subscribeLocalData(refreshEvents: () => void, refreshStations: () => void) {
  refreshEvents();
  refreshStations();
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
  /**
   * Đây là gì: hàm con xử lý khi có tin từ thẻ khác.
   * Mục tiêu: cập nhật cả cảnh báo lẫn máy thí sinh khi dữ liệu bị đổi ở nơi khác.
   * Chức năng: gọi refreshEvents() rồi refreshStations().
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: nghe kênh BroadcastChannel và sự kiện "storage" ngay bên dưới.
   * Liên kết với: broadcast() (bên gửi tin).
   */
  const onChannel = () => { refreshEvents(); refreshStations(); };
  channel?.addEventListener('message', onChannel);
  window.addEventListener('storage', onChannel);
  window.addEventListener(LOCAL_EVENTS_SIGNAL, refreshEvents);
  window.addEventListener(LOCAL_STATIONS_SIGNAL, refreshStations);
  return () => {
    channel?.removeEventListener('message', onChannel);
    channel?.close();
    window.removeEventListener('storage', onChannel);
    window.removeEventListener(LOCAL_EVENTS_SIGNAL, refreshEvents);
    window.removeEventListener(LOCAL_STATIONS_SIGNAL, refreshStations);
  };
}
