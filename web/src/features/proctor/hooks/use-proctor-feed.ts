import { useEffect, useRef, useState } from 'react';
import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { SETTINGS_STORAGE_KEY } from '@/domain/thresholds';
import { HUB_STATUS_SIGNAL } from '@/services/browser-signals';
import { getConfiguredHubUrl, getDesktopRuntime, hasFirebaseConfig, setConfiguredHubUrl, setPageHubUrl, subscribeExamData, } from '@/services/exam-sync';
import { defaultSplitDevHubUrl, isSplitDevOrigin } from '@/services/hub/hub-url';
function savedRoomName() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}') as {
            roomName?: unknown;
        };
        return typeof parsed.roomName === 'string' ? parsed.roomName.trim() : '';
    }
    catch {
        return '';
    }
}
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
        let unsubscribe = () => { };
        const requestedHub = new URLSearchParams(window.location.search).get('hub');
        if (requestedHub)
            setConfiguredHubUrl(requestedHub);
        const timer = window.setInterval(() => setClock(new Date()), 1000);
        void getDesktopRuntime().then((runtime) => {
            if (cancelled)
                return;
            if (runtime) {
                const configured = getConfiguredHubUrl();
                const splitDev = isSplitDevOrigin();
                const pageHub = requestedHub
                    ? configured
                    : (splitDev ? defaultSplitDevHubUrl() : window.location.origin);
                if (pageHub)
                    setPageHubUrl(pageHub);
                const ownHub = !requestedHub || configured === pageHub || (splitDev && !requestedHub);
                setHubUrl(ownHub || !configured ? (splitDev ? window.location.origin : runtime.hubUrl) : configured);
                setConnectCode(ownHub && runtime.discovery && runtime.connectCode ? runtime.connectCode : '');
            }
            else if (!requestedHub && isSplitDevOrigin()) {
                setPageHubUrl(defaultSplitDevHubUrl());
                setHubUrl(window.location.origin);
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
        else {
            setLatestAlert((prev) => {
                if (!prev)
                    return null;
                const stillThere = events.find((event) => event.id === prev.id);
                if (!stillThere || stillThere.reviewed)
                    return null;
                return prev;
            });
        }
        knownEventIdsRef.current = currentIds;
    }, [events]);
    return { events, setEvents, stations, setStations, clock, hubUrl, connectCode, hubConnected, latestAlert, setLatestAlert };
}
