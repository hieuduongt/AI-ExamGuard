/**
 * File này là "hộp thư đi" của máy thí sinh: cảnh báo được xếp hàng ở đây rồi gửi dần
 * tới máy giám thị qua mạng LAN. Nếu mất mạng, cảnh báo vẫn nằm chờ để gửi lại sau.
 */
import type { ExamEvent } from '@/domain/exam-types';
import { emitDelivered, safeParse } from '@/services/browser-signals';
import { postToHub } from './hub-transport';

// Các cảnh báo đang chờ tới hub của giám thị vẫn còn nguyên khi tải lại trang hoặc mất
// mạng (vì được cất trong localStorage: bộ nhớ nhỏ của trình duyệt, tắt máy vẫn còn).
// Mỗi mục nhớ hub đích của nó, để lỡ sau này đổi địa chỉ thì cũng không gửi nhầm chỗ.
/** Tên ngăn trong localStorage chứa hộp thư đi. */
const OUTBOX_KEY = 'examguard:outbox:v1';
/** Một cảnh báo đang chờ gửi, kèm địa chỉ máy giám thị cần gửi tới. */
type PendingEvent = { hubUrl: string; event: ExamEvent };
/** Lượt gửi đang chạy (nếu có), để không chạy hai lượt gửi cùng lúc. */
let flushing: Promise<void> | null = null;

/**
 * Đây là gì: hàm đọc toàn bộ hộp thư đi.
 * Mục tiêu: biết đang còn những cảnh báo nào chưa gửi.
 * Chức năng: lấy dữ liệu ở ngăn OUTBOX_KEY và giải mã; nếu chưa có hoặc hỏng thì coi là
 *   danh sách rỗng.
 * Đầu ra: mảng các cảnh báo đang chờ (PendingEvent).
 * Dùng ở đâu: enqueueEvent(), getPendingEventCount(), flushPendingEvents() trong file này.
 * Liên kết với: safeParse() trong services/browser-signals.ts.
 */
function readOutbox() {
  return safeParse<PendingEvent[]>(localStorage.getItem(OUTBOX_KEY), []);
}

/**
 * Đây là gì: hàm bỏ một cảnh báo vào hộp thư đi.
 * Mục tiêu: không để mất cảnh báo nào, kể cả khi mạng đang hỏng.
 * Chức năng: bỏ bản cũ cùng mã (id) nếu có, rồi thêm cảnh báo mới vào cuối hàng kèm địa
 *   chỉ máy giám thị cần gửi tới; lưu lại vào localStorage.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: publishEvent() trong services/exam-sync.ts.
 * Liên kết với: flushPendingEvents() (lấy ra gửi đi).
 */
export function enqueueEvent(hubUrl: string, event: ExamEvent) {
  const pending = readOutbox();
  localStorage.setItem(OUTBOX_KEY, JSON.stringify([...pending.filter((item) => item.event.id !== event.id), { hubUrl, event }]));
}

/**
 * Đây là gì: hàm đếm số cảnh báo chưa gửi được.
 * Mục tiêu: cho thí sinh thấy còn bao nhiêu cảnh báo đang chờ gửi.
 * Chức năng: đếm số mục trong hộp thư đi; nếu chạy ngoài trình duyệt thì trả về 0.
 * Đầu ra: một con số.
 * Dùng ở đâu: features/candidate/hooks/use-delivery-status.ts (qua services/exam-sync.ts).
 * Liên kết với: readOutbox() ở trên.
 */
export function getPendingEventCount() {
  if (typeof window === 'undefined') return 0;
  return readOutbox().length;
}

/**
 * Đây là gì: hàm gửi hết các cảnh báo đang chờ trong hộp thư đi.
 * Mục tiêu: đưa cảnh báo tới máy giám thị ngay khi mạng cho phép.
 * Chức năng: nếu đang có một lượt gửi chạy thì dùng chung lượt đó. Nếu không, gửi lần
 *   lượt từng cảnh báo tới đúng máy giám thị của nó; máy nào gửi hỏng một lần thì bỏ qua
 *   các cảnh báo còn lại của máy đó trong lượt này. Gửi được cái nào thì xóa cái đó khỏi
 *   hộp và hô "đã gửi tới nơi".
 * Đầu ra: việc cần chờ, xong khi đã thử gửi hết lượt.
 * Dùng ở đâu: services/exam-sync.ts (publishEvent, publishStation) và testHubConnection()
 *   trong services/hub/hub-client.ts.
 * Liên kết với: postToHub() trong ./hub-transport.ts (gửi tới /api/events);
 *   emitDelivered() trong services/browser-signals.ts.
 */
export function flushPendingEvents(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const queue = readOutbox();
    const unavailableHubs = new Set<string>();
    for (const item of queue) {
      if (unavailableHubs.has(item.hubUrl)) continue;
      if (!await postToHub('/api/events', item.event, 'POST', item.hubUrl)) {
        unavailableHubs.add(item.hubUrl);
        continue;
      }
      // Đọc lại hộp thư: trong lúc chờ gửi, có thể đã có cảnh báo khác được xếp thêm vào.
      const remaining = readOutbox()
        .filter((pending) => pending.event.id !== item.event.id || pending.hubUrl !== item.hubUrl);
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
      emitDelivered(item.event.id);
    }
  })().finally(() => { flushing = null; });
  return flushing;
}
