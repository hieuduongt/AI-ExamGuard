'use client';

import { useEffect, useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  KeyRound,
  Laptop,
  LockKeyhole,
  Network,
  Save,
  ServerCog,
  Settings2,
  ShieldCheck,
  TimerReset,
  UsersRound,
  Wifi,
} from 'lucide-react';
import { ExamGuardHeader } from '@/components/examguard-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { BehaviorThresholds } from '@/domain/exam-types';
import { DEFAULT_THRESHOLDS, SETTINGS_STORAGE_KEY } from '@/domain/thresholds';
import { hasFirebaseConfig } from '@/services/exam-sync';

export default function AdminPage() {
  const [settings, setSettings] = useState<BehaviorThresholds>(DEFAULT_THRESHOLDS);
  const [roomName, setRoomName] = useState('Phòng thi 01');
  const [stationCount, setStationCount] = useState(15);
  const [storeSnapshots, setStoreSnapshots] = useState(false);
  const [requireConsent, setRequireConsent] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { thresholds?: BehaviorThresholds; roomName?: string; stationCount?: number; storeSnapshots?: boolean; requireConsent?: boolean };
          if (parsed.thresholds) setSettings(parsed.thresholds);
          if (parsed.roomName) setRoomName(parsed.roomName);
          if (parsed.stationCount) setStationCount(parsed.stationCount);
          setStoreSnapshots(Boolean(parsed.storeSnapshots));
          setRequireConsent(parsed.requireConsent !== false);
        } catch { /* Giữ cấu hình mặc định nếu dữ liệu cũ không hợp lệ. */ }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateThreshold(key: keyof BehaviorThresholds, value: string) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: Math.max(1, Math.min(60, Number(value) || 1)) }));
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ thresholds: settings, roomName, stationCount, storeSnapshots, requireConsent }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  }

  function exportConfig() {
    const config = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), roomName, stationCount, thresholds: settings, privacy: { storeSnapshots, requireConsent } }, null, 2);
    const url = URL.createObjectURL(new Blob([config], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ai-examguard-config.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <ExamGuardHeader active="admin" />
      <div className="mx-auto w-[min(1240px,calc(100%-28px))] py-7 sm:py-9">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><Badge className="mb-3 bg-violet-100 text-violet-700">QUẢN TRỊ HỆ THỐNG</Badge><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Cấu hình phòng thi & ngưỡng AI</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Điều chỉnh ngưỡng cảnh báo theo quy chế từng kỳ thi. Mọi thay đổi cần được thử nghiệm trước khi áp dụng chính thức.</p></div><div className="flex gap-2"><Button variant="outline" size="lg" onClick={exportConfig} className="h-10 bg-white"><Download /> Xuất cấu hình</Button><Button size="lg" onClick={saveSettings} className={`h-10 font-extrabold ${saved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'}`}>{saved ? <CheckCircle2 /> : <Save />}{saved ? 'Đã lưu' : 'Lưu thay đổi'}</Button></div></div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,.55fr)]">
          <div className="grid gap-5">
            <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 px-6 py-5"><CardTitle className="flex items-center gap-2 font-extrabold"><Settings2 className="size-5 text-blue-600" /> Thông tin phòng thi</CardTitle><CardDescription>Cấu hình nhận diện dùng chung cho các máy trong phòng.</CardDescription></CardHeader><CardContent className="grid gap-5 p-6 sm:grid-cols-2"><label htmlFor="room-name" className="grid gap-2 text-xs font-bold text-slate-600">Tên hiển thị<Input id="room-name" value={roomName} onChange={(event) => { setRoomName(event.target.value); setSaved(false); }} className="h-11 bg-slate-50" /></label><label htmlFor="station-count" className="grid gap-2 text-xs font-bold text-slate-600">Số máy thí sinh<Input id="station-count" type="number" min={1} max={80} value={stationCount} onChange={(event) => { setStationCount(Number(event.target.value)); setSaved(false); }} className="h-11 bg-slate-50" /></label><div className="sm:col-span-2 grid gap-3 sm:grid-cols-3">{[['PHONG-01', 'Đang hoạt động', '15/15 máy'], ['PHONG-02', 'Sẵn sàng', '0/20 máy'], ['PHONG-03', 'Tạm đóng', '0/18 máy']].map(([code, status, machines], index) => <div key={code} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-center justify-between"><b className="text-xs">{code}</b><span className={`size-2 rounded-full ${index === 0 ? 'bg-emerald-500' : index === 1 ? 'bg-blue-400' : 'bg-slate-300'}`} /></div><p className="mt-3 text-[10px] font-bold text-slate-500">{status}</p><small className="mt-1 block text-[9px] text-slate-400">{machines}</small></div>)}</div></CardContent></Card>

            <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 px-6 py-5"><CardTitle className="flex items-center gap-2 font-extrabold"><TimerReset className="size-5 text-violet-600" /> Bộ đệm & ngưỡng cảnh báo</CardTitle><CardDescription>Chỉ tạo sự kiện khi tín hiệu kéo dài liên tục quá ngưỡng.</CardDescription></CardHeader><CardContent className="grid gap-3 p-6 sm:grid-cols-2">{[
              ['noFaceSeconds', 'Không có mặt', 'Thời gian thí sinh rời khỏi khung hình', 'giây'],
              ['multipleFacesSeconds', 'Nhiều khuôn mặt', 'Thời gian xuất hiện người thứ hai', 'giây'],
              ['headTurnSeconds', 'Quay/cúi/ngẩng đầu', 'Tín hiệu tư thế bất thường kéo dài', 'giây'],
              ['gazeAwaySeconds', 'Hướng mắt lệch', 'Nhìn khỏi vùng màn hình liên tục', 'giây'],
              ['cooldownSeconds', 'Khoảng nghỉ cảnh báo', 'Không lặp cùng cảnh báo quá dày', 'giây'],
            ].map(([key, title, description, unit]) => <label htmlFor={`threshold-${key}`} key={key} className={`flex items-center gap-4 rounded-2xl border border-slate-200 p-4 ${key === 'cooldownSeconds' ? 'sm:col-span-2' : ''}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><BrainCircuit className="size-5" /></span><span className="min-w-0 flex-1"><b className="block text-xs">{title}</b><small className="mt-1 block text-[10px] leading-4 text-slate-400">{description}</small></span><span className="relative"><Input id={`threshold-${key}`} type="number" min={1} max={60} value={settings[key as keyof BehaviorThresholds]} onChange={(event) => updateThreshold(key as keyof BehaviorThresholds, event.target.value)} className="h-10 w-20 bg-slate-50 pr-9 text-center font-black" /><i className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold not-italic text-slate-400">{unit}</i></span></label>)}</CardContent></Card>

            <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 px-6 py-5"><CardTitle className="flex items-center gap-2 font-extrabold"><LockKeyhole className="size-5 text-emerald-600" /> Quyền riêng tư & lưu trữ</CardTitle><CardDescription>Thiết lập theo nguyên tắc tối thiểu hóa dữ liệu cá nhân.</CardDescription></CardHeader><CardContent className="grid gap-3 p-6"><div className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4"><Switch aria-label="Yêu cầu thí sinh xác nhận thông báo giám sát" checked={requireConsent} onCheckedChange={(value) => { setRequireConsent(value); setSaved(false); }} className="mt-1" /><span><b className="block text-xs">Yêu cầu thí sinh xác nhận thông báo giám sát</b><small className="mt-1 block text-[10px] leading-5 text-slate-400">Nút bắt đầu chỉ hoạt động sau khi thí sinh đọc và đồng ý.</small></span></div><div className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4"><Switch aria-label="Lưu ảnh tại thời điểm cảnh báo" checked={storeSnapshots} onCheckedChange={(value) => { setStoreSnapshots(value); setSaved(false); }} className="mt-1" /><span><b className="block text-xs">Lưu ảnh tại thời điểm cảnh báo</b><small className="mt-1 block text-[10px] leading-5 text-slate-400">Mặc định tắt. Chỉ bật khi quy chế, cơ sở pháp lý và thời hạn xóa dữ liệu đã được xác định.</small></span></div></CardContent></Card>
          </div>

          <aside className="grid gap-5 xl:sticky xl:top-24">
            <Card className="border-0 bg-[#0a1b35] py-0 text-white shadow-xl shadow-slate-300/30 ring-0"><CardHeader className="border-b border-white/8 px-5 py-5"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><ServerCog className="size-4 text-cyan-300" /> Kiến trúc triển khai</CardTitle></CardHeader><CardContent className="p-5"><div className="grid gap-3">{[
              [Laptop, 'Máy thí sinh', 'Webcam + MediaPipe + Behavior Engine'],
              [Network, 'Kênh sự kiện', hasFirebaseConfig ? 'Firebase Firestore thời gian thực' : 'BroadcastChannel / localStorage demo'],
              [Cloud, 'Dashboard giám thị', 'Chỉ nhận trạng thái và cảnh báo'],
              [Database, 'Kho dữ liệu', 'Sự kiện, cấu hình và lịch sử xác minh'],
            ].map(([Icon, title, detail], index) => <div key={String(title)} className="relative flex gap-3 rounded-xl bg-white/[.045] p-3.5 ring-1 ring-white/7"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-cyan-300"><Icon className="size-[18px]" /></span><div><b className="block text-xs">{String(title)}</b><small className="mt-1 block text-[9px] leading-4 text-slate-400">{String(detail)}</small></div>{index < 3 && <i className="absolute -bottom-3 left-[31px] h-3 border-l border-dashed border-cyan-300/30" />}</div>)}</div><div className={`mt-4 flex items-center gap-3 rounded-xl p-3 ${hasFirebaseConfig ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-300/10 text-amber-100'}`}><Wifi className="size-4" /><span className="text-[10px] font-bold">{hasFirebaseConfig ? 'Đã có cấu hình Firebase' : 'Chưa cấu hình Firebase — đang dùng demo cục bộ'}</span></div></CardContent></Card>

            <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><KeyRound className="size-4 text-amber-500" /> Vai trò & quyền hạn</CardTitle></CardHeader><CardContent className="grid gap-3 p-5">{[
              [UsersRound, 'Thí sinh', 'Bật camera, xem trạng thái máy của mình'],
              [ShieldCheck, 'Giám thị', 'Theo dõi, xác minh và xuất báo cáo'],
              [ServerCog, 'Quản trị', 'Cấu hình phòng, ngưỡng và thời hạn lưu'],
            ].map(([Icon, role, scope]) => <div key={String(role)} className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><Icon className="size-4" /></span><div><b className="text-xs">{String(role)}</b><p className="mt-1 text-[10px] leading-4 text-slate-400">{String(scope)}</p></div></div>)}</CardContent></Card>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" /><div><b className="block text-xs text-emerald-950">Nguyên tắc không thay đổi</b><p className="mt-1 text-[10px] leading-5 text-emerald-800/70">AI không tự kết luận vi phạm. Quyết định cuối cùng luôn thuộc về giám thị theo quy chế thi.</p></div></div></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
