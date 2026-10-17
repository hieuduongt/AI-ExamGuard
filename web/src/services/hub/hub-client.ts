import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { emitHubStatus } from '@/services/browser-signals';
import { fetchWithTimeout } from './hub-transport';
import { activeHubUrl, defaultSplitDevHubUrl, isSplitDevOrigin, normalizeHubUrl, resolveBrowserHubUrl, setConfiguredHubUrl } from './hub-url';
import { flushPendingEvents } from './outbox';
export interface HubRuntime {
    ok: boolean;
    port: number;
    hubUrl: string;
    version?: string;
    discovery?: boolean;
    connectCode?: string;
}
export type ProctorPresence = {
    room: string;
};
export async function testHubConnection(value: string) {
    const typed = normalizeHubUrl(value);
    if (!typed)
        return { ok: false, hubUrl: '', message: 'Địa chỉ máy giám thị không hợp lệ.' };
    const hubUrl = resolveBrowserHubUrl(typed);
    try {
        const response = await fetchWithTimeout(`${hubUrl}/api/health`);
        const payload = await response.json() as {
            ok?: boolean;
        };
        if (!response.ok || !payload.ok)
            throw new Error('Máy giám thị không phản hồi.');
        setConfiguredHubUrl(hubUrl);
        emitHubStatus('connected');
        void flushPendingEvents();
        return { ok: true, hubUrl, message: 'Đã kết nối với máy giám thị.' };
    }
    catch {
        emitHubStatus('disconnected');
        return { ok: false, hubUrl, message: 'Không kết nối được. Hãy kiểm tra địa chỉ, Wi-Fi/LAN và tường lửa Windows.' };
    }
}
export async function getDesktopRuntime(): Promise<HubRuntime | null> {
    if (typeof window === 'undefined')
        return null;
    const candidates = [
        activeHubUrl(),
        window.location.origin,
        isSplitDevOrigin() ? defaultSplitDevHubUrl() : '',
    ].filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);
    for (const base of candidates) {
        try {
            const response = await fetchWithTimeout(`${base}/api/runtime`);
            if (!response.ok)
                continue;
            const payload = await response.json() as HubRuntime;
            if (payload.ok && payload.hubUrl)
                return payload;
        }
        catch {
        }
    }
    return null;
}
export async function fetchHubSnapshot(hubUrl: string, proctor?: ProctorPresence) {
    const query = proctor ? `?${new URLSearchParams({ proctor: '1', room: proctor.room })}` : '';
    const response = await fetchWithTimeout(`${hubUrl}/api/snapshot${query}`);
    if (!response.ok)
        throw new Error('LAN hub unavailable');
    return await response.json() as {
        events?: ExamEvent[];
        stations?: StationStatus[];
    };
}
