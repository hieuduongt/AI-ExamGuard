import { emitHubStatus } from '@/services/browser-signals';
import { activeHubUrl } from './hub-url';
const HUB_TIMEOUT_MS = 12000;
export type HubPostResult = 'ok' | 'rejected' | 'unreachable';
export async function fetchWithTimeout(url: string, init?: RequestInit) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), HUB_TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    }
    finally {
        window.clearTimeout(timer);
    }
}
export async function postToHubResult(path: string, payload: unknown, method = 'POST', hubUrl = activeHubUrl()): Promise<HubPostResult> {
    if (!hubUrl)
        return 'unreachable';
    try {
        const response = await fetchWithTimeout(`${hubUrl}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: payload === undefined ? undefined : JSON.stringify(payload),
        });
        if (response.ok) {
            emitHubStatus('connected');
            return 'ok';
        }
        emitHubStatus(response.status >= 500 ? 'disconnected' : 'connected');
        return response.status >= 400 && response.status < 500 ? 'rejected' : 'unreachable';
    }
    catch {
        emitHubStatus('disconnected');
        return 'unreachable';
    }
}
export async function postToHub(path: string, payload: unknown, method = 'POST', hubUrl = activeHubUrl()) {
    return (await postToHubResult(path, payload, method, hubUrl)) === 'ok';
}
