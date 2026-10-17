/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Đây là gì: file kiểm thử đơn vị cho các luật nghiệp vụ cơ bản của AI ExamGuard.
 * Mục tiêu: giữ đúng các ngưỡng mặc định (bao nhiêu giây thì cảnh báo), cách đọc ngưỡng đã lưu,
 *   cách tô màu máy thí sinh và mức độ nghiêm trọng của từng loại cảnh báo.
 * Chức năng: gọi các hàm thật với dữ liệu mẫu rồi so với kết quả mong đợi.
 * Đầu ra: kết quả đạt/không đạt của từng ca kiểm thử.
 * Dùng ở đâu: chạy bằng lệnh `npm test` trong thư mục web.
 * Liên kết với: web/src/domain/thresholds.ts, web/src/domain/station-health.ts,
 *   web/src/domain/alert-catalog.ts.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');
const { DEFAULT_THRESHOLDS, VISION_LIMITS, normalizeThresholds, parseSavedThresholds } = loadSource('src/domain/thresholds.ts');
const { classifyMetrics } = loadSource('src/domain/station-health.ts');
const { ALERT_LABELS, alertSeverity } = loadSource('src/domain/alert-catalog.ts');

// Số liệu "bình thường": một khuôn mặt, nhìn thẳng vào màn hình.
const neutral = { faceCount: 1, headYaw: 0, headPitch: 0, gazeX: 0, gazeY: 0, fps: 12 };

// Ngưỡng thời gian mặc định và giới hạn góc/hướng mắt cho mỗi khung hình không bị đổi.
test('default thresholds and per-frame limits are unchanged', () => {
  assert.deepEqual({ ...DEFAULT_THRESHOLDS }, { noFaceSeconds: 5, multipleFacesSeconds: 2, headTurnSeconds: 3, headPoseSeconds: 6, gazeAwaySeconds: 5, cooldownSeconds: 12 });
  assert.deepEqual({ ...VISION_LIMITS }, { headYaw: 14, headPitch: 20, gazeX: 0.55, gazeY: 0.7 });
});

// Ngưỡng đã lưu chỉ nhận số hợp lệ từ 1 đến 60 giây; dữ liệu hỏng thì dùng ngưỡng mặc định.
test('saved thresholds accept only finite numbers between 1 and 60 seconds', () => {
  assert.deepEqual({ ...parseSavedThresholds(null) }, { ...DEFAULT_THRESHOLDS });
  assert.deepEqual({ ...parseSavedThresholds('not json') }, { ...DEFAULT_THRESHOLDS });
  assert.deepEqual({ ...parseSavedThresholds('null') }, { ...DEFAULT_THRESHOLDS });
  const parsed = parseSavedThresholds(JSON.stringify({ thresholds: { noFaceSeconds: 8, headTurnSeconds: 0, gazeAwaySeconds: 61, cooldownSeconds: '9' } }));
  assert.deepEqual({ ...parsed }, { ...DEFAULT_THRESHOLDS, noFaceSeconds: 8 });
  assert.deepEqual(
    { ...normalizeThresholds({ multipleFacesSeconds: 5, headTurnSeconds: 99 }) },
    { ...DEFAULT_THRESHOLDS, multipleFacesSeconds: 5 },
  );
});

// Màu máy thí sinh: xét số khuôn mặt trước, rồi đến góc đầu hay hướng mắt vượt giới hạn.
test('station colour: face count first, then any angle or gaze over its limit', () => {
  assert.equal(classifyMetrics(neutral), 'normal');
  assert.equal(classifyMetrics({ ...neutral, faceCount: 0 }), 'critical');
  assert.equal(classifyMetrics({ ...neutral, faceCount: 2, headYaw: 40 }), 'critical');
  assert.equal(classifyMetrics({ ...neutral, headYaw: -14.1 }), 'warning');
  assert.equal(classifyMetrics({ ...neutral, headYaw: 14 }), 'normal');
  assert.equal(classifyMetrics({ ...neutral, headPitch: 20.1 }), 'warning');
  assert.equal(classifyMetrics({ ...neutral, gazeX: 0.56 }), 'warning');
  assert.equal(classifyMetrics({ ...neutral, gazeY: -0.71 }), 'warning');
});

// Chỉ "không có mặt" và "nhiều khuôn mặt" là cảnh báo nghiêm trọng; còn lại là nhắc nhở.
test('only missing or extra faces are critical alerts', () => {
  for (const type of Object.keys(ALERT_LABELS)) {
    assert.equal(alertSeverity(type), type === 'no_face' || type === 'multiple_faces' ? 'critical' : 'warning');
  }
});
