// In-page notifications (window CustomEvents) that let screens react to sync
// activity without importing each other. Names are part of the app's behaviour.
export const HUB_STATUS_SIGNAL = 'examguard-hub-status';
export const DELIVERY_SIGNAL = 'examguard-delivery';
export const LOCAL_EVENTS_SIGNAL = 'examguard-events';
export const LOCAL_STATIONS_SIGNAL = 'examguard-stations';

export type HubStatus = 'connected' | 'disconnected';

export function emitHubStatus(status: HubStatus) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(HUB_STATUS_SIGNAL, { detail: status }));
}

export function emitDelivered(id: string) {
  window.dispatchEvent(new CustomEvent(DELIVERY_SIGNAL, { detail: { id, delivered: true } }));
}

export function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
