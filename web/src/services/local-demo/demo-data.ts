/**
 * File này tạo dữ liệu mẫu (giả) cho một phòng thi 15 máy, dùng để thử màn hình giám thị
 * khi chưa có máy thí sinh thật nào kết nối. Thuộc phần chạy thử cục bộ (local-demo).
 */
import type { StationStatus, VisionMetrics } from '@/domain/exam-types';

/** Số đo camera "bình thường" dùng cho máy mẫu: 1 khuôn mặt, nhìn thẳng, 28 khung hình/giây. */
const zeroMetrics: VisionMetrics = { faceCount: 1, gazeX: 0, gazeY: 0, headYaw: 0, headPitch: 0, fps: 28 };

/**
 * Đây là gì: hàm tạo danh sách 15 máy thí sinh mẫu (PC-01 đến PC-15) của phòng PHONG-01.
 * Mục tiêu: phòng mẫu chỉ dùng cho nút "Tạo cảnh báo thử" của giám thị khi chưa có máy
 *   thí sinh thật nào kết nối.
 * Chức năng: tạo từng máy với số báo danh, tên thí sinh, thời điểm thấy gần nhất; PC-03
 *   ở mức nguy hiểm (không thấy mặt, 3 cảnh báo), PC-07 và PC-12 ở mức cảnh báo, còn lại
 *   bình thường.
 * Đầu ra: mảng 15 trạng thái máy thí sinh (StationStatus).
 * Dùng ở đâu: web/src/features/proctor/demo-alert.ts (qua services/exam-sync.ts).
 * Liên kết với: kiểu StationStatus, VisionMetrics trong web/src/domain/exam-types.ts.
 */
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
