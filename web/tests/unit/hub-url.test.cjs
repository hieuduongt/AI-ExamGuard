/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Đây là gì: file kiểm thử đơn vị cho phần xử lý địa chỉ máy giám thị (hub: máy trung tâm của
 *   giám thị, nơi mọi máy thí sinh gửi cảnh báo về).
 * Mục tiêu: thí sinh gõ địa chỉ kiểu nào cũng được hiểu đúng; địa chỉ sai thì bị từ chối; và khi
 *   có nhiều nguồn địa chỉ thì chọn đúng thứ tự ưu tiên.
 * Chức năng: gọi normalizeHubUrl với nhiều kiểu địa chỉ, và thử thứ tự ưu tiên: địa chỉ gắn riêng
 *   cho trang > địa chỉ đã lưu > địa chỉ của chính trang đang mở.
 * Đầu ra: kết quả đạt/không đạt của từng ca kiểm thử.
 * Dùng ở đâu: chạy bằng lệnh `npm test` trong thư mục web.
 * Liên kết với: web/src/services/hub/hub-url.ts (normalizeHubUrl, activeHubUrl,
 *   setConfiguredHubUrl, setPageHubUrl, getConfiguredHubUrl); cổng mặc định 8765.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');
const { normalizeHubUrl } = loadSource('src/services/hub/hub-url.ts', {
  'src/services/firebase/firebase-client.ts': { hasFirebaseConfig: false, getFirebaseDb: () => null },
});

// Địa chỉ máy giám thị nhận cả địa chỉ IP trần và tự thêm cổng mặc định của mạng LAN.
test('teacher hub address accepts bare IPs and adds the default LAN port', () => {
  assert.equal(normalizeHubUrl('192.168.1.10'), 'http://192.168.1.10:8765');
  assert.equal(normalizeHubUrl('  192.168.1.10:9000/ '), 'http://192.168.1.10:9000');
  assert.equal(normalizeHubUrl('http://pc-gv:8765/giam-thi'), 'http://pc-gv:8765');
  assert.equal(normalizeHubUrl('https://hub.example'), 'https://hub.example');
});

// Địa chỉ trống hoặc viết sai thì bị từ chối (trả về chuỗi rỗng).
test('empty or malformed hub addresses are rejected', () => {
  assert.equal(normalizeHubUrl(''), '');
  assert.equal(normalizeHubUrl('   '), '');
  assert.equal(normalizeHubUrl('http://[bad'), '');
});

// Điểm lạ đã biết (cố ý giữ nguyên): gõ mỗi "http://" thì chữ "http" bị hiểu là tên máy.
test('known quirk (kept as-is): a lone scheme is read as a host name', () => {
  assert.equal(normalizeHubUrl('http://'), 'http://http:8765');
});

// Thứ tự ưu tiên: địa chỉ gắn cho trang > địa chỉ đã lưu > địa chỉ của chính trang đang mở.
test('a hub pinned for the page wins over the saved address, which wins over the origin', () => {
  const stored = new Map();
  const hub = loadSource('src/services/hub/hub-url.ts', {
    'src/services/firebase/firebase-client.ts': { hasFirebaseConfig: false, getFirebaseDb: () => null },
  }, {
    window: { location: { origin: 'http://192.168.1.20:8765' } },
    localStorage: {
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
      removeItem: (key) => stored.delete(key),
    },
  });
  assert.equal(hub.activeHubUrl(), 'http://192.168.1.20:8765');
  hub.setConfiguredHubUrl('192.168.1.12');
  assert.equal(hub.activeHubUrl(), 'http://192.168.1.12:8765');
  hub.setPageHubUrl('http://192.168.1.20:8765');
  assert.equal(hub.activeHubUrl(), 'http://192.168.1.20:8765');
  assert.equal(hub.getConfiguredHubUrl(), 'http://192.168.1.12:8765');
});
