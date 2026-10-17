/**
 * File này là "bộ máy chấm hành vi" (behavior engine): nhận các con số AI đọc được từ
 * camera ở từng khung hình và quyết định khi nào một hành vi kéo dài đủ lâu để phát cảnh báo.
 * Thuộc phần luật nghiệp vụ (web/src/domain/). AI nhìn ảnh camera để ước lượng hướng đầu,
 * hướng mắt; không lưu video.
 */
import type { AlertType, BehaviorThresholds, VisionMetrics } from './exam-types';
import { VISION_LIMITS } from './thresholds';

// Thời gian "yên ổn" (mili giây) cần có liên tục thì mới xóa bộ đếm của một hành vi.
// Nhờ vậy, AI lỡ nhận sai một vài khung hình thì bộ đếm không bị xóa oan.
const RECOVERY_MS = 400;
// Nếu hai khung hình cách nhau quá 1,5 giây (camera đứng, máy treo) thì coi như mất dấu
// và đếm lại từ đầu, không cộng khoảng trống đó vào thời gian vi phạm.
const MAX_FRAME_GAP_MS = 1500;

// Tiến trình của một hành vi: loại cảnh báo, đã kéo dài bao nhiêu giây,
// và cần bao nhiêu giây thì mới thành cảnh báo.
export interface BehaviorProgress {
  type: AlertType;
  elapsedSeconds: number;
  requiredSeconds: number;
}

// Đồng hồ riêng của một hành vi: thời gian đang vi phạm, thời gian đã yên ổn,
// và khung hình trước có đang vi phạm không.
interface SignalTimer { activeMs: number; quietMs: number; wasActive: boolean }

/**
 * Đây là gì: lớp (class, một "khuôn" tạo ra đối tượng có dữ liệu và hàm riêng) bộ máy chấm
 *   hành vi.
 * Mục tiêu: chỉ cảnh báo khi hành vi bất thường kéo dài thật, tránh báo nhầm vì một cái
 *   liếc mắt hay vì AI nhận sai trong chốc lát.
 * Chức năng: đếm thời gian các khung hình bất thường đã thấy, bỏ qua nhiễu ngắn của việc
 *   dò khuôn mặt, và không bao giờ tính lúc camera bị dừng thành nhiều giây vi phạm.
 * Đầu ra: mỗi lần gọi update() trả về tiến trình các hành vi và danh sách hành vi vừa đủ
 *   thời gian để phát cảnh báo.
 * Dùng ở đâu: web/src/features/candidate/hooks/use-monitoring-session.ts (mỗi phiên thi tạo
 *   một bộ máy); web/tests/unit/behavior-engine.test.cjs và web/tests/e2e/alert-flow.cjs.
 * Liên kết với: VISION_LIMITS trong thresholds.ts (ngưỡng góc đầu, hướng mắt),
 *   BehaviorThresholds trong exam-types.ts (số giây cần kéo dài).
 */
export class BehaviorEngine {
  private timers = new Map<AlertType, SignalTimer>();
  private lastFrame: number | null = null;

  /**
   * Đây là gì: hàm xóa sạch bộ nhớ của bộ máy chấm hành vi.
   * Mục tiêu: để phiên thi mới không bị "dính" thời gian vi phạm của phiên cũ.
   * Chức năng: xóa mọi đồng hồ hành vi và quên thời điểm khung hình trước.
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: startMonitoring và stopMonitoring trong
   *   web/src/features/candidate/hooks/use-monitoring-session.ts.
   * Liên kết với: update() (bắt đầu đếm lại từ đầu sau khi reset).
   */
  reset() { this.timers.clear(); this.lastFrame = null; }

  /**
   * Đây là gì: hàm chấm một khung hình mới.
   * Mục tiêu: cập nhật thời gian kéo dài của từng hành vi và báo khi nào đủ để cảnh báo.
   * Chức năng: tính khoảng thời gian từ khung hình trước (nếu âm hoặc quá 1,5 giây thì đếm
   *   lại từ đầu); kiểm tra 5 hành vi: không có mặt, nhiều khuôn mặt, quay đầu trái/phải,
   *   cúi/ngẩng đầu, mắt nhìn lệch (3 hành vi sau chỉ xét khi có đúng 1 khuôn mặt). Hành vi
   *   đang xảy ra thì cộng thời gian; ngừng đủ 400 mili giây thì về 0.
   * Đầu ra: { progress, triggered }: progress là tiến trình các hành vi đang có thời gian;
   *   triggered là các hành vi đang xảy ra và đã đủ số giây quy định.
   * Dùng ở đâu: evaluateBehavior trong
   *   web/src/features/candidate/hooks/use-monitoring-session.ts, sau mỗi khung hình AI.
   * Liên kết với: VISION_LIMITS (thresholds.ts), ngưỡng số giây do trang quản trị lưu
   *   (parseSavedThresholds), behaviorDetail() bên dưới để viết lời mô tả cảnh báo.
   */
  update(metrics: VisionMetrics, now: number, thresholds: BehaviorThresholds) {
    let delta = this.lastFrame === null ? 0 : now - this.lastFrame;
    if (delta < 0 || delta > MAX_FRAME_GAP_MS) { this.timers.clear(); delta = 0; }
    this.lastFrame = now;
    const singleFace = metrics.faceCount === 1;
    const conditions: Array<[AlertType, boolean, number]> = [
      ['no_face', metrics.faceCount === 0, thresholds.noFaceSeconds],
      ['multiple_faces', metrics.faceCount > 1, thresholds.multipleFacesSeconds],
      ['head_turn', singleFace && Math.abs(metrics.headYaw) > VISION_LIMITS.headYaw, thresholds.headTurnSeconds],
      ['head_pose', singleFace && Math.abs(metrics.headPitch) > VISION_LIMITS.headPitch, thresholds.headPoseSeconds],
      ['gaze_away', singleFace && (Math.abs(metrics.gazeX) > VISION_LIMITS.gazeX || Math.abs(metrics.gazeY) > VISION_LIMITS.gazeY), thresholds.gazeAwaySeconds],
    ];
    const progress: BehaviorProgress[] = [];
    const triggered: BehaviorProgress[] = [];
    for (const [type, active, seconds] of conditions) {
      const timer = this.timers.get(type) ?? { activeMs: 0, quietMs: 0, wasActive: false };
      if (active) {
        if (timer.wasActive) timer.activeMs += delta;
        timer.quietMs = 0;
      } else {
        timer.quietMs += delta;
        if (timer.quietMs >= RECOVERY_MS) timer.activeMs = 0;
      }
      timer.wasActive = active;
      this.timers.set(type, timer);
      if (active || timer.activeMs > 0) {
        const item = { type, elapsedSeconds: timer.activeMs / 1000, requiredSeconds: seconds };
        progress.push(item);
        if (active && timer.activeMs >= seconds * 1000) triggered.push(item);
      }
    }
    return { progress, triggered };
  }
}

/**
 * Đây là gì: hàm viết câu mô tả chi tiết cho một cảnh báo hành vi.
 * Mục tiêu: cho giám thị biết cụ thể chuyện gì xảy ra và kéo dài bao lâu.
 * Chức năng: tùy loại hành vi, ghép số giây quan sát (làm tròn 1 chữ số thập phân) với
 *   con số liên quan: góc quay đầu, góc cúi/ngẩng, hoặc số khuôn mặt.
 * Đầu ra: một câu tiếng Việt, ví dụ "Không phát hiện khuôn mặt trong 5.0 giây quan sát."
 * Dùng ở đâu: evaluateBehavior trong
 *   web/src/features/candidate/hooks/use-monitoring-session.ts; web/tests/e2e/alert-flow.cjs.
 * Liên kết với: BehaviorProgress (kết quả của BehaviorEngine.update), VisionMetrics.
 */
export function behaviorDetail(item: BehaviorProgress, metrics: VisionMetrics) {
  const duration = item.elapsedSeconds.toFixed(1);
  switch (item.type) {
    case 'head_turn': return `Quay đầu: chỉ số góc ước tính ${Math.abs(metrics.headYaw).toFixed(1)}°, vượt ngưỡng trong ${duration} giây quan sát.`;
    case 'head_pose': return `Cúi/ngẩng đầu: chỉ số góc ước tính ${Math.abs(metrics.headPitch).toFixed(1)}°, trong ${duration} giây quan sát.`;
    case 'no_face': return `Không phát hiện khuôn mặt trong ${duration} giây quan sát.`;
    case 'multiple_faces': return `Phát hiện ${metrics.faceCount} khuôn mặt trong ${duration} giây quan sát.`;
    default: return `Hướng mắt lệch màn hình trong ${duration} giây quan sát.`;
  }
}
