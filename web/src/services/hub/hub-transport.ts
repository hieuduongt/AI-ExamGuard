/**
 * File này lo việc "đi đường" khi trang web nói chuyện với hub (máy trung tâm của giám thị,
 * nơi mọi máy thí sinh gửi cảnh báo về) qua mạng LAN: gửi yêu cầu có giới hạn thời gian
 * chờ và báo lại trạng thái kết nối.
 */
import { emitHubStatus } from '@/services/browser-signals';
import { activeHubUrl } from './hub-url';

/** Thời gian chờ tối đa cho mỗi yêu cầu gửi tới máy giám thị (clip ngắn có thể lớn hơn vài trăm KB). */
const HUB_TIMEOUT_MS = 12000;

/** Kết quả gửi tới hub: thành công / hub từ chối dữ liệu / không tới được hub. */
export type HubPostResult = 'ok' | 'rejected' | 'unreachable';

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
 * Đây là gì: hàm gửi dữ liệu JSON tới hub và phân loại kết quả chi tiết.
 * Mục tiêu: outbox biết lúc nào nên bỏ qua cả hàng (mất mạng) và lúc nào chỉ bỏ một cảnh báo hỏng.
 * Đầu ra: 'ok' | 'rejected' (4xx) | 'unreachable' (mất mạng / 5xx / hết giờ).
 */
export async function postToHubResult(path: string, payload: unknown, method = 'POST', hubUrl = activeHubUrl()): Promise<HubPostResult> {
  if (!hubUrl) return 'unreachable';
  try {
    const response = await fetchWithTimeout(`${hubUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    if (response.ok) {
      emitHubStatus('connected');
      return 'ok';
    }
    emitHubStatus(response.status >= 500 ? 'disconnected' : 'connected');
    return response.status >= 400 && response.status < 500 ? 'rejected' : 'unreachable';
  } catch {
    emitHubStatus('disconnected');
    return 'unreachable';
  }
}

/**
 * Đây là gì: hàm gửi dữ liệu dạng JSON tới máy giám thị.
 * Mục tiêu: gửi cảnh báo, trạng thái máy thí sinh, hoặc dấu "đã xem" lên máy giám thị.
 * Chức năng: gửi dữ liệu tới hubUrl + path qua API của hub; báo trạng thái hub là đã kết nối /
 *   mất kết nối và không bao giờ ném lỗi ra ngoài. Nếu chưa có địa chỉ hub thì không gửi.
 * Đầu ra: việc cần chờ cho ra true nếu máy giám thị nhận, false nếu không gửi được.
 * Dùng ở đâu: services/hub/outbox.ts, services/exam-sync.ts.
 */
export async function postToHub(path: string, payload: unknown, method = 'POST', hubUrl = activeHubUrl()) {
  return (await postToHubResult(path, payload, method, hubUrl)) === 'ok';
}
