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
  candidateName: string;
  state: StationState;
  lastSeen: number;
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

export const DEFAULT_THRESHOLDS: BehaviorThresholds = {
  noFaceSeconds: 5,
  multipleFacesSeconds: 2,
  headTurnSeconds: 4,
  gazeAwaySeconds: 5,
  cooldownSeconds: 12,
};

export const SETTINGS_STORAGE_KEY = 'examguard:settings:v1';

export const ALERT_LABELS: Record<AlertType, string> = {
  no_face: 'Không có mặt trước máy',
  multiple_faces: 'Xuất hiện nhiều khuôn mặt',
  head_turn: 'Quay đầu trái/phải kéo dài',
  head_pose: 'Cúi/ngẩng đầu bất thường',
  gaze_away: 'Hướng mắt lệch màn hình',
  focus_lost: 'Rời khỏi cửa sổ bài thi',
  restricted_input: 'Thao tác bàn phím bị hạn chế',
};
