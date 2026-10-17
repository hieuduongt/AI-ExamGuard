'use client';
import type { AlertVerdict, ExamEvent, StationStatus } from '@/domain/exam-types';
import { emitDelivered, emitHubStatus } from '@/services/browser-signals';
import { hasFirebaseConfig } from '@/services/firebase/firebase-client';
import { markFirestoreEventReviewed, saveEventToFirestore, saveStationToFirestore, subscribeFirestore, } from '@/services/firebase/firestore-sync';
import { fetchHubSnapshot, type ProctorPresence } from '@/services/hub/hub-client';
import { postToHub, postToHubResult } from '@/services/hub/hub-transport';
import { activeHubUrl } from '@/services/hub/hub-url';
import { enqueueEvent, flushPendingEvents } from '@/services/hub/outbox';
import { localEvents, localStations, markLocalEventReviewed, removeLocalStation, saveLocalEvent, saveLocalStation, subscribeLocalData, } from '@/services/local-demo/local-store';
function withoutMedia(event: ExamEvent): ExamEvent {
    const light: ExamEvent = { ...event };
    delete light.clip;
    delete light.snapshots;
    return light;
}
export { hasFirebaseConfig };
export type { HubStatus } from '@/services/browser-signals';
export { getDesktopRuntime, testHubConnection, type HubRuntime, type ProctorPresence } from '@/services/hub/hub-client';
export { fetchDiscoveredHubs, isConnectCode, sameRoom, type DiscoveredHub } from '@/services/hub/hub-discovery';
export { getConfiguredHubUrl, normalizeHubUrl, setConfiguredHubUrl, setPageHubUrl } from '@/services/hub/hub-url';
export { flushPendingEvents, getPendingEventCount } from '@/services/hub/outbox';
export { demoStations } from '@/services/local-demo/demo-data';
export function makeId(prefix = 'event') {
    const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${suffix}`;
}
export function publishEvent(event: ExamEvent) {
    if (typeof window === 'undefined')
        return;
    try {
        saveLocalEvent(withoutMedia(event));
    }
    catch {
    }
    const hubUrl = activeHubUrl();
    if (hubUrl) {
        const hasMedia = Boolean(event.clip || event.snapshots?.length);
        if (hasMedia) {
            void deliverMediaEventToHub(hubUrl, event);
        }
        else {
            enqueueEvent(hubUrl, event);
            void flushPendingEvents();
        }
    }
    try {
        saveEventToFirestore(withoutMedia(event));
    }
    catch {
    }
}
async function deliverMediaEventToHub(hubUrl: string, event: ExamEvent) {
    const first = await postToHubResult('/api/events', event, 'POST', hubUrl);
    if (first === 'ok') {
        emitDelivered(event.id);
        return;
    }
    const light = withoutMedia(event);
    const second = await postToHubResult('/api/events', light, 'POST', hubUrl);
    if (second === 'ok') {
        emitDelivered(event.id);
        return;
    }
    if (first === 'unreachable' || second === 'unreachable') {
        enqueueEvent(hubUrl, light);
        void flushPendingEvents();
    }
}
export function publishStation(station: StationStatus) {
    if (typeof window === 'undefined')
        return;
    saveLocalStation(station);
    void postToHub('/api/stations', station);
    void flushPendingEvents();
    saveStationToFirestore(station);
}
export function markEventReviewed(id: string, reviewed = true, verdict?: AlertVerdict) {
    if (typeof window === 'undefined')
        return;
    markLocalEventReviewed(id, reviewed, verdict);
    void postToHub(`/api/events/${encodeURIComponent(id)}`, { reviewed, ...(verdict ? { verdict } : {}) }, 'PATCH');
    markFirestoreEventReviewed(id, reviewed, verdict);
}
export function removeStation(roomId: string, stationId: string) {
    if (typeof window === 'undefined')
        return;
    removeLocalStation(roomId, stationId);
    const hubUrl = activeHubUrl();
    if (!hubUrl)
        return;
    void postToHub(`/api/stations/${encodeURIComponent(roomId)}/${encodeURIComponent(stationId)}`, undefined, 'DELETE', hubUrl);
}
export function subscribeExamData(onEvents: (events: ExamEvent[]) => void, onStations: (stations: StationStatus[]) => void, proctor?: ProctorPresence) {
    let authoritative = false;
    const stopLocal = subscribeLocalData(() => { if (!authoritative)
        onEvents(localEvents()); }, () => { if (!authoritative)
        onStations(localStations()); });
    const stopFirestore = subscribeFirestore((events) => {
        authoritative = true;
        onEvents(events);
    }, onStations);
    let stopped = false;
    let polling = false;
    const pollHub = async () => {
        const hubUrl = activeHubUrl();
        if (!hubUrl || stopped || polling)
            return;
        polling = true;
        try {
            const payload = await fetchHubSnapshot(hubUrl, proctor);
            if (stopped)
                return;
            authoritative = true;
            onEvents(Array.isArray(payload.events) ? payload.events : []);
            onStations(Array.isArray(payload.stations) ? payload.stations : []);
            emitHubStatus('connected');
        }
        catch {
            if (!stopped)
                emitHubStatus('disconnected');
        }
        finally {
            polling = false;
        }
    };
    void pollHub();
    const hubTimer = window.setInterval(() => void pollHub(), 1000);
    return () => {
        stopped = true;
        window.clearInterval(hubTimer);
        stopLocal();
        stopFirestore();
    };
}
