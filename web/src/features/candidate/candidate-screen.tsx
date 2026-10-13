'use client';

import { ExamGuardHeader } from '@/components/layout/examguard-header';
import { AdvisoryNote } from './components/advisory-note';
import { CameraPanel } from './components/camera-panel';
import { CandidateHeading } from './components/candidate-heading';
import { CheckListCard } from './components/check-list-card';
import { HubConnectionPanel } from './components/hub-connection-panel';
import { LiveSignalsCard } from './components/live-signals-card';
import { RecentEventsCard } from './components/recent-events-card';
import { SessionFormCard } from './components/session-form-card';
import { SessionNotices } from './components/session-notices';
import { useDeliveryStatus } from './hooks/use-delivery-status';
import { useHubConnection } from './hooks/use-hub-connection';
import { useHubDiscovery } from './hooks/use-hub-discovery';
import { useMonitoringSession } from './hooks/use-monitoring-session';

// Candidate page (/thi-sinh). Both the form and the monitoring view stay mounted
// and are toggled with `hidden`, so the <video> element survives the switch.
export function CandidateScreen() {
  const { deliveredIds, pendingCount, refreshPendingCount } = useDeliveryStatus();
  const { hubAddress, hubState, hubMessage, changeHubAddress, connectTeacherHub, connectTo } = useHubConnection();
  const session = useMonitoringSession({ hubState, refreshPendingCount });
  const discovery = useHubDiscovery(!session.running && hubState !== 'connected', connectTo);
  const { running, modelState, health } = session;

  const statusTone = health === 'critical' ? 'bg-rose-500' : health === 'warning' ? 'bg-amber-400' : running ? 'bg-emerald-500' : 'bg-slate-400';

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <ExamGuardHeader active="candidate" monitoring={running || modelState === 'loading'} />
      <div className="mx-auto w-[min(1260px,calc(100%-28px))] py-7 sm:py-9">
        <CandidateHeading statusTone={statusTone} running={running} statusText={session.statusText} />

        <SessionNotices running={running} pendingCount={pendingCount} errorMessage={session.errorMessage} />

        <div className={`grid gap-5 lg:grid-cols-[1.05fr_.95fr] ${running ? 'hidden' : ''}`}>
          <SessionFormCard
            candidateName={session.candidateName}
            setCandidateName={session.setCandidateName}
            candidateId={session.candidateId}
            setCandidateId={session.setCandidateId}
            roomId={session.roomId}
            setRoomId={session.setRoomId}
            stationId={session.stationId}
            setStationId={session.setStationId}
            consented={session.consented}
            setConsented={session.setConsented}
            modelState={modelState}
            hubState={hubState}
            errorMessage={session.errorMessage}
            startMonitoring={session.startMonitoring}
            hubPanel={<HubConnectionPanel hubAddress={hubAddress} hubState={hubState} hubMessage={hubMessage} changeHubAddress={changeHubAddress} connectTeacherHub={connectTeacherHub} discovery={discovery} roomId={session.roomId} />}
          />

          <CheckListCard />
        </div>

        <div className={`grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.55fr)] ${running ? '' : 'hidden'}`}>
          <CameraPanel
            candidateName={session.candidateName}
            candidateId={session.candidateId}
            roomId={session.roomId}
            stationId={session.stationId}
            hubState={hubState}
            modelState={modelState}
            analysisStalled={session.analysisStalled}
            stopMonitoring={session.stopMonitoring}
            videoRef={session.videoRef}
            canvasRef={session.canvasRef}
            metrics={session.metrics}
            statusTone={statusTone}
            health={health}
          />

          <aside className="grid content-start gap-5">
            <LiveSignalsCard
              metrics={session.metrics}
              modelState={modelState}
              analysisStalled={session.analysisStalled}
              behaviorProgress={session.behaviorProgress}
              activeThresholds={session.activeThresholds}
              lowPowerMode={session.lowPowerMode}
              setLowPowerMode={session.setLowPowerMode}
            />

            <RecentEventsCard recentEvents={session.recentEvents} deliveredIds={deliveredIds} createTestAlert={session.createTestAlert} />
          </aside>
        </div>

        <AdvisoryNote />
      </div>
    </main>
  );
}
