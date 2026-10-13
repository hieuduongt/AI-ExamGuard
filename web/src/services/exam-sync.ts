'use client';

// Single entry point the screens use to send and receive exam data. Each call
// fans out to every available channel: local demo storage, the LAN hub
// (desktop-hub/), and Firebase when configured.
import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { emitHubStatus } from '@/services/browser-signals';
import { hasFirebaseConfig } from '@/services/firebase/firebase-client';
import {
  markFirestoreEventReviewed,
  saveEventToFirestore,
  saveStationToFirestore,
  subscribeFirestore,
} from '@/services/firebase/firestore-sync';
import { fetchHubSnapshot, type ProctorPresence } from '@/services/hub/hub-client';
import { postToHub } from '@/services/hub/hub-transport';
import { activeHubUrl } from '@/services/hub/hub-url';
import { enqueueEvent, flushPendingEvents } from '@/services/hub/outbox';
import {
  localEvents,
  localStations,
  markLocalEventReviewed,
  saveLocalEvent,
  saveLocalStation,
  subscribeLocalData,
} from '@/services/local-demo/local-store';

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
  if (typeof window === 'undefined') return;
  saveLocalEvent(event);
  const hubUrl = activeHubUrl();
  if (hubUrl) {
    enqueueEvent(hubUrl, event);
    void flushPendingEvents();
  }
  saveEventToFirestore(event);
}

export function publishStation(station: StationStatus) {
  if (typeof window === 'undefined') return;
  saveLocalStation(station);
  void postToHub('/api/stations', station);
  void flushPendingEvents();
  saveStationToFirestore(station);
}

export function markEventReviewed(id: string, reviewed = true) {
  if (typeof window === 'undefined') return;
  markLocalEventReviewed(id, reviewed);
  void postToHub(`/api/events/${encodeURIComponent(id)}`, { reviewed }, 'PATCH');
  markFirestoreEventReviewed(id, reviewed);
}

// Once the hub or Firestore has answered, their data is authoritative and the
// local demo copy no longer overwrites it.
export function subscribeExamData(
  onEvents: (events: ExamEvent[]) => void,
  onStations: (stations: StationStatus[]) => void,
  proctor?: ProctorPresence,
) {
  let authoritative = false;
  const stopLocal = subscribeLocalData(
    () => { if (!authoritative) onEvents(localEvents()); },
    () => { if (!authoritative) onStations(localStations()); },
  );
  const stopFirestore = subscribeFirestore((events) => {
    authoritative = true;
    onEvents(events);
  }, onStations);

  let stopped = false;
  let polling = false;
  const pollHub = async () => {
    const hubUrl = activeHubUrl();
    if (!hubUrl || stopped || polling) return;
    polling = true;
    try {
      const payload = await fetchHubSnapshot(hubUrl, proctor);
      if (stopped) return;
      authoritative = true;
      onEvents(Array.isArray(payload.events) ? payload.events : []);
      onStations(Array.isArray(payload.stations) ? payload.stations : []);
      emitHubStatus('connected');
    } catch {
      if (!stopped) emitHubStatus('disconnected');
    } finally {
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
