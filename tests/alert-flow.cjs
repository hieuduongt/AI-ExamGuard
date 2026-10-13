/* eslint-disable @typescript-eslint/no-require-imports */
// Run with: node tests/alert-flow.cjs STUDENT_ORIGIN TEACHER_ORIGIN
// Set PLAYWRIGHT_MODULE to a preinstalled Playwright module directory if needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [studentUrl, teacherUrl] = process.argv.slice(2);
if (!studentUrl || !teacherUrl) throw new Error('Pass two isolated test-server origins');
const qaId = `QA-${Date.now()}`;

async function until(check, label, timeout = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out: ${label}`);
}
async function snapshot() { return (await fetch(`${teacherUrl}/api/snapshot`)).json(); }

function injectedModules() {
  // Execute the same source modules that production uses; no fake event endpoint.
  const sourceFiles = {
    types: 'lib/exam-types.ts', engine: 'lib/behavior-engine.ts', store: 'lib/exam-store.ts',
  };
  let script = 'window.qaModules = {};';
  for (const [key, file] of Object.entries(sourceFiles)) {
    const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    script += `\n{ const exports = {}; const require = (name) => {
      if(name === 'firebase/firestore') return {};
      if(name === '@/lib/firebase-client') return {hasFirebaseConfig:false,getFirebaseDb:()=>null};
      throw new Error('Unexpected import '+name);
    }; ${output}\nwindow.qaModules[${JSON.stringify(key)}] = exports; }`;
  }
  return script;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: [
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

    // Head-turn input is deterministic synthetic metrics, explicitly distinct
    // from the real MediaPipe camera test above.
    await pupil.addScriptTag({ content: injectedModules() });
    let blocked = true;
    await pupil.route('**/api/events', (route) => blocked ? route.abort('failed') : route.continue());
    const generatedId = await pupil.evaluate(({ qaId }) => {
      const { engine, types, store } = window.qaModules;
      const detector = new engine.BehaviorEngine();
      let result;
      let metrics;
      let turn;
      for (let t = 0; t <= 4500; t += 100) {
        metrics = { faceCount: 1, headYaw: t % 1000 === 500 ? 13.7 : -18.4, headPitch: 0, gazeX: 0, gazeY: 0, fps: 12 };
        result = detector.update(metrics, t, types.DEFAULT_THRESHOLDS);
        turn = result.triggered.find((item) => item.type === 'head_turn');
        if (turn) break;
      }
      if (!turn) throw new Error('Engine did not detect sustained noisy turn');
      const id = store.makeId('qa-turn');
      store.publishEvent({ id, roomId:'PHONG-01', stationId:qaId, candidateId:qaId, candidateName:'Học sinh kiểm thử',
        type:turn.type, severity:'warning', title:types.ALERT_LABELS[turn.type], detail:engine.behaviorDetail(turn, metrics),
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
