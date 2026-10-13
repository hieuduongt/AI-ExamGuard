import type { ExamEvent } from '@/domain/exam-types';
import { emitDelivered, safeParse } from '@/services/browser-signals';
import { postToHub } from './hub-transport';

// Alerts waiting to reach the teacher hub survive reloads and network loss.
// Each entry remembers its target hub so a later address change cannot misroute it.
const OUTBOX_KEY = 'examguard:outbox:v1';
type PendingEvent = { hubUrl: string; event: ExamEvent };
let flushing: Promise<void> | null = null;

function readOutbox() {
  return safeParse<PendingEvent[]>(localStorage.getItem(OUTBOX_KEY), []);
}

export function enqueueEvent(hubUrl: string, event: ExamEvent) {
  const pending = readOutbox();
  localStorage.setItem(OUTBOX_KEY, JSON.stringify([...pending.filter((item) => item.event.id !== event.id), { hubUrl, event }]));
}

export function getPendingEventCount() {
  if (typeof window === 'undefined') return 0;
  return readOutbox().length;
}

export function flushPendingEvents(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const queue = readOutbox();
    const unavailableHubs = new Set<string>();
    for (const item of queue) {
      if (unavailableHubs.has(item.hubUrl)) continue;
      if (!await postToHub('/api/events', item.event, 'POST', item.hubUrl)) {
        unavailableHubs.add(item.hubUrl);
        continue;
      }
      // Re-read: another event may have been queued during the request.
      const remaining = readOutbox()
        .filter((pending) => pending.event.id !== item.event.id || pending.hubUrl !== item.hubUrl);
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
      emitDelivered(item.event.id);
    }
  })().finally(() => { flushing = null; });
  return flushing;
}
