/**
 * File này chứa các câu hỏi trang web gửi tới hub (máy trung tâm của giám thị, nơi mọi
 * máy thí sinh gửi cảnh báo về): thử kết nối, hỏi thông tin ứng dụng máy tính, và lấy
 * toàn bộ dữ liệu phòng thi.
 */
import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { emitHubStatus } from '@/services/browser-signals';
import { fetchWithTimeout } from './hub-transport';
import { activeHubUrl, defaultSplitDevHubUrl, isSplitDevOrigin, normalizeHubUrl, resolveBrowserHubUrl, setConfiguredHubUrl } from './hub-url';
import { flushPendingEvents } from './outbox';

/**
 * Thông tin ứng dụng máy tính của giám thị gửi về: chạy ổn không (ok), cổng (port), địa
 * chỉ hub (hubUrl), phiên bản, có bật dò tìm trên LAN không (discovery), mã kết nối 4 số.
 */
export interface HubRuntime {
  ok: boolean;
  port: number;
  hubUrl: string;
  version?: string;
  discovery?: boolean;
  connectCode?: string;
}

/** Báo cho hub biết đang có màn hình giám thị mở, kèm tên phòng (room). */
export type ProctorPresence = { room: string };

/**
 * Đây là gì: hàm thử kết nối tới máy giám thị theo địa chỉ người dùng gõ.
 * Mục tiêu: cho thí sinh biết đã nối được với máy giám thị chưa trước khi bắt đầu thi.
 * Chức năng: chuẩn hóa địa chỉ; hỏi đường /api/health của hub; nếu hub trả lời ổn thì
 *   lưu địa chỉ, báo đã kết nối và gửi luôn các cảnh báo còn đang chờ; nếu không thì
 *   báo mất kết nối.
 * Đầu ra: việc cần chờ cho ra { ok, hubUrl, message } với lời nhắn tiếng Việt cho người dùng.
 * Dùng ở đâu: features/candidate/hooks/use-hub-connection.ts (qua services/exam-sync.ts).
 * Liên kết với: normalizeHubUrl(), setConfiguredHubUrl() trong ./hub-url.ts;
 *   flushPendingEvents() trong ./outbox.ts; /api/health trong
 *   desktop-hub/examguard_desktop/http_handler.py.
 */
export async function testHubConnection(value: string) {
  const typed = normalizeHubUrl(value);
  if (!typed) return { ok: false, hubUrl: '', message: 'Địa chỉ máy giám thị không hợp lệ.' };
  // HTTPS + next dev: gọi qua origin trang (proxy), tránh mixed content / 127.0.0.1 sai máy.
  const hubUrl = resolveBrowserHubUrl(typed);
  try {
    const response = await fetchWithTimeout(`${hubUrl}/api/health`);
    const payload = await response.json() as { ok?: boolean };
    if (!response.ok || !payload.ok) throw new Error('Máy giám thị không phản hồi.');
    setConfiguredHubUrl(hubUrl);
    emitHubStatus('connected');
    void flushPendingEvents();
    return { ok: true, hubUrl, message: 'Đã kết nối với máy giám thị.' };
  } catch {
    emitHubStatus('disconnected');
    return { ok: false, hubUrl, message: 'Không kết nối được. Hãy kiểm tra địa chỉ, Wi-Fi/LAN và tường lửa Windows.' };
  }
}

/**
 * Đây là gì: hàm hỏi thông tin runtime của hub (cổng, hubUrl LAN, mã kết nối).
 * Mục tiêu: màn hình giám thị biết hub đang chạy ở đâu và hiện địa chỉ/mã cho thí sinh.
 * Chức năng: thử lần lượt các gốc có thể — hub đang chọn, origin trang (khi EXE phục vụ
 *   web), hub tách mặc định khi `next dev`. Chỉ nhận khi trả ok + hubUrl; mọi lỗi → null.
 * Đầu ra: việc cần chờ cho ra HubRuntime, hoặc null.
 * Dùng ở đâu: features/proctor/hooks/use-proctor-feed.ts (qua services/exam-sync.ts).
 * Liên kết với: /api/runtime trong desktop-hub/examguard_desktop/http_handler.py.
 */
export async function getDesktopRuntime(): Promise<HubRuntime | null> {
  if (typeof window === 'undefined') return null;
  const candidates = [
    activeHubUrl(),
    window.location.origin,
    isSplitDevOrigin() ? defaultSplitDevHubUrl() : '',
  ].filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);

  for (const base of candidates) {
    try {
      const response = await fetchWithTimeout(`${base}/api/runtime`);
      if (!response.ok) continue;
      const payload = await response.json() as HubRuntime;
      if (payload.ok && payload.hubUrl) return payload;
    } catch {
      /* thử ứng viên tiếp theo */
    }
  }
  return null;
}

/**
 * Đây là gì: hàm lấy toàn bộ dữ liệu hiện tại của máy giám thị.
 * Mục tiêu: màn hình giám thị luôn có danh sách cảnh báo và máy thí sinh mới nhất.
 * Chức năng: hỏi đường /api/snapshot của hub. Khi có proctor, hub còn biết đang có màn
 *   hình giám thị mở, nên nó tự hô trên mạng LAN cho máy thí sinh tìm thấy
 *   (desktop-hub/examguard_desktop/discovery.py). Hub không trả lời thì báo lỗi.
 * Đầu ra: việc cần chờ cho ra { events, stations } (cảnh báo và máy thí sinh).
 * Dùng ở đâu: subscribeExamData() trong services/exam-sync.ts (hỏi mỗi giây).
 * Liên kết với: /api/snapshot trong desktop-hub/examguard_desktop/http_handler.py.
 */
export async function fetchHubSnapshot(hubUrl: string, proctor?: ProctorPresence) {
  const query = proctor ? `?${new URLSearchParams({ proctor: '1', room: proctor.room })}` : '';
  const response = await fetchWithTimeout(`${hubUrl}/api/snapshot${query}`);
  if (!response.ok) throw new Error('LAN hub unavailable');
  return await response.json() as { events?: ExamEvent[]; stations?: StationStatus[] };
}
