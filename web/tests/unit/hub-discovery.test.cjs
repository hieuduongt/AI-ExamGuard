/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Đây là gì: file kiểm thử đơn vị cho phần tự tìm máy giám thị trong mạng LAN
 *   (mạng nội bộ của phòng thi).
 * Mục tiêu: bảo đảm mã kết nối đúng 4 chữ số và tên phòng của giám thị được so khớp "dễ tính" với
 *   mã phòng thí sinh nhập (không phân biệt hoa thường, dấu tiếng Việt, khoảng trắng, gạch nối).
 * Chức năng: gọi các hàm thật với nhiều giá trị mẫu, đúng lẫn sai.
 * Đầu ra: kết quả đạt/không đạt của từng ca kiểm thử.
 * Dùng ở đâu: chạy bằng lệnh `npm test` trong thư mục web.
 * Liên kết với: web/src/services/hub/hub-discovery.ts (isConnectCode, roomKey, sameRoom); phía hub
 *   có desktop-hub/tests/test_hub_discovery.py.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');
const { isConnectCode, roomKey, sameRoom } = loadSource('src/services/hub/hub-discovery.ts', {
  'src/services/firebase/firebase-client.ts': { hasFirebaseConfig: false, getFirebaseDb: () => null },
});

// Mã kết nối phải đúng 4 chữ số (cho phép khoảng trắng ở hai đầu).
test('connect codes are exactly four digits', () => {
  assert.equal(isConnectCode('0427'), true);
  assert.equal(isConnectCode(' 0427 '), true);
  for (const value of ['', '427', '04271', '04a7', '04 27']) assert.equal(isConnectCode(value), false, value);
});

// Tên phòng của giám thị khớp "dễ tính" với mã phòng thí sinh nhập.
test('proctor room names match the candidate room code loosely', () => {
  assert.equal(roomKey('Phòng thi 01'), 'PHONG01');
  assert.equal(sameRoom('Phòng thi 01', 'PHONG-01'), true);
  assert.equal(sameRoom('phong 01', 'PHONG-01'), true);
  assert.equal(sameRoom('Đồi A', 'DOI-A'), true);
  assert.equal(sameRoom('Phòng thi 02', 'PHONG-01'), false);
  assert.equal(sameRoom('', ''), false);
});
