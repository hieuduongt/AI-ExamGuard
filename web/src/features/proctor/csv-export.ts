import type { AlertVerdict, ExamEvent } from '@/domain/exam-types';
export function verdictLabel(verdict?: AlertVerdict) {
    if (verdict === 'confirmed')
        return 'Xác nhận đúng';
    if (verdict === 'false_alarm')
        return 'Báo nhầm';
    return 'Chưa kết luận';
}
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
export function downloadEventsCsv(events: ExamEvent[]) {
    downloadCsv(buildEventsCsv(events), `AI-ExamGuard-${new Date().toISOString().slice(0, 10)}.csv`);
}
export function downloadConfirmedCsv(events: ExamEvent[]) {
    const reviewedWithVerdict = events.filter(
        (event) => event.verdict === 'confirmed' || event.verdict === 'false_alarm',
    );
    downloadCsv(buildEventsCsv(reviewedWithVerdict), `AI-ExamGuard-da-xac-nhan-${new Date().toISOString().slice(0, 10)}.csv`);
}
