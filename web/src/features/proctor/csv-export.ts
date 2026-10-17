// File này tạo và tải về báo cáo cảnh báo dạng CSV (bảng chữ mở được bằng Excel)
// từ trang giám thị. Có báo cáo đầy đủ và biên bản chỉ gồm cảnh báo đã xác nhận đúng.

import type { AlertVerdict, ExamEvent } from '@/domain/exam-types';

/** Chữ tiếng Việt cho kết luận của giám thị. */
export function verdictLabel(verdict?: AlertVerdict) {
  if (verdict === 'confirmed') return 'Xác nhận đúng';
  if (verdict === 'false_alarm') return 'Báo nhầm';
  return 'Chưa kết luận';
}

/**
 * Đây là gì: hàm tạo nội dung báo cáo CSV.
 * Mục tiêu: biến danh sách cảnh báo thành một bảng để lưu trữ hoặc in.
 * Chức năng: dòng đầu là tên cột; mỗi cảnh báo thành một dòng; mọi ô được đặt trong ngoặc kép.
 *   Đầu file có ký tự đánh dấu UTF-8 (BOM) để Excel mở tiếng Việt không bị lỗi chữ.
 * Đầu ra: một chuỗi chữ CSV.
 * Dùng ở đâu: downloadEventsCsv, downloadConfirmedCsv; kiểm thử trong web/tests/unit/proctor.test.cjs.
 */
export function buildEventsCsv(events: ExamEvent[]) {
  const rows = [
    ['Thời gian', 'Phòng', 'Máy', 'Số báo danh', 'Thí sinh', 'Mức độ', 'Sự kiện', 'Chi tiết', 'Đã xem', 'Kết luận'],
    ...events.map((event) => [
      new Date(event.timestamp).toLocaleString('vi-VN'),
      event.roomId,
      event.stationId,
      event.candidateId,
      event.candidateName,
      event.severity,
      event.title,
      event.detail,
      event.reviewed ? 'Có' : 'Chưa',
      verdictLabel(event.verdict),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')}`;
}

function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Đây là gì: hàm tải báo cáo CSV đầy đủ về máy.
 * Mục tiêu: cho giám thị bấm một nút là có file báo cáo mọi cảnh báo.
 */
export function downloadEventsCsv(events: ExamEvent[]) {
  downloadCsv(buildEventsCsv(events), `AI-ExamGuard-${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Đây là gì: hàm tải biên bản chỉ gồm cảnh báo giám thị đã "Xác nhận đúng".
 * Mục tiêu: sau buổi thi có bản tổng kết không lẫn báo nhầm và cảnh báo chưa kiểm tra.
 */
export function downloadConfirmedCsv(events: ExamEvent[]) {
  const confirmed = events.filter((event) => event.verdict === 'confirmed');
  downloadCsv(buildEventsCsv(confirmed), `AI-ExamGuard-da-xac-nhan-${new Date().toISOString().slice(0, 10)}.csv`);
}
