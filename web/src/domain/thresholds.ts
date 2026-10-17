import type { BehaviorThresholds, VisionMetrics } from './exam-types';
export const DEFAULT_THRESHOLDS: BehaviorThresholds = {
    noFaceSeconds: 5,
    multipleFacesSeconds: 2,
    headTurnSeconds: 3,
    headPoseSeconds: 6,
    gazeAwaySeconds: 5,
    cooldownSeconds: 12,
};
export const VISION_LIMITS = { headYaw: 14, headPitch: 20, gazeX: 0.55, gazeY: 0.7 };
export const SETTINGS_STORAGE_KEY = 'examguard:settings:v2';
export function exceedsVisionLimits(metrics: VisionMetrics) {
    return Math.abs(metrics.headYaw) > VISION_LIMITS.headYaw
        || Math.abs(metrics.headPitch) > VISION_LIMITS.headPitch
        || Math.abs(metrics.gazeX) > VISION_LIMITS.gazeX
        || Math.abs(metrics.gazeY) > VISION_LIMITS.gazeY;
}
export function normalizeThresholds(input: unknown): BehaviorThresholds {
    const thresholds = { ...DEFAULT_THRESHOLDS };
    if (!input || typeof input !== 'object')
        return thresholds;
    const raw = input as Partial<BehaviorThresholds>;
    for (const key of Object.keys(DEFAULT_THRESHOLDS) as Array<keyof BehaviorThresholds>) {
        const value = raw[key];
        if (typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 60) {
            thresholds[key] = value;
        }
    }
    return thresholds;
}
export function parseSavedThresholds(raw: string | null): BehaviorThresholds {
    if (!raw)
        return { ...DEFAULT_THRESHOLDS };
    try {
        const parsed = JSON.parse(raw) as {
            thresholds?: unknown;
        };
        return normalizeThresholds(parsed.thresholds);
    }
    catch {
        return { ...DEFAULT_THRESHOLDS };
    }
}
export function parseSavedPrivacy(raw: string | null) {
    if (!raw)
        return { storeSnapshots: false, requireConsent: true };
    try {
        const parsed = JSON.parse(raw) as {
            storeSnapshots?: unknown;
            requireConsent?: unknown;
        };
        return {
            storeSnapshots: Boolean(parsed.storeSnapshots),
            requireConsent: parsed.requireConsent !== false,
        };
    }
    catch {
        return { storeSnapshots: false, requireConsent: true };
    }
}
