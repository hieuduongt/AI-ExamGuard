/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Đây là gì: file kiểm thử đơn vị cho các phần logic của màn hình giám thị.
 * Mục tiêu: bảo đảm giám thị lọc cảnh báo đúng (theo mức độ, chưa xem, tìm chữ tiếng Việt), máy im
 *   lặng quá 7 giây được coi là mất kết nối, và file CSV (bảng tính) xuất ra mở được bằng Excel.
 * Chức năng: tạo cảnh báo và máy thí sinh mẫu, gọi các hàm thật rồi so kết quả.
 * Đầu ra: kết quả đạt/không đạt của từng ca kiểm thử.
 * Dùng ở đâu: chạy bằng lệnh `npm test` trong thư mục web.
 * Liên kết với: web/src/features/proctor/event-filters.ts, web/src/features/proctor/csv-export.ts.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');
const { filterEvents, countStations, markOfflineStations } = loadSource('src/features/proctor/event-filters.ts');
const { buildEventsCsv } = loadSource('src/features/proctor/csv-export.ts');

/**
 * Đây là gì: hàm tạo một cảnh báo mẫu.
 * Mục tiêu: có nhanh một cảnh báo đủ trường, chỉ cần ghi phần muốn khác đi.
 * Chức năng: tạo cảnh báo "không có mặt" của thí sinh Nguyễn Văn A (phòng PHONG-01, máy PC-01),
 *   rồi đè lên bằng các trường trong overrides.
 * Đầu ra: một đối tượng cảnh báo (ExamEvent).
 * Dùng ở đâu: các ca kiểm thử trong file này.
 * Liên kết với: kiểu ExamEvent trong web/src/domain/exam-types.ts.
 */
const event = (overrides) => ({ id: 'e', roomId: 'PHONG-01', stationId: 'PC-01', candidateId: 'SBD001', candidateName: 'Nguyễn Văn A',
  type: 'no_face', severity: 'critical', title: 'Không có mặt trước máy', detail: 'd', timestamp: 0, reviewed: false, source: 'ai', ...overrides });
/**
 * Đây là gì: hàm tạo trạng thái mẫu của một máy thí sinh.
 * Mục tiêu: có nhanh một máy thí sinh đủ trường, chỉ cần ghi phần muốn khác đi.
 * Chức năng: tạo máy PC-01 ở phòng PHONG-01, trạng thái "normal" (bình thường), rồi đè lên bằng
 *   các trường trong overrides (ví dụ lastSeen: lần cuối máy báo về).
 * Đầu ra: một đối tượng trạng thái máy (StationStatus).
 * Dùng ở đâu: ca kiểm thử về máy mất kết nối trong file này.
 * Liên kết với: kiểu StationStatus trong web/src/domain/exam-types.ts.
 */
const station = (overrides) => ({ roomId: 'PHONG-01', stationId: 'PC-01', candidateId: 'S', candidateName: 'A', state: 'normal', lastSeen: 0, metrics: {}, alertCount: 0, ...overrides });

// Danh sách cảnh báo lọc được theo mức độ, theo "chưa xem" và theo chữ tiếng Việt gõ tự do.
test('feed filters by severity, unreviewed and Vietnamese free text', () => {
  const events = [
    event({ id: 'a' }),
    event({ id: 'b', severity: 'warning', reviewed: true, candidateName: 'Trần Thị Bình', stationId: 'PC-02' }),
  ];
  const ids = (filter, query = '') => filterEvents(events, filter, query).map((item) => item.id);
  assert.deepEqual(ids('all'), ['a', 'b']);
  assert.deepEqual(ids('critical'), ['a']);
  assert.deepEqual(ids('warning'), ['b']);
  assert.deepEqual(ids('unreviewed'), ['a']);
  assert.deepEqual(ids('all', '  BÌNH '), ['b']);
  assert.deepEqual(ids('all', 'pc-01'), ['a']);
});

// Máy im lặng quá 7 giây hiện là mất kết nối (offline), rồi mới đếm số máy theo trạng thái.
test('stations silent for more than 7 seconds are shown offline, then counted', () => {
  const stations = [
    station({ stationId: 'A', lastSeen: 1000 }),
    station({ stationId: 'B', lastSeen: 0, serverSeenAt: 3000, state: 'warning' }),
    station({ stationId: 'C', lastSeen: 2999, state: 'critical' }),
  ];
  const active = markOfflineStations(stations, 10000);
  assert.deepEqual(active.map((item) => item.state), ['offline', 'warning', 'offline']);
  assert.deepEqual({ ...countStations(active, [event({}), event({ reviewed: true })]) },
    { total: 3, normal: 0, warning: 1, critical: 0, unreviewed: 1 });
});

// File CSV có ký hiệu BOM (để Excel đọc đúng tiếng Việt), tiêu đề tiếng Việt, xử lý dấu ngoặc kép.
test('CSV export has a BOM, a Vietnamese header and escaped quotes', () => {
  const csv = buildEventsCsv([event({ detail: 'nói "xin chào"', reviewed: true })]);
  const [header, row] = csv.split('\n');
  assert.equal(header, '\uFEFF"Thời gian","Phòng","Máy","Số báo danh","Thí sinh","Mức độ","Sự kiện","Chi tiết","Đã xem"');
  assert.ok(row.endsWith('"PHONG-01","PC-01","SBD001","Nguyễn Văn A","critical","Không có mặt trước máy","nói ""xin chào""","Có"'));
});
