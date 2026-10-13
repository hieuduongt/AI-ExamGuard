import type { StationStatus, VisionMetrics } from '@/domain/exam-types';

const zeroMetrics: VisionMetrics = { faceCount: 1, gazeX: 0, gazeY: 0, headYaw: 0, headPitch: 0, fps: 28 };

// Sample room used only for the proctor's "Tạo cảnh báo thử" button when no
// real station is connected.
export function demoStations(): StationStatus[] {
  const warning = new Set(['PC-07', 'PC-12']);
  return Array.from({ length: 15 }, (_, index) => {
    const stationId = `PC-${String(index + 1).padStart(2, '0')}`;
    return {
      stationId,
      roomId: 'PHONG-01',
      candidateId: `SBD${String(index + 1).padStart(3, '0')}`,
      candidateName: `Thí sinh ${String(index + 1).padStart(2, '0')}`,
      state: stationId === 'PC-03' ? 'critical' : warning.has(stationId) ? 'warning' : 'normal',
      lastSeen: Date.now() - index * 950,
      metrics: stationId === 'PC-03' ? { ...zeroMetrics, faceCount: 0 } : zeroMetrics,
      alertCount: stationId === 'PC-03' ? 3 : warning.has(stationId) ? 1 : 0,
    };
  });
}
