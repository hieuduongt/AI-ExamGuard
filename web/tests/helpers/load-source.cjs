/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Đây là gì: công cụ phụ trợ cho các bài kiểm thử (test) của trang web AI ExamGuard.
 *   "Kiểm thử" là cho máy tự chạy thử code và so kết quả với điều mong đợi.
 * Mục tiêu: chạy thẳng các file TypeScript thật của trang web (thư mục web/src) mà không cần
 *   "build" (đóng gói) trước, để bài kiểm thử thử đúng code sản phẩm đang dùng.
 * Chức năng: dịch từng file TypeScript sang JavaScript thường, rồi lần theo các dòng nạp file
 *   khác (import) kiểu đường dẫn tương đối ("./", "../") hoặc kiểu "@/" (nghĩa là web/src/).
 *   Mọi thư viện bên ngoài khác đều phải được thay bằng "bản giả" (stub) do bài kiểm thử đưa vào.
 * Đầu ra: hai hàm loadSource (dùng trong Node) và browserBundle (dùng trong trình duyệt).
 * Dùng ở đâu: mọi file web/tests/unit/*.test.cjs và web/tests/e2e/alert-flow.cjs. Bản thân file
 *   này không tự chạy; nó được dùng khi chạy lệnh `npm test` trong thư mục web.
 * Liên kết với: thư viện typescript (trong web/node_modules) để dịch code.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Đường dẫn tới thư mục web/ (gốc của trang web), tính từ vị trí file này.
const WEB_ROOT = path.join(__dirname, '..', '..');

/**
 * Đây là gì: hàm đổi đường dẫn file đầy đủ thành đường dẫn ngắn tính từ thư mục web/.
 * Mục tiêu: có một "tên gọi" thống nhất cho mỗi file trên mọi máy (Windows hay macOS).
 * Chức năng: cắt phần đầu đường dẫn đến web/, rồi đổi dấu "\" (Windows) thành "/".
 * Đầu ra: chuỗi như "src/domain/thresholds.ts".
 * Dùng ở đâu: resolveImport (để báo lỗi) và collectGraph (làm mã định danh cho từng file).
 * Liên kết với: hằng số WEB_ROOT ở trên.
 */
function toWebPath(file) {
  return path.relative(WEB_ROOT, file).split(path.sep).join('/');
}

/**
 * Đây là gì: hàm tìm ra file thật mà một dòng import đang nhắc tới.
 * Mục tiêu: biết chính xác cần nạp file nào khi code viết `import ... from './abc'`.
 * Chức năng: nếu tên bắt đầu bằng "@/" thì tìm trong web/src; nếu bắt đầu bằng "." thì tìm
 *   cạnh file đang đọc; lần lượt thử thêm đuôi ".ts", ".tsx" hoặc "index.ts".
 * Đầu ra: đường dẫn đầy đủ của file tìm được; trả về null nếu là thư viện bên ngoài (không phải
 *   file của dự án); báo lỗi nếu là file dự án mà không tìm thấy.
 * Dùng ở đâu: hàm visit bên trong collectGraph.
 * Liên kết với: WEB_ROOT, toWebPath.
 */
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

/**
 * Đây là gì: hàm dịch một file TypeScript sang JavaScript thường.
 * Mục tiêu: Node và trình duyệt chỉ hiểu JavaScript, nên phải dịch trước khi chạy.
 * Chức năng: đọc nội dung file rồi nhờ thư viện typescript dịch sang kiểu CommonJS (kiểu nạp
 *   file bằng require) theo chuẩn ES2022.
 * Đầu ra: chuỗi code JavaScript đã dịch.
 * Dùng ở đâu: hàm visit bên trong collectGraph.
 * Liên kết với: thư viện typescript (biến ts ở đầu file).
 */
function transpile(file) {
  return ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

/**
 * Đây là gì: hàm gom một file (gọi là "module") cùng mọi file của dự án mà nó nạp vào.
 * Mục tiêu: chuẩn bị đủ "bản đồ" các file cần chạy, giống như liệt kê mọi viên gạch trước khi xây.
 * Chức năng: bắt đầu từ các file đầu vào (entryFiles), dịch từng file, tìm các dòng require(...)
 *   trong code đã dịch, rồi lần tiếp sang file được nạp. File nào có trong danh sách bản giả
 *   (stubs) thì bỏ qua. Khóa (tên) trong stubs có thể là đúng chữ viết trong dòng import, hoặc
 *   đường dẫn tính từ web/, ví dụ 'src/services/firebase/firebase-client.ts'.
 * Đầu ra: { modules, entries }: modules là bảng "tên file -> code đã dịch + danh sách file nó
 *   nạp"; entries là tên của các file đầu vào.
 * Dùng ở đâu: loadSource và browserBundle ngay bên dưới.
 * Liên kết với: transpile, resolveImport, toWebPath.
 */
function collectGraph(entryFiles, stubs = {}) {
  const modules = new Map();
  /**
   * Đây là gì: hàm con "ghé thăm" một file trong collectGraph.
   * Mục tiêu: thêm file này và các file nó nạp vào bảng modules, mỗi file đúng một lần.
   * Chức năng: nếu file đã thăm hoặc là bản giả thì dừng; nếu chưa thì dịch file, ghi vào bảng,
   *   rồi tự gọi lại chính mình cho từng file dự án mà nó nạp.
   * Đầu ra: tên file (đường dẫn tính từ web/).
   * Dùng ở đâu: cuối hàm collectGraph (cho file đầu vào) và trong chính nó (cho file được nạp).
   * Liên kết với: transpile, resolveImport, toWebPath, bảng modules.
   */
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

/**
 * Đây là gì: hàm nạp và chạy một file TypeScript thật của trang web ngay trong Node.
 * Mục tiêu: cho bài kiểm thử gọi được các hàm thật (ví dụ normalizeHubUrl, BehaviorEngine) để
 *   thử xem chúng có chạy đúng không.
 * Chức năng: gom file và các file nó nạp (collectGraph), rồi chạy từng file trong một "phòng kín"
 *   (sandbox: vùng chạy riêng, tách khỏi phần còn lại). Tham số stubs là các bản giả thay cho thư
 *   viện ngoài; tham số globals thêm các thứ giống trình duyệt (window, localStorage là bộ nhớ nhỏ
 *   của trình duyệt, fetch là hàm gửi yêu cầu qua mạng...) vào phòng kín.
 * Đầu ra: những gì file đó xuất ra (export), ví dụ { normalizeHubUrl, ... }.
 * Dùng ở đâu: mọi file web/tests/unit/*.test.cjs.
 * Liên kết với: collectGraph; thư viện vm của Node (tạo phòng kín).
 */
function loadSource(file, stubs = {}, globals = {}) {
  const { modules, entries } = collectGraph([file], stubs);
  const cache = new Map();
  /**
   * Đây là gì: hàm con chạy một file đã dịch và lấy phần nó xuất ra.
   * Mục tiêu: mỗi file chỉ chạy một lần, các lần sau dùng lại kết quả đã nhớ (cache).
   * Chức năng: nếu là bản giả thì trả bản giả; nếu đã chạy thì trả kết quả cũ; nếu chưa thì chạy
   *   code trong phòng kín, kèm một hàm require riêng để nạp đúng file đã gom.
   * Đầu ra: phần xuất ra (exports) của file.
   * Dùng ở đâu: cuối loadSource (file đầu vào) và trong localRequire (file được nạp).
   * Liên kết với: bảng modules từ collectGraph, tham số stubs và globals.
   */
  const load = (id) => {
    if (id in stubs) return stubs[id];
    if (cache.has(id)) return cache.get(id).exports;
    const record = { exports: {} };
    cache.set(id, record);
    const { code, imports } = modules.get(id);
    /**
     * Đây là gì: hàm require "riêng" đưa cho từng file khi chạy trong phòng kín.
     * Mục tiêu: khi file gọi require('...') thì nhận đúng bản giả hoặc đúng file dự án đã gom.
     * Chức năng: tìm tên trong stubs trước, rồi trong danh sách file đã gom; không có thì báo lỗi.
     * Đầu ra: phần xuất ra của file hoặc bản giả được yêu cầu.
     * Dùng ở đâu: truyền vào vm.runInNewContext ngay bên dưới, thay cho require thật.
     * Liên kết với: hàm load ở trên, tham số stubs.
     */
    const localRequire = (specifier) => {
      if (specifier in stubs) return stubs[specifier];
      if (specifier in imports) return load(imports[specifier]);
      throw new Error(`Unmapped test import: ${specifier}`);
    };
    vm.runInNewContext(code, { exports: record.exports, module: record, require: localRequire, Map, Set, Date, Math, URL, ...globals });
    return record.exports;
  };
  return load(entries[0]);
}

/**
 * Đây là gì: hàm đóng gói các file TypeScript thật thành một đoạn script cho trình duyệt.
 * Mục tiêu: cho bài kiểm thử toàn luồng (e2e) chạy đúng code sản phẩm ngay bên trong trang web.
 * Chức năng: gom file giống loadSource (dùng collectGraph), rồi viết ra một đoạn code để chèn vào
 *   trang như thẻ <script>; đoạn code đó gán window.qaModules[tên] cho mỗi file đầu vào.
 *   Giá trị trong stubSources là đoạn code JavaScript dạng chữ (ví dụ '{}') làm bản giả.
 * Đầu ra: chuỗi code JavaScript.
 * Dùng ở đâu: hàm injectedModules trong web/tests/e2e/alert-flow.cjs.
 * Liên kết với: collectGraph; window.qaModules được đọc lại trong alert-flow.cjs.
 */
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
