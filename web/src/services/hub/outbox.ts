import type { ExamEvent } from '@/domain/exam-types';
import { emitDelivered, safeParse } from '@/services/browser-signals';
import { postToHubResult } from './hub-transport';
const OUTBOX_KEY = 'examguard:outbox:v1';
type PendingEvent = {
    hubUrl: string;
    event: ExamEvent;
};
let flushing: Promise<void> | null = null;
function readOutbox() {
    return safeParse<PendingEvent[]>(localStorage.getItem(OUTBOX_KEY), []);
}
export function enqueueEvent(hubUrl: string, event: ExamEvent) {
    const light: ExamEvent = { ...event };
    delete light.clip;
    delete light.snapshots;
    const pending = readOutbox();
    try {
        localStorage.setItem(OUTBOX_KEY, JSON.stringify([...pending.filter((item) => item.event.id !== light.id), { hubUrl, event: light }]));
    }
    catch {
    }
}
export function getPendingEventCount() {
    if (typeof window === 'undefined')
        return 0;
    return readOutbox().length;
}
export function flushPendingEvents(): Promise<void> {
    if (flushing)
        return flushing;
    flushing = (async () => {
        const queue = readOutbox();
        const unavailableHubs = new Set<string>();
        for (const item of queue) {
            if (unavailableHubs.has(item.hubUrl))
                continue;
            const result = await postToHubResult('/api/events', item.event, 'POST', item.hubUrl);
            if (result === 'unreachable') {
                unavailableHubs.add(item.hubUrl);
                continue;
            }
            const remaining = readOutbox()
                .filter((pending) => pending.event.id !== item.event.id || pending.hubUrl !== item.hubUrl);
            try {
                localStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
            }
            catch { }
            if (result === 'ok')
                emitDelivered(item.event.id);
        }
    })().finally(() => { flushing = null; });
    return flushing;
}
