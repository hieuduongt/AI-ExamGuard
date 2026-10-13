/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');
const { DEFAULT_THRESHOLDS, VISION_LIMITS, parseSavedThresholds } = loadSource('src/domain/thresholds.ts');
const { classifyMetrics } = loadSource('src/domain/station-health.ts');
const { ALERT_LABELS, alertSeverity } = loadSource('src/domain/alert-catalog.ts');

const neutral = { faceCount: 1, headYaw: 0, headPitch: 0, gazeX: 0, gazeY: 0, fps: 12 };

test('default thresholds and per-frame limits are unchanged', () => {
  assert.deepEqual({ ...DEFAULT_THRESHOLDS }, { noFaceSeconds: 5, multipleFacesSeconds: 2, headTurnSeconds: 3, gazeAwaySeconds: 5, cooldownSeconds: 12 });
  assert.deepEqual({ ...VISION_LIMITS }, { headYaw: 14, headPitch: 20, gazeX: 0.55, gazeY: 0.7 });
});

test('saved thresholds accept only finite numbers between 1 and 60 seconds', () => {
  assert.deepEqual({ ...parseSavedThresholds(null) }, { ...DEFAULT_THRESHOLDS });
  assert.deepEqual({ ...parseSavedThresholds('not json') }, { ...DEFAULT_THRESHOLDS });
  assert.deepEqual({ ...parseSavedThresholds('null') }, { ...DEFAULT_THRESHOLDS });
  const parsed = parseSavedThresholds(JSON.stringify({ thresholds: { noFaceSeconds: 8, headTurnSeconds: 0, gazeAwaySeconds: 61, cooldownSeconds: '9' } }));
  assert.deepEqual({ ...parsed }, { ...DEFAULT_THRESHOLDS, noFaceSeconds: 8 });
});

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

test('only missing or extra faces are critical alerts', () => {
  for (const type of Object.keys(ALERT_LABELS)) {
    assert.equal(alertSeverity(type), type === 'no_face' || type === 'multiple_faces' ? 'critical' : 'warning');
  }
});
