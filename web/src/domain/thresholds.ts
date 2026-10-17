/**
 * File này chứa các ngưỡng của hệ thống: cần bao nhiêu giây một hành vi mới thành cảnh báo,
 * góc đầu/hướng mắt lệch bao nhiêu là bất thường, và cách đọc ngưỡng do quản trị lưu.
 * Thuộc phần luật nghiệp vụ (web/src/domain/).
 */
import type { BehaviorThresholds, VisionMetrics } from './exam-types';

// Ngưỡng mặc định: một tín hiệu phải kéo dài bao lâu (giây) thì mới phát cảnh báo,
// và cooldownSeconds là số giây phải chờ trước khi báo lại cùng một loại.
export const DEFAULT_THRESHOLDS: BehaviorThresholds = {
  noFaceSeconds: 5,
  multipleFacesSeconds: 2,
  headTurnSeconds: 3,
  // Cúi/ngẩng tách riêng và lâu hơn quay đầu: viết nháp, nhặt bút dễ gây báo nhầm.
  // Tách riêng còn để sau này gắn thuật toán "nhìn" chính xác hơn (xem ai/vision-provider.ts)
  // mà không phải viết lại toàn bộ BehaviorEngine.
  headPoseSeconds: 6,
  gazeAwaySeconds: 5,
  cooldownSeconds: 12,
};

// Giới hạn cho từng khung hình: góc đầu ước tính (độ) và tỉ lệ lệch của mắt.
// Vượt các số này là "bất thường" trong khung hình đó.
export const VISION_LIMITS = { headYaw: 14, headPitch: 20, gazeX: 0.55, gazeY: 0.7 };

// Tên ô nhớ trong localStorage (bộ nhớ nhỏ của trình duyệt, tắt máy vẫn còn) nơi trang
// quản trị lưu cài đặt; trang thí sinh và giám thị đọc lại từ đây.
export const SETTINGS_STORAGE_KEY = 'examguard:settings:v2';

/**
 * Đây là gì: hàm kiểm tra khung hình có vượt giới hạn góc đầu hoặc hướng mắt không.
 * Mục tiêu: phát hiện nhanh thí sinh đang quay đầu, cúi/ngẩng hoặc nhìn lệch màn hình.
 * Chức năng: so độ lớn (bỏ dấu âm/dương) của góc quay đầu, góc cúi/ngẩng, hướng mắt ngang
 *   và dọc với VISION_LIMITS; chỉ cần một giá trị vượt là đủ.
 * Đầu ra: true nếu có ít nhất một giá trị vượt giới hạn, ngược lại false.
 * Dùng ở đâu: classifyMetrics trong station-health.ts.
 * Liên kết với: VISION_LIMITS ngay bên trên (behavior-engine.ts cũng dùng cùng giới hạn này).
 */
export function exceedsVisionLimits(metrics: VisionMetrics) {
  return Math.abs(metrics.headYaw) > VISION_LIMITS.headYaw
    || Math.abs(metrics.headPitch) > VISION_LIMITS.headPitch
    || Math.abs(metrics.gazeX) > VISION_LIMITS.gazeX
    || Math.abs(metrics.gazeY) > VISION_LIMITS.gazeY;
}

/**
 * Đây là gì: hàm đọc ngưỡng thời gian mà trang quản trị đã lưu.
 * Mục tiêu: dùng đúng cài đặt của quản trị, nhưng không để dữ liệu hỏng làm sai hệ thống.
 * Chức năng: nhận chuỗi đã lưu, đọc phần "thresholds"; giá trị nào là số hợp lệ trong
 *   khoảng 1–60 giây thì dùng, giá trị nằm ngoài 1–60 giây (hoặc thiếu, sai kiểu) thì quay
 *   về mặc định. Chuỗi rỗng hoặc không đọc được thì dùng toàn bộ mặc định.
 * Đầu ra: một bộ ngưỡng BehaviorThresholds đầy đủ.
 * Dùng ở đâu: startMonitoring trong
 *   web/src/features/candidate/hooks/use-monitoring-session.ts; web/tests/unit/domain.test.cjs.
 * Liên kết với: SETTINGS_STORAGE_KEY, DEFAULT_THRESHOLDS; nơi lưu là
 *   web/src/features/admin/admin-screen.tsx.
 */
export function parseSavedThresholds(raw: string | null): BehaviorThresholds {
  const thresholds = { ...DEFAULT_THRESHOLDS };
  if (!raw) return thresholds;
  try {
    const parsed = JSON.parse(raw) as { thresholds?: BehaviorThresholds };
    for (const key of Object.keys(DEFAULT_THRESHOLDS) as Array<keyof BehaviorThresholds>) {
      const value = parsed.thresholds?.[key];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 60) thresholds[key] = value;
    }
    return thresholds;
  } catch {
    return { ...DEFAULT_THRESHOLDS };
  }
}

/**
 * Đây là gì: hàm đọc hai tùy chọn quyền riêng tư đã lưu ở trang Quản trị.
 * Mục tiêu: trang thí sinh biết có bắt buộc tự tích đồng ý không, và có gửi kèm ảnh nhỏ khi cảnh báo không.
 * Đầu ra: { storeSnapshots, requireConsent }; mặc định lưu ảnh = tắt, yêu cầu đồng ý = bật.
 */
export function parseSavedPrivacy(raw: string | null) {
  if (!raw) return { storeSnapshots: false, requireConsent: true };
  try {
    const parsed = JSON.parse(raw) as { storeSnapshots?: unknown; requireConsent?: unknown };
    return {
      storeSnapshots: Boolean(parsed.storeSnapshots),
      requireConsent: parsed.requireConsent !== false,
    };
  } catch {
    return { storeSnapshots: false, requireConsent: true };
  }
}
