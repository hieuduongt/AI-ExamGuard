/**
 * Đây là gì: file cấu hình Next.js, bộ khung dùng để xây trang web AI ExamGuard.
 * Mục tiêu: xuất trang web thành các file tĩnh (HTML, CSS, JS) để chạy được mà không cần
 *   máy chủ Node.js, kể cả khi không có Internet.
 * Chức năng: bật chế độ xuất tĩnh và tắt bộ tối ưu ảnh (bộ này cần máy chủ mới chạy được).
 * Đầu ra: một đối tượng cấu hình được xuất ra cho Next.js đọc.
 * Dùng ở đâu: Next.js tự đọc file này khi chạy "npm run dev" hoặc "npm run build" trong web/.
 * Liên kết với: thư mục web/out (kết quả build) được chương trình hub trên máy giám thị
 *   phục vụ lại cho các máy trong phòng (desktop-hub/examguard_desktop/http_handler.py).
 */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Xuất toàn bộ trang web thành file tĩnh vào thư mục out/.
  output: 'export',
  // Cấu hình về ảnh.
  images: {
    // Dùng ảnh nguyên bản, không tối ưu, vì chế độ xuất tĩnh không có máy chủ để tối ưu ảnh.
    unoptimized: true,
  },
};

export default nextConfig;
