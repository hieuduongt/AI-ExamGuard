'use client';

import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseDb, hasFirebaseConfig } from '@/lib/firebase-client';
import type { ExamEvent, StationStatus, VisionMetrics } from '@/lib/exam-types';

const EVENT_KEY = 'examguard:events:v1';
const STATION_KEY = 'examguard:stations:v1';
const CHANNEL = 'examguard:live:v1';

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function localEvents() {
  if (typeof window === 'undefined') return [] as ExamEvent[];
  return safeParse<ExamEvent[]>(localStorage.getItem(EVENT_KEY), []);
}

function localStations() {
  if (typeof window === 'undefined') return [] as StationStatus[];
  return safeParse<StationStatus[]>(localStorage.getItem(STATION_KEY), []);
}

function postMessage(payload: unknown) {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage(payload);
  channel.close();
}

export function makeId(prefix = 'event') {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

export function publishEvent(event: ExamEvent) {
  if (typeof window === 'undefined') return;
  const next = [event, ...localEvents().filter((item) => item.id !== event.id)].slice(0, 150);
  localStorage.setItem(EVENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('examguard-events'));
  postMessage({ kind: 'event', event });

  const db = getFirebaseDb();
  if (db) {
    void setDoc(doc(db, 'examEvents', event.id), event).catch(() => undefined);
  }
}

export function publishStation(station: StationStatus) {
  if (typeof window === 'undefined') return;
  const stations = localStations();
  const next = [station, ...stations.filter((item) => item.stationId !== station.stationId)].slice(0, 80);
  localStorage.setItem(STATION_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('examguard-stations'));
  postMessage({ kind: 'station', station });

  const db = getFirebaseDb();
  if (db) {
    void setDoc(doc(db, 'examStations', station.stationId), station).catch(() => undefined);
  }
}

export function markEventReviewed(id: string, reviewed = true) {
  if (typeof window === 'undefined') return;
  const next = localEvents().map((event) => event.id === id ? { ...event, reviewed } : event);
  localStorage.setItem(EVENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('examguard-events'));
  postMessage({ kind: 'review', id, reviewed });
  const db = getFirebaseDb();
  if (db) void updateDoc(doc(db, 'examEvents', id), { reviewed }).catch(() => undefined);
}

export function getEventSnapshot() { return localEvents(); }
export function getStationSnapshot() { return localStations(); }

export function subscribeExamData(
  onEvents: (events: ExamEvent[]) => void,
  onStations: (stations: StationStatus[]) => void,
) {
  const refreshEvents = () => onEvents(localEvents());
  const refreshStations = () => onStations(localStations());
  refreshEvents();
  refreshStations();

  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
  const onChannel = () => { refreshEvents(); refreshStations(); };
  channel?.addEventListener('message', onChannel);
  window.addEventListener('storage', onChannel);
  window.addEventListener('examguard-events', refreshEvents);
  window.addEventListener('examguard-stations', refreshStations);

  const firebaseUnsubs: Array<() => void> = [];
  const db = getFirebaseDb();
  if (db) {
    firebaseUnsubs.push(onSnapshot(query(collection(db, 'examEvents'), orderBy('timestamp', 'desc'), limit(150)), (snapshot) => {
      const remote = snapshot.docs.map((item) => item.data() as ExamEvent);
      if (remote.length) onEvents(remote);
    }, () => undefined));
    firebaseUnsubs.push(onSnapshot(collection(db, 'examStations'), (snapshot) => {
      const remote = snapshot.docs.map((item) => item.data() as StationStatus);
      if (remote.length) onStations(remote);
    }, () => undefined));
  }

  return () => {
    channel?.removeEventListener('message', onChannel);
    channel?.close();
    window.removeEventListener('storage', onChannel);
    window.removeEventListener('examguard-events', refreshEvents);
    window.removeEventListener('examguard-stations', refreshStations);
    firebaseUnsubs.forEach((unsubscribe) => unsubscribe());
  };
}

const zeroMetrics: VisionMetrics = { faceCount: 1, gazeX: 0, gazeY: 0, headYaw: 0, headPitch: 0, fps: 28 };

export function demoStations(): StationStatus[] {
  const warning = new Set(['PC-07', 'PC-12']);
  return Array.from({ length: 15 }, (_, index) => {
    const stationId = `PC-${String(index + 1).padStart(2, '0')}`;
    return {
      stationId,
      roomId: 'PHONG-01',
      candidateName: `Thí sinh ${String(index + 1).padStart(2, '0')}`,
      state: stationId === 'PC-03' ? 'critical' : warning.has(stationId) ? 'warning' : 'normal',
      lastSeen: Date.now() - index * 950,
      metrics: stationId === 'PC-03' ? { ...zeroMetrics, faceCount: 0 } : zeroMetrics,
      alertCount: stationId === 'PC-03' ? 3 : warning.has(stationId) ? 1 : 0,
    };
  });
}

export function seedDemoData() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(STATION_KEY)) localStorage.setItem(STATION_KEY, JSON.stringify(demoStations()));
  if (!localStorage.getItem(EVENT_KEY)) {
    const base = Date.now();
    const events: ExamEvent[] = [
      { id: 'demo-1', roomId: 'PHONG-01', stationId: 'PC-07', candidateName: 'Thí sinh 07', type: 'head_turn', severity: 'warning', title: 'Quay đầu phải kéo dài', detail: 'Góc quay đầu 28°, duy trì 5,2 giây.', timestamp: base - 42_000, reviewed: false, source: 'demo' },
      { id: 'demo-2', roomId: 'PHONG-01', stationId: 'PC-12', candidateName: 'Thí sinh 12', type: 'gaze_away', severity: 'info', title: 'Hướng mắt lệch phải', detail: 'Hướng mắt rời vùng màn hình trong 6,1 giây.', timestamp: base - 93_000, reviewed: false, source: 'demo' },
      { id: 'demo-3', roomId: 'PHONG-01', stationId: 'PC-03', candidateName: 'Thí sinh 03', type: 'no_face', severity: 'critical', title: 'Không có mặt trước máy', detail: 'Không phát hiện khuôn mặt trong 8,4 giây.', timestamp: base - 135_000, reviewed: false, source: 'demo' },
      { id: 'demo-4', roomId: 'PHONG-01', stationId: 'PC-09', candidateName: 'Thí sinh 09', type: 'focus_lost', severity: 'warning', title: 'Rời khỏi cửa sổ bài thi', detail: 'Cửa sổ bài thi mất tiêu điểm trong 3,7 giây.', timestamp: base - 310_000, reviewed: true, source: 'demo' },
    ];
    localStorage.setItem(EVENT_KEY, JSON.stringify(events));
  }
}

export { hasFirebaseConfig };
