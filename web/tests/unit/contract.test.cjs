/* eslint-disable @typescript-eslint/no-require-imports */
// Web constants and data shapes must match shared/hub-contract.json (the desktop hub relies on them).
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

function interfaceBody(name) {
  const match = typesSource.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `interface ${name} not found`);
  return match[1];
}

test('default hub port matches the contract', () => {
  assert.equal(DEFAULT_HUB_PORT, String(contract.defaultHubPort));
});

test('every alert type in the contract has a label, and no extra ones', () => {
  assert.deepEqual(Object.keys(ALERT_LABELS).sort(), [...contract.alertTypes].sort());
  for (const type of contract.alertTypes) assert.match(typesSource, new RegExp(`\\| '${type}'`));
});

test('events and stations always carry the identity fields the hub requires', () => {
  for (const name of ['ExamEvent', 'StationStatus']) {
    const body = interfaceBody(name);
    for (const field of contract.identityFields) {
      assert.match(body, new RegExp(`\\n\\s+${field}: string;`), `${name}.${field} must be a required string`);
    }
  }
  assert.match(interfaceBody('ExamEvent'), /\n\s+id: string;/);
});
