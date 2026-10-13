import type { ExamEvent } from '@/domain/exam-types';

// UTF-8 BOM so Excel opens Vietnamese text correctly.
export function buildEventsCsv(events: ExamEvent[]) {
  const rows = [
    ['Thời gian', 'Phòng', 'Máy', 'Số báo danh', 'Thí sinh', 'Mức độ', 'Sự kiện', 'Chi tiết', 'Đã xem'],
    ...events.map((event) => [new Date(event.timestamp).toLocaleString('vi-VN'), event.roomId, event.stationId, event.candidateId, event.candidateName, event.severity, event.title, event.detail, event.reviewed ? 'Có' : 'Chưa']),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')}`;
  return csv;
}

export function downloadEventsCsv(events: ExamEvent[]) {
  const csv = buildEventsCsv(events);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `AI-ExamGuard-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
