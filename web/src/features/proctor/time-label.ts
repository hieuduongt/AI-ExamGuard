// File này đổi một mốc thời gian thành câu dễ đọc như "vừa xong", "5 phút trước"
// để hiện trong luồng cảnh báo của trang giám thị.

/**
 * Đây là gì: hàm viết thời gian theo kiểu "bao lâu trước".
 * Mục tiêu: giúp giám thị biết nhanh cảnh báo mới hay cũ.
 * Chức năng: dưới 10 giây ghi "vừa xong"; dưới 1 phút ghi "N giây trước"; dưới 1 giờ ghi
 *   "N phút trước"; lâu hơn thì ghi giờ:phút theo kiểu Việt Nam.
 * Đầu ra: một chuỗi chữ, ví dụ "12 giây trước" hoặc "14:05".
 * Dùng ở đâu: components/event-feed.tsx.
 * Liên kết với: trường timestamp (mốc thời gian, tính bằng mili giây) của ExamEvent
 *   (web/src/domain/exam-types.ts).
 */
export function timeLabel(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 10) return 'vừa xong';
  if (seconds < 60) return `${seconds} giây trước`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
