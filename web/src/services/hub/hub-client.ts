import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { emitHubStatus } from '@/services/browser-signals';
import { fetchWithTimeout } from './hub-transport';
import { normalizeHubUrl, setConfiguredHubUrl } from './hub-url';
import { flushPendingEvents } from './outbox';

export interface HubRuntime {
  ok: boolean;
  port: number;
  hubUrl: string;
  version?: string;
}

export async function testHubConnection(value: string) {
  const hubUrl = normalizeHubUrl(value);
  if (!hubUrl) return { ok: false, hubUrl: '', message: 'Địa chỉ máy giám thị không hợp lệ.' };
  try {
    const response = await fetchWithTimeout(`${hubUrl}/api/health`);
    const payload = await response.json() as { ok?: boolean };
    if (!response.ok || !payload.ok) throw new Error('Máy giám thị không phản hồi.');
    setConfiguredHubUrl(hubUrl);
    emitHubStatus('connected');
    void flushPendingEvents();
    return { ok: true, hubUrl, message: 'Đã kết nối với máy giám thị.' };
  } catch {
    emitHubStatus('disconnected');
    return { ok: false, hubUrl, message: 'Không kết nối được. Hãy kiểm tra địa chỉ, Wi-Fi/LAN và tường lửa Windows.' };
  }
}

// Only answers when this page is served by the desktop app (desktop-hub/).
export async function getDesktopRuntime(): Promise<HubRuntime | null> {
  if (typeof window === 'undefined') return null;
  try {
    const response = await fetchWithTimeout(`${window.location.origin}/api/runtime`);
    if (!response.ok) return null;
    const payload = await response.json() as HubRuntime;
    return payload.ok && payload.hubUrl ? payload : null;
  } catch {
    return null;
  }
}

export async function fetchHubSnapshot(hubUrl: string) {
  const response = await fetchWithTimeout(`${hubUrl}/api/snapshot`);
  if (!response.ok) throw new Error('LAN hub unavailable');
  return await response.json() as { events?: ExamEvent[]; stations?: StationStatus[] };
}
