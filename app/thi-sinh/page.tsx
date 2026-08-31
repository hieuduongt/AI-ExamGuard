'use client';

import type { FaceLandmarker, FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
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
} from 'lucide-react';
import { ExamGuardHeader } from '@/components/examguard-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ALERT_LABELS, DEFAULT_THRESHOLDS, SETTINGS_STORAGE_KEY, type AlertType, type BehaviorThresholds, type ExamEvent, type VisionMetrics } from '@/lib/exam-types';
import { makeId, publishEvent, publishStation } from '@/lib/exam-store';

type ModelState = 'idle' | 'loading' | 'ready' | 'camera-only' | 'error';
type ActiveTimer = Partial<Record<AlertType, number>>;
type CooldownTimer = Partial<Record<AlertType, number>>;

const initialMetrics: VisionMetrics = { faceCount: 0, gazeX: 0, gazeY: 0, headYaw: 0, headPitch: 0, fps: 0 };

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function point(landmarks: NormalizedLandmark[], index: number) {
  return landmarks[index] ?? { x: 0.5, y: 0.5, z: 0, visibility: 0 };
}

function ratio(value: number, min: number, max: number) {
  return (value - min) / Math.max(max - min, 0.001);
}

function calculateMetrics(result: FaceLandmarkerResult, fps: number): VisionMetrics {
  const faceCount = result.faceLandmarks.length;
  if (!faceCount) return { ...initialMetrics, fps };
  const landmarks = result.faceLandmarks[0];
  const nose = point(landmarks, 1);
  const leftCheek = point(landmarks, 234);
  const rightCheek = point(landmarks, 454);
  const forehead = point(landmarks, 10);
  const chin = point(landmarks, 152);

  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
  const headYaw = ((nose.x - average([leftCheek.x, rightCheek.x])) / Math.max(faceWidth, 0.01)) * 110;
  const headPitch = (ratio(nose.y, forehead.y, chin.y) - 0.54) * 95;

  const leftIris = point(landmarks, 468);
  const rightIris = point(landmarks, 473);
  const leftX = ratio(leftIris.x, point(landmarks, 33).x, point(landmarks, 133).x);
  const rightX = ratio(rightIris.x, point(landmarks, 362).x, point(landmarks, 263).x);
  const leftY = ratio(leftIris.y, point(landmarks, 159).y, point(landmarks, 145).y);
  const rightY = ratio(rightIris.y, point(landmarks, 386).y, point(landmarks, 374).y);

  return {
    faceCount,
    gazeX: (average([leftX, rightX]) - 0.5) * 2,
    gazeY: (average([leftY, rightY]) - 0.5) * 2,
    headYaw,
    headPitch,
    fps,
  };
}

function drawOverlay(canvas: HTMLCanvasElement, result: FaceLandmarkerResult) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  result.faceLandmarks.forEach((landmarks, faceIndex) => {
    const xs = landmarks.map((item) => item.x * canvas.width);
    const ys = landmarks.map((item) => item.y * canvas.height);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const width = Math.max(...xs) - left;
    const height = Math.max(...ys) - top;
    context.strokeStyle = faceIndex === 0 ? '#34d399' : '#fb7185';
    context.lineWidth = 3;
    context.setLineDash([10, 7]);
    context.strokeRect(left - 10, top - 10, width + 20, height + 20);
    context.setLineDash([]);
    [1, 33, 133, 362, 263, 468, 473].forEach((index) => {
      const landmark = point(landmarks, index);
      context.fillStyle = index >= 468 ? '#22d3ee' : '#60a5fa';
      context.beginPath();
      context.arc(landmark.x * canvas.width, landmark.y * canvas.height, index >= 468 ? 4 : 2.5, 0, Math.PI * 2);
      context.fill();
    });
  });
}

export default function CandidatePage() {
  const [candidateName, setCandidateName] = useState('Nguyễn Minh Anh');
  const [stationId, setStationId] = useState('PC-01');
  const [roomId, setRoomId] = useState('PHONG-01');
  const [consented, setConsented] = useState(true);
  const [running, setRunning] = useState(false);
  const [modelState, setModelState] = useState<ModelState>('idle');
  const [metrics, setMetrics] = useState<VisionMetrics>(initialMetrics);
  const [statusText, setStatusText] = useState('Sẵn sàng kiểm tra thiết bị');
  const [recentEvents, setRecentEvents] = useState<ExamEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [lowPowerMode, setLowPowerMode] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationRef = useRef(0);
  const detectionLoopRef = useRef<() => void>(() => undefined);
  const runningRef = useRef(false);
  const identityRef = useRef({ candidateName, stationId, roomId });
  const metricsRef = useRef(initialMetrics);
  const activeTimersRef = useRef<ActiveTimer>({});
  const cooldownsRef = useRef<CooldownTimer>({});
  const lastFrameRef = useRef({ timestamp: 0, frameCount: 0, fpsStarted: 0, fps: 0 });
  const alertCountRef = useRef(0);
  const thresholdsRef = useRef<BehaviorThresholds>(DEFAULT_THRESHOLDS);

  useEffect(() => { identityRef.current = { candidateName, stationId, roomId }; }, [candidateName, roomId, stationId]);

  const health = useMemo(() => {
    if (!running) return 'idle';
    if (metrics.faceCount === 0) return 'critical';
    if (metrics.faceCount > 1 || Math.abs(metrics.headYaw) > 22 || Math.abs(metrics.gazeX) > 0.55) return 'warning';
    return 'normal';
  }, [metrics, running]);

  const emitAlert = useCallback((type: AlertType, detail: string, source: ExamEvent['source'] = 'ai') => {
    const now = Date.now();
    const lastSent = cooldownsRef.current[type] ?? 0;
    if (now - lastSent < thresholdsRef.current.cooldownSeconds * 1000) return;
    cooldownsRef.current[type] = now;
    alertCountRef.current += 1;
    const identity = identityRef.current;
    const severity = type === 'no_face' || type === 'multiple_faces' ? 'critical' : type === 'gaze_away' ? 'info' : 'warning';
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
    setRecentEvents((events) => [event, ...events].slice(0, 6));
  }, []);

  const evaluateBehavior = useCallback((nextMetrics: VisionMetrics, now: number) => {
    const thresholds = thresholdsRef.current;
    const conditions: Array<[AlertType, boolean, number, string]> = [
      ['no_face', nextMetrics.faceCount === 0, thresholds.noFaceSeconds, `Không phát hiện khuôn mặt trong ${thresholds.noFaceSeconds} giây.`],
      ['multiple_faces', nextMetrics.faceCount > 1, thresholds.multipleFacesSeconds, `Phát hiện ${nextMetrics.faceCount} khuôn mặt trong khung hình.`],
      ['head_turn', Math.abs(nextMetrics.headYaw) > 22, thresholds.headTurnSeconds, `Góc quay đầu ước tính ${Math.abs(nextMetrics.headYaw).toFixed(0)}°.`],
      ['head_pose', Math.abs(nextMetrics.headPitch) > 20, thresholds.headTurnSeconds, `Góc cúi/ngẩng ước tính ${Math.abs(nextMetrics.headPitch).toFixed(0)}°.`],
      ['gaze_away', Math.abs(nextMetrics.gazeX) > 0.55 || Math.abs(nextMetrics.gazeY) > 0.7, thresholds.gazeAwaySeconds, 'Hướng mắt rời vùng màn hình trong thời gian kéo dài.'],
    ];

    conditions.forEach(([type, active, seconds, detail]) => {
      if (!active) { delete activeTimersRef.current[type]; return; }
      activeTimersRef.current[type] ??= now;
      if (now - (activeTimersRef.current[type] ?? now) >= seconds * 1000) {
        emitAlert(type, detail);
        activeTimersRef.current[type] = now;
      }
    });
  }, [emitAlert]);

  const updateStation = useCallback((nextMetrics: VisionMetrics) => {
    const identity = identityRef.current;
    const state = nextMetrics.faceCount === 0 || nextMetrics.faceCount > 1
      ? 'critical'
      : Math.abs(nextMetrics.headYaw) > 22 || Math.abs(nextMetrics.gazeX) > 0.55
        ? 'warning'
        : 'normal';
    publishStation({ ...identity, state, metrics: nextMetrics, lastSeen: Date.now(), alertCount: alertCountRef.current });
  }, []);

  const detectionLoop = useCallback(() => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    const now = performance.now();
    const frameInterval = lowPowerMode ? 160 : 80;

    if (video && canvas && landmarker && video.readyState >= 2 && now - lastFrameRef.current.timestamp >= frameInterval) {
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
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        drawOverlay(canvas, result);
        const nextMetrics = calculateMetrics(result, lastFrameRef.current.fps);
        metricsRef.current = nextMetrics;
        setMetrics(nextMetrics);
        evaluateBehavior(nextMetrics, Date.now());
      } catch {
        setStatusText('Đang khôi phục bộ phân tích hình ảnh…');
      }
    }
    animationRef.current = requestAnimationFrame(() => detectionLoopRef.current());
  }, [evaluateBehavior, lowPowerMode]);

  useEffect(() => { detectionLoopRef.current = detectionLoop; }, [detectionLoop]);

  const stopMonitoring = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    setRunning(false);
    setModelState('idle');
    setStatusText('Phiên giám sát đã dừng');
    const identity = identityRef.current;
    publishStation({ ...identity, state: 'offline', metrics: metricsRef.current, lastSeen: Date.now(), alertCount: alertCountRef.current });
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
    if (!consented) return;
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as { thresholds?: BehaviorThresholds };
        thresholdsRef.current = parsed.thresholds ?? DEFAULT_THRESHOLDS;
      } catch { thresholdsRef.current = DEFAULT_THRESHOLDS; }
    }
    setErrorMessage('');
    setModelState('loading');
    setStatusText('Đang xin quyền sử dụng webcam…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 }, facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Không tìm thấy vùng hiển thị camera.');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setRunning(true);
      runningRef.current = true;
      setStatusText('Đang tải mô hình nhận diện khuôn mặt…');

      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const fileset = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
        landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 2,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
        setModelState('ready');
        setStatusText('AI đang phân tích cục bộ trên thiết bị');
        animationRef.current = requestAnimationFrame(() => detectionLoopRef.current());
      } catch {
        setModelState('camera-only');
        setStatusText('Camera hoạt động; mô hình AI chưa tải được');
        setErrorMessage('Không tải được mô hình MediaPipe. Kiểm tra kết nối mạng; video vẫn chỉ hiển thị cục bộ và chưa gửi đi.');
      }
    } catch (error) {
      setModelState('error');
      setRunning(false);
      runningRef.current = false;
      setStatusText('Không thể khởi động webcam');
      setErrorMessage(error instanceof Error ? error.message : 'Vui lòng cấp quyền webcam trong trình duyệt.');
    }
  }

  function createTestAlert(type: AlertType) {
    emitAlert(type, 'Sự kiện thử do thí sinh tạo để kiểm tra đường truyền.', 'demo');
  }

  const statusTone = health === 'critical' ? 'bg-rose-500' : health === 'warning' ? 'bg-amber-400' : running ? 'bg-emerald-500' : 'bg-slate-400';

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <ExamGuardHeader active="candidate" />
      <div className="mx-auto w-[min(1260px,calc(100%-28px))] py-7 sm:py-9">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div><Badge className="mb-3 bg-blue-100 text-blue-700">KHU VỰC THÍ SINH</Badge><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Kiểm tra thiết bị & bắt đầu giám sát</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Webcam được phân tích ngay trên máy này. Hệ thống chỉ gửi chỉ số trạng thái và sự kiện cần chú ý.</p></div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><span className={`size-2.5 rounded-full ${statusTone} ${running ? 'animate-pulse' : ''}`} /><div><small className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Trạng thái</small><b className="text-xs">{statusText}</b></div></div>
        </div>

        {!running ? (
          <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
            <Card className="border-0 bg-white py-0 shadow-sm ring-1 ring-slate-200/80">
              <CardHeader className="border-b border-slate-100 px-6 py-5"><CardTitle className="flex items-center gap-2 font-extrabold"><UserRound className="size-5 text-blue-600" /> Thông tin phiên thi</CardTitle><CardDescription>Đối chiếu đúng phòng và số máy trước khi bắt đầu.</CardDescription></CardHeader>
              <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
                <label htmlFor="candidate-name" className="grid gap-2 text-xs font-bold text-slate-600 sm:col-span-2">Họ và tên thí sinh<Input id="candidate-name" value={candidateName} onChange={(event) => setCandidateName(event.target.value)} className="h-11 bg-slate-50 text-sm font-medium" /></label>
                <label htmlFor="room-id" className="grid gap-2 text-xs font-bold text-slate-600">Mã phòng thi<Input id="room-id" value={roomId} onChange={(event) => setRoomId(event.target.value.toUpperCase())} className="h-11 bg-slate-50 text-sm font-medium" /></label>
                <label htmlFor="station-id" className="grid gap-2 text-xs font-bold text-slate-600">Số máy / vị trí<Input id="station-id" value={stationId} onChange={(event) => setStationId(event.target.value.toUpperCase())} className="h-11 bg-slate-50 text-sm font-medium" /></label>
                <div className="sm:col-span-2 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><Switch aria-label="Xác nhận đã đọc thông báo giám sát" checked={consented} onCheckedChange={setConsented} className="mt-0.5" /><div><b className="block text-xs text-blue-950">Tôi đã đọc thông báo giám sát</b><p className="mt-1 text-xs leading-5 text-blue-700/75">Tôi đồng ý bật webcam trong thời gian thi và hiểu rằng AI chỉ tạo cảnh báo hỗ trợ giám thị.</p></div></div>
                <Button size="lg" disabled={!consented || !candidateName || !roomId || !stationId} onClick={startMonitoring} className="h-12 rounded-xl bg-blue-600 font-extrabold hover:bg-blue-500 sm:col-span-2"><Play data-icon="inline-start" /> Kiểm tra webcam và bắt đầu</Button>
                {errorMessage && <p className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700"><AlertTriangle className="mr-2 inline size-4" />{errorMessage}</p>}
              </CardContent>
            </Card>

            <Card className="border-0 bg-[#091a34] py-0 text-white shadow-xl shadow-slate-300/30 ring-0">
              <CardHeader className="px-6 pt-6"><CardTitle className="font-extrabold">Hệ thống sẽ kiểm tra</CardTitle><CardDescription className="text-slate-400">5 lớp tín hiệu, xử lý theo bộ đệm thời gian 5–10 giây.</CardDescription></CardHeader>
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
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.55fr)]">
            <section className="overflow-hidden rounded-[22px] bg-[#07162d] shadow-[0_24px_70px_rgba(9,28,55,.24)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4 text-white"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-emerald-400/12 text-emerald-300"><Radio className="size-[18px]" /></span><div><b className="block text-sm">{candidateName}</b><small className="text-[10px] font-semibold text-slate-400">{roomId} · {stationId}</small></div></div><div className="flex items-center gap-2"><Badge className={`${modelState === 'ready' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-300/15 text-amber-200'} border-0`}><span className="mr-1 size-1.5 rounded-full bg-current" />{modelState === 'ready' ? 'AI cục bộ đang chạy' : 'Chế độ camera'}</Badge><Button variant="ghost" size="sm" onClick={stopMonitoring} className="text-slate-300 hover:bg-white/8 hover:text-white"><Square className="size-3.5" /> Dừng</Button></div></div>
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
                    ['Quay đầu', `${Math.abs(metrics.headYaw).toFixed(0)}°`, Math.abs(metrics.headYaw) < 22 ? 'Trong ngưỡng' : 'Lệch'],
                    ['Cúi/ngẩng', `${Math.abs(metrics.headPitch).toFixed(0)}°`, Math.abs(metrics.headPitch) < 20 ? 'Trong ngưỡng' : 'Lệch'],
                    ['Hướng mắt', `${Math.abs(metrics.gazeX * 100).toFixed(0)}%`, Math.abs(metrics.gazeX) < .55 ? 'Trung tâm' : 'Lệch'],
                  ].map(([label, value, hint]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><small className="text-[10px] font-semibold text-slate-400">{label}</small><b className="mt-1 block text-lg font-black tracking-tight">{value}</b><span className="mt-1 block text-[9px] font-bold text-slate-500">{hint}</span></div>)}
                  <div className="col-span-2 border-t border-slate-100 pt-4"><div className="mb-2 flex justify-between text-[10px] font-bold"><span className="text-slate-500">Độ ổn định khung hình</span><span className="text-emerald-600">{metrics.faceCount === 1 ? '92%' : '46%'}</span></div><Progress value={metrics.faceCount === 1 ? 92 : 46} /></div>
                  <div className="col-span-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600"><span><CircleGauge className="mr-2 inline size-4 text-slate-400" /> Chế độ máy cấu hình thấp</span><Switch aria-label="Chế độ máy cấu hình thấp" size="sm" checked={lowPowerMode} onCheckedChange={setLowPowerMode} /></div>
                </CardContent>
              </Card>

              <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80">
                <CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><AlertTriangle className="size-4 text-amber-500" /> Sự kiện trên máy này</CardTitle></CardHeader>
                <CardContent className="p-3">
                  {recentEvents.length ? recentEvents.map((event) => <div key={event.id} className="flex gap-3 rounded-xl p-3 hover:bg-slate-50"><span className={`mt-0.5 size-2 shrink-0 rounded-full ${event.severity === 'critical' ? 'bg-rose-500' : event.severity === 'warning' ? 'bg-amber-400' : 'bg-cyan-500'}`} /><div><b className="block text-xs">{event.title}</b><small className="mt-1 block text-[10px] leading-4 text-slate-400">{new Date(event.timestamp).toLocaleTimeString('vi-VN')}</small></div></div>) : <div className="py-6 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-500" /><p className="mt-2 text-xs font-bold text-slate-700">Chưa có sự kiện cảnh báo</p><small className="mt-1 block text-[10px] text-slate-400">Hãy giữ tư thế ổn định và nhìn vào màn hình.</small></div>}
                  <details className="mt-2 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-[10px] font-bold text-slate-500">Kiểm tra đường truyền cảnh báo</summary><div className="mt-3 grid grid-cols-2 gap-2"><Button variant="outline" size="xs" onClick={() => createTestAlert('gaze_away')}>Thử cảnh báo vàng</Button><Button variant="outline" size="xs" onClick={() => createTestAlert('no_face')}>Thử cảnh báo đỏ</Button></div></details>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-500"><Info className="mt-0.5 size-4 shrink-0 text-blue-500" /><p className="text-xs leading-5"><b className="text-slate-700">Lưu ý:</b> AI ExamGuard chỉ hỗ trợ giám sát và không tự kết luận vi phạm. Mọi cảnh báo cần được giám thị xem xét cùng bối cảnh thực tế.</p></div>
      </div>
    </main>
  );
}
