const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');
const { EMPTY_METRICS, calculateMetrics } = loadSource('src/ai/face-metrics.ts');
function face(overrides = {}) {
    const landmarks = [];
    const set = (index, x, y) => { landmarks[index] = { x, y, z: 0 }; };
    set(1, 0.5, 0.516);
    set(234, 0.4, 0.5);
    set(454, 0.6, 0.5);
    set(10, 0.5, 0.3);
    set(152, 0.5, 0.7);
    set(33, 0.42, 0.42);
    set(133, 0.48, 0.42);
    set(468, 0.45, 0.42);
    set(362, 0.52, 0.42);
    set(263, 0.58, 0.42);
    set(473, 0.55, 0.42);
    set(159, 0.45, 0.40);
    set(145, 0.45, 0.44);
    set(386, 0.55, 0.40);
    set(374, 0.55, 0.44);
    for (const [index, [x, y]] of Object.entries(overrides))
        set(Number(index), x, y);
    return landmarks;
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≉ ${expected}`);
test('no face keeps every metric at zero except fps', () => {
    assert.deepEqual({ ...calculateMetrics({ faceLandmarks: [] }, 17) }, { ...EMPTY_METRICS, fps: 17 });
});
test('a centred face looking at the screen gives neutral angles and gaze', () => {
    const metrics = calculateMetrics({ faceLandmarks: [face()] }, 20);
    assert.equal(metrics.faceCount, 1);
    close(metrics.headYaw, 0);
    close(metrics.headPitch, 0);
    close(metrics.gazeX, 0);
    close(metrics.gazeY, 0);
});
test('nose shifted towards one cheek estimates a head turn', () => {
    const metrics = calculateMetrics({ faceLandmarks: [face({ 1: [0.55, 0.516] })] }, 20);
    close(metrics.headYaw, 27.5);
});
test('two faces are counted, angles come from the first face', () => {
    const metrics = calculateMetrics({ faceLandmarks: [face(), face({ 1: [0.55, 0.516] })] }, 20);
    assert.equal(metrics.faceCount, 2);
    close(metrics.headYaw, 0);
});
