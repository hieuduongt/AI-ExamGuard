'use client';

import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  Cable,
  Check,
  CheckCircle2,
  CircleGauge,
  Eye,
  Info,
  Keyboard,
  LockKeyhole,
  Play,
  Radio,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  Square,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ExamGuardHeader } from '@/components/layout/examguard-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { EMPTY_METRICS, calculateMetrics } from '@/ai/face-metrics';
import { drawOverlay } from '@/ai/face-overlay';
import { loadFaceLandmarker } from '@/ai/face-landmarker-loader';
import { ALERT_LABELS, alertSeverity } from '@/domain/alert-catalog';
import { BehaviorEngine, behaviorDetail, type BehaviorProgress } from '@/domain/behavior-engine';
import type { AlertType, BehaviorThresholds, ExamEvent, VisionMetrics } from '@/domain/exam-types';
import { classifyMetrics } from '@/domain/station-health';
import { DEFAULT_THRESHOLDS, SETTINGS_STORAGE_KEY, VISION_LIMITS, parseSavedThresholds } from '@/domain/thresholds';
import { cameraErrorMessage } from '@/features/candidate/camera-errors';
import {
  getConfiguredHubUrl,
  getPendingEventCount,
  hasFirebaseConfig,
  makeId,
  publishEvent,
  publishStation,
  testHubConnection,
} from '@/services/exam-sync';

type ModelState = 'idle' | 'loading' | 'ready' | 'camera-only' | 'error';
type HubState = 'unchecked' | 'checking' | 'connected' | 'disconnected';
type CooldownTimer = Partial<Record<AlertType, number>>;

const initialMetrics: VisionMetrics = EMPTY_METRICS;
const { headYaw: HEAD_YAW_ALERT_DEGREES, headPitch: HEAD_PITCH_ALERT_DEGREES, gazeX: GAZE_X_ALERT_RATIO } = VISION_LIMITS;

export default function CandidatePage() {
  const [candidateName, setCandidateName] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [stationId, setStationId] = useState('');
  const [roomId, setRoomId] = useState('PHONG-01');
  const [hubAddress, setHubAddress] = useState(() => getConfiguredHubUrl());
  const [hubState, setHubState] = useState<HubState>(hasFirebaseConfig ? 'connected' : 'unchecked');
  const [hubMessage, setHubMessage] = useState(hasFirebaseConfig ? 'Đang đồng bộ qua Firebase.' : 'Nhập địa chỉ hiển thị trên máy giám thị.');
  const [consented, setConsented] = useState(true);
  const [running, setRunning] = useState(false);
  const [modelState, setModelState] = useState<ModelState>('idle');
  const [metrics, setMetrics] = useState<VisionMetrics>(initialMetrics);
  const [statusText, setStatusText] = useState('Sẵn sàng kiểm tra thiết bị');
  const [recentEvents, setRecentEvents] = useState<ExamEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [behaviorProgress, setBehaviorProgress] = useState<BehaviorProgress[]>([]);
  const [deliveredIds, setDeliveredIds] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
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

  useEffect(() => {
    const onDelivery = (event: Event) => {
      const { id } = (event as CustomEvent<{ id: string }>).detail;
      setDeliveredIds((items) => [...items.filter((item) => item !== id), id].slice(-500));
      setPendingCount(getPendingEventCount());
    };
    window.addEventListener('examguard-delivery', onDelivery);
    return () => window.removeEventListener('examguard-delivery', onDelivery);
  }, []);

  useEffect(() => {
    if (hasFirebaseConfig) return;
    const savedAddress = getConfiguredHubUrl();
    if (!savedAddress) return;
    void testHubConnection(savedAddress).then((result) => {
      setHubAddress(result.hubUrl || savedAddress);
      setHubState(result.ok ? 'connected' : 'disconnected');
      setHubMessage(result.message);
    });
  }, []);

  useEffect(() => {
    if (hasFirebaseConfig) return;
    const onHubStatus = (event: Event) => {
      const status = (event as CustomEvent<'connected' | 'disconnected'>).detail;
      setHubState(status);
      setHubMessage(status === 'connected'
        ? 'Đang gửi trạng thái tới máy giám thị.'
        : 'Mất kết nối máy giám thị. Hãy kiểm tra mạng LAN/Wi-Fi.');
    };
    window.addEventListener('examguard-hub-status', onHubStatus);
    return () => window.removeEventListener('examguard-hub-status', onHubStatus);
  }, []);

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
    setPendingCount(getPendingEventCount());
    setRecentEvents((events) => [event, ...events].slice(0, 6));
  }, []);

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
    setPendingCount(getPendingEventCount());
  }, []);

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

  useEffect(() => {
    if (!running) return;
    const onVisibility = () => { if (document.hidden) emitAlert('focus_lost', 'Thí sinh chuyển khỏi cửa sổ bài thi.', 'browser'); };
    const onRestrictedInput = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'p'].includes(event.key.toLowerCase())) {
        emitAlert('restricted_input', `Phát hiện tổ hợp phím ${event.ctrlKey ? 'Ctrl' : 'Cmd'}+${event.key.toUpperCase()}.`, 'browser');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('keydown', onRestrictedInput);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onRestrictedInput);
    };
  }, [emitAlert, running]);

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

  async function connectTeacherHub() {
    setHubState('checking');
    setHubMessage('Đang kiểm tra kết nối…');
    const result = await testHubConnection(hubAddress);
    setHubAddress(result.hubUrl || hubAddress);
    setHubState(result.ok ? 'connected' : 'disconnected');
    setHubMessage(result.message);
  }

  const statusTone = health === 'critical' ? 'bg-rose-500' : health === 'warning' ? 'bg-amber-400' : running ? 'bg-emerald-500' : 'bg-slate-400';

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <ExamGuardHeader active="candidate" monitoring={running || modelState === 'loading'} />
      <div className="mx-auto w-[min(1260px,calc(100%-28px))] py-7 sm:py-9">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div><Badge className="mb-3 bg-blue-100 text-blue-700">KHU VỰC THÍ SINH</Badge><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Kiểm tra thiết bị & bắt đầu giám sát</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Webcam được phân tích ngay trên máy này. Hệ thống chỉ gửi chỉ số trạng thái và sự kiện cần chú ý.</p></div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><span className={`size-2.5 rounded-full ${statusTone} ${running ? 'animate-pulse' : ''}`} /><div><small className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Trạng thái</small><b className="text-xs">{statusText}</b></div></div>
        </div>

        {running && <div className="mb-5 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p>Để kiểm tra trên cùng máy, bấm <b>Mở Giám thị ↗</b> ở phía trên. Webcam sẽ tiếp tục chạy ở cửa sổ này.</p>
          <p>{pendingCount > 0 ? `${pendingCount} cảnh báo đang chờ gửi lại. Hãy giữ ứng dụng mở.` : 'Cảnh báo sẽ ghi “Giám thị đã nhận” sau khi máy giám thị xác nhận.'}</p>
        </div>}
        {running && errorMessage && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{errorMessage}</p>}

        <div className={`grid gap-5 lg:grid-cols-[1.05fr_.95fr] ${running ? 'hidden' : ''}`}>
            <Card className="border-0 bg-white py-0 shadow-sm ring-1 ring-slate-200/80">
              <CardHeader className="border-b border-slate-100 px-6 py-5"><CardTitle className="flex items-center gap-2 font-extrabold"><UserRound className="size-5 text-blue-600" /> Thông tin phiên thi</CardTitle><CardDescription>Đối chiếu đúng phòng và số máy trước khi bắt đầu.</CardDescription></CardHeader>
              <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
                <label htmlFor="candidate-name" className="grid gap-2 text-xs font-bold text-slate-600">Họ và tên thí sinh<Input id="candidate-name" autoComplete="name" placeholder="Nhập đúng họ và tên" value={candidateName} onChange={(event) => setCandidateName(event.target.value)} className="h-11 bg-slate-50 text-sm font-medium" /></label>
                <label htmlFor="candidate-id" className="grid gap-2 text-xs font-bold text-slate-600">Số báo danh<Input id="candidate-id" placeholder="Ví dụ: SBD001" value={candidateId} onChange={(event) => setCandidateId(event.target.value.toUpperCase())} className="h-11 bg-slate-50 text-sm font-medium" /></label>
                <label htmlFor="room-id" className="grid gap-2 text-xs font-bold text-slate-600">Mã phòng thi<Input id="room-id" value={roomId} onChange={(event) => setRoomId(event.target.value.toUpperCase())} className="h-11 bg-slate-50 text-sm font-medium" /></label>
                <label htmlFor="station-id" className="grid gap-2 text-xs font-bold text-slate-600">Số máy / vị trí<Input id="station-id" value={stationId} onChange={(event) => setStationId(event.target.value.toUpperCase())} className="h-11 bg-slate-50 text-sm font-medium" /></label>
                {!hasFirebaseConfig && <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2"><Cable className="size-4 text-blue-600" /><b className="text-xs text-slate-800">Kết nối máy giám thị</b></div><p className="mt-1 text-[10px] leading-5 text-slate-500">Nhập địa chỉ LAN đang hiển thị trên dashboard của giáo viên.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input aria-label="Địa chỉ máy giám thị" value={hubAddress} onChange={(event) => { setHubAddress(event.target.value); setHubState('unchecked'); }} onKeyDown={(event) => { if (event.key === 'Enter') void connectTeacherHub(); }} placeholder="Ví dụ: http://192.168.1.10:8765" className="h-11 bg-white font-mono text-xs" /><Button type="button" variant="outline" onClick={() => void connectTeacherHub()} disabled={hubState === 'checking' || !hubAddress.trim()} className="h-11 shrink-0 bg-white"><Wifi className="size-4" />{hubState === 'checking' ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}</Button></div><div className={`mt-3 flex items-center gap-2 text-[10px] font-bold ${hubState === 'connected' ? 'text-emerald-700' : hubState === 'disconnected' ? 'text-rose-700' : 'text-slate-500'}`}>{hubState === 'connected' ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}{hubMessage}</div></div>}
                <div className="sm:col-span-2 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><Switch aria-label="Xác nhận đã đọc thông báo giám sát" checked={consented} onCheckedChange={setConsented} className="mt-0.5" /><div><b className="block text-xs text-blue-950">Tôi đã đọc thông báo giám sát</b><p className="mt-1 text-xs leading-5 text-blue-700/75">Tôi đồng ý bật webcam trong thời gian thi và hiểu rằng AI chỉ tạo cảnh báo hỗ trợ giám thị.</p></div></div>
                <Button size="lg" disabled={modelState === 'loading' || !consented || !candidateName.trim() || !candidateId.trim() || !roomId.trim() || !stationId.trim() || (!hasFirebaseConfig && hubState !== 'connected')} onClick={startMonitoring} className="h-12 rounded-xl bg-blue-600 font-extrabold hover:bg-blue-500 sm:col-span-2"><Play data-icon="inline-start" /> {modelState === 'loading' ? 'Đang chuẩn bị webcam…' : 'Kiểm tra webcam và bắt đầu'}</Button>
                {errorMessage && <p className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700"><AlertTriangle className="mr-2 inline size-4" />{errorMessage}</p>}
              </CardContent>
            </Card>

            <Card className="border-0 bg-[#091a34] py-0 text-white shadow-xl shadow-slate-300/30 ring-0">
              <CardHeader className="px-6 pt-6"><CardTitle className="font-extrabold">Hệ thống sẽ kiểm tra</CardTitle><CardDescription className="text-slate-400">Các tín hiệu được lọc theo bộ đệm 2–5 giây để giảm báo nhầm.</CardDescription></CardHeader>
              <CardContent className="grid gap-3 p-6 pt-4">
                {[
                  [ScanFace, 'Khuôn mặt', 'Vắng mặt hoặc xuất hiện người thứ hai'],
                  [Eye, 'Hướng nhìn', 'Nhìn lệch trái, phải, lên hoặc xuống'],
                  [RotateCcw, 'Tư thế đầu', 'Quay, cúi hoặc ngẩng kéo dài'],
                  [Keyboard, 'Tương tác trình duyệt', 'Chuyển tab, sao chép hoặc in'],
                ].map(([Icon, title, detail]) => <div key={String(title)} className="flex items-center gap-4 rounded-2xl border border-white/7 bg-white/[.045] p-4"><span className="grid size-10 place-items-center rounded-xl bg-blue-500/15 text-cyan-300"><Icon className="size-5" /></span><div><b className="block text-sm">{String(title)}</b><small className="mt-1 block text-xs text-slate-400">{String(detail)}</small></div><Check className="ml-auto size-4 text-emerald-400" /></div>)}
                <div className="mt-1 flex items-start gap-3 rounded-xl bg-emerald-400/8 p-4 text-emerald-200"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><p className="text-xs leading-5">Video không được truyền liên tục lên máy giám thị trong cấu hình mặc định.</p></div>
              </CardContent>
            </Card>
        </div>

        <div className={`grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.55fr)] ${running ? '' : 'hidden'}`}>
            <section className="overflow-hidden rounded-[22px] bg-[#07162d] shadow-[0_24px_70px_rgba(9,28,55,.24)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4 text-white"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-emerald-400/12 text-emerald-300"><Radio className="size-[18px]" /></span><div><b className="block text-sm">{candidateName} · {candidateId}</b><small className="text-[10px] font-semibold text-slate-400">{roomId} · {stationId}</small></div></div><div className="flex items-center gap-2"><Badge className={`${hubState === 'connected' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-200'} border-0`}><Wifi className="mr-1 size-3" />{hubState === 'connected' ? 'Đã nối máy giám thị' : 'Mất kết nối'}</Badge><Badge className={`${modelState === 'ready' && !analysisStalled ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-300/15 text-amber-200'} border-0`}><span className="mr-1 size-1.5 rounded-full bg-current" />{modelState === 'ready' ? (analysisStalled ? 'AI đã tạm dừng' : 'AI cục bộ đang chạy') : 'Chế độ camera'}</Badge><Button variant="ghost" size="sm" onClick={stopMonitoring} className="text-slate-300 hover:bg-white/8 hover:text-white"><Square className="size-3.5" /> Dừng</Button></div></div>
              <div className="relative aspect-video bg-[#030b17]">
                <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
                <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100" />
                {modelState === 'loading' && <div className="absolute inset-0 grid place-items-center bg-[#07162d]/82 text-center text-white backdrop-blur-sm"><div><BrainCircuit className="mx-auto size-9 animate-pulse text-cyan-300" /><b className="mt-4 block text-sm">Đang chuẩn bị MediaPipe Face Landmarker</b><p className="mt-2 text-xs text-slate-400">Lần đầu có thể mất vài giây để tải mô hình.</p></div></div>}
                <div className="absolute left-4 top-4 flex gap-2"><span className="rounded-lg bg-black/45 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur">720p</span><span className="rounded-lg bg-black/45 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur">{metrics.fps || '—'} FPS AI</span></div>
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between"><div className="rounded-xl bg-black/55 px-3 py-2 text-white backdrop-blur"><small className="block text-[9px] text-slate-300">KHUNG HÌNH</small><b className="mt-1 flex items-center gap-2 text-xs"><span className={`size-2 rounded-full ${statusTone}`} />{health === 'critical' ? 'Cần trở lại vị trí' : health === 'warning' ? 'Đang theo dõi tín hiệu' : 'Vị trí phù hợp'}</b></div><div className="rounded-xl bg-black/55 p-2 text-[9px] text-slate-300 backdrop-blur"><ShieldCheck className="mr-1 inline size-3.5 text-emerald-300" /> Chỉ gửi sự kiện</div></div>
              </div>
            </section>

            <aside className="grid content-start gap-5">
              <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80">
                <CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><CircleGauge className="size-4 text-blue-600" /> Tín hiệu thời gian thực</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 p-5">
                  {[
                    ['Khuôn mặt', String(metrics.faceCount), metrics.faceCount === 1 ? 'Tốt' : 'Kiểm tra'],
                    ['Quay đầu', `${Math.abs(metrics.headYaw).toFixed(0)}°`, Math.abs(metrics.headYaw) <= HEAD_YAW_ALERT_DEGREES ? 'Trong ngưỡng' : 'Lệch'],
                    ['Cúi/ngẩng', `${Math.abs(metrics.headPitch).toFixed(0)}°`, Math.abs(metrics.headPitch) <= HEAD_PITCH_ALERT_DEGREES ? 'Trong ngưỡng' : 'Lệch'],
                    ['Hướng mắt', `${Math.abs(metrics.gazeX * 100).toFixed(0)}%`, Math.abs(metrics.gazeX) <= GAZE_X_ALERT_RATIO ? 'Trung tâm' : 'Lệch'],
                  ].map(([label, value, hint]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><small className="text-[10px] font-semibold text-slate-400">{label}</small><b className="mt-1 block text-lg font-black tracking-tight">{value}</b><span className="mt-1 block text-[9px] font-bold text-slate-500">{hint}</span></div>)}
                  <div className="col-span-2 border-t border-slate-100 pt-4" aria-live="polite">
                    <b className="block text-sm text-slate-800">Tiến trình tạo cảnh báo</b>
                    {modelState !== 'ready' || analysisStalled ? <p className="mt-2 text-sm text-amber-700">Chưa có AI phân tích. Camera mở chưa có nghĩa là đã nhận diện.</p> : behaviorProgress.length ? behaviorProgress.map((item) => <div key={item.type} className="mt-3"><div className="mb-1 flex justify-between gap-2 text-sm"><span>{ALERT_LABELS[item.type]}</span><b>{Math.min(item.elapsedSeconds, item.requiredSeconds).toFixed(1)} / {item.requiredSeconds}s</b></div><Progress value={Math.min(100, item.elapsedSeconds / item.requiredSeconds * 100)} /></div>) : <p className="mt-2 text-sm text-slate-500">Chưa có tín hiệu vượt ngưỡng. Quay đầu: trên {HEAD_YAW_ALERT_DEGREES}° ước tính trong {activeThresholds.headTurnSeconds}s.</p>}
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600"><span><CircleGauge className="mr-2 inline size-4 text-slate-400" /> Chế độ máy cấu hình thấp</span><Switch aria-label="Chế độ máy cấu hình thấp" size="sm" checked={lowPowerMode} onCheckedChange={setLowPowerMode} /></div>
                </CardContent>
              </Card>

              <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80">
                <CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><AlertTriangle className="size-4 text-amber-500" /> Sự kiện trên máy này</CardTitle></CardHeader>
                <CardContent className="p-3">
                  {recentEvents.length ? recentEvents.map((event) => <div key={event.id} className="flex gap-3 rounded-xl p-3 hover:bg-slate-50"><span className={`mt-0.5 size-2 shrink-0 rounded-full ${event.severity === 'critical' ? 'bg-rose-500' : event.severity === 'warning' ? 'bg-amber-400' : 'bg-cyan-500'}`} /><div><b className="block text-xs">{event.title}</b><small className="mt-1 block text-[10px] leading-4 text-slate-400">{new Date(event.timestamp).toLocaleTimeString('vi-VN')}</small><small className={`mt-1 block text-sm ${deliveredIds.includes(event.id) ? 'text-emerald-700' : 'text-amber-700'}`}>{deliveredIds.includes(event.id) ? 'Giám thị đã nhận' : 'Đang chờ gửi đến giám thị'}</small></div></div>) : <div className="py-6 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-500" /><p className="mt-2 text-xs font-bold text-slate-700">Chưa có sự kiện cảnh báo</p><small className="mt-1 block text-[10px] text-slate-400">Hãy giữ tư thế ổn định và nhìn vào màn hình.</small></div>}
                  <details className="mt-2 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-[10px] font-bold text-slate-500">Kiểm tra đường truyền cảnh báo</summary><div className="mt-3 grid grid-cols-2 gap-2"><Button variant="outline" size="xs" onClick={() => createTestAlert('gaze_away')}>Thử cảnh báo vàng</Button><Button variant="outline" size="xs" onClick={() => createTestAlert('no_face')}>Thử cảnh báo đỏ</Button></div></details>
                </CardContent>
              </Card>
            </aside>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-500"><Info className="mt-0.5 size-4 shrink-0 text-blue-500" /><p className="text-xs leading-5"><b className="text-slate-700">Lưu ý:</b> AI ExamGuard chỉ hỗ trợ giám sát và không tự kết luận vi phạm. Mọi cảnh báo cần được giám thị xem xét cùng bối cảnh thực tế.</p></div>
      </div>
    </main>
  );
}
