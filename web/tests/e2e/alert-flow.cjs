/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Đây là gì: bài kiểm thử toàn luồng (e2e, "từ đầu đến cuối") của AI ExamGuard. Máy tự mở trình
 *   duyệt thật, đóng vai cả thí sinh lẫn giám thị, rồi bấm nút như người dùng thật.
 * Mục tiêu: chứng minh cả chuỗi chạy đúng: thí sinh kết nối với máy giám thị (hub: máy trung tâm
 *   của giám thị, nơi mọi máy thí sinh gửi cảnh báo về) -> AI phân tích camera -> mở cửa sổ giám
 *   thị -> cảnh báo "không có mặt" tới giám thị -> video đứng thì báo "AI đã tạm dừng" -> mất mạng
 *   rồi gửi lại -> bấm Dừng.
 * Chức năng: dùng thư viện Playwright (điều khiển trình duyệt tự động) với camera giả. Phần AI
 *   (MediaPipe: mô hình nhận diện điểm mốc khuôn mặt) là thật; AI nhìn ảnh camera để ước lượng
 *   hướng đầu, hướng mắt, không lưu video. Phần quay đầu dùng số liệu giả lập đưa vào bộ đếm thật.
 * Đầu ra: in "PASS: ..." cho từng chặng; nếu sai thì in lỗi và kết thúc với mã lỗi 1.
 * Dùng ở đâu: chạy tay, không nằm trong `npm test`. Lệnh chạy (trong thư mục web):
 *   node tests/e2e/alert-flow.cjs ĐỊA_CHỈ_THÍ_SINH ĐỊA_CHỈ_GIÁM_THỊ
 *   Đặt biến PLAYWRIGHT_MODULE tới thư mục Playwright đã cài sẵn nếu cần.
 *   Đặt biến E2E_BROWSER_CHANNEL=chrome trên máy không có Microsoft Edge.
 * Liên kết với: hai địa chỉ máy chủ thử do desktop-hub/tests/serve_hub.py mở ra (hướng dẫn ở
 *   docs/van-hanh/chay-va-build.md); trang /thi-sinh và /giam-thi;
 *   web/tests/helpers/load-source.cjs.
 */
const assert = require('node:assert/strict');
const { browserBundle } = require('../helpers/load-source.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [studentUrl, teacherUrl] = process.argv.slice(2);
if (!studentUrl || !teacherUrl) throw new Error('Pass two isolated test-server origins');
// Mã thí sinh riêng cho lần chạy này (gắn giờ hiện tại) để không lẫn với dữ liệu cũ.
const qaId = `QA-${Date.now()}`;

/**
 * Đây là gì: hàm "chờ cho đến khi" một điều kiện đúng.
 * Mục tiêu: trang web và mạng cần thời gian; bài kiểm thử phải chờ thay vì kiểm tra ngay.
 * Chức năng: cứ 0,25 giây lại hỏi hàm check một lần; đúng thì dừng chờ. Quá thời hạn timeout
 *   (mặc định 45 giây) thì báo lỗi "Timed out" (hết giờ) kèm tên label để biết chặng nào hỏng.
 *   Đây là việc cần chờ (async), như chờ mạng trả lời.
 * Đầu ra: không trả về gì khi thành công; báo lỗi khi hết giờ.
 * Dùng ở đâu: hầu hết các bước trong phần chạy chính của file này.
 * Liên kết với: hàm snapshot (thường được gọi bên trong check).
 */
async function until(check, label, timeout = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out: ${label}`);
}
/**
 * Đây là gì: hàm hỏi máy giám thị "hiện đang có những gì".
 * Mục tiêu: kiểm tra dữ liệu thật đã tới máy giám thị, không chỉ nhìn giao diện.
 * Chức năng: gửi yêu cầu tới cửa giao tiếp (API) /api/snapshot của máy giám thị.
 * Đầu ra: dữ liệu gồm danh sách máy thí sinh (stations) và cảnh báo (events).
 * Dùng ở đâu: nhiều bước until(...) trong phần chạy chính của file này.
 * Liên kết với: API /api/snapshot của hub trong desktop-hub/.
 */
async function snapshot() { return (await fetch(`${teacherUrl}/api/snapshot`)).json(); }

/**
 * Đây là gì: hàm tạo đoạn script chứa code thật của trang web để chèn vào trang thí sinh.
 * Mục tiêu: chạy đúng những file mà sản phẩm thật dùng, không dùng cửa nhận cảnh báo giả.
 * Chức năng: đóng gói ngưỡng (thresholds), danh mục cảnh báo (alert-catalog), bộ máy chấm hành vi
 *   (behavior-engine) và phần gửi/nhận dữ liệu (exam-sync); thay Firebase (dịch vụ đám mây) bằng
 *   bản giả "không có cấu hình".
 * Đầu ra: chuỗi code; khi chạy trong trang sẽ tạo window.qaModules.
 * Dùng ở đâu: bước kiểm thử quay đầu trong phần chạy chính của file này (addScriptTag).
 * Liên kết với: browserBundle trong web/tests/helpers/load-source.cjs; các file web/src/domain/
 *   thresholds.ts, alert-catalog.ts, behavior-engine.ts và web/src/services/exam-sync.ts.
 */
function injectedModules() {
  // Chạy đúng các file nguồn mà bản thật dùng; không có cửa nhận cảnh báo giả.
  return browserBundle({
    thresholds: 'src/domain/thresholds.ts',
    catalog: 'src/domain/alert-catalog.ts',
    engine: 'src/domain/behavior-engine.ts',
    store: 'src/services/exam-sync.ts',
  }, {
    'firebase/firestore': '{}',
    'src/services/firebase/firebase-client.ts': '{ hasFirebaseConfig: false, getFirebaseDb: () => null }',
  });
}

// Phần chạy chính: mở trình duyệt, đi lần lượt từng chặng, in "PASS" sau mỗi chặng đạt.
(async () => {
  const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL || 'msedge', headless: true, args: [
    '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--disable-gpu',
  ] });
  try {
    const pupilContext = await browser.newContext();
    const teacherContext = await browser.newContext();
    const pupil = await pupilContext.newPage();
    const teacher = await teacherContext.newPage();
    const errors = [];
    pupil.on('pageerror', (error) => errors.push(error.message));
    teacher.on('pageerror', (error) => errors.push(error.message));
    pupil.on('console', (message) => { if (message.type() === 'error') console.log('CANDIDATE:', message.text()); });
    await teacher.goto(`${teacherUrl}/giam-thi`);
    await pupil.goto(`${studentUrl}/thi-sinh`);
    await pupil.locator('#candidate-name').fill('Học sinh kiểm thử');
    await pupil.locator('#candidate-id').fill(qaId);
    await pupil.locator('#station-id').fill(qaId);
    await pupil.getByRole('textbox', { name: 'Địa chỉ máy giám thị', exact: true }).fill(teacherUrl);
    await pupil.getByRole('button', { name: 'Kiểm tra kết nối', exact: true }).click();
    const start = pupil.getByRole('button', { name: 'Kiểm tra webcam và bắt đầu', exact: true });
    await until(() => start.isEnabled(), 'teacher connection');
    await start.click();
    await until(async () => {
      const data = await snapshot();
      return data.stations.some((s) => s.candidateId === qaId && s.analysisState === 'ready');
    }, 'real MediaPipe model analysing fake camera frames', 90000);
    console.log('PASS: actual candidate UI loads MediaPipe and reports fresh analysis');
    assert.equal(await pupil.evaluate(() => document.querySelector('video').srcObject.getVideoTracks()[0].readyState), 'live', 'fake camera must be live before testing popup');

    const popupPromise = pupil.waitForEvent('popup');
    await pupil.getByRole('button', { name: 'Mở Giám thị ↗', exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    assert.ok(pupil.url().includes('/thi-sinh'));
    assert.ok(await pupil.evaluate(() => document.querySelector('video').srcObject.getVideoTracks()[0].readyState === 'live'));
    console.log('PASS: opening proctor keeps candidate page and camera alive');

    await until(async () => (await snapshot()).events.some((event) => event.candidateId === qaId && event.type === 'no_face'), 'actual detector -> timer -> LAN event');
    await until(() => teacher.getByRole('alert').filter({ hasText: qaId }).count().then(Boolean), 'teacher shows candidate identity');
    await until(() => pupil.getByText('Giám thị đã nhận', { exact: true }).count().then(Boolean), 'candidate displays acknowledgement');
    console.log('PASS: real MediaPipe blank frames generate no_face and teacher shows correct identity');

    await pupil.evaluate(() => document.querySelector('video').pause());
    await until(async () => (await snapshot()).stations.some((s) => s.candidateId === qaId && s.analysisState === 'stalled'), 'frozen video is not reported as healthy AI');
    await until(() => pupil.getByText('AI đã tạm dừng', { exact: true }).count().then(Boolean), 'candidate sees frozen analysis');
    await until(() => teacher.getByText('Camera không có khung hình AI mới', { exact: true }).count().then(Boolean), 'teacher sees frozen analysis');
    await pupil.evaluate(() => document.querySelector('video').play());
    await until(async () => (await snapshot()).stations.some((s) => s.candidateId === qaId && s.analysisState === 'ready'), 'analysis resumes');
    console.log('PASS: frozen analysis is visible on both sides and resumes with fresh frames');

    // Dữ liệu quay đầu ở đây là số liệu giả lập, lần nào chạy cũng giống nhau; nó tách biệt
    // rõ ràng với phần thử camera bằng MediaPipe thật ở trên.
    await pupil.addScriptTag({ content: injectedModules() });
    let blocked = true;
    await pupil.route('**/api/events', (route) => blocked ? route.abort('failed') : route.continue());
    const generatedId = await pupil.evaluate(({ qaId }) => {
      const { engine, thresholds, catalog, store } = window.qaModules;
      const detector = new engine.BehaviorEngine();
      let result;
      let metrics;
      let turn;
      for (let t = 0; t <= 4500; t += 100) {
        metrics = { faceCount: 1, headYaw: t % 1000 === 500 ? 13.7 : -18.4, headPitch: 0, gazeX: 0, gazeY: 0, fps: 12 };
        result = detector.update(metrics, t, thresholds.DEFAULT_THRESHOLDS);
        turn = result.triggered.find((item) => item.type === 'head_turn');
        if (turn) break;
      }
      if (!turn) throw new Error('Engine did not detect sustained noisy turn');
      const id = store.makeId('qa-turn');
      store.publishEvent({ id, roomId:'PHONG-01', stationId:qaId, candidateId:qaId, candidateName:'Học sinh kiểm thử',
        type:turn.type, severity:'warning', title:catalog.ALERT_LABELS[turn.type], detail:engine.behaviorDetail(turn, metrics),
        timestamp:Date.now(), reviewed:false, source:'ai' });
      return id;
    }, { qaId });
    await until(() => pupil.evaluate(() => window.qaModules.store.getPendingEventCount() > 0), 'failed event queued');
    assert.equal((await snapshot()).events.some((event) => event.id === generatedId), false);
    blocked = false;
    await pupil.evaluate(() => window.qaModules.store.flushPendingEvents());
    await until(async () => (await snapshot()).events.some((event) => event.id === generatedId), 'retry delivery');
    await until(() => teacher.getByRole('alert').filter({ hasText: 'Quay đầu trái/phải kéo dài' }).count().then(Boolean), 'head turn visible on teacher');
    const matches = (await snapshot()).events.filter((event) => event.id === generatedId);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].candidateId, qaId);
    console.log('PASS: sustained head-turn engine -> queued network failure -> retry -> teacher banner');
    await popup.close();
    await pupil.getByRole('button', { name: 'Dừng', exact: true }).click();
    await until(async () => (await snapshot()).stations.some((s) => s.candidateId === qaId && s.analysisState === 'stopped'), 'explicit stop');
    assert.deepEqual(errors, []);
    console.log('PASS: explicit stop reported; no browser application errors');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
