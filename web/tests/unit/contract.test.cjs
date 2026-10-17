/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Đây là gì: file kiểm thử đơn vị kiểm tra trang web có giữ đúng "hợp đồng" với máy giám thị không.
 * Mục tiêu: các hằng số và hình dạng dữ liệu của web phải khớp shared/hub-contract.json, vì
 *   chương trình hub trên máy giám thị (desktop-hub/, máy trung tâm nơi mọi máy thí sinh gửi cảnh
 *   báo về) dựa vào đúng những thứ đó. Lệch một chỗ là hai bên "nói hai thứ tiếng".
 * Chức năng: đọc file hợp đồng, rồi so với cổng mặc định, danh sách loại cảnh báo và các trường
 *   nhận dạng (phòng, máy, thí sinh) trong code web.
 * Đầu ra: kết quả đạt/không đạt của từng ca kiểm thử.
 * Dùng ở đâu: chạy bằng lệnh `npm test` trong thư mục web.
 * Liên kết với: shared/hub-contract.json, web/src/services/hub/hub-url.ts,
 *   web/src/domain/alert-catalog.ts, web/src/domain/exam-types.ts; phía Python có
 *   desktop-hub/tests/test_contract.py kiểm tra cùng hợp đồng.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('../helpers/load-source.cjs');

const webRoot = path.resolve(__dirname, '../..');
const contract = JSON.parse(fs.readFileSync(path.join(webRoot, '../shared/hub-contract.json'), 'utf8'));
const { DEFAULT_HUB_PORT } = loadSource('src/services/hub/hub-url.ts', {
  'src/services/firebase/firebase-client.ts': { hasFirebaseConfig: false, getFirebaseDb: () => null },
});
const { ALERT_LABELS } = loadSource('src/domain/alert-catalog.ts');
const typesSource = fs.readFileSync(path.join(webRoot, 'src/domain/exam-types.ts'), 'utf8');

/**
 * Đây là gì: hàm lấy phần thân của một kiểu dữ liệu (interface) trong file exam-types.ts.
 * Mục tiêu: xem kiểu dữ liệu đó khai báo những trường (ô thông tin) nào.
 * Chức năng: tìm đoạn chữ "export interface <tên> { ... }" trong nội dung file; không thấy thì
 *   ca kiểm thử thất bại với thông báo "interface ... not found" (không tìm thấy).
 * Đầu ra: chuỗi chữ nằm giữa hai dấu ngoặc nhọn của interface đó.
 * Dùng ở đâu: ca kiểm thử về các trường nhận dạng trong file này.
 * Liên kết với: biến typesSource (nội dung web/src/domain/exam-types.ts).
 */
function interfaceBody(name) {
  const match = typesSource.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `interface ${name} not found`);
  return match[1];
}

// Cổng mạng mặc định của máy giám thị trong web phải trùng với hợp đồng.
test('default hub port matches the contract', () => {
  assert.equal(DEFAULT_HUB_PORT, String(contract.defaultHubPort));
});

// Mỗi loại cảnh báo trong hợp đồng đều có tên hiển thị, và web không có loại nào thừa.
test('every alert type in the contract has a label, and no extra ones', () => {
  assert.deepEqual(Object.keys(ALERT_LABELS).sort(), [...contract.alertTypes].sort());
  for (const type of contract.alertTypes) assert.match(typesSource, new RegExp(`\\| '${type}'`));
});

// Cảnh báo và trạng thái máy thí sinh luôn có đủ các trường nhận dạng mà hub yêu cầu.
test('events and stations always carry the identity fields the hub requires', () => {
  for (const name of ['ExamEvent', 'StationStatus']) {
    const body = interfaceBody(name);
    for (const field of contract.identityFields) {
      assert.match(body, new RegExp(`\\n\\s+${field}: string;`), `${name}.${field} must be a required string`);
    }
  }
  assert.match(interfaceBody('ExamEvent'), /\n\s+id: string;/);
});

// Các kết luận giám thị trong hợp đồng đều có trong kiểu AlertVerdict.
test('every verdict in the contract appears in AlertVerdict', () => {
  assert.match(typesSource, /export type AlertVerdict = 'confirmed' \| 'false_alarm';/);
  for (const verdict of contract.verdicts) {
    assert.match(typesSource, new RegExp(`'${verdict}'`));
  }
});
