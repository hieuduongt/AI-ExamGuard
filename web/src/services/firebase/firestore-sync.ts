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
import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { emitDelivered, emitHubStatus } from '@/services/browser-signals';
import { getFirebaseDb } from './firebase-client';

// Optional cloud channel (collections examEvents / examStations). Every function
// is a no-op when Firebase is not configured.

export function saveEventToFirestore(event: ExamEvent) {
  const db = getFirebaseDb();
  if (db) void setDoc(doc(db, 'examEvents', event.id), event).then(() => {
    emitDelivered(event.id);
  }).catch(() => emitHubStatus('disconnected'));
}

export function saveStationToFirestore(station: StationStatus) {
  const db = getFirebaseDb();
  if (db) {
    const documentId = `${station.roomId}__${station.stationId}`.replaceAll('/', '_');
    void setDoc(doc(db, 'examStations', documentId), station).catch(() => undefined);
  }
}

export function markFirestoreEventReviewed(id: string, reviewed: boolean) {
  const db = getFirebaseDb();
  if (db) void updateDoc(doc(db, 'examEvents', id), { reviewed }).catch(() => undefined);
}

export function subscribeFirestore(
  onEvents: (events: ExamEvent[]) => void,
  onStations: (stations: StationStatus[]) => void,
) {
  const unsubscribes: Array<() => void> = [];
  const db = getFirebaseDb();
  if (db) {
    unsubscribes.push(onSnapshot(query(collection(db, 'examEvents'), orderBy('timestamp', 'desc'), limit(500)), (snapshot) => {
      onEvents(snapshot.docs.map((item) => item.data() as ExamEvent));
    }, () => undefined));
    unsubscribes.push(onSnapshot(collection(db, 'examStations'), (snapshot) => {
      onStations(snapshot.docs.map((item) => item.data() as StationStatus));
    }, () => undefined));
  }
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}
