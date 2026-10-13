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

const EVENT_KEY = 'examguard:events:v2';
const STATION_KEY = 'examguard:stations:v2';
const HUB_KEY = 'examguard:teacher-hub:v1';
const CHANNEL = 'examguard:live:v2';
const OUTBOX_KEY = 'examguard:outbox:v1';
const HUB_TIMEOUT_MS = 3500;
type PendingEvent = { hubUrl: string; event: ExamEvent };
let flushing: Promise<void> | null = null;

export interface HubRuntime {
  ok: boolean;
  port: number;
  hubUrl: string;
  version?: string;
}

export type HubStatus = 'connected' | 'disconnected';

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

function emitHubStatus(status: HubStatus) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('examguard-hub-status', { detail: status }));
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), HUB_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    window.clearTimeout(timer);
  }
}

export function normalizeHubUrl(value: string) {
  const raw = value.trim().replace(/\/+$/, '');
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
    if (!url.port && url.protocol === 'http:') url.port = '8765';
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

function activeHubUrl() {
  if (typeof window === 'undefined') return '';
  const configured = getConfiguredHubUrl();
  if (configured) return configured;
  return hasFirebaseConfig ? '' : window.location.origin;
}

export async function testHubConnection(value: string) {
  const hubUrl = normalizeHubUrl(value);
  if (!hubUrl) return { ok: false, hubUrl: '', message: 'Địa chỉ máy giám thị không hợp lệ.' };
  try {
    const response = await fetchWithTimeout(`${hubUrl}/api/health`);
    const payload = await response.json() as { ok?: boolean };
    if (!response.ok || !payload.ok) throw new Error('Máy giám thị không phản hồi.');
    setConfiguredHubUrl(hubUrl);
    emitHubStatus('connected');
    void flushPendingEvents();
    return { ok: true, hubUrl, message: 'Đã kết nối với máy giám thị.' };
  } catch {
    emitHubStatus('disconnected');
    return { ok: false, hubUrl, message: 'Không kết nối được. Hãy kiểm tra địa chỉ, Wi-Fi/LAN và tường lửa Windows.' };
  }
}

export async function getDesktopRuntime(): Promise<HubRuntime | null> {
  if (typeof window === 'undefined') return null;
  try {
    const response = await fetchWithTimeout(`${window.location.origin}/api/runtime`);
    if (!response.ok) return null;
    const payload = await response.json() as HubRuntime;
    return payload.ok && payload.hubUrl ? payload : null;
  } catch {
    return null;
  }
}

async function postToHub(path: string, payload: unknown, method = 'POST', hubUrl = activeHubUrl()) {
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

export function getPendingEventCount() {
  if (typeof window === 'undefined') return 0;
  return safeParse<PendingEvent[]>(localStorage.getItem(OUTBOX_KEY), []).length;
}

export function flushPendingEvents(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const queue = safeParse<PendingEvent[]>(localStorage.getItem(OUTBOX_KEY), []);
    const unavailableHubs = new Set<string>();
    for (const item of queue) {
      if (unavailableHubs.has(item.hubUrl)) continue;
      if (!await postToHub('/api/events', item.event, 'POST', item.hubUrl)) {
        unavailableHubs.add(item.hubUrl);
        continue;
      }
      // Re-read: another event may have been queued during the request.
      const remaining = safeParse<PendingEvent[]>(localStorage.getItem(OUTBOX_KEY), [])
        .filter((pending) => pending.event.id !== item.event.id || pending.hubUrl !== item.hubUrl);
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
      window.dispatchEvent(new CustomEvent('examguard-delivery', { detail: { id: item.event.id, delivered: true } }));
    }
  })().finally(() => { flushing = null; });
  return flushing;
}

export function makeId(prefix = 'event') {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

export function publishEvent(event: ExamEvent) {
  if (typeof window === 'undefined') return;
  const next = [event, ...localEvents().filter((item) => item.id !== event.id)].slice(0, 500);
  localStorage.setItem(EVENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('examguard-events'));
  postMessage({ kind: 'event', event });
  const hubUrl = activeHubUrl();
  if (hubUrl) {
    const pending = safeParse<PendingEvent[]>(localStorage.getItem(OUTBOX_KEY), []);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify([...pending.filter((item) => item.event.id !== event.id), { hubUrl, event }]));
    void flushPendingEvents();
  }

  const db = getFirebaseDb();
  if (db) void setDoc(doc(db, 'examEvents', event.id), event).then(() => {
    window.dispatchEvent(new CustomEvent('examguard-delivery', { detail: { id: event.id, delivered: true } }));
  }).catch(() => emitHubStatus('disconnected'));
}

export function publishStation(station: StationStatus) {
  if (typeof window === 'undefined') return;
  const stations = localStations();
  const key = `${station.roomId}::${station.stationId}`;
  const next = [station, ...stations.filter((item) => `${item.roomId}::${item.stationId}` !== key)].slice(0, 150);
  localStorage.setItem(STATION_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('examguard-stations'));
  postMessage({ kind: 'station', station });
  void postToHub('/api/stations', station);
  void flushPendingEvents();

  const db = getFirebaseDb();
  if (db) {
    const documentId = `${station.roomId}__${station.stationId}`.replaceAll('/', '_');
    void setDoc(doc(db, 'examStations', documentId), station).catch(() => undefined);
  }
}

export function markEventReviewed(id: string, reviewed = true) {
  if (typeof window === 'undefined') return;
  const next = localEvents().map((event) => event.id === id ? { ...event, reviewed } : event);
  localStorage.setItem(EVENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('examguard-events'));
  postMessage({ kind: 'review', id, reviewed });
  void postToHub(`/api/events/${encodeURIComponent(id)}`, { reviewed }, 'PATCH');
  const db = getFirebaseDb();
  if (db) void updateDoc(doc(db, 'examEvents', id), { reviewed }).catch(() => undefined);
}

export function subscribeExamData(
  onEvents: (events: ExamEvent[]) => void,
  onStations: (stations: StationStatus[]) => void,
) {
  let authoritative = false;
  const refreshEvents = () => { if (!authoritative) onEvents(localEvents()); };
  const refreshStations = () => { if (!authoritative) onStations(localStations()); };
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
    firebaseUnsubs.push(onSnapshot(query(collection(db, 'examEvents'), orderBy('timestamp', 'desc'), limit(500)), (snapshot) => {
      authoritative = true;
      onEvents(snapshot.docs.map((item) => item.data() as ExamEvent));
    }, () => undefined));
    firebaseUnsubs.push(onSnapshot(collection(db, 'examStations'), (snapshot) => {
      onStations(snapshot.docs.map((item) => item.data() as StationStatus));
    }, () => undefined));
  }

  let stopped = false;
  let polling = false;
  const pollHub = async () => {
    const hubUrl = activeHubUrl();
    if (!hubUrl || stopped || polling) return;
    polling = true;
    try {
      const response = await fetchWithTimeout(`${hubUrl}/api/snapshot`);
      if (!response.ok) throw new Error('LAN hub unavailable');
      const payload = await response.json() as { events?: ExamEvent[]; stations?: StationStatus[] };
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
      candidateId: `SBD${String(index + 1).padStart(3, '0')}`,
      candidateName: `Thí sinh ${String(index + 1).padStart(2, '0')}`,
      state: stationId === 'PC-03' ? 'critical' : warning.has(stationId) ? 'warning' : 'normal',
      lastSeen: Date.now() - index * 950,
      metrics: stationId === 'PC-03' ? { ...zeroMetrics, faceCount: 0 } : zeroMetrics,
      alertCount: stationId === 'PC-03' ? 3 : warning.has(stationId) ? 1 : 0,
    };
  });
}

export { hasFirebaseConfig };
