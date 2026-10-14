/**
 * File này giúp máy thí sinh tự tìm máy giám thị trong cùng mạng LAN (thay vì phải gõ
 * địa chỉ), dựa vào mã kết nối 4 số và tên phòng thi.
 */
import { fetchWithTimeout } from './hub-transport';

/**
 * Thông tin một máy giám thị tìm thấy trên mạng LAN: địa chỉ (hubUrl), tên phòng (room),
 * tên máy (host) và phiên bản phần mềm (version).
 */
export interface DiscoveredHub {
  hubUrl: string;
  room: string;
  host: string;
  version: string;
}

/**
 * Đây là gì: hàm kiểm tra một chuỗi có phải mã kết nối 4 chữ số không.
 * Mục tiêu: phân biệt người dùng gõ mã kết nối (ví dụ "1234") hay gõ địa chỉ máy.
 * Chức năng: bỏ khoảng trắng hai đầu rồi xem có đúng 4 chữ số không.
 * Đầu ra: true nếu là mã 4 số, false nếu không.
 * Dùng ở đâu: features/candidate/hooks/use-hub-discovery.ts (qua services/exam-sync.ts).
 * Liên kết với: mã kết nối 4 số mà desktop-hub/ hô kèm trên mạng LAN.
 */
export function isConnectCode(value: string) {
  return /^\d{4}$/.test(value.trim());
}

/**
 * Đây là gì: hàm rút gọn tên phòng thành một "chìa khóa" để so sánh.
 * Mục tiêu: "Phòng thi 01" (giám thị đặt trong cài đặt) và "PHONG-01" (thí sinh gõ ở
 *   biểu mẫu) phải được coi là cùng một phòng.
 * Chức năng: bỏ dấu tiếng Việt, đổi "đ" thành "d", viết hoa, bỏ mọi ký tự không phải chữ
 *   hoặc số, rồi bỏ chữ "THI" đầu tiên.
 * Đầu ra: chuỗi chìa khóa, ví dụ "PHONG01".
 * Dùng ở đâu: sameRoom() ngay bên dưới; được kiểm thử trong
 *   web/tests/unit/hub-discovery.test.cjs.
 * Liên kết với: sameRoom().
 */
export function roomKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace('THI', '');
}

/**
 * Đây là gì: hàm xem phòng của máy giám thị và phòng thí sinh nhập có trùng nhau không.
 * Mục tiêu: đánh dấu máy giám thị đúng phòng để thí sinh chọn không nhầm.
 * Chức năng: so sánh chìa khóa phòng của hai bên; tên phòng rỗng thì coi là không trùng.
 * Đầu ra: true nếu cùng phòng, false nếu khác.
 * Dùng ở đâu: features/candidate/components/hub-connection-panel.tsx
 *   (qua services/exam-sync.ts).
 * Liên kết với: roomKey() ở trên.
 */
export function sameRoom(hubRoom: string, candidateRoom: string) {
  const key = roomKey(hubRoom);
  return Boolean(key) && key === roomKey(candidateRoom);
}

/**
 * Đây là gì: hàm hỏi danh sách các máy giám thị đang có trên mạng LAN.
 * Mục tiêu: cho thí sinh chọn máy giám thị từ danh sách, hoặc tìm bằng mã kết nối.
 * Chức năng: hỏi hub của chính trang này (đường /api/discover) xem nó đã nghe thấy những
 *   máy giám thị nào hô trên mạng LAN (hô to cho mọi máy trong cùng mạng nghe thấy); nếu
 *   có mã kết nối thì chỉ lấy các máy có mã đó. Trả về null khi không dùng được cách dò
 *   tìm này (trang chạy trên máy chủ web thường, hoặc hub không bật nghe), khi đó trang
 *   quay về cách gõ địa chỉ bằng tay.
 * Đầu ra: việc cần chờ cho ra mảng máy giám thị tìm thấy (DiscoveredHub), hoặc null.
 * Dùng ở đâu: features/candidate/hooks/use-hub-discovery.ts (qua services/exam-sync.ts).
 * Liên kết với: đường /api/discover trong desktop-hub/examguard_desktop/http_handler.py;
 *   fetchWithTimeout() trong ./hub-transport.ts.
 */
export async function fetchDiscoveredHubs(code = ''): Promise<DiscoveredHub[] | null> {
  if (typeof window === 'undefined') return null;
  const url = new URL('/api/discover', window.location.origin);
  if (code) url.searchParams.set('code', code.trim());
  try {
    const response = await fetchWithTimeout(url.href);
    if (!response.ok) return null;
    const payload = await response.json() as { ok?: boolean; running?: boolean; hubs?: DiscoveredHub[] };
    return payload.ok && payload.running && Array.isArray(payload.hubs) ? payload.hubs : null;
  } catch {
    return null;
  }
}
