import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { LOCAL_EVENTS_SIGNAL, LOCAL_STATIONS_SIGNAL, safeParse } from '@/services/browser-signals';

// Single-browser demo channel: two tabs of the same browser share data through
// localStorage + BroadcastChannel. It cannot connect two different computers.
const EVENT_KEY = 'examguard:events:v2';
const STATION_KEY = 'examguard:stations:v2';
const CHANNEL = 'examguard:live:v2';

export function localEvents() {
  if (typeof window === 'undefined') return [] as ExamEvent[];
  return safeParse<ExamEvent[]>(localStorage.getItem(EVENT_KEY), []);
}

export function localStations() {
  if (typeof window === 'undefined') return [] as StationStatus[];
  return safeParse<StationStatus[]>(localStorage.getItem(STATION_KEY), []);
}

function broadcast(payload: unknown) {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage(payload);
  channel.close();
}

export function saveLocalEvent(event: ExamEvent) {
  const next = [event, ...localEvents().filter((item) => item.id !== event.id)].slice(0, 500);
  localStorage.setItem(EVENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(LOCAL_EVENTS_SIGNAL));
  broadcast({ kind: 'event', event });
}

export function saveLocalStation(station: StationStatus) {
  const stations = localStations();
  const key = `${station.roomId}::${station.stationId}`;
  const next = [station, ...stations.filter((item) => `${item.roomId}::${item.stationId}` !== key)].slice(0, 150);
  localStorage.setItem(STATION_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(LOCAL_STATIONS_SIGNAL));
  broadcast({ kind: 'station', station });
}

export function markLocalEventReviewed(id: string, reviewed: boolean) {
  const next = localEvents().map((event) => event.id === id ? { ...event, reviewed } : event);
  localStorage.setItem(EVENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(LOCAL_EVENTS_SIGNAL));
  broadcast({ kind: 'review', id, reviewed });
}

// Calls back immediately, then whenever another tab or this tab changes the data.
export function subscribeLocalData(refreshEvents: () => void, refreshStations: () => void) {
  refreshEvents();
  refreshStations();
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
  const onChannel = () => { refreshEvents(); refreshStations(); };
  channel?.addEventListener('message', onChannel);
  window.addEventListener('storage', onChannel);
  window.addEventListener(LOCAL_EVENTS_SIGNAL, refreshEvents);
  window.addEventListener(LOCAL_STATIONS_SIGNAL, refreshStations);
  return () => {
    channel?.removeEventListener('message', onChannel);
    channel?.close();
    window.removeEventListener('storage', onChannel);
    window.removeEventListener(LOCAL_EVENTS_SIGNAL, refreshEvents);
    window.removeEventListener(LOCAL_STATIONS_SIGNAL, refreshStations);
  };
}
