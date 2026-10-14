// File này tạo một cảnh báo giả để giám thị thử xem trang giám thị hoạt động ra sao,
// không cần thí sinh thật.

import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { demoStations, makeId } from '@/services/exam-sync';

/**
 * Đây là gì: hàm tạo một cảnh báo mẫu.
 * Mục tiêu: phục vụ nút "Tạo cảnh báo thử" để kiểm tra âm thanh, dải báo mới, bảng chi tiết.
 * Chức năng: chọn lần lượt từng máy đang có (nếu chưa có máy nào thì lấy máy mẫu đầu tiên);
 *   luân phiên giữa cảnh báo đỏ "nhiều khuôn mặt" và cảnh báo vàng "quay đầu".
 * Đầu ra: một cảnh báo (ExamEvent) mới, chưa xem, có nguồn là "demo".
 * Dùng ở đâu: addDemoAlert trong proctor-screen.tsx.
 * Liên kết với: demoStations, makeId (web/src/services/exam-sync.ts); publishEvent gửi
 *   cảnh báo này đi.
 */
export function buildDemoAlert(events: ExamEvent[], activeStations: StationStatus[]): ExamEvent {
  const index = events.length % Math.max(activeStations.length, 1);
  const station = activeStations[index] ?? demoStations()[0];
  const event: ExamEvent = {
    id: makeId('demo'), roomId: station.roomId, stationId: station.stationId, candidateId: station.candidateId, candidateName: station.candidateName,
    type: index % 2 ? 'head_turn' : 'multiple_faces', severity: index % 2 ? 'warning' : 'critical',
    title: index % 2 ? 'Quay đầu trái/phải kéo dài' : 'Xuất hiện nhiều khuôn mặt',
    detail: index % 2 ? 'Góc quay đầu ước tính 31°, duy trì 5,4 giây.' : 'Phát hiện 2 khuôn mặt trong khung hình trong 2,3 giây.',
    timestamp: Date.now(), reviewed: false, source: 'demo',
  };
  return event;
}
