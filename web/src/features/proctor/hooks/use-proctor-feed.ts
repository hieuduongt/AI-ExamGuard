import { useEffect, useRef, useState } from 'react';
import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { HUB_STATUS_SIGNAL } from '@/services/browser-signals';
import {
  getConfiguredHubUrl,
  getDesktopRuntime,
  hasFirebaseConfig,
  setConfiguredHubUrl,
  subscribeExamData,
} from '@/services/exam-sync';

// Live events/stations for the dashboard, the LAN address to show students,
// and the newest unreviewed alert that arrived after the page opened.
export function useProctorFeed() {
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [stations, setStations] = useState<StationStatus[]>([]);
  const [clock, setClock] = useState(new Date(0));
  const [hubUrl, setHubUrl] = useState('');
  const [hubConnected, setHubConnected] = useState(hasFirebaseConfig);
  const [latestAlert, setLatestAlert] = useState<ExamEvent | null>(null);
  const knownEventIdsRef = useRef<Set<string>>(new Set());
  const eventFeedReadyRef = useRef(false);

  useEffect(() => {
    const requestedHub = new URLSearchParams(window.location.search).get('hub');
    if (requestedHub) setConfiguredHubUrl(requestedHub);
    const unsubscribe = subscribeExamData(setEvents, setStations);
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    void getDesktopRuntime().then((runtime) => {
      if (runtime) {
        const configured = getConfiguredHubUrl();
        setHubUrl(!configured || configured === window.location.origin ? runtime.hubUrl : configured);
      }
    });
    const onHubStatus = (event: Event) => {
      setHubConnected((event as CustomEvent<'connected' | 'disconnected'>).detail === 'connected');
    };
    window.addEventListener(HUB_STATUS_SIGNAL, onHubStatus);
    return () => {
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

  return { events, setEvents, stations, clock, hubUrl, hubConnected, latestAlert, setLatestAlert };
}
