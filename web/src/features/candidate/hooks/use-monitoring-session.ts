import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_METRICS, calculateMetrics } from '@/ai/face-metrics';
import { drawOverlay } from '@/ai/face-overlay';
import { loadFaceLandmarker } from '@/ai/face-landmarker-loader';
import { ALERT_LABELS, alertSeverity } from '@/domain/alert-catalog';
import { BehaviorEngine, behaviorDetail, type BehaviorProgress } from '@/domain/behavior-engine';
import type { AlertType, BehaviorThresholds, ExamEvent, VisionMetrics } from '@/domain/exam-types';
import { classifyMetrics } from '@/domain/station-health';
import { DEFAULT_THRESHOLDS, SETTINGS_STORAGE_KEY, parseSavedThresholds } from '@/domain/thresholds';
import { hasFirebaseConfig, makeId, publishEvent, publishStation } from '@/services/exam-sync';
import { cameraErrorMessage } from '../camera-errors';
import { useBrowserGuard } from './use-browser-guard';
import type { HubState } from './use-hub-connection';

export type ModelState = 'idle' | 'loading' | 'ready' | 'camera-only' | 'error';
export type EmitAlert = (type: AlertType, detail: string, source?: ExamEvent['source']) => void;
type CooldownTimer = Partial<Record<AlertType, number>>;

const initialMetrics: VisionMetrics = EMPTY_METRICS;

type Options = { hubState: HubState; refreshPendingCount: () => void };

// One monitoring session on the candidate machine:
// webcam -> face landmarks -> behaviour engine -> alerts, plus a station heartbeat every 2 s.
export function useMonitoringSession({ hubState, refreshPendingCount }: Options) {
  const [candidateName, setCandidateName] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [stationId, setStationId] = useState('');
  const [roomId, setRoomId] = useState('PHONG-01');
  const [consented, setConsented] = useState(true);
  const [running, setRunning] = useState(false);
  const [modelState, setModelState] = useState<ModelState>('idle');
  const [metrics, setMetrics] = useState<VisionMetrics>(initialMetrics);
  const [statusText, setStatusText] = useState('Sẵn sàng kiểm tra thiết bị');
  const [recentEvents, setRecentEvents] = useState<ExamEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [behaviorProgress, setBehaviorProgress] = useState<BehaviorProgress[]>([]);
  const [activeThresholds, setActiveThresholds] = useState(DEFAULT_THRESHOLDS);
  const [analysisStalled, setAnalysisStalled] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationRef = useRef(0);
  const detectionLoopRef = useRef<() => void>(() => undefined);
  const runningRef = useRef(false);
  const identityRef = useRef({ candidateName, candidateId, stationId, roomId });
  const metricsRef = useRef(initialMetrics);
  const engineRef = useRef(new BehaviorEngine());
  const progressRef = useRef<BehaviorProgress[]>([]);
  const lastAnalyzedRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const modelStateRef = useRef<ModelState>('idle');
  const analysisErrorRef = useRef('');
  const sessionRef = useRef(0);
  const cooldownsRef = useRef<CooldownTimer>({});
  const lastFrameRef = useRef({ timestamp: 0, frameCount: 0, fpsStarted: 0, fps: 0 });
  const alertCountRef = useRef(0);
  const thresholdsRef = useRef<BehaviorThresholds>(DEFAULT_THRESHOLDS);

  useEffect(() => { identityRef.current = { candidateName, candidateId, stationId, roomId }; }, [candidateId, candidateName, roomId, stationId]);

  const health = useMemo(() => {
    if (!running) return 'idle';
    return classifyMetrics(metrics);
  }, [metrics, running]);

  const emitAlert = useCallback((type: AlertType, detail: string, source: ExamEvent['source'] = 'ai') => {
    const now = Date.now();
    const lastSent = cooldownsRef.current[type] ?? 0;
    if (source !== 'demo' && now - lastSent < thresholdsRef.current.cooldownSeconds * 1000) return;
    if (source !== 'demo') cooldownsRef.current[type] = now;
    alertCountRef.current += 1;
    const identity = identityRef.current;
    const severity = alertSeverity(type);
    const event: ExamEvent = {
      id: makeId(),
      ...identity,
      type,
      severity,
      title: ALERT_LABELS[type],
      detail,
      timestamp: now,
      reviewed: false,
      source,
    };
    publishEvent(event);
    refreshPendingCount();
    setRecentEvents((events) => [event, ...events].slice(0, 6));
  }, [refreshPendingCount]);

  const evaluateBehavior = useCallback((nextMetrics: VisionMetrics, now: number) => {
    const result = engineRef.current.update(nextMetrics, now, thresholdsRef.current);
    progressRef.current = result.progress;
    setBehaviorProgress(result.progress);
    for (const item of result.triggered) emitAlert(item.type, behaviorDetail(item, nextMetrics));
  }, [emitAlert]);

  const updateStation = useCallback((nextMetrics: VisionMetrics) => {
    const identity = identityRef.current;
    const fresh = lastAnalyzedRef.current > 0 && Date.now() - lastAnalyzedRef.current < 3000;
    const analysisState = modelStateRef.current === 'ready' ? (fresh ? 'ready' : 'stalled')
      : modelStateRef.current === 'loading' ? 'loading' : 'error';
    setAnalysisStalled(analysisState === 'stalled');
    const state = analysisState !== 'ready' ? 'warning' : classifyMetrics(nextMetrics);
    publishStation({ ...identity, state, metrics: nextMetrics, lastSeen: Date.now(), alertCount: alertCountRef.current,
      analysisState, lastAnalyzedAt: lastAnalyzedRef.current, behaviorProgress: fresh ? progressRef.current : [],
      analysisMessage: analysisState === 'stalled' ? 'Camera không có khung hình AI mới' : analysisErrorRef.current,
    });
    if (analysisState === 'stalled') {
      setStatusText('Phân tích đang tạm dừng — kiểm tra webcam hoặc dừng rồi bắt đầu lại');
      setBehaviorProgress([]);
    }
    refreshPendingCount();
  }, [refreshPendingCount]);

  const detectionLoop = useCallback(() => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    const now = performance.now();
    const frameInterval = lowPowerMode ? 160 : 80;

    if (video && canvas && landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastFrameRef.current.timestamp = now;
      if (!lastFrameRef.current.fpsStarted) lastFrameRef.current.fpsStarted = now;
      lastFrameRef.current.frameCount += 1;
      if (now - lastFrameRef.current.fpsStarted >= 1000) {
        lastFrameRef.current.fps = Math.round(lastFrameRef.current.frameCount * 1000 / (now - lastFrameRef.current.fpsStarted));
        lastFrameRef.current.frameCount = 0;
        lastFrameRef.current.fpsStarted = now;
      }
      try {
        const result = landmarker.detectForVideo(video, now);
        lastVideoTimeRef.current = video.currentTime;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        drawOverlay(canvas, result);
        const nextMetrics = calculateMetrics(result, lastFrameRef.current.fps);
        metricsRef.current = nextMetrics;
        lastAnalyzedRef.current = Date.now();
        analysisErrorRef.current = '';
        setErrorMessage('');
        setStatusText('AI đang phân tích cục bộ trên thiết bị');
        setMetrics(nextMetrics);
        evaluateBehavior(nextMetrics, Date.now());
      } catch (error) {
        analysisErrorRef.current = error instanceof Error ? error.message : 'Không phân tích được khung hình';
        setErrorMessage(`AI gặp lỗi: ${analysisErrorRef.current}`);
        setStatusText('AI gặp lỗi — chưa thể phát hiện hành vi');
      }
    }
    animationRef.current = window.setTimeout(() => detectionLoopRef.current(), frameInterval);
  }, [evaluateBehavior, lowPowerMode]);

  useEffect(() => { detectionLoopRef.current = detectionLoop; }, [detectionLoop]);

  const stopMonitoring = useCallback(() => {
    const wasRunning = runningRef.current;
    sessionRef.current += 1;
    runningRef.current = false;
    window.clearTimeout(animationRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    modelStateRef.current = 'idle';
    engineRef.current.reset();
    progressRef.current = [];
    setRunning(false);
    setModelState('idle');
    setStatusText('Phiên giám sát đã dừng');
    const identity = identityRef.current;
    if (wasRunning) publishStation({ ...identity, state: 'offline', analysisState: 'stopped', analysisMessage: 'Phiên giám sát đã dừng', metrics: metricsRef.current, lastSeen: Date.now(), alertCount: alertCountRef.current });
  }, []);

  useEffect(() => () => stopMonitoring(), [stopMonitoring]);

  useBrowserGuard(running, emitAlert);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => updateStation(metricsRef.current), 2000);
    updateStation(metricsRef.current);
    return () => window.clearInterval(timer);
  }, [running, updateStation]);

  async function startMonitoring() {
    if (!consented || modelStateRef.current === 'loading') return;
    if (!hasFirebaseConfig && hubState !== 'connected') {
      setErrorMessage('Bạn phải kết nối thành công với máy giám thị trước khi bắt đầu.');
      return;
    }
    const identity = {
      candidateName: candidateName.trim(),
      candidateId: candidateId.trim().toUpperCase(),
      roomId: roomId.trim().toUpperCase(),
      stationId: stationId.trim().toUpperCase(),
    };
    identityRef.current = identity;
    const session = ++sessionRef.current;
    engineRef.current.reset();
    progressRef.current = [];
    cooldownsRef.current = {};
    lastAnalyzedRef.current = 0;
    lastVideoTimeRef.current = -1;
    lastFrameRef.current = { timestamp: 0, frameCount: 0, fpsStarted: 0, fps: 0 };
    metricsRef.current = initialMetrics;
    analysisErrorRef.current = '';
    setBehaviorProgress([]);
    setAnalysisStalled(false);
    setMetrics(initialMetrics);
    setCandidateName(identity.candidateName);
    setCandidateId(identity.candidateId);
    setRoomId(identity.roomId);
    setStationId(identity.stationId);
    thresholdsRef.current = parseSavedThresholds(localStorage.getItem(SETTINGS_STORAGE_KEY));
    setActiveThresholds(thresholdsRef.current);
    setErrorMessage('');
    setModelState('loading');
    modelStateRef.current = 'loading';
    setStatusText('Đang xin quyền sử dụng webcam…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt này không hỗ trợ truy cập webcam. Hãy dùng phiên bản Chrome hoặc Edge mới nhất.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 }, facingMode: 'user' }, audio: false });
      if (session !== sessionRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Không tìm thấy vùng hiển thị camera.');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (session !== sessionRef.current) return;
      setRunning(true);
      runningRef.current = true;
      setStatusText('Đang tải mô hình nhận diện khuôn mặt…');

      try {
        const detector = await loadFaceLandmarker(() => session !== sessionRef.current);
        if (!detector) return;
        if (session !== sessionRef.current) { detector.close(); return; }
        landmarkerRef.current = detector;
        modelStateRef.current = 'ready';
        setModelState('ready');
        setStatusText('AI đang phân tích cục bộ trên thiết bị');
        detectionLoopRef.current();
      } catch (error) {
        if (session !== sessionRef.current) return;
        modelStateRef.current = 'camera-only';
        analysisErrorRef.current = error instanceof Error ? error.message : 'Không tải được mô hình MediaPipe';
        setModelState('camera-only');
        setStatusText('Camera hoạt động; mô hình AI chưa tải được');
        setErrorMessage(`Chưa có AI nhận diện. ${analysisErrorRef.current}`);
      }
    } catch (error) {
      if (session !== sessionRef.current) return;
      modelStateRef.current = 'error';
      setModelState('error');
      setRunning(false);
      runningRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStatusText('Không thể khởi động webcam');
      setErrorMessage(cameraErrorMessage(error));
    }
  }

  function createTestAlert(type: AlertType) {
    emitAlert(type, 'Sự kiện thử do thí sinh tạo để kiểm tra đường truyền.', 'demo');
  }

  return {
    candidateName, setCandidateName, candidateId, setCandidateId, roomId, setRoomId, stationId, setStationId,
    consented, setConsented, running, modelState, metrics, statusText, recentEvents, errorMessage,
    lowPowerMode, setLowPowerMode, behaviorProgress, activeThresholds, analysisStalled, health,
    videoRef, canvasRef, startMonitoring, stopMonitoring, createTestAlert,
  };
}
