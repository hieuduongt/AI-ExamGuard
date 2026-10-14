/**
 * File này chứa các hàm tiện ích nhỏ dùng chung cho phần giao diện của trang web.
 * Hiện có một hàm cn() để ghép các "lớp trang trí" (class CSS của Tailwind) cho gọn.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Đây là gì: hàm ghép tên các lớp trang trí (class CSS) thành một chuỗi duy nhất.
 * Mục tiêu: giúp viết giao diện gọn hơn, tránh hai lớp trang trí đá nhau
 *   (ví dụ vừa "chữ đỏ" vừa "chữ xanh").
 * Chức năng: nhận nhiều tên lớp (có thể kèm điều kiện bật/tắt), bỏ những cái bị tắt,
 *   rồi gộp lại; nếu hai lớp Tailwind cùng chỉnh một thứ thì giữ lớp đứng sau.
 * Đầu ra: một chuỗi tên lớp, ví dụ "rounded-xl bg-blue-600".
 * Dùng ở đâu: các viên gạch giao diện cơ bản trong web/src/components/ui/
 *   (button.tsx, badge.tsx, card.tsx, input.tsx, progress.tsx, switch.tsx).
 * Liên kết với: thư viện clsx (bỏ lớp bị tắt) và tailwind-merge (xử lý lớp trùng).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
