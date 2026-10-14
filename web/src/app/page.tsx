/**
 * File này là "cửa vào" của trang chủ (địa chỉ "/") trong trang web Next.js.
 * Next.js tự biến mỗi file page.tsx trong thư mục app/ thành một trang; tên thư mục là đường dẫn.
 * Nội dung thật của trang chủ nằm ở web/src/features/home/.
 */
import { HomeScreen } from '@/features/home/home-screen';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   của trang chủ "/".
 * Mục tiêu: giới thiệu sản phẩm và dẫn người dùng tới khu thí sinh, giám thị.
 * Chức năng: chỉ đặt khối HomeScreen vào trang, không tự làm gì thêm.
 * Đầu ra: giao diện trang chủ.
 * Dùng ở đâu: Next.js tự gọi khi ai đó mở địa chỉ "/".
 * Liên kết với: HomeScreen (web/src/features/home/home-screen.tsx), RootLayout (app/layout.tsx).
 */
export default function Home() {
  return <HomeScreen />;
}
