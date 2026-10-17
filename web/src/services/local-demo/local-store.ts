import type { AlertVerdict, ExamEvent, StationStatus } from '@/domain/exam-types';
import { LOCAL_EVENTS_SIGNAL, LOCAL_STATIONS_SIGNAL, safeParse } from '@/services/browser-signals';
const EVENT_KEY = 'examguard:events:v2';
const STATION_KEY = 'examguard:stations:v2';
const CHANNEL = 'examguard:live:v2';
export function localEvents() {
    if (typeof window === 'undefined')
        return [] as ExamEvent[];
    return safeParse<ExamEvent[]>(localStorage.getItem(EVENT_KEY), []);
}
export function localStations() {
    if (typeof window === 'undefined')
        return [] as StationStatus[];
    return safeParse<StationStatus[]>(localStorage.getItem(STATION_KEY), []);
}
function broadcast(payload: unknown) {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window))
        return;
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(payload);
    channel.close();
}
export function saveLocalEvent(event: ExamEvent) {
    const light: ExamEvent = { ...event };
    delete light.clip;
    delete light.snapshots;
    const next = [light, ...localEvents().filter((item) => item.id !== light.id)].slice(0, 500);
    localStorage.setItem(EVENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(LOCAL_EVENTS_SIGNAL));
    broadcast({ kind: 'event', event: light });
}
export function saveLocalStation(station: StationStatus) {
    const stations = localStations();
    const key = `${station.roomId}::${station.stationId}`;
    const next = [station, ...stations.filter((item) => `${item.roomId}::${item.stationId}` !== key)].slice(0, 150);
    localStorage.setItem(STATION_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(LOCAL_STATIONS_SIGNAL));
    broadcast({ kind: 'station', station });
}
export function removeLocalStation(roomId: string, stationId: string) {
    const key = `${roomId}::${stationId}`;
    const next = localStations().filter((item) => `${item.roomId}::${item.stationId}` !== key);
    localStorage.setItem(STATION_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(LOCAL_STATIONS_SIGNAL));
    broadcast({ kind: 'station-remove', roomId, stationId });
}
export function markLocalEventReviewed(id: string, reviewed: boolean, verdict?: AlertVerdict) {
    const next = localEvents().map((event) => {
        if (event.id !== id)
            return event;
        const updated = { ...event, reviewed };
        if (verdict)
            updated.verdict = verdict;
        else if (!reviewed)
            delete updated.verdict;
        return updated;
    });
    localStorage.setItem(EVENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(LOCAL_EVENTS_SIGNAL));
    broadcast({ kind: 'review', id, reviewed, verdict });
}
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
