import type { AlertSeverity, ExamEvent, StationStatus } from '@/domain/exam-types';

export type FilterValue = 'all' | AlertSeverity | 'unreviewed';

// A station that has not sent a heartbeat for 7 seconds is shown as offline.
export function markOfflineStations(stations: StationStatus[], now: number) {
  return stations.map((station) => {
    const seenAt = station.serverSeenAt ?? station.lastSeen;
    return now - seenAt > 7000 ? { ...station, state: 'offline' as const } : station;
  });
}

export function filterEvents(events: ExamEvent[], filter: FilterValue, queryText: string) {
  return events.filter((event) => {
    const matchesFilter = filter === 'all' || (filter === 'unreviewed' ? !event.reviewed : event.severity === filter);
    const normalized = queryText.trim().toLocaleLowerCase('vi');
    const matchesQuery = !normalized || `${event.roomId} ${event.stationId} ${event.candidateId} ${event.candidateName} ${event.title}`.toLocaleLowerCase('vi').includes(normalized);
    return matchesFilter && matchesQuery;
  });
}

export function countStations(activeStations: StationStatus[], events: ExamEvent[]) {
  return {
    total: activeStations.length,
    normal: activeStations.filter((station) => station.state === 'normal').length,
    warning: activeStations.filter((station) => station.state === 'warning').length,
    critical: activeStations.filter((station) => station.state === 'critical').length,
    unreviewed: events.filter((event) => !event.reviewed).length,
  };
}
