/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Đây là gì: file kiểm thử đơn vị cho phần tính số liệu khuôn mặt từ kết quả của AI.
 *   AI (MediaPipe) nhìn ảnh camera để tìm các điểm mốc trên khuôn mặt; không lưu video.
 * Mục tiêu: bảo đảm từ các điểm mốc, chương trình tính đúng số khuôn mặt, góc quay đầu
 *   (trái/phải, lên/xuống) và hướng mắt.
 * Chức năng: tự tạo một khuôn mặt giả bằng tọa độ các điểm mốc (mũi, má, trán, cằm, mắt), rồi
 *   xem hàm tính toán trả ra số liệu có đúng không.
 * Đầu ra: kết quả đạt/không đạt của từng ca kiểm thử.
 * Dùng ở đâu: chạy bằng lệnh `npm test` trong thư mục web.
 * Liên kết với: web/src/ai/face-metrics.ts (calculateMetrics, EMPTY_METRICS).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/load-source.cjs');
const { EMPTY_METRICS, calculateMetrics } = loadSource('src/ai/face-metrics.ts');

/**
 * Đây là gì: hàm tạo một khuôn mặt giả gồm các điểm mốc như MediaPipe trả về.
 * Mục tiêu: có khuôn mặt "chuẩn" nhìn thẳng vào màn hình, và dễ dàng xê dịch vài điểm để thử.
 * Chức năng: đặt tọa độ (x, y) cho các điểm mốc theo số thứ tự của MediaPipe (1 là mũi, 234 và
 *   454 là hai má, 10 là trán, 152 là cằm, các số còn lại là quanh mắt và con ngươi); sau đó đè
 *   lên bằng các điểm trong overrides, dạng { số thứ tự: [x, y] }.
 * Đầu ra: mảng các điểm mốc { x, y, z }.
 * Dùng ở đâu: các ca kiểm thử có khuôn mặt trong file này.
 * Liên kết với: calculateMetrics trong web/src/ai/face-metrics.ts (đọc đúng các số thứ tự này).
 */
function face(overrides = {}) {
  const landmarks = [];
  /**
   * Đây là gì: hàm con đặt tọa độ cho một điểm mốc.
   * Mục tiêu: viết gọn việc đặt nhiều điểm.
   * Chức năng: ghi { x, y, z: 0 } vào vị trí index của mảng landmarks.
   * Đầu ra: không trả về gì; mảng landmarks được cập nhật.
   * Dùng ở đâu: ngay trong hàm face.
   * Liên kết với: mảng landmarks của hàm face.
   */
  const set = (index, x, y) => { landmarks[index] = { x, y, z: 0 }; };
  set(1, 0.5, 0.516);            // mũi
  set(234, 0.4, 0.5);            // má trái
  set(454, 0.6, 0.5);            // má phải
  set(10, 0.5, 0.3);             // trán
  set(152, 0.5, 0.7);            // cằm
  set(33, 0.42, 0.42); set(133, 0.48, 0.42); set(468, 0.45, 0.42);
  set(362, 0.52, 0.42); set(263, 0.58, 0.42); set(473, 0.55, 0.42);
  set(159, 0.45, 0.40); set(145, 0.45, 0.44);
  set(386, 0.55, 0.40); set(374, 0.55, 0.44);
  for (const [index, [x, y]] of Object.entries(overrides)) set(Number(index), x, y);
  return landmarks;
}

/**
 * Đây là gì: hàm kiểm tra hai số "gần như bằng nhau".
 * Mục tiêu: phép tính số thập phân trên máy tính có sai số cực nhỏ, nên không so bằng tuyệt đối.
 * Chức năng: chênh lệch giữa actual (giá trị thật) và expected (giá trị mong đợi) phải nhỏ hơn
 *   một phần tỉ; nếu không thì ca kiểm thử thất bại và in ra hai số đó.
 * Đầu ra: không trả về gì; báo lỗi nếu hai số khác nhau.
 * Dùng ở đâu: các ca kiểm thử về góc đầu và hướng mắt trong file này.
 * Liên kết với: thư viện assert của Node.
 */
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≉ ${expected}`);

// Không có khuôn mặt thì mọi số liệu bằng 0, trừ số khung hình mỗi giây (fps).
test('no face keeps every metric at zero except fps', () => {
  assert.deepEqual({ ...calculateMetrics({ faceLandmarks: [] }, 17) }, { ...EMPTY_METRICS, fps: 17 });
});

// Khuôn mặt ở giữa, nhìn thẳng màn hình thì góc đầu và hướng mắt đều bằng 0.
test('a centred face looking at the screen gives neutral angles and gaze', () => {
  const metrics = calculateMetrics({ faceLandmarks: [face()] }, 20);
  assert.equal(metrics.faceCount, 1);
  close(metrics.headYaw, 0);
  close(metrics.headPitch, 0);
  close(metrics.gazeX, 0);
  close(metrics.gazeY, 0);
});

// Mũi lệch về phía một bên má thì chương trình ước lượng là đang quay đầu.
test('nose shifted towards one cheek estimates a head turn', () => {
  const metrics = calculateMetrics({ faceLandmarks: [face({ 1: [0.55, 0.516] })] }, 20);
  close(metrics.headYaw, 27.5);
});

// Có hai khuôn mặt thì đếm đủ 2, còn góc đầu lấy theo khuôn mặt thứ nhất.
test('two faces are counted, angles come from the first face', () => {
  const metrics = calculateMetrics({ faceLandmarks: [face(), face({ 1: [0.55, 0.516] })] }, 20);
  assert.equal(metrics.faceCount, 2);
  close(metrics.headYaw, 0);
});
