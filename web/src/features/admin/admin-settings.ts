import type { BehaviorThresholds } from '@/domain/exam-types';

// Shape stored under SETTINGS_STORAGE_KEY. The candidate page reads only
// `thresholds` from it (see domain/thresholds.ts).
export type SavedAdminSettings = { thresholds?: BehaviorThresholds; roomName?: string; stationCount?: number; storeSnapshots?: boolean; requireConsent?: boolean };

// Returns null for missing or unreadable data so the page keeps its defaults.
export function parseAdminSettings(raw: string) {
  try {
    const parsed = JSON.parse(raw) as SavedAdminSettings;
    return {
      thresholds: parsed.thresholds,
      roomName: parsed.roomName,
      stationCount: parsed.stationCount,
      storeSnapshots: Boolean(parsed.storeSnapshots),
      requireConsent: parsed.requireConsent !== false,
    };
  } catch {
    return null;
  }
}

export function clampThresholdSeconds(value: string) {
  return Math.max(1, Math.min(60, Number(value) || 1));
}

type ExportInput = { roomName: string; stationCount: number; settings: BehaviorThresholds; storeSnapshots: boolean; requireConsent: boolean };

export function buildConfigJson({ roomName, stationCount, settings, storeSnapshots, requireConsent }: ExportInput) {
  const config = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), roomName, stationCount, thresholds: settings, privacy: { storeSnapshots, requireConsent } }, null, 2);
  return config;
}

export function downloadConfig(input: ExportInput) {
  const config = buildConfigJson(input);
  const url = URL.createObjectURL(new Blob([config], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'ai-examguard-config.json';
  anchor.click();
  URL.revokeObjectURL(url);
}
