import { hasFirebaseConfig } from '@/services/firebase/firebase-client';

const HUB_KEY = 'examguard:teacher-hub:v1';
export const DEFAULT_HUB_PORT = '8765';

// Accepts "192.168.1.10", "192.168.1.10:8765" or a full URL; returns "" if invalid.
export function normalizeHubUrl(value: string) {
  const raw = value.trim().replace(/\/+$/, '');
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
    if (!url.port && url.protocol === 'http:') url.port = DEFAULT_HUB_PORT;
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

export function getConfiguredHubUrl() {
  if (typeof window === 'undefined') return '';
  return normalizeHubUrl(localStorage.getItem(HUB_KEY) ?? '');
}

export function setConfiguredHubUrl(value: string) {
  const normalized = normalizeHubUrl(value);
  if (typeof window !== 'undefined') {
    if (normalized) localStorage.setItem(HUB_KEY, normalized);
    else localStorage.removeItem(HUB_KEY);
  }
  return normalized;
}

// The saved teacher hub, otherwise this page's own server (desktop app), unless
// Firebase is configured.
export function activeHubUrl() {
  if (typeof window === 'undefined') return '';
  const configured = getConfiguredHubUrl();
  if (configured) return configured;
  return hasFirebaseConfig ? '' : window.location.origin;
}
