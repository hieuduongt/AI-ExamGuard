/**
 * File này là "cửa vào" của màn hình thí sinh (địa chỉ "/thi-sinh") trong trang web Next.js.
 * Đây là màn hình chạy trên máy làm bài: bật camera, AI theo dõi và gửi cảnh báo cho giám thị.
 * Nội dung thật nằm ở web/src/features/candidate/.
 */
import { CandidateScreen } from '@/features/candidate/candidate-screen';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   của trang "/thi-sinh".
 * Mục tiêu: mở màn hình kiểm tra thiết bị và giám sát cho thí sinh.
 * Chức năng: chỉ đặt khối CandidateScreen vào trang, không tự làm gì thêm.
 * Đầu ra: giao diện màn hình thí sinh.
 * Dùng ở đâu: Next.js tự gọi khi mở "/thi-sinh" (từ nút ở trang chủ hoặc thanh tiêu đề).
 * Liên kết với: CandidateScreen (web/src/features/candidate/candidate-screen.tsx).
 */
export default function CandidatePage() {
  return <CandidateScreen />;
}
