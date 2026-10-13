import type { BehaviorThresholds, VisionMetrics } from './exam-types';

// How long (seconds) a signal must persist before an alert is raised.
export const DEFAULT_THRESHOLDS: BehaviorThresholds = {
  noFaceSeconds: 5,
  multipleFacesSeconds: 2,
  headTurnSeconds: 3,
  gazeAwaySeconds: 5,
  cooldownSeconds: 12,
};

// Per-frame limits on the estimated head angles (degrees) and gaze ratios.
export const VISION_LIMITS = { headYaw: 14, headPitch: 20, gazeX: 0.55, gazeY: 0.7 };

export const SETTINGS_STORAGE_KEY = 'examguard:settings:v2';

export function exceedsVisionLimits(metrics: VisionMetrics) {
  return Math.abs(metrics.headYaw) > VISION_LIMITS.headYaw
    || Math.abs(metrics.headPitch) > VISION_LIMITS.headPitch
    || Math.abs(metrics.gazeX) > VISION_LIMITS.gazeX
    || Math.abs(metrics.gazeY) > VISION_LIMITS.gazeY;
}

// Thresholds saved by the admin page; values outside 1–60 s fall back to defaults.
export function parseSavedThresholds(raw: string | null): BehaviorThresholds {
  const thresholds = { ...DEFAULT_THRESHOLDS };
  if (!raw) return thresholds;
  try {
    const parsed = JSON.parse(raw) as { thresholds?: BehaviorThresholds };
    for (const key of Object.keys(DEFAULT_THRESHOLDS) as Array<keyof BehaviorThresholds>) {
      const value = parsed.thresholds?.[key];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 60) thresholds[key] = value;
    }
    return thresholds;
  } catch {
    return { ...DEFAULT_THRESHOLDS };
  }
}
