/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');
const { BehaviorEngine } = loadSource('src/lib/behavior-engine.ts');
const { DEFAULT_THRESHOLDS } = loadSource('src/lib/exam-types.ts');
const neutral = { faceCount: 1, headYaw: 0, headPitch: 0, gazeX: 0, gazeY: 0, fps: 12 };
function sample(engine, time, overrides = {}) {
  return engine.update({ ...neutral, ...overrides }, time, DEFAULT_THRESHOLDS);
}

test('sustained left and right turns produce head_turn after 3 observed seconds', () => {
  for (const yaw of [-17.9, 18.4]) {
    const engine = new BehaviorEngine();
    for (let t = 0; t < 3000; t += 100) assert.equal(sample(engine, t, { headYaw: yaw }).triggered.length, 0);
    assert.ok(sample(engine, 3000, { headYaw: yaw }).triggered.some((item) => item.type === 'head_turn'));
  }
});

test('one noisy frame per second does not erase a sustained turn', () => {
  const engine = new BehaviorEngine();
  let detected = false;
  for (let t = 0; t <= 4500; t += 100) {
    const result = sample(engine, t, { headYaw: t % 1000 === 500 ? 13.7 : 18.4 });
    detected ||= result.triggered.some((item) => item.type === 'head_turn');
  }
  assert.equal(detected, true);
});

test('brief glance followed by looking forward is not accumulated into a later violation', () => {
  const engine = new BehaviorEngine();
  for (let t = 0; t <= 5000; t += 100) {
    const headYaw = t < 1800 || t > 3000 ? 18.4 : 0;
    assert.equal(sample(engine, t, { headYaw }).triggered.length, 0);
  }
});

test('a frozen or paused stream cannot supply unobserved seconds', () => {
  const engine = new BehaviorEngine();
  sample(engine, 0, { headYaw: 18.4 });
  sample(engine, 1000, { headYaw: 18.4 });
  const resumed = sample(engine, 12000, { headYaw: 18.4 });
  assert.equal(resumed.triggered.length, 0);
  assert.equal(resumed.progress[0].elapsedSeconds, 0);
});

test('no face generates no_face, never an unrelated head or eye event', () => {
  const engine = new BehaviorEngine();
  let result;
  for (let t = 0; t <= 5000; t += 100) result = sample(engine, t, { faceCount: 0, headYaw: 35, gazeX: 1 });
  assert.deepEqual(Array.from(result.triggered, (item) => item.type), ['no_face']);
});

test('a fresh session clears previous frame timers', () => {
  const engine = new BehaviorEngine();
  for (let t = 0; t <= 2500; t += 100) sample(engine, t, { headYaw: 18.4 });
  engine.reset();
  assert.equal(sample(engine, 3000, { headYaw: 18.4 }).progress[0].elapsedSeconds, 0);
});
