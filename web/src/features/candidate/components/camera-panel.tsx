import type { RefObject } from 'react';
import { BrainCircuit, Radio, ShieldCheck, Square, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { VisionMetrics } from '@/domain/exam-types';
import type { HubState } from '../hooks/use-hub-connection';
import type { ModelState } from '../hooks/use-monitoring-session';
type Props = {
    candidateName: string;
    candidateId: string;
    roomId: string;
    stationId: string;
    hubState: HubState;
    modelState: ModelState;
    analysisStalled: boolean;
    stopMonitoring: () => void;
    videoRef: RefObject<HTMLVideoElement | null>;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    metrics: VisionMetrics;
    statusTone: string;
    health: string;
};
export function CameraPanel({ candidateName, candidateId, roomId, stationId, hubState, modelState, analysisStalled, stopMonitoring, videoRef, canvasRef, metrics, statusTone, health, }: Props) {
    return (<section className="overflow-hidden rounded-[22px] bg-[#07162d] shadow-[0_24px_70px_rgba(9,28,55,.24)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4 text-white"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-emerald-400/12 text-emerald-300"><Radio className="size-[18px]"/></span><div><b className="block text-sm">{candidateName} · {candidateId}</b><small className="text-[10px] font-semibold text-slate-400">{roomId} · {stationId}</small></div></div><div className="flex items-center gap-2"><Badge className={`${hubState === 'connected' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-200'} border-0`}><Wifi className="mr-1 size-3"/>{hubState === 'connected' ? 'Đã nối máy giám thị' : 'Mất kết nối'}</Badge><Badge className={`${modelState === 'ready' && !analysisStalled ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-300/15 text-amber-200'} border-0`}><span className="mr-1 size-1.5 rounded-full bg-current"/>{modelState === 'ready' ? (analysisStalled ? 'AI đã tạm dừng' : 'AI cục bộ đang chạy') : 'Chế độ camera'}</Badge><Button variant="ghost" size="sm" onClick={stopMonitoring} className="text-slate-300 hover:bg-white/8 hover:text-white"><Square className="size-3.5"/> Dừng</Button></div></div>
      <div className="relative aspect-video bg-[#030b17]">
        <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover"/>
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"/>
        {modelState === 'loading' && <div className="absolute inset-0 grid place-items-center bg-[#07162d]/82 text-center text-white backdrop-blur-sm"><div><BrainCircuit className="mx-auto size-9 animate-pulse text-cyan-300"/><b className="mt-4 block text-sm">Đang chuẩn bị MediaPipe Face Landmarker</b><p className="mt-2 text-xs text-slate-400">Lần đầu có thể mất vài giây để tải mô hình.</p></div></div>}
        <div className="absolute left-4 top-4 flex gap-2"><span className="rounded-lg bg-black/45 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur">720p</span><span className="rounded-lg bg-black/45 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur">{metrics.fps || '—'} FPS AI</span></div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between"><div className="rounded-xl bg-black/55 px-3 py-2 text-white backdrop-blur"><small className="block text-[9px] text-slate-300">KHUNG HÌNH</small><b className="mt-1 flex items-center gap-2 text-xs"><span className={`size-2 rounded-full ${statusTone}`}/>{health === 'critical' ? 'Cần trở lại vị trí' : health === 'warning' ? 'Đang theo dõi tín hiệu' : 'Vị trí phù hợp'}</b></div><div className="rounded-xl bg-black/55 p-2 text-[9px] text-slate-300 backdrop-blur"><ShieldCheck className="mr-1 inline size-3.5 text-emerald-300"/> Chỉ gửi sự kiện</div></div>
      </div>
    </section>);
}
