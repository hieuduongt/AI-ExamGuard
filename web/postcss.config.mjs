/**
 * Đây là gì: file cấu hình PostCSS, công cụ "biên dịch" các file trang trí (CSS) của trang web.
 * Mục tiêu: để các lớp trang trí viết tắt của Tailwind (ví dụ "rounded-xl", "bg-blue-600")
 *   được đổi thành CSS thật mà trình duyệt hiểu.
 * Chức năng: bật đúng một phần bổ sung (plugin) là Tailwind CSS.
 * Đầu ra: một đối tượng cấu hình được xuất ra cho Next.js đọc.
 * Dùng ở đâu: Next.js tự đọc file này khi chạy "npm run dev" hoặc "npm run build" trong web/.
 * Liên kết với: web/src/app/globals.css (file CSS chính, nơi nạp Tailwind).
 */
const postcssConfig = {
  // Danh sách phần bổ sung PostCSS sẽ chạy.
  plugins: {
    // Phần bổ sung của Tailwind CSS: biến lớp viết tắt thành CSS thật; {} là không cần tùy chọn.
    '@tailwindcss/postcss': {},
  },
};

export default postcssConfig;
