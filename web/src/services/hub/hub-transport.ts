/**
 * File này lo việc "đi đường" khi trang web nói chuyện với hub (máy trung tâm của giám thị,
 * nơi mọi máy thí sinh gửi cảnh báo về) qua mạng LAN: gửi yêu cầu có giới hạn thời gian
 * chờ và báo lại trạng thái kết nối.
 */
import { emitHubStatus } from '@/services/browser-signals';
import { activeHubUrl } from './hub-url';

/** Thời gian chờ tối đa cho mỗi yêu cầu gửi tới máy giám thị: 3,5 giây. */
const HUB_TIMEOUT_MS = 3500;

/**
 * Đây là gì: hàm gửi yêu cầu qua mạng nhưng không chờ quá lâu.
 * Mục tiêu: nếu máy giám thị tắt hoặc mạng hỏng thì trang không bị treo mãi.
 * Chức năng: gửi yêu cầu tới địa chỉ url; nếu quá HUB_TIMEOUT_MS mà chưa có trả lời thì
 *   hủy; luôn bảo trình duyệt không dùng bản lưu cũ (no-store) để lấy dữ liệu mới nhất.
 * Đầu ra: việc cần chờ (Promise), như chờ mạng trả lời, cho ra câu trả lời của máy kia;
 *   báo lỗi nếu hết giờ hoặc mất mạng.
 * Dùng ở đâu: postToHub() ngay bên dưới, services/hub/hub-client.ts,
 *   services/hub/hub-discovery.ts.
 * Liên kết với: hàm fetch có sẵn của trình duyệt.
 */
export async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), HUB_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Đây là gì: hàm gửi dữ liệu dạng JSON tới máy giám thị.
 * Mục tiêu: gửi cảnh báo, trạng thái máy thí sinh, hoặc dấu "đã xem" lên máy giám thị.
 * Chức năng: gửi dữ liệu tới hubUrl + path qua API (cửa giao tiếp giữa hai chương trình)
 *   của hub; báo trạng thái hub là đã kết nối / mất kết nối và không bao giờ ném lỗi ra
 *   ngoài. Nếu chưa có địa chỉ hub thì không gửi.
 * Đầu ra: việc cần chờ cho ra true nếu máy giám thị nhận, false nếu không gửi được.
 * Dùng ở đâu: services/hub/outbox.ts (gửi cảnh báo), services/exam-sync.ts (gửi trạng
 *   thái máy, đánh dấu đã xem).
 * Liên kết với: activeHubUrl() trong ./hub-url.ts; emitHubStatus() trong
 *   services/browser-signals.ts; các đường /api/... trong
 *   desktop-hub/examguard_desktop/http_handler.py.
 */
export async function postToHub(path: string, payload: unknown, method = 'POST', hubUrl = activeHubUrl()) {
  if (!hubUrl) return false;
  try {
    const response = await fetchWithTimeout(`${hubUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('LAN hub rejected the request');
    emitHubStatus('connected');
    return true;
  } catch {
    emitHubStatus('disconnected');
    return false;
  }
}
