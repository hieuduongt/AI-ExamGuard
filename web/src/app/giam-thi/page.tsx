/**
 * File này là "cửa vào" của màn hình giám thị (địa chỉ "/giam-thi") trong trang web Next.js.
 * Đây là màn hình giám thị dùng để theo dõi cả phòng thi và xem cảnh báo từ máy thí sinh.
 * Nội dung thật nằm ở web/src/features/proctor/.
 */
import { ProctorScreen } from '@/features/proctor/proctor-screen';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   của trang "/giam-thi".
 * Mục tiêu: mở màn hình theo dõi phòng thi cho giám thị.
 * Chức năng: chỉ đặt khối ProctorScreen vào trang, không tự làm gì thêm.
 * Đầu ra: giao diện màn hình giám thị.
 * Dùng ở đâu: Next.js tự gọi khi mở "/giam-thi" (từ nút ở trang chủ, thanh tiêu đề,
 *   hoặc hàm openProctorWindow trong web/src/services/desktop-bridge.ts).
 * Liên kết với: ProctorScreen (web/src/features/proctor/proctor-screen.tsx).
 */
export default function ProctorPage() {
  return <ProctorScreen />;
}
