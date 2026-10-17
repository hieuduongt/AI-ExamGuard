// File này chứa các hàm tính toán cho trang giám thị: đánh dấu máy mất kết nối, lọc và
// tìm kiếm cảnh báo, đếm số máy theo từng trạng thái. Không vẽ giao diện.

import type { AlertSeverity, AlertType, ExamEvent, StationStatus } from '@/domain/exam-types';

// Các lựa chọn của bộ lọc cảnh báo: tất cả, theo mức độ (đỏ/vàng/thông tin), hoặc chưa xem.
export type FilterValue = 'all' | AlertSeverity | 'unreviewed';

/**
 * Đây là gì: hàm đánh dấu máy thí sinh bị mất kết nối.
 * Mục tiêu: cho giám thị biết máy nào đã ngừng gửi tin.
 * Chức năng: máy thí sinh gửi "nhịp tim" (tin báo còn sống) đều đặn; máy nào quá 7 giây không
 *   gửi thì bị coi là mất kết nối (offline). Ưu tiên giờ máy chủ nhận tin (serverSeenAt),
 *   nếu không có thì dùng giờ máy thí sinh gửi (lastSeen).
 * Đầu ra: danh sách máy mới; máy quá hạn có state là 'offline', các máy khác giữ nguyên.
 * Dùng ở đâu: ProctorScreen (proctor-screen.tsx), tính lại mỗi giây theo đồng hồ;
 *   kiểm thử trong web/tests/unit/proctor.test.cjs.
 * Liên kết với: nhịp gửi trạng thái 2 giây của máy thí sinh
 *   (web/src/features/candidate/hooks/use-monitoring-session.ts);
 *   kiểu StationStatus (web/src/domain/exam-types.ts).
 */
export function markOfflineStations(stations: StationStatus[], now: number) {
  return stations.map((station) => {
    const seenAt = station.serverSeenAt ?? station.lastSeen;
    return now - seenAt > 7000 ? { ...station, state: 'offline' as const } : station;
  });
}

/**
 * Đây là gì: hàm lọc và tìm kiếm cảnh báo.
 * Mục tiêu: giúp giám thị chỉ xem những cảnh báo mình quan tâm.
 * Chức năng: giữ cảnh báo khớp bộ lọc (tất cả / chưa xem / đúng mức độ) VÀ khớp từ khóa tìm
 *   kiếm trong phòng, số máy, số báo danh, họ tên hoặc tiêu đề (không phân biệt chữ hoa thường).
 * Đầu ra: danh sách cảnh báo đã lọc.
 * Dùng ở đâu: ProctorScreen (proctor-screen.tsx); kiểm thử trong web/tests/unit/proctor.test.cjs.
 * Liên kết với: các nút lọc và ô tìm kiếm trong components/event-feed.tsx.
 */
export function filterEvents(events: ExamEvent[], filter: FilterValue, queryText: string) {
  return events.filter((event) => {
    const matchesFilter = filter === 'all' || (filter === 'unreviewed' ? !event.reviewed : event.severity === filter);
    const normalized = queryText.trim().toLocaleLowerCase('vi');
    const matchesQuery = !normalized || `${event.roomId} ${event.stationId} ${event.candidateId} ${event.candidateName} ${event.title}`.toLocaleLowerCase('vi').includes(normalized);
    return matchesFilter && matchesQuery;
  });
}

/**
 * Đây là gì: hàm đếm số liệu tổng quan của phòng thi.
 * Mục tiêu: cho giám thị nhìn nhanh tình hình cả phòng.
 * Chức năng: đếm tổng số máy, số máy bình thường, cảnh báo vàng, ưu tiên kiểm tra (đỏ),
 *   số cảnh báo chưa xác minh, và số lần giám thị đã bấm "Báo nhầm".
 * Đầu ra: đối tượng { total, normal, warning, critical, unreviewed, falseAlarms }.
 * Dùng ở đâu: ProctorScreen (proctor-screen.tsx); kiểm thử trong web/tests/unit/proctor.test.cjs.
 * Liên kết với: components/stat-cards.tsx (hiện các con số này).
 */
export function countStations(activeStations: StationStatus[], events: ExamEvent[]) {
  return {
    total: activeStations.length,
    normal: activeStations.filter((station) => station.state === 'normal').length,
    warning: activeStations.filter((station) => station.state === 'warning').length,
    critical: activeStations.filter((station) => station.state === 'critical').length,
    unreviewed: events.filter((event) => !event.reviewed).length,
    falseAlarms: events.filter((event) => event.verdict === 'false_alarm').length,
  };
}

/**
 * Đây là gì: hàm đếm số lần báo nhầm theo từng loại cảnh báo.
 * Mục tiêu: biết loại nào hay báo nhầm nhất để chỉnh ngưỡng thời gian cho đúng chỗ.
 * Đầu ra: mảng { type, count } chỉ gồm các loại đã có ít nhất một lần báo nhầm, sắp giảm dần.
 */
export function countFalseAlarmsByType(events: ExamEvent[]) {
  const counts = new Map<AlertType, number>();
  for (const event of events) {
    if (event.verdict !== 'false_alarm') continue;
    counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}
