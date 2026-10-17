'use client';
import { useMemo, useState } from 'react';
import { ExamGuardHeader } from '@/components/layout/examguard-header';
import type { AlertVerdict, ExamEvent } from '@/domain/exam-types';
import { markEventReviewed, publishEvent, removeStation } from '@/services/exam-sync';
import { EventDetailDrawer } from './components/event-detail-drawer';
import { EventDistribution } from './components/event-distribution';
import { EventFeed } from './components/event-feed';
import { HubAddressBanner } from './components/hub-address-banner';
import { NewAlertBanner } from './components/new-alert-banner';
import { ProctorHeading } from './components/proctor-heading';
import { StatCards } from './components/stat-cards';
import { StationGrid } from './components/station-grid';
import { VerificationPrinciple } from './components/verification-principle';
import { downloadConfirmedCsv, downloadEventsCsv } from './csv-export';
import { buildDemoAlert } from './demo-alert';
import { countFalseAlarmsByType, countStations, filterEvents, markOfflineStations, type FilterValue } from './event-filters';
import { useProctorFeed } from './hooks/use-proctor-feed';
export function ProctorScreen() {
    const { events, setEvents, stations, setStations, clock, hubUrl, connectCode, hubConnected, latestAlert, setLatestAlert } = useProctorFeed();
    const [filter, setFilter] = useState<FilterValue>('all');
    const [queryText, setQueryText] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const activeStations = useMemo(() => markOfflineStations(stations, clock.getTime()), [clock, stations]);
    const filteredEvents = useMemo(() => filterEvents(events, filter, queryText), [events, filter, queryText]);
    const selectedEvent = events.find((event) => event.id === selectedId) ?? null;
    const counts = useMemo(() => countStations(activeStations, events), [activeStations, events]);
    const falseAlarmByType = useMemo(() => countFalseAlarmsByType(events), [events]);
    function reviewWithVerdict(id: string, verdict: AlertVerdict) {
        markEventReviewed(id, true, verdict);
        setEvents((items) => items.map((item) => item.id === id ? { ...item, reviewed: true, verdict } : item));
        if (latestAlert?.id === id)
            setLatestAlert(null);
    }
    function addDemoAlert() {
        const event: ExamEvent = buildDemoAlert(events, activeStations);
        publishEvent(event);
        setSelectedId(event.id);
    }
    function exportCsv() {
        downloadEventsCsv(events);
    }
    function exportConfirmed() {
        downloadConfirmedCsv(events);
    }
    function handleRemoveStation(roomId: string, stationId: string) {
        removeStation(roomId, stationId);
        setStations((items) => items.filter((item) => !(item.roomId === roomId && item.stationId === stationId)));
    }
    async function copyHubUrl() {
        if (!hubUrl)
            return;
        try {
            await navigator.clipboard.writeText(hubUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        }
        catch {
            setCopied(false);
        }
    }
    return (<main className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <ExamGuardHeader active="proctor"/>
      <div className="mx-auto w-[min(1380px,calc(100%-28px))] py-6 sm:py-8">
        <ProctorHeading hubConnected={hubConnected} clock={clock} onDemoAlert={addDemoAlert} onExport={exportCsv} onExportConfirmed={exportConfirmed}/>

        {hubUrl && <HubAddressBanner hubUrl={hubUrl} connectCode={connectCode} copied={copied} onCopy={copyHubUrl}/>}

        {latestAlert && <NewAlertBanner latestAlert={latestAlert} onOpen={() => { setSelectedId(latestAlert.id); setLatestAlert(null); }}/>}

        <StatCards counts={counts} falseAlarmByType={falseAlarmByType}/>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,.9fr)_minmax(420px,1.1fr)]">
          <StationGrid activeStations={activeStations} events={events} onSelectEvent={setSelectedId} onRemoveStation={handleRemoveStation}/>
          <EventFeed filteredEvents={filteredEvents} filter={filter} onFilterChange={setFilter} queryText={queryText} onQueryChange={setQueryText} selectedId={selectedId} onSelectEvent={setSelectedId}/>
        </div>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <EventDistribution events={events}/>
          <VerificationPrinciple />
        </section>
      </div>

      {selectedEvent && <EventDetailDrawer selectedEvent={selectedEvent} onClose={() => setSelectedId(null)} onVerdict={reviewWithVerdict}/>}
    </main>);
}
