/**
 * File này là các dòng thông báo phía trên camera trong lúc thi (hướng dẫn, số cảnh báo đang
 * chờ gửi, lỗi). Thuộc phần giao diện thí sinh (web/src/features/candidate/components/).
 */

// Props: có đang giám sát không, số cảnh báo còn chờ gửi, lời báo lỗi.
type Props = { running: boolean; pendingCount: number; errorMessage: string };

/**
 * Đây là gì: React component khối thông báo trong phiên thi.
 * Mục tiêu: nhắc thí sinh giữ ứng dụng mở và cho biết cảnh báo đã tới giám thị chưa.
 * Chức năng: chỉ hiện khi đang giám sát, phía trên camera: hướng dẫn mở trang Giám thị để
 *   thử trên cùng máy; báo số cảnh báo đang chờ gửi lại (hoặc giải thích dòng "Giám thị đã
 *   nhận"); nếu có lỗi thì hiện thêm ô báo lỗi màu đỏ.
 * Đầu ra: khối thông báo, hoặc không có gì khi chưa giám sát.
 * Dùng ở đâu: candidate-screen.tsx, ngay dưới tiêu đề.
 * Liên kết với: pendingCount từ hooks/use-delivery-status.ts; errorMessage từ
 *   hooks/use-monitoring-session.ts.
 */
export function SessionNotices({ running, pendingCount, errorMessage }: Props) {
  return (
    <>
      {running && <div className="mb-5 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p>Để kiểm tra trên cùng máy, bấm <b>Mở Giám thị ↗</b> ở phía trên. Webcam sẽ tiếp tục chạy ở cửa sổ này.</p>
        <p>{pendingCount > 0 ? `${pendingCount} cảnh báo đang chờ gửi lại. Hãy giữ ứng dụng mở.` : 'Cảnh báo sẽ ghi “Giám thị đã nhận” sau khi máy giám thị xác nhận.'}</p>
      </div>}
      {running && errorMessage && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{errorMessage}</p>}
    </>
  );
}
