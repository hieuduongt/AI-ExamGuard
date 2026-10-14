/**
 * File này là "cửa vào" của màn hình quản trị (địa chỉ "/quan-tri") trong trang web Next.js.
 * Đây là nơi cài đặt ngưỡng cảnh báo, tên phòng thi và các tùy chọn riêng tư.
 * Nội dung thật nằm ở web/src/features/admin/.
 */
import { AdminScreen } from '@/features/admin/admin-screen';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   của trang "/quan-tri".
 * Mục tiêu: mở màn hình cài đặt cho người quản trị.
 * Chức năng: chỉ đặt khối AdminScreen vào trang, không tự làm gì thêm.
 * Đầu ra: giao diện màn hình quản trị.
 * Dùng ở đâu: Next.js tự gọi khi mở "/quan-tri" (nút bánh răng trên thanh tiêu đề
 *   web/src/components/layout/examguard-header.tsx).
 * Liên kết với: AdminScreen (web/src/features/admin/admin-screen.tsx).
 */
export default function AdminPage() {
  return <AdminScreen />;
}
