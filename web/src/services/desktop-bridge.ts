/**
 * File này là "cây cầu" giữa trang web và ứng dụng máy tính của giám thị (desktop-hub/).
 * Nó giúp mở màn hình giám thị: trong ứng dụng máy tính thì nhờ ứng dụng mở cửa sổ riêng,
 * còn trên trình duyệt thường thì mở một thẻ (tab) mới.
 */

/**
 * Kiểu dữ liệu mô tả cửa sổ trình duyệt khi trang chạy bên trong ứng dụng máy tính
 * (pywebview): khi đó có thêm lệnh open_proctor để mở cửa sổ giám thị.
 */
type DesktopWindow = Window & {
  pywebview?: { api?: { open_proctor: (hubUrl: string) => Promise<boolean> } };
};

/**
 * Đây là gì: hàm mở màn hình giám thị (/giam-thi).
 * Mục tiêu: cho người dùng bấm một nút là mở được màn hình theo dõi phòng thi.
 * Chức năng: nếu trang đang chạy trong ứng dụng máy tính thì nhờ ứng dụng mở cửa sổ
 *   giám thị; nếu không thì mở thẻ mới tên "examguard-proctor", kèm địa chỉ hub
 *   (máy trung tâm của giám thị, nơi mọi máy thí sinh gửi cảnh báo về) nếu có.
 * Đầu ra: việc cần chờ (Promise) trả về true nếu mở được, false nếu bị chặn.
 * Dùng ở đâu: thanh tiêu đề trang web (web/src/components/layout/examguard-header.tsx).
 * Liên kết với: hàm open_proctor trong desktop-hub/examguard_desktop/desktop_window.py.
 */
export async function openProctorWindow(hubUrl: string) {
  const desktop = (window as DesktopWindow).pywebview?.api;
  if (desktop?.open_proctor) return desktop.open_proctor(hubUrl);
  const url = new URL('/giam-thi', window.location.origin);
  if (hubUrl) url.searchParams.set('hub', hubUrl);
  return Boolean(window.open(url.href, 'examguard-proctor'));
}
