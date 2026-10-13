// Shared data shapes for an exam session. These fields are also the LAN API
// contract with desktop-hub/ (see docs/ky-thuat/api-lan.md); rename nothing here
// without updating the desktop hub.

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertType =
  | 'no_face'
  | 'multiple_faces'
  | 'head_turn'
  | 'head_pose'
  | 'gaze_away'
  | 'focus_lost'
  | 'restricted_input';

export type StationState = 'offline' | 'normal' | 'warning' | 'critical';

export interface VisionMetrics {
  faceCount: number;
  gazeX: number;
  gazeY: number;
  headYaw: number;
  headPitch: number;
  fps: number;
}

export interface ExamEvent {
  id: string;
  roomId: string;
  stationId: string;
  candidateId: string;
  candidateName: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  timestamp: number;
  reviewed: boolean;
  source: 'ai' | 'browser' | 'demo';
}

export interface StationStatus {
  stationId: string;
  roomId: string;
  candidateId: string;
  candidateName: string;
  state: StationState;
  lastSeen: number;
  serverSeenAt?: number;
  analysisState?: 'loading' | 'ready' | 'stalled' | 'error' | 'stopped';
  analysisMessage?: string;
  lastAnalyzedAt?: number;
  behaviorProgress?: Array<{ type: AlertType; elapsedSeconds: number; requiredSeconds: number }>;
  metrics: VisionMetrics;
  alertCount: number;
}

export interface BehaviorThresholds {
  noFaceSeconds: number;
  multipleFacesSeconds: number;
  headTurnSeconds: number;
  gazeAwaySeconds: number;
  cooldownSeconds: number;
}
