/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Đây là gì: file kiểm thử đơn vị (thử từng phần nhỏ) cho bộ máy chấm hành vi của thí sinh.
 * Mục tiêu: bảo đảm cảnh báo chỉ được phát khi hành vi kéo dài đủ lâu (ví dụ quay đầu 3 giây),
 *   không phát nhầm vì một khung hình nhiễu hay một cái liếc nhanh.
 * Chức năng: đưa vào bộ máy từng "khung hình" số liệu giả (hướng đầu, hướng mắt, số khuôn mặt)
 *   theo thời gian, rồi xem bộ máy có phát cảnh báo đúng lúc không.
 * Đầu ra: kết quả đạt/không đạt của từng ca kiểm thử, in ra màn hình.
 * Dùng ở đâu: chạy bằng lệnh `npm test` trong thư mục web (chạy mọi file tests/unit/*.test.cjs).
 * Liên kết với: web/src/domain/behavior-engine.ts, web/src/domain/thresholds.ts,
 *   web/tests/helpers/load-source.cjs.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');
const { BehaviorEngine } = loadSource('src/domain/behavior-engine.ts');
const { DEFAULT_THRESHOLDS } = loadSource('src/domain/thresholds.ts');
// Số liệu "bình thường": một khuôn mặt, nhìn thẳng vào màn hình, 12 khung hình mỗi giây.
const neutral = { faceCount: 1, headYaw: 0, headPitch: 0, gazeX: 0, gazeY: 0, fps: 12 };
/**
 * Đây là gì: hàm đưa một khung hình số liệu vào bộ máy chấm hành vi.
 * Mục tiêu: viết ca kiểm thử ngắn gọn, chỉ cần ghi phần số liệu khác với mức bình thường.
 * Chức năng: ghép số liệu bình thường (neutral) với phần thay đổi (overrides), rồi gọi
 *   engine.update tại thời điểm time (tính bằng mili giây) với ngưỡng mặc định.
 * Đầu ra: kết quả của engine.update (gồm danh sách cảnh báo vừa phát "triggered" và tiến độ
 *   đếm giờ "progress").
 * Dùng ở đâu: mọi ca kiểm thử trong file này.
 * Liên kết với: BehaviorEngine.update trong web/src/domain/behavior-engine.ts, DEFAULT_THRESHOLDS.
 */
function sample(engine, time, overrides = {}) {
  return engine.update({ ...neutral, ...overrides }, time, DEFAULT_THRESHOLDS);
}

// Quay đầu sang trái hoặc phải liên tục đủ 3 giây thì phải phát cảnh báo quay đầu (head_turn).
test('sustained left and right turns produce head_turn after 3 observed seconds', () => {
  for (const yaw of [-17.9, 18.4]) {
    const engine = new BehaviorEngine();
    for (let t = 0; t < 3000; t += 100) assert.equal(sample(engine, t, { headYaw: yaw }).triggered.length, 0);
    assert.ok(sample(engine, 3000, { headYaw: yaw }).triggered.some((item) => item.type === 'head_turn'));
  }
});

// Mỗi giây có một khung hình nhiễu cũng không được xóa mất việc đếm giờ quay đầu đang kéo dài.
test('one noisy frame per second does not erase a sustained turn', () => {
  const engine = new BehaviorEngine();
  let detected = false;
  for (let t = 0; t <= 4500; t += 100) {
    const result = sample(engine, t, { headYaw: t % 1000 === 500 ? 13.7 : 18.4 });
    detected ||= result.triggered.some((item) => item.type === 'head_turn');
  }
  assert.equal(detected, true);
});

// Liếc nhanh rồi nhìn thẳng lại thì thời gian liếc không bị cộng dồn vào lần vi phạm sau.
test('brief glance followed by looking forward is not accumulated into a later violation', () => {
  const engine = new BehaviorEngine();
  for (let t = 0; t <= 5000; t += 100) {
    const headYaw = t < 1800 || t > 3000 ? 18.4 : 0;
    assert.equal(sample(engine, t, { headYaw }).triggered.length, 0);
  }
});

// Video bị đứng hay tạm dừng thì khoảng thời gian không quan sát được không được tính vào giờ đếm.
test('a frozen or paused stream cannot supply unobserved seconds', () => {
  const engine = new BehaviorEngine();
  sample(engine, 0, { headYaw: 18.4 });
  sample(engine, 1000, { headYaw: 18.4 });
  const resumed = sample(engine, 12000, { headYaw: 18.4 });
  assert.equal(resumed.triggered.length, 0);
  assert.equal(resumed.progress[0].elapsedSeconds, 0);
});

// Không có khuôn mặt thì chỉ phát cảnh báo "không có mặt" (no_face), không phát cảnh báo đầu/mắt.
test('no face generates no_face, never an unrelated head or eye event', () => {
  const engine = new BehaviorEngine();
  let result;
  for (let t = 0; t <= 5000; t += 100) result = sample(engine, t, { faceCount: 0, headYaw: 35, gazeX: 1 });
  assert.deepEqual(Array.from(result.triggered, (item) => item.type), ['no_face']);
});

// Bắt đầu phiên mới (reset) thì mọi bộ đếm giờ của phiên trước phải về 0.
test('a fresh session clears previous frame timers', () => {
  const engine = new BehaviorEngine();
  for (let t = 0; t <= 2500; t += 100) sample(engine, t, { headYaw: 18.4 });
  engine.reset();
  assert.equal(sample(engine, 3000, { headYaw: 18.4 }).progress[0].elapsedSeconds, 0);
});
