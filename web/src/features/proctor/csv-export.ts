// File này tạo và tải về báo cáo cảnh báo dạng CSV (bảng chữ mở được bằng Excel)
// từ trang giám thị.

import type { ExamEvent } from '@/domain/exam-types';

/**
 * Đây là gì: hàm tạo nội dung báo cáo CSV.
 * Mục tiêu: biến danh sách cảnh báo thành một bảng để lưu trữ hoặc in.
 * Chức năng: dòng đầu là tên cột (thời gian, phòng, máy, số báo danh, thí sinh, mức độ, sự kiện,
 *   chi tiết, đã xem); mỗi cảnh báo thành một dòng; mọi ô được đặt trong ngoặc kép và dấu
 *   ngoặc kép bên trong được nhân đôi. Đầu file có ký tự đánh dấu UTF-8 (BOM) để Excel mở
 *   tiếng Việt không bị lỗi chữ.
 * Đầu ra: một chuỗi chữ CSV.
 * Dùng ở đâu: downloadEventsCsv ngay bên dưới; được kiểm thử trong web/tests/unit/proctor.test.cjs.
 * Liên kết với: kiểu ExamEvent (web/src/domain/exam-types.ts).
 */
export function buildEventsCsv(events: ExamEvent[]) {
  const rows = [
    ['Thời gian', 'Phòng', 'Máy', 'Số báo danh', 'Thí sinh', 'Mức độ', 'Sự kiện', 'Chi tiết', 'Đã xem'],
    ...events.map((event) => [new Date(event.timestamp).toLocaleString('vi-VN'), event.roomId, event.stationId, event.candidateId, event.candidateName, event.severity, event.title, event.detail, event.reviewed ? 'Có' : 'Chưa']),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')}`;
  return csv;
}

/**
 * Đây là gì: hàm tải báo cáo CSV về máy.
 * Mục tiêu: cho giám thị bấm một nút là có file báo cáo.
 * Chức năng: tạo nội dung bằng buildEventsCsv, đóng gói thành file tạm trong trình duyệt,
 *   giả lập bấm link tải xuống, rồi xóa file tạm.
 * Đầu ra: không trả về gì; trình duyệt tải về file AI-ExamGuard-<năm-tháng-ngày>.csv.
 * Dùng ở đâu: exportCsv trong proctor-screen.tsx (nút "Xuất báo cáo").
 * Liên kết với: buildEventsCsv ở trên.
 */
export function downloadEventsCsv(events: ExamEvent[]) {
  const csv = buildEventsCsv(events);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `AI-ExamGuard-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
