import { hasFirebaseConfig } from '@/services/firebase/firebase-client';
const HUB_KEY = 'examguard:teacher-hub:v1';
export const DEFAULT_HUB_PORT = '8765';
export function isSplitDevOrigin(origin = typeof window !== 'undefined' ? window.location.origin : '') {
    if (!origin)
        return false;
    try {
        const url = new URL(origin);
        return url.port === '3000';
    }
    catch {
        return false;
    }
}
export function defaultSplitDevHubUrl() {
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin.replace(/\/+$/, '');
    }
    const fromEnv = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_HUB_URL?.trim() : '';
    if (fromEnv)
        return normalizeHubUrl(fromEnv);
    return `http://127.0.0.1:${DEFAULT_HUB_PORT}`;
}
export function resolveBrowserHubUrl(hubUrl: string) {
    const normalized = normalizeHubUrl(hubUrl);
    if (!normalized || typeof window === 'undefined')
        return normalized;
    if (isSplitDevOrigin())
        return window.location.origin.replace(/\/+$/, '');
    if (window.location.protocol === 'https:' && normalized.startsWith('http://')) {
        try {
            const hub = new URL(normalized);
            const pageHost = window.location.hostname;
            if (hub.hostname === pageHost || hub.hostname === '127.0.0.1' || hub.hostname === 'localhost') {
                return window.location.origin.replace(/\/+$/, '');
            }
        }
        catch {
        }
    }
    return normalized;
}
export function normalizeHubUrl(value: string) {
    const raw = value.trim().replace(/\/+$/, '');
    if (!raw)
        return '';
    try {
        const url = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
        if (!url.port && url.protocol === 'http:')
            url.port = DEFAULT_HUB_PORT;
        return `${url.protocol}//${url.host}`;
    }
    catch {
        return '';
    }
}
export function getConfiguredHubUrl() {
    if (typeof window === 'undefined')
        return '';
    return normalizeHubUrl(localStorage.getItem(HUB_KEY) ?? '');
}
export function setConfiguredHubUrl(value: string) {
    const normalized = normalizeHubUrl(value);
    if (typeof window !== 'undefined') {
        if (normalized)
            localStorage.setItem(HUB_KEY, normalized);
        else
            localStorage.removeItem(HUB_KEY);
    }
    return normalized;
}
let pageHubUrl = '';
export function setPageHubUrl(value: string) {
    pageHubUrl = normalizeHubUrl(value);
}
export function activeHubUrl() {
    if (typeof window === 'undefined')
        return '';
    if (pageHubUrl)
        return resolveBrowserHubUrl(pageHubUrl);
    const configured = getConfiguredHubUrl();
    if (configured)
        return resolveBrowserHubUrl(configured);
    if (hasFirebaseConfig)
        return '';
    if (isSplitDevOrigin())
        return defaultSplitDevHubUrl();
    return window.location.origin;
}
