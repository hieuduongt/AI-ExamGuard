// File này chứa các hàm phụ của trang quản trị: đọc cài đặt đã lưu, giữ ngưỡng trong
// khoảng cho phép, và tạo/tải file cấu hình JSON. Không vẽ giao diện.

import type { BehaviorThresholds } from '@/domain/exam-types';

// Hình dạng dữ liệu cài đặt được lưu dưới khóa SETTINGS_STORAGE_KEY. Trang thí sinh chỉ đọc
// phần `thresholds` (ngưỡng) trong đó (xem domain/thresholds.ts).
export type SavedAdminSettings = { thresholds?: BehaviorThresholds; roomName?: string; stationCount?: number; storeSnapshots?: boolean; requireConsent?: boolean };

/**
 * Đây là gì: hàm đọc chuỗi cài đặt đã lưu của trang quản trị.
 * Mục tiêu: biến chuỗi chữ trong bộ nhớ trình duyệt thành các cài đặt dùng được.
 * Chức năng: giải mã chuỗi JSON (dạng chữ ghi dữ liệu có cấu trúc); "lưu ảnh" mặc định là tắt,
 *   "yêu cầu xác nhận" mặc định là bật nếu không ghi rõ là tắt.
 * Đầu ra: đối tượng gồm thresholds, roomName, stationCount, storeSnapshots, requireConsent;
 *   trả về null nếu dữ liệu đọc không được, để trang giữ nguyên giá trị mặc định.
 * Dùng ở đâu: AdminScreen (admin-screen.tsx) khi trang vừa mở.
 * Liên kết với: kiểu SavedAdminSettings ở trên; saveSettings trong admin-screen.tsx ghi
 *   dữ liệu này.
 */
export function parseAdminSettings(raw: string) {
  try {
    const parsed = JSON.parse(raw) as SavedAdminSettings;
    return {
      thresholds: parsed.thresholds,
      roomName: parsed.roomName,
      stationCount: parsed.stationCount,
      storeSnapshots: Boolean(parsed.storeSnapshots),
      requireConsent: parsed.requireConsent !== false,
    };
  } catch {
    return null;
  }
}

/**
 * Đây là gì: hàm giữ số giây của ngưỡng trong khoảng cho phép.
 * Mục tiêu: không để người dùng đặt ngưỡng vô lý (âm, 0 hoặc quá lớn).
 * Chức năng: đổi chữ gõ vào thành số; nếu không phải số thì lấy 1; ép vào khoảng 1–60.
 * Đầu ra: một số nguyên giây từ 1 đến 60.
 * Dùng ở đâu: updateThreshold trong admin-screen.tsx.
 * Liên kết với: ô nhập trong components/threshold-settings-card.tsx (cũng giới hạn 1–60),
 *   parseSavedThresholds trong domain/thresholds.ts.
 */
export function clampThresholdSeconds(value: string) {
  return Math.max(1, Math.min(60, Number(value) || 1));
}

// Các cài đặt cần có để xuất file cấu hình.
type ExportInput = { roomName: string; stationCount: number; settings: BehaviorThresholds; storeSnapshots: boolean; requireConsent: boolean };

/**
 * Đây là gì: hàm tạo nội dung file cấu hình.
 * Mục tiêu: gói mọi cài đặt thành một đoạn chữ JSON dễ đọc để cất thành file.
 * Chức năng: ghép phiên bản (version 1), thời điểm xuất, tên phòng, số máy, ngưỡng và phần
 *   quyền riêng tư; xuống dòng, thụt lề 2 dấu cách cho dễ đọc.
 * Đầu ra: chuỗi JSON.
 * Dùng ở đâu: downloadConfig ngay bên dưới.
 * Liên kết với: kiểu ExportInput ở trên.
 */
export function buildConfigJson({ roomName, stationCount, settings, storeSnapshots, requireConsent }: ExportInput) {
  const config = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), roomName, stationCount, thresholds: settings, privacy: { storeSnapshots, requireConsent } }, null, 2);
  return config;
}

/**
 * Đây là gì: hàm tải file cấu hình về máy.
 * Mục tiêu: cho người quản trị có một bản cấu hình cất trên máy tính.
 * Chức năng: tạo nội dung bằng buildConfigJson, đóng gói thành file tạm trong trình duyệt,
 *   giả lập bấm vào một đường link tải xuống, rồi xóa file tạm.
 * Đầu ra: không trả về gì; trình duyệt tải về file ai-examguard-config.json.
 * Dùng ở đâu: exportConfig trong admin-screen.tsx.
 * Liên kết với: buildConfigJson ở trên.
 */
export function downloadConfig(input: ExportInput) {
  const config = buildConfigJson(input);
  const url = URL.createObjectURL(new Blob([config], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'ai-examguard-config.json';
  anchor.click();
  URL.revokeObjectURL(url);
}
