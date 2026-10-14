/**
 * File này quản lý địa chỉ của hub (máy trung tâm của giám thị, nơi mọi máy thí sinh gửi
 * cảnh báo về): chuẩn hóa địa chỉ người dùng gõ, lưu lại, và chọn ra địa chỉ đang dùng.
 */
import { hasFirebaseConfig } from '@/services/firebase/firebase-client';

/** Tên ngăn trong localStorage (bộ nhớ nhỏ của trình duyệt, tắt máy vẫn còn) lưu địa chỉ hub. */
const HUB_KEY = 'examguard:teacher-hub:v1';
// Phải khớp với shared/hub-contract.json (được kiểm tra trong tests/unit/contract.test.cjs).
/** Cổng mặc định của máy giám thị: 8765. */
export const DEFAULT_HUB_PORT = '8765';

/**
 * Đây là gì: hàm chuẩn hóa địa chỉ máy giám thị.
 * Mục tiêu: giúp người dùng gõ địa chỉ kiểu nào cũng được mà máy vẫn hiểu.
 * Chức năng: nhận "192.168.1.10", "192.168.1.10:8765" hoặc địa chỉ đầy đủ; bỏ dấu "/"
 *   thừa ở cuối; tự thêm "http://" và cổng 8765 nếu thiếu.
 * Đầu ra: địa chỉ chuẩn như "http://192.168.1.10:8765"; nếu gõ sai thì trả về chuỗi rỗng "".
 * Dùng ở đâu: các hàm trong file này, testHubConnection() trong ./hub-client.ts; được kiểm
 *   thử trong web/tests/unit/hub-url.test.cjs.
 * Liên kết với: DEFAULT_HUB_PORT ở trên (phải khớp shared/hub-contract.json).
 */
export function normalizeHubUrl(value: string) {
  const raw = value.trim().replace(/\/+$/, '');
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
    if (!url.port && url.protocol === 'http:') url.port = DEFAULT_HUB_PORT;
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

/**
 * Đây là gì: hàm đọc địa chỉ máy giám thị đã lưu.
 * Mục tiêu: lần sau mở trang không phải gõ lại địa chỉ.
 * Chức năng: lấy địa chỉ trong localStorage và chuẩn hóa; chạy ngoài trình duyệt thì trả "".
 * Đầu ra: địa chỉ đã lưu, hoặc "" nếu chưa có.
 * Dùng ở đâu: activeHubUrl() trong file này; features/candidate/hooks/use-hub-connection.ts,
 *   features/proctor/hooks/use-proctor-feed.ts, components/layout/examguard-header.tsx
 *   (qua services/exam-sync.ts).
 * Liên kết với: setConfiguredHubUrl() (nơi lưu địa chỉ).
 */
export function getConfiguredHubUrl() {
  if (typeof window === 'undefined') return '';
  return normalizeHubUrl(localStorage.getItem(HUB_KEY) ?? '');
}

/**
 * Đây là gì: hàm lưu địa chỉ máy giám thị.
 * Mục tiêu: nhớ máy giám thị mà người dùng đã chọn.
 * Chức năng: chuẩn hóa địa chỉ; nếu hợp lệ thì lưu vào localStorage, nếu rỗng hoặc sai
 *   thì xóa địa chỉ đã lưu.
 * Đầu ra: địa chỉ đã chuẩn hóa ("" nếu sai).
 * Dùng ở đâu: testHubConnection() trong ./hub-client.ts;
 *   features/proctor/hooks/use-proctor-feed.ts (qua services/exam-sync.ts).
 * Liên kết với: getConfiguredHubUrl(), normalizeHubUrl().
 */
export function setConfiguredHubUrl(value: string) {
  const normalized = normalizeHubUrl(value);
  if (typeof window !== 'undefined') {
    if (normalized) localStorage.setItem(HUB_KEY, normalized);
    else localStorage.removeItem(HUB_KEY);
  }
  return normalized;
}

/** Địa chỉ hub được "ghim" riêng cho thẻ (tab) trình duyệt này; "" là chưa ghim. */
let pageHubUrl = '';

/**
 * Đây là gì: hàm ghim một địa chỉ hub chỉ cho thẻ trình duyệt này.
 * Mục tiêu: chỉ áp dụng cho thẻ này và được ưu tiên hơn địa chỉ đã lưu: màn hình giám
 *   thị do một hub phục vụ thì luôn đọc dữ liệu của chính hub đó, kể cả khi địa chỉ đã
 *   lưu thuộc một mạng khác.
 * Chức năng: chuẩn hóa địa chỉ rồi ghi vào pageHubUrl (không lưu vào localStorage).
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: features/proctor/hooks/use-proctor-feed.ts (qua services/exam-sync.ts).
 * Liên kết với: activeHubUrl() đọc giá trị này trước tiên.
 */
export function setPageHubUrl(value: string) {
  pageHubUrl = normalizeHubUrl(value);
}

/**
 * Đây là gì: hàm chọn ra địa chỉ máy giám thị đang dùng.
 * Mục tiêu: mọi lần gửi/nhận dữ liệu qua LAN đều dùng chung một địa chỉ đúng.
 * Chức năng: thứ tự ưu tiên: hub được ghim cho thẻ này, rồi hub giám thị đã lưu, nếu
 *   không có thì dùng chính máy chủ đang phục vụ trang (ứng dụng máy tính) — trừ khi đã
 *   cấu hình Firebase (dịch vụ đám mây) thì trả "".
 * Đầu ra: địa chỉ hub, hoặc "" nếu không dùng hub.
 * Dùng ở đâu: postToHub() trong ./hub-transport.ts; services/exam-sync.ts.
 * Liên kết với: setPageHubUrl(), getConfiguredHubUrl(), hasFirebaseConfig trong
 *   services/firebase/firebase-client.ts.
 */
export function activeHubUrl() {
  if (typeof window === 'undefined') return '';
  if (pageHubUrl) return pageHubUrl;
  const configured = getConfiguredHubUrl();
  if (configured) return configured;
  return hasFirebaseConfig ? '' : window.location.origin;
}
