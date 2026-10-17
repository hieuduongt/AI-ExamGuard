/**
 * Đồng bộ cài đặt phòng thi (ngưỡng cảnh báo + quyền riêng tư) giữa trang Quản trị và máy thí sinh qua hub.
 */
import type { BehaviorThresholds } from '@/domain/exam-types';
import { normalizeThresholds } from '@/domain/thresholds';
import { fetchWithTimeout, postToHub } from './hub-transport';
import { activeHubUrl } from './hub-url';

export type HubRoomSettings = {
  storeSnapshots: boolean;
  requireConsent: boolean;
  thresholds: BehaviorThresholds;
};

/**
 * Đẩy cài đặt phòng thi lên hub để mọi máy thí sinh đọc được.
 */
export async function publishHubSettings(settings: {
  storeSnapshots: boolean;
  requireConsent: boolean;
  thresholds: BehaviorThresholds;
}) {
  return postToHub('/api/settings', {
    storeSnapshots: settings.storeSnapshots,
    requireConsent: settings.requireConsent,
    thresholds: normalizeThresholds(settings.thresholds),
  }, 'POST');
}

/**
 * Đọc cài đặt từ hub. Trả null nếu hub không trả lời.
 */
export async function fetchHubSettings(hubUrl = activeHubUrl()): Promise<HubRoomSettings | null> {
  if (!hubUrl) return null;
  try {
    const response = await fetchWithTimeout(`${hubUrl}/api/settings`);
    if (!response.ok) return null;
    const payload = await response.json() as {
      ok?: boolean;
      storeSnapshots?: unknown;
      requireConsent?: unknown;
      thresholds?: unknown;
    };
    if (!payload.ok) return null;
    return {
      storeSnapshots: Boolean(payload.storeSnapshots),
      requireConsent: payload.requireConsent !== false,
      thresholds: normalizeThresholds(payload.thresholds),
    };
  } catch {
    return null;
  }
}
