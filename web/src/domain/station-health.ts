import type { VisionMetrics } from './exam-types';
import { exceedsVisionLimits } from './thresholds';

export type MetricsHealth = 'normal' | 'warning' | 'critical';

// Instant (per-frame) colour of a station; alerts still require the timed rules
// in behavior-engine.ts.
export function classifyMetrics(metrics: VisionMetrics): MetricsHealth {
  if (metrics.faceCount === 0 || metrics.faceCount > 1) return 'critical';
  if (exceedsVisionLimits(metrics)) return 'warning';
  return 'normal';
}
