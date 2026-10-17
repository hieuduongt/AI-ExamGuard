/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Đây là gì: file kiểm thử đơn vị cho phần gửi/nhận dữ liệu giữa máy thí sinh và máy giám thị
 *   (hub: máy trung tâm của giám thị, nơi mọi máy thí sinh gửi cảnh báo về).
 * Mục tiêu: bảo đảm cảnh báo gửi lúc mất mạng không bị mất mà được giữ lại và gửi đúng một lần
 *   khi có mạng; trạng thái máy và việc "đã xem" đi đúng địa chỉ; địa chỉ hub được chuẩn hóa và
 *   nhớ lại.
 * Chức năng: dựng một "trình duyệt giả" (bộ nhớ, mạng, sự kiện đều giả) để chạy code thật mà
 *   không cần mạng hay hub thật.
 * Đầu ra: kết quả đạt/không đạt của từng ca kiểm thử.
 * Dùng ở đâu: chạy bằng lệnh `npm test` trong thư mục web. Có thể đặt biến EXAM_SYNC_SOURCE để
 *   thử một file nguồn khác thay cho src/services/exam-sync.ts.
 * Liên kết với: web/src/services/exam-sync.ts (và các file nó nạp như services/hub/hub-url.ts),
 *   web/tests/helpers/load-source.cjs; các đường dẫn /api/events, /api/stations của hub.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');

// File nguồn được kiểm thử; mặc định là src/services/exam-sync.ts.
const SOURCE = process.env.EXAM_SYNC_SOURCE || 'src/services/exam-sync.ts';
// Bản giả của Firebase (dịch vụ đám mây): giả như máy không có cấu hình Firebase.
const FIREBASE_STUB = { hasFirebaseConfig: false, getFirebaseDb: () => null };

/**
 * Đây là gì: hàm dựng một "trình duyệt giả" rồi nạp phần gửi/nhận dữ liệu vào đó.
 * Mục tiêu: mỗi ca kiểm thử có một môi trường sạch, điều khiển được việc có mạng hay mất mạng.
 * Chức năng: tạo bộ nhớ giả thay cho localStorage (bộ nhớ nhỏ của trình duyệt, tắt máy vẫn còn),
 *   hàm fetch giả ghi lại mọi yêu cầu mạng, window giả có địa chỉ http://hub.local:8765 và ghi lại
 *   mọi tín hiệu (sự kiện) phát ra; rồi nạp file SOURCE bằng loadSource với Firebase giả.
 * Đầu ra: { sync, storage, signals, requests, state }: sync là các hàm thật đã nạp; storage là bộ
 *   nhớ; signals là tín hiệu đã phát; requests là yêu cầu mạng đã gửi; đổi state.online để
 *   bật/tắt mạng.
 * Dùng ở đâu: đầu mỗi ca kiểm thử trong file này.
 * Liên kết với: loadSource trong web/tests/helpers/load-source.cjs, hằng số SOURCE, FIREBASE_STUB.
 */
function browser() {
  const storage = new Map();
  const signals = [];
  const requests = [];
  const state = { online: false, status: 200 };
  /**
   * Đây là gì: bản giả của CustomEvent (một "tín hiệu" mà trang web tự phát ra).
   * Mục tiêu: Node không có sẵn CustomEvent như trình duyệt, nên cần bản giả.
   * Chức năng: chỉ nhớ loại tín hiệu (type) và dữ liệu kèm theo (detail).
   * Đầu ra: một đối tượng tín hiệu có type và detail.
   * Dùng ở đâu: truyền vào loadSource qua globals, code exam-sync.ts dùng để báo trạng thái.
   * Liên kết với: window.dispatchEvent giả ngay bên dưới (ghi tín hiệu vào signals).
   */
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
  /**
   * Đây là gì: hàm fetch giả (fetch thật là hàm gửi yêu cầu qua mạng).
   * Mục tiêu: thử code gửi dữ liệu mà không cần mạng thật, và biết code đã gửi những gì.
   * Chức năng: ghi địa chỉ, kiểu yêu cầu (GET/POST/PATCH) và nội dung vào requests; nếu
   *   state.online là false thì báo lỗi "offline" (mất mạng).
   * Đầu ra: khi có mạng, một câu trả lời giả báo thành công { ok: true }.
   * Dùng ở đâu: truyền vào loadSource qua globals, thay cho fetch của exam-sync.ts.
   * Liên kết với: mảng requests và biến state trong hàm browser.
   */
  const fetch = async (url, init = {}) => {
    requests.push({ url, method: init.method || 'GET', body: init.body });
    if (!state.online) throw new Error('offline');
    if (typeof state.status === 'number' && state.status >= 400) {
      return { ok: false, status: state.status, json: async () => ({ ok: false }) };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const globals = { window, localStorage, fetch, CustomEvent: FakeCustomEvent, AbortController, crypto: undefined, BroadcastChannel: undefined };
  const sync = loadSource(SOURCE, {
    'firebase/firestore': {},
    'src/services/firebase/firebase-client.ts': FIREBASE_STUB,
    '@/lib/firebase-client': FIREBASE_STUB,
  }, globals);
  return { sync, storage, signals, requests, state };
}

/**
 * Đây là gì: hàm tạo một cảnh báo mẫu.
 * Mục tiêu: có nhanh một cảnh báo đủ trường để thử gửi đi.
 * Chức năng: tạo cảnh báo "không có mặt" (no_face) ở phòng P1, máy PC-01, với mã id truyền vào.
 * Đầu ra: một đối tượng cảnh báo (ExamEvent).
 * Dùng ở đâu: ca kiểm thử gửi cảnh báo khi mất mạng trong file này.
 * Liên kết với: kiểu ExamEvent trong web/src/domain/exam-types.ts.
 */
const event = (id) => ({ id, roomId: 'P1', stationId: 'PC-01', candidateId: 'SBD1', candidateName: 'A', type: 'no_face',
  severity: 'critical', title: 't', detail: 'd', timestamp: 1, reviewed: false, source: 'ai' });

// Cảnh báo gửi lúc mất mạng được giữ lại, rồi chỉ gửi đúng một lần khi hub trả lời.
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

// Tín hiệu "máy còn sống" và việc đánh dấu đã xem được gửi tới hub đúng đường dẫn.
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

// Clip/ảnh không được nhét vào localStorage; gửi thẳng hub thành công thì báo đã nhận.
test('alert with clip is not stored in localStorage and marks delivered on direct hub ok', async () => {
  const { sync, storage, signals, requests, state } = browser();
  state.online = true;
  const fat = { ...event('clip-1'), clip: `data:video/webm;base64,${'A'.repeat(2000)}` };
  sync.publishEvent(fat);
  await new Promise((resolve) => setTimeout(resolve, 20));
  const stored = JSON.parse(storage.get('examguard:events:v2'));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].clip, undefined);
  assert.ok(requests.some((item) => item.url.endsWith('/api/events') && item.body.includes('clip')));
  assert.ok(signals.some((item) => item.type === 'examguard-delivery' && item.detail?.id === 'clip-1'));
  assert.equal(sync.getPendingEventCount(), 0);
});

// Hub từ chối (4xx) một cảnh báo không làm kẹt cả hộp thư đi.
test('rejected outbox item is dropped so later alerts can still flush', async () => {
  const { sync, storage, requests, state } = browser();
  state.online = true;
  state.status = 400;
  storage.set('examguard:outbox:v1', JSON.stringify([
    { hubUrl: 'http://hub.local:8765', event: event('bad') },
    { hubUrl: 'http://hub.local:8765', event: event('good') },
  ]));
  await sync.flushPendingEvents();
  assert.equal(sync.getPendingEventCount(), 0);
  assert.equal(requests.filter((item) => item.url.endsWith('/api/events')).length, 2);
});

// Xóa máy gửi DELETE đúng đường dẫn và gỡ khỏi localStorage.
test('removeStation deletes on hub and locally', async () => {
  const { sync, requests, state, storage } = browser();
  state.online = true;
  storage.set('examguard:teacher-hub:v1', 'http://10.0.0.5:8765');
  storage.set('examguard:stations:v2', JSON.stringify([
    { roomId: 'P1', stationId: 'PC/01', candidateId: 'S', candidateName: 'A', state: 'offline', lastSeen: 1, metrics: {}, alertCount: 0 },
  ]));
  sync.removeStation('P1', 'PC/01');
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(requests.map((item) => `${item.method} ${item.url}`), [
    'DELETE http://10.0.0.5:8765/api/stations/P1/PC%2F01',
  ]);
  assert.equal(JSON.parse(storage.get('examguard:stations:v2')).length, 0);
});

// Địa chỉ hub được chuẩn hóa và được nhớ lại sau khi kiểm tra kết nối thành công.
test('hub addresses are normalised and remembered after a successful check', async () => {
  const { sync, state, storage } = browser();
  state.online = true;
  const result = await sync.testHubConnection('192.168.1.20');
  assert.deepEqual({ ...result }, { ok: true, hubUrl: 'http://192.168.1.20:8765', message: 'Đã kết nối với máy giám thị.' });
  assert.equal(storage.get('examguard:teacher-hub:v1'), 'http://192.168.1.20:8765');
  assert.equal(sync.getConfiguredHubUrl(), 'http://192.168.1.20:8765');
});
