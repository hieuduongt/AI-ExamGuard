/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');

const SOURCE = process.env.EXAM_SYNC_SOURCE || 'src/services/exam-sync.ts';
const FIREBASE_STUB = { hasFirebaseConfig: false, getFirebaseDb: () => null };

function browser() {
  const storage = new Map();
  const signals = [];
  const requests = [];
  const state = { online: false };
  class FakeCustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const window = {
    location: { origin: 'http://hub.local:8765' },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    dispatchEvent: (event) => { signals.push({ type: event.type, detail: event.detail }); return true; },
  };
  const localStorage = {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  const fetch = async (url, init = {}) => {
    requests.push({ url, method: init.method || 'GET', body: init.body });
    if (!state.online) throw new Error('offline');
    return { ok: true, json: async () => ({ ok: true }) };
  };
  const globals = { window, localStorage, fetch, CustomEvent: FakeCustomEvent, AbortController, crypto: undefined, BroadcastChannel: undefined };
  const sync = loadSource(SOURCE, {
    'firebase/firestore': {},
    'src/services/firebase/firebase-client.ts': FIREBASE_STUB,
    '@/lib/firebase-client': FIREBASE_STUB,
  }, globals);
  return { sync, storage, signals, requests, state };
}

const event = (id) => ({ id, roomId: 'P1', stationId: 'PC-01', candidateId: 'SBD1', candidateName: 'A', type: 'no_face',
  severity: 'critical', title: 't', detail: 'd', timestamp: 1, reviewed: false, source: 'ai' });

test('an alert sent while offline is kept, then delivered once when the hub answers', async () => {
  const { sync, storage, signals, requests, state } = browser();
  sync.publishEvent(event('e1'));
  sync.publishEvent(event('e1'));
  await sync.flushPendingEvents();
  assert.equal(sync.getPendingEventCount(), 1);
  assert.equal(JSON.parse(storage.get('examguard:events:v2')).length, 1);
  assert.ok(signals.some((item) => item.type === 'examguard-hub-status' && item.detail === 'disconnected'));
  assert.ok(requests.every((item) => item.url === 'http://hub.local:8765/api/events' && item.method === 'POST'));

  state.online = true;
  await sync.flushPendingEvents();
  assert.equal(sync.getPendingEventCount(), 0);
  const delivered = signals.filter((item) => item.type === 'examguard-delivery');
  assert.deepEqual(delivered.map((item) => ({ ...item.detail })), [{ id: 'e1', delivered: true }]);
  assert.equal(storage.get('examguard:outbox:v1'), '[]');
});

test('station heartbeat and review go to the hub with the expected routes', async () => {
  const { sync, requests, state, storage } = browser();
  state.online = true;
  storage.set('examguard:teacher-hub:v1', 'http://10.0.0.5:8765');
  sync.publishStation({ roomId: 'P1', stationId: 'PC/01', candidateId: 'S', candidateName: 'A', state: 'normal', lastSeen: 1, metrics: {}, alertCount: 0 });
  sync.markEventReviewed('id with space');
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(requests.map((item) => `${item.method} ${item.url}`), [
    'POST http://10.0.0.5:8765/api/stations',
    'PATCH http://10.0.0.5:8765/api/events/id%20with%20space',
  ]);
  assert.equal(JSON.parse(storage.get('examguard:stations:v2'))[0].stationId, 'PC/01');
});

test('hub addresses are normalised and remembered after a successful check', async () => {
  const { sync, state, storage } = browser();
  state.online = true;
  const result = await sync.testHubConnection('192.168.1.20');
  assert.deepEqual({ ...result }, { ok: true, hubUrl: 'http://192.168.1.20:8765', message: 'Đã kết nối với máy giám thị.' });
  assert.equal(storage.get('examguard:teacher-hub:v1'), 'http://192.168.1.20:8765');
  assert.equal(sync.getConfiguredHubUrl(), 'http://192.168.1.20:8765');
});
