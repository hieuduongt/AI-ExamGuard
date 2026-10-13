'use client';

import { useEffect, useState } from 'react';
import { ExamGuardHeader } from '@/components/layout/examguard-header';
import type { BehaviorThresholds } from '@/domain/exam-types';
import { DEFAULT_THRESHOLDS, SETTINGS_STORAGE_KEY } from '@/domain/thresholds';
import { clampThresholdSeconds, downloadConfig, parseAdminSettings } from './admin-settings';
import { AdminHeading } from './components/admin-heading';
import { ArchitectureCard } from './components/architecture-card';
import { DataPolicyNote } from './components/data-policy-note';
import { PrivacySettingsCard } from './components/privacy-settings-card';
import { RolesCard } from './components/roles-card';
import { RoomSettingsCard } from './components/room-settings-card';
import { ThresholdSettingsCard } from './components/threshold-settings-card';

// Admin page (/quan-tri): room, thresholds and privacy settings saved in this browser.
export function AdminScreen() {
  const [settings, setSettings] = useState<BehaviorThresholds>(DEFAULT_THRESHOLDS);
  const [roomName, setRoomName] = useState('Phòng thi 01');
  const [stationCount, setStationCount] = useState(15);
  const [storeSnapshots, setStoreSnapshots] = useState(false);
  const [requireConsent, setRequireConsent] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = parseAdminSettings(raw);
        if (parsed) {
          if (parsed.thresholds) setSettings(parsed.thresholds);
          if (parsed.roomName) setRoomName(parsed.roomName);
          if (parsed.stationCount) setStationCount(parsed.stationCount);
          setStoreSnapshots(parsed.storeSnapshots);
          setRequireConsent(parsed.requireConsent);
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateThreshold(key: keyof BehaviorThresholds, value: string) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: clampThresholdSeconds(value) }));
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ thresholds: settings, roomName, stationCount, storeSnapshots, requireConsent }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  }

  function exportConfig() {
    downloadConfig({ roomName, stationCount, settings, storeSnapshots, requireConsent });
  }

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <ExamGuardHeader active="admin" />
      <div className="mx-auto w-[min(1240px,calc(100%-28px))] py-7 sm:py-9">
        <AdminHeading saved={saved} saveSettings={saveSettings} exportConfig={exportConfig} />

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,.55fr)]">
          <div className="grid gap-5">
            <RoomSettingsCard
              roomName={roomName}
              stationCount={stationCount}
              onRoomNameChange={(value) => { setRoomName(value); setSaved(false); }}
              onStationCountChange={(value) => { setStationCount(value); setSaved(false); }}
            />

            <ThresholdSettingsCard settings={settings} updateThreshold={updateThreshold} />

            <PrivacySettingsCard
              requireConsent={requireConsent}
              storeSnapshots={storeSnapshots}
              onRequireConsentChange={(value) => { setRequireConsent(value); setSaved(false); }}
              onStoreSnapshotsChange={(value) => { setStoreSnapshots(value); setSaved(false); }}
            />
          </div>

          <aside className="grid gap-5 xl:sticky xl:top-24">
            <ArchitectureCard />

            <RolesCard />

            <DataPolicyNote />
          </aside>
        </div>
      </div>
    </main>
  );
}
