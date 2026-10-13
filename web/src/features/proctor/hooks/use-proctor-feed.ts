import { useEffect, useRef, useState } from 'react';
import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { SETTINGS_STORAGE_KEY } from '@/domain/thresholds';
import { HUB_STATUS_SIGNAL } from '@/services/browser-signals';
import {
  getConfiguredHubUrl,
  getDesktopRuntime,
  hasFirebaseConfig,
  setConfiguredHubUrl,
  setPageHubUrl,
  subscribeExamData,
} from '@/services/exam-sync';

function savedRoomName() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}') as { roomName?: unknown };
    return typeof parsed.roomName === 'string' ? parsed.roomName.trim() : '';
  } catch {
    return '';
  }
}

// Live events/stations for the dashboard, the LAN address and connect code to show
// students, and the newest unreviewed alert that arrived after the page opened.
// Opened from a hub without ?hub=, the dashboard reads that hub and shows its
// current LAN address, whatever address this browser saved earlier.
export function useProctorFeed() {
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [stations, setStations] = useState<StationStatus[]>([]);
  const [clock, setClock] = useState(new Date(0));
  const [hubUrl, setHubUrl] = useState('');
  const [connectCode, setConnectCode] = useState('');
  const [hubConnected, setHubConnected] = useState(hasFirebaseConfig);
  const [latestAlert, setLatestAlert] = useState<ExamEvent | null>(null);
  const knownEventIdsRef = useRef<Set<string>>(new Set());
  const eventFeedReadyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    const requestedHub = new URLSearchParams(window.location.search).get('hub');
    if (requestedHub) setConfiguredHubUrl(requestedHub);
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    void getDesktopRuntime().then((runtime) => {
      if (cancelled) return;
      if (runtime) {
        const configured = getConfiguredHubUrl();
        const ownHub = !requestedHub || configured === window.location.origin;
        if (!requestedHub) setPageHubUrl(window.location.origin);
        setHubUrl(ownHub || !configured ? runtime.hubUrl : configured);
        setConnectCode(ownHub && runtime.discovery && runtime.connectCode ? runtime.connectCode : '');
      }
      unsubscribe = subscribeExamData(setEvents, setStations, { room: savedRoomName() });
    });
    const onHubStatus = (event: Event) => {
      setHubConnected((event as CustomEvent<'connected' | 'disconnected'>).detail === 'connected');
    };
    window.addEventListener(HUB_STATUS_SIGNAL, onHubStatus);
    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener(HUB_STATUS_SIGNAL, onHubStatus);
    };
  }, []);

  useEffect(() => {
    const currentIds = new Set(events.map((event) => event.id));
    if (!eventFeedReadyRef.current) {
      knownEventIdsRef.current = currentIds;
      eventFeedReadyRef.current = true;
      return;
    }
    const incoming = events.find((event) => !knownEventIdsRef.current.has(event.id) && !event.reviewed);
    if (incoming) {
      setLatestAlert(incoming);
    }
    knownEventIdsRef.current = currentIds;
  }, [events]);

  return { events, setEvents, stations, clock, hubUrl, connectCode, hubConnected, latestAlert, setLatestAlert };
}
