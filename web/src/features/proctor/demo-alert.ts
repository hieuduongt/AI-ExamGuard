import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { demoStations, makeId } from '@/services/exam-sync';

// Sample alert for the "Tạo cảnh báo thử" button; alternates red and yellow.
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
