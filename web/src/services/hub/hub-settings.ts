/**
 * Đồng bộ cài đặt phòng thi (đặc biệt storeSnapshots) giữa trang Quản trị và máy thí sinh qua hub.
 */
import { fetchWithTimeout, postToHub } from './hub-transport';
import { activeHubUrl } from './hub-url';

export type HubRoomSettings = {
  storeSnapshots: boolean;
  requireConsent: boolean;
};

/**
 * Đẩy cài đặt quyền riêng tư lên hub để máy thí sinh đọc được.
 */
export async function publishHubSettings(settings: HubRoomSettings) {
  return postToHub('/api/settings', settings, 'POST');
}

/**
 * Đọc cài đặt từ hub. Trả null nếu hub không trả lời.
 */
export async function fetchHubSettings(hubUrl = activeHubUrl()): Promise<HubRoomSettings | null> {
  if (!hubUrl) return null;
  try {
    const response = await fetchWithTimeout(`${hubUrl}/api/settings`);
    if (!response.ok) return null;
    const payload = await response.json() as { ok?: boolean; storeSnapshots?: unknown; requireConsent?: unknown };
    if (!payload.ok) return null;
    return {
      storeSnapshots: Boolean(payload.storeSnapshots),
      requireConsent: payload.requireConsent !== false,
    };
  } catch {
    return null;
  }
}
