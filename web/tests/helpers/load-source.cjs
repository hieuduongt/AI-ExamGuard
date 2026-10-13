/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadSource(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: (key) => {
    if (!(key in dependencies)) throw new Error(`Unmapped test import: ${key}`);
    return dependencies[key];
  }, Map, Set, Date, Math });
  return exports;
}
module.exports = { loadSource };
