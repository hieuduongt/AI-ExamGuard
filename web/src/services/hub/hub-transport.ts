import { emitHubStatus } from '@/services/browser-signals';
import { activeHubUrl } from './hub-url';

const HUB_TIMEOUT_MS = 3500;

export async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), HUB_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    window.clearTimeout(timer);
  }
}

// Sends JSON to the hub; reports the hub as connected/disconnected and never throws.
export async function postToHub(path: string, payload: unknown, method = 'POST', hubUrl = activeHubUrl()) {
  if (!hubUrl) return false;
  try {
    const response = await fetchWithTimeout(`${hubUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('LAN hub rejected the request');
    emitHubStatus('connected');
    return true;
  } catch {
    emitHubStatus('disconnected');
    return false;
  }
}
