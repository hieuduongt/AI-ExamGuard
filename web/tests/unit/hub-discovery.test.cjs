const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');
const { isConnectCode, roomKey, sameRoom } = loadSource('src/services/hub/hub-discovery.ts', {
    'src/services/firebase/firebase-client.ts': { hasFirebaseConfig: false, getFirebaseDb: () => null },
});
test('connect codes are exactly four digits', () => {
    assert.equal(isConnectCode('0427'), true);
    assert.equal(isConnectCode(' 0427 '), true);
    for (const value of ['', '427', '04271', '04a7', '04 27'])
        assert.equal(isConnectCode(value), false, value);
});
test('proctor room names match the candidate room code loosely', () => {
    assert.equal(roomKey('Phòng thi 01'), 'PHONG01');
    assert.equal(sameRoom('Phòng thi 01', 'PHONG-01'), true);
    assert.equal(sameRoom('phong 01', 'PHONG-01'), true);
    assert.equal(sameRoom('Đồi A', 'DOI-A'), true);
    assert.equal(sameRoom('Phòng thi 02', 'PHONG-01'), false);
    assert.equal(sameRoom('', ''), false);
});
