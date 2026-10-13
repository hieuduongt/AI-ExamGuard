/* eslint-disable @typescript-eslint/no-require-imports */
// Runs the real TypeScript sources (no build step) by transpiling each file and
// following its relative and `@/` imports. Anything else must be stubbed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const WEB_ROOT = path.join(__dirname, '..', '..');

function toWebPath(file) {
  return path.relative(WEB_ROOT, file).split(path.sep).join('/');
}

function resolveImport(fromFile, specifier) {
  let base;
  if (specifier.startsWith('@/')) base = path.join(WEB_ROOT, 'src', specifier.slice(2));
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(fromFile), specifier);
  else return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Cannot resolve ${specifier} from ${toWebPath(fromFile)}`);
}

function transpile(file) {
  return ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

// Collects a module and its local imports. `stubs` keys may be an import
// specifier or a web-root path such as 'src/services/firebase/firebase-client.ts'.
function collectGraph(entryFiles, stubs = {}) {
  const modules = new Map();
  const visit = (file) => {
    const id = toWebPath(file);
    if (modules.has(id) || id in stubs) return id;
    const code = transpile(file);
    const imports = {};
    modules.set(id, { code, imports });
    for (const [, , specifier] of code.matchAll(/require\((['"])([^'"]+)\1\)/g)) {
      if (specifier in stubs) continue;
      const resolved = resolveImport(file, specifier);
      if (!resolved) continue;
      const target = toWebPath(resolved);
      imports[specifier] = target;
      if (!(target in stubs)) visit(resolved);
    }
    return id;
  };
  const entries = entryFiles.map((file) => visit(path.join(WEB_ROOT, file)));
  return { modules, entries };
}

function loadSource(file, stubs = {}) {
  const { modules, entries } = collectGraph([file], stubs);
  const cache = new Map();
  const load = (id) => {
    if (id in stubs) return stubs[id];
    if (cache.has(id)) return cache.get(id).exports;
    const record = { exports: {} };
    cache.set(id, record);
    const { code, imports } = modules.get(id);
    const localRequire = (specifier) => {
      if (specifier in stubs) return stubs[specifier];
      if (specifier in imports) return load(imports[specifier]);
      throw new Error(`Unmapped test import: ${specifier}`);
    };
    vm.runInNewContext(code, { exports: record.exports, module: record, require: localRequire, Map, Set, Date, Math });
    return record.exports;
  };
  return load(entries[0]);
}

// Same graph as loadSource, emitted as a browser <script> that assigns
// window.qaModules[name] for each entry. `stubSources` values are JS expressions.
function browserBundle(entriesByName, stubSources = {}) {
  const names = Object.keys(entriesByName);
  const { modules, entries } = collectGraph(Object.values(entriesByName), stubSources);
  const defs = [...modules].map(([id, { code, imports }]) =>
    `${JSON.stringify(id)}: { imports: ${JSON.stringify(imports)}, run: function (exports, module, require) {\n${code}\n} }`);
  const stubs = Object.entries(stubSources).map(([key, source]) => `${JSON.stringify(key)}: ${source}`);
  return `window.qaModules = {};
(function () {
  const defs = {${defs.join(',\n')}};
  const stubs = {${stubs.join(',\n')}};
  const cache = {};
  function load(id) {
    if (id in stubs) return stubs[id];
    if (cache[id]) return cache[id].exports;
    const module = { exports: {} };
    cache[id] = module;
    const def = defs[id];
    def.run(module.exports, module, function (specifier) {
      if (specifier in stubs) return stubs[specifier];
      if (specifier in def.imports) return load(def.imports[specifier]);
      throw new Error('Unexpected import ' + specifier);
    });
    return module.exports;
  }
  ${names.map((name, index) => `window.qaModules[${JSON.stringify(name)}] = load(${JSON.stringify(entries[index])});`).join('\n  ')}
})();`;
}

module.exports = { loadSource, browserBundle };
