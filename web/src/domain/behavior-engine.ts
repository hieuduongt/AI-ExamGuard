import type { AlertType, BehaviorThresholds, VisionMetrics } from './exam-types';
import { VISION_LIMITS } from './thresholds';

const RECOVERY_MS = 400;
const MAX_FRAME_GAP_MS = 1500;

export interface BehaviorProgress {
  type: AlertType;
  elapsedSeconds: number;
  requiredSeconds: number;
}

interface SignalTimer { activeMs: number; quietMs: number; wasActive: boolean }

// Count observed abnormal frames, tolerate brief tracking noise, and never
// count a paused camera as several seconds of observed behaviour.
export class BehaviorEngine {
  private timers = new Map<AlertType, SignalTimer>();
  private lastFrame: number | null = null;

  reset() { this.timers.clear(); this.lastFrame = null; }

  update(metrics: VisionMetrics, now: number, thresholds: BehaviorThresholds) {
    let delta = this.lastFrame === null ? 0 : now - this.lastFrame;
    if (delta < 0 || delta > MAX_FRAME_GAP_MS) { this.timers.clear(); delta = 0; }
    this.lastFrame = now;
    const singleFace = metrics.faceCount === 1;
    const conditions: Array<[AlertType, boolean, number]> = [
      ['no_face', metrics.faceCount === 0, thresholds.noFaceSeconds],
      ['multiple_faces', metrics.faceCount > 1, thresholds.multipleFacesSeconds],
      ['head_turn', singleFace && Math.abs(metrics.headYaw) > VISION_LIMITS.headYaw, thresholds.headTurnSeconds],
      ['head_pose', singleFace && Math.abs(metrics.headPitch) > VISION_LIMITS.headPitch, thresholds.headTurnSeconds],
      ['gaze_away', singleFace && (Math.abs(metrics.gazeX) > VISION_LIMITS.gazeX || Math.abs(metrics.gazeY) > VISION_LIMITS.gazeY), thresholds.gazeAwaySeconds],
    ];
    const progress: BehaviorProgress[] = [];
    const triggered: BehaviorProgress[] = [];
    for (const [type, active, seconds] of conditions) {
      const timer = this.timers.get(type) ?? { activeMs: 0, quietMs: 0, wasActive: false };
      if (active) {
        if (timer.wasActive) timer.activeMs += delta;
        timer.quietMs = 0;
      } else {
        timer.quietMs += delta;
        if (timer.quietMs >= RECOVERY_MS) timer.activeMs = 0;
      }
      timer.wasActive = active;
      this.timers.set(type, timer);
      if (active || timer.activeMs > 0) {
        const item = { type, elapsedSeconds: timer.activeMs / 1000, requiredSeconds: seconds };
        progress.push(item);
        if (active && timer.activeMs >= seconds * 1000) triggered.push(item);
      }
    }
    return { progress, triggered };
  }
}

export function behaviorDetail(item: BehaviorProgress, metrics: VisionMetrics) {
  const duration = item.elapsedSeconds.toFixed(1);
  switch (item.type) {
    case 'head_turn': return `Quay đầu: chỉ số góc ước tính ${Math.abs(metrics.headYaw).toFixed(1)}°, vượt ngưỡng trong ${duration} giây quan sát.`;
    case 'head_pose': return `Cúi/ngẩng đầu: chỉ số góc ước tính ${Math.abs(metrics.headPitch).toFixed(1)}°, trong ${duration} giây quan sát.`;
    case 'no_face': return `Không phát hiện khuôn mặt trong ${duration} giây quan sát.`;
    case 'multiple_faces': return `Phát hiện ${metrics.faceCount} khuôn mặt trong ${duration} giây quan sát.`;
    default: return `Hướng mắt lệch màn hình trong ${duration} giây quan sát.`;
  }
}
