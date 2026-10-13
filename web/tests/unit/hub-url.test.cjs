/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');
const { normalizeHubUrl } = loadSource('src/services/hub/hub-url.ts', {
  'src/services/firebase/firebase-client.ts': { hasFirebaseConfig: false, getFirebaseDb: () => null },
});

test('teacher hub address accepts bare IPs and adds the default LAN port', () => {
  assert.equal(normalizeHubUrl('192.168.1.10'), 'http://192.168.1.10:8765');
  assert.equal(normalizeHubUrl('  192.168.1.10:9000/ '), 'http://192.168.1.10:9000');
  assert.equal(normalizeHubUrl('http://pc-gv:8765/giam-thi'), 'http://pc-gv:8765');
  assert.equal(normalizeHubUrl('https://hub.example'), 'https://hub.example');
});

test('empty or malformed hub addresses are rejected', () => {
  assert.equal(normalizeHubUrl(''), '');
  assert.equal(normalizeHubUrl('   '), '');
  assert.equal(normalizeHubUrl('http://[bad'), '');
});

test('known quirk (kept as-is): a lone scheme is read as a host name', () => {
  assert.equal(normalizeHubUrl('http://'), 'http://http:8765');
});

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
