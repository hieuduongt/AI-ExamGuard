'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Download,
  Eye,
  Filter,
  MonitorCheck,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCheck,
  UsersRound,
  Wifi,
} from 'lucide-react';
import { ExamGuardHeader } from '@/components/examguard-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AlertSeverity, AlertType, ExamEvent, StationStatus } from '@/lib/exam-types';
import {
  demoStations,
  hasFirebaseConfig,
  makeId,
  markEventReviewed,
  publishEvent,
  seedDemoData,
  subscribeExamData,
} from '@/lib/exam-store';

type FilterValue = 'all' | AlertSeverity | 'unreviewed';

const alertIcons: Record<AlertType, typeof Eye> = {
  no_face: ShieldAlert,
  multiple_faces: UsersRound,
  head_turn: RefreshCw,
  head_pose: RefreshCw,
  gaze_away: Eye,
  focus_lost: MonitorCheck,
  restricted_input: SlidersHorizontal,
};

function severityClasses(severity: AlertSeverity) {
  if (severity === 'critical') return { dot: 'bg-rose-500', text: 'text-rose-700', surface: 'bg-rose-50', ring: 'ring-rose-200' };
  if (severity === 'warning') return { dot: 'bg-amber-400', text: 'text-amber-700', surface: 'bg-amber-50', ring: 'ring-amber-200' };
  return { dot: 'bg-cyan-500', text: 'text-cyan-700', surface: 'bg-cyan-50', ring: 'ring-cyan-200' };
}

function timeLabel(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 10) return 'vừa xong';
  if (seconds < 60) return `${seconds} giây trước`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function ProctorDashboard() {
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [stations, setStations] = useState<StationStatus[]>([]);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [queryText, setQueryText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    seedDemoData();
    const unsubscribe = subscribeExamData(setEvents, setStations);
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => { unsubscribe(); window.clearInterval(timer); };
  }, []);

  const activeStations = stations.length ? stations : demoStations();
  const filteredEvents = useMemo(() => events.filter((event) => {
    const matchesFilter = filter === 'all' || (filter === 'unreviewed' ? !event.reviewed : event.severity === filter);
    const normalized = queryText.trim().toLocaleLowerCase('vi');
    const matchesQuery = !normalized || `${event.stationId} ${event.candidateName} ${event.title}`.toLocaleLowerCase('vi').includes(normalized);
    return matchesFilter && matchesQuery;
  }), [events, filter, queryText]);

  const selectedEvent = events.find((event) => event.id === selectedId) ?? null;
  const counts = useMemo(() => ({
    total: activeStations.length,
    normal: activeStations.filter((station) => station.state === 'normal').length,
    warning: activeStations.filter((station) => station.state === 'warning').length,
    critical: activeStations.filter((station) => station.state === 'critical').length,
    unreviewed: events.filter((event) => !event.reviewed).length,
  }), [activeStations, events]);
  const statCards = [
    { Icon: MonitorCheck, label: 'Tổng máy thi', count: counts.total, tone: 'text-blue-600 bg-blue-50' },
    { Icon: CheckCircle2, label: 'Bình thường', count: counts.normal, tone: 'text-emerald-600 bg-emerald-50' },
    { Icon: AlertTriangle, label: 'Cảnh báo vàng', count: counts.warning, tone: 'text-amber-600 bg-amber-50' },
    { Icon: ShieldAlert, label: 'Ưu tiên kiểm tra', count: counts.critical, tone: 'text-rose-600 bg-rose-50' },
    { Icon: BellRing, label: 'Chưa xác minh', count: counts.unreviewed, tone: 'text-violet-600 bg-violet-50' },
  ];

  function reviewEvent(id: string) {
    markEventReviewed(id, true);
    setEvents((items) => items.map((item) => item.id === id ? { ...item, reviewed: true } : item));
  }

  function addDemoAlert() {
    const index = events.length % Math.max(activeStations.length, 1);
    const station = activeStations[index] ?? demoStations()[0];
    const event: ExamEvent = {
      id: makeId('demo'), roomId: station.roomId, stationId: station.stationId, candidateName: station.candidateName,
      type: index % 2 ? 'head_turn' : 'multiple_faces', severity: index % 2 ? 'warning' : 'critical',
      title: index % 2 ? 'Quay đầu trái/phải kéo dài' : 'Xuất hiện nhiều khuôn mặt',
      detail: index % 2 ? 'Góc quay đầu ước tính 31°, duy trì 5,4 giây.' : 'Phát hiện 2 khuôn mặt trong khung hình trong 2,3 giây.',
      timestamp: Date.now(), reviewed: false, source: 'demo',
    };
    publishEvent(event);
    setSelectedId(event.id);
  }

  function exportCsv() {
    const rows = [
      ['Thời gian', 'Phòng', 'Máy', 'Thí sinh', 'Mức độ', 'Sự kiện', 'Chi tiết', 'Đã xem'],
      ...events.map((event) => [new Date(event.timestamp).toLocaleString('vi-VN'), event.roomId, event.stationId, event.candidateName, event.severity, event.title, event.detail, event.reviewed ? 'Có' : 'Chưa']),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `AI-ExamGuard-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <ExamGuardHeader active="proctor" />
      <div className="mx-auto w-[min(1380px,calc(100%-28px))] py-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-3 flex flex-wrap items-center gap-2"><Badge className="bg-blue-100 text-blue-700">DASHBOARD GIÁM THỊ</Badge><Badge variant="outline" className={hasFirebaseConfig ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}><Wifi className="size-3" /> {hasFirebaseConfig ? 'Firebase thời gian thực' : 'Demo cục bộ'}</Badge></div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Phòng thi 01</h1><p className="mt-2 text-sm text-slate-500">Môn Toán · Ca sáng · 15 máy · 90 phút</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" size="lg" onClick={addDemoAlert} className="h-10 bg-white"><BellRing /> Tạo cảnh báo thử</Button><Button variant="outline" size="lg" onClick={exportCsv} className="h-10 bg-white"><Download /> Xuất báo cáo</Button><div className="flex h-10 items-center gap-2 rounded-xl bg-[#0a1b35] px-4 text-xs font-bold text-white"><Radio className="size-4 text-emerald-400" /><span className="text-slate-400">TRỰC TUYẾN</span><time>{clock.toLocaleTimeString('vi-VN')}</time></div></div>
        </div>

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {statCards.map(({ Icon, label, count, tone }) => <Card key={label} className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardContent className="flex items-center gap-3 p-4"><span className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></span><div><small className="block text-[10px] font-bold text-slate-400">{label}</small><strong className="mt-1 block text-xl font-black">{String(count).padStart(2, '0')}</strong></div></CardContent></Card>)}
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,.9fr)_minmax(420px,1.1fr)]">
          <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80">
            <CardHeader className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4"><div><CardTitle className="text-sm font-extrabold">Trạng thái máy thí sinh</CardTitle><p className="mt-1 text-[10px] text-slate-400">Cập nhật trạng thái gần nhất theo thời gian thực</p></div><div className="flex gap-3 text-[9px] font-bold text-slate-400"><span><i className="mr-1 inline-block size-2 rounded-full bg-emerald-500" />Ổn định</span><span><i className="mr-1 inline-block size-2 rounded-full bg-amber-400" />Theo dõi</span><span><i className="mr-1 inline-block size-2 rounded-full bg-rose-500" />Kiểm tra</span></div></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 p-5 sm:grid-cols-5">
              {activeStations.map((station) => {
                const tone = station.state === 'critical' ? 'border-rose-200 bg-rose-50 text-rose-700' : station.state === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700' : station.state === 'offline' ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-emerald-200 bg-emerald-50/70 text-emerald-700';
                const recent = events.find((event) => event.stationId === station.stationId && !event.reviewed);
                return <button key={station.stationId} onClick={() => recent && setSelectedId(recent.id)} className={`group relative rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}><span className="flex items-center justify-between"><MonitorCheck className="size-5" />{station.alertCount > 0 && <i className="grid size-5 place-items-center rounded-full bg-current text-[9px] font-black text-white [background:currentColor]"><b className="text-white">{station.alertCount}</b></i>}</span><b className="mt-4 block text-xs">{station.stationId}</b><small className="mt-1 block truncate text-[9px] opacity-70">{station.candidateName}</small></button>;
              })}
            </CardContent>
            <div className="grid grid-cols-3 border-t border-slate-100 px-5 py-4 text-center"><div><b className="block text-sm font-black">{Math.round(activeStations.reduce((sum, station) => sum + station.metrics.fps, 0) / Math.max(activeStations.length, 1))}</b><small className="text-[9px] text-slate-400">FPS AI trung bình</small></div><div className="border-x border-slate-100"><b className="block text-sm font-black text-emerald-600">98,7%</b><small className="text-[9px] text-slate-400">Kết nối ổn định</small></div><div><b className="block text-sm font-black">{events.length}</b><small className="text-[9px] text-slate-400">Tổng sự kiện</small></div></div>
          </Card>

          <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80">
            <CardHeader className="border-b border-slate-100 px-5 py-4"><div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><BellRing className="size-4 text-blue-600" /> Luồng cảnh báo</CardTitle><p className="mt-1 text-[10px] text-slate-400">Chọn một sự kiện để xem chi tiết và xác minh</p></div><div className="relative"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" /><Input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Tìm máy, thí sinh…" className="h-9 w-48 bg-slate-50 pl-9 text-xs" /></div></div><div className="mt-3 flex flex-wrap gap-2"><Filter className="mr-1 mt-1.5 size-3.5 text-slate-400" />{([['all', 'Tất cả'], ['unreviewed', 'Chưa xem'], ['critical', 'Đỏ'], ['warning', 'Vàng'], ['info', 'Thông tin']] as const).map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${filter === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'}`}>{label}</button>)}</div></CardHeader>
            <CardContent className="max-h-[520px] overflow-y-auto p-2">
              {filteredEvents.length ? filteredEvents.map((event) => {
                const Icon = alertIcons[event.type];
                const tone = severityClasses(event.severity);
                return <button key={event.id} onClick={() => setSelectedId(event.id)} className={`grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 ${selectedId === event.id ? 'bg-blue-50 ring-1 ring-blue-100' : ''}`}><span className={`grid size-10 place-items-center rounded-xl ${tone.surface} ${tone.text}`}><Icon className="size-[18px]" /></span><div className="min-w-0"><div className="flex items-center gap-2"><b className="text-xs text-slate-900">{event.stationId}</b><span className={`size-1.5 rounded-full ${tone.dot}`} />{event.reviewed && <span className="text-[9px] font-bold text-emerald-600"><Check className="mr-0.5 inline size-3" />Đã xem</span>}</div><p className="mt-1 truncate text-[11px] font-semibold text-slate-600">{event.title}</p><small className="mt-1 block truncate text-[9px] text-slate-400">{event.candidateName} · {timeLabel(event.timestamp)}</small></div><ChevronRight className="size-4 text-slate-300" /></button>;
              }) : <div className="grid min-h-72 place-items-center text-center"><div><CheckCircle2 className="mx-auto size-9 text-emerald-500" /><b className="mt-3 block text-sm">Không có cảnh báo phù hợp</b><p className="mt-1 text-xs text-slate-400">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p></div></div>}
            </CardContent>
          </Card>
        </div>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><CircleDot className="size-4 text-violet-600" /> Phân bố sự kiện</CardTitle></CardHeader><CardContent className="grid gap-4 p-5">{[
            ['Không có mặt', events.filter((event) => event.type === 'no_face').length, 'bg-rose-500'],
            ['Hướng nhìn / quay đầu', events.filter((event) => event.type === 'gaze_away' || event.type === 'head_turn').length, 'bg-amber-400'],
            ['Rời cửa sổ bài thi', events.filter((event) => event.type === 'focus_lost').length, 'bg-violet-500'],
            ['Nhiều khuôn mặt', events.filter((event) => event.type === 'multiple_faces').length, 'bg-cyan-500'],
          ].map(([label, value, color]) => { const count = Number(value); const max = Math.max(...events.reduce<number[]>((all, item) => { const index = ['no_face', 'gaze_away', 'focus_lost', 'multiple_faces'].indexOf(item.type); if (index >= 0) all[index] = (all[index] ?? 0) + 1; return all; }, [0, 0, 0, 0]), 1); return <div key={String(label)}><div className="mb-2 flex justify-between text-[10px] font-bold"><span className="text-slate-500">{String(label)}</span><span>{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(5, count / max * 100)}%` }} /></div></div>; })}</CardContent></Card>
          <Card className="border-0 bg-[#0a1b35] py-0 text-white shadow-sm ring-0"><CardContent className="flex h-full min-h-52 items-center gap-5 p-6"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-400/12 text-emerald-300"><ShieldCheck className="size-7" /></span><div><Badge className="mb-3 border-0 bg-emerald-400/12 text-emerald-300">NGUYÊN TẮC XÁC MINH</Badge><h2 className="text-lg font-black">AI cảnh báo. Giám thị kết luận.</h2><p className="mt-2 text-xs leading-5 text-slate-400">Hãy quan sát trực tiếp, trao đổi với thí sinh khi cần và ghi chú bối cảnh trước khi xử lý theo quy chế.</p></div></CardContent></Card>
        </section>
      </div>

      {selectedEvent && (() => {
        const Icon = alertIcons[selectedEvent.type];
        const tone = severityClasses(selectedEvent.severity);
        return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px]"><aside className="h-full w-[min(460px,100%)] overflow-y-auto bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><small className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chi tiết cảnh báo</small><h2 className="mt-1 text-lg font-black">{selectedEvent.stationId} · {selectedEvent.candidateName}</h2></div><Button aria-label="Đóng chi tiết" variant="ghost" size="icon" onClick={() => setSelectedId(null)}>×</Button></div><div className="p-6"><span className={`grid size-14 place-items-center rounded-2xl ${tone.surface} ${tone.text}`}><Icon className="size-7" /></span><Badge className={`mt-5 border-0 ${tone.surface} ${tone.text}`}>{selectedEvent.severity === 'critical' ? 'ƯU TIÊN KIỂM TRA' : selectedEvent.severity === 'warning' ? 'CẢNH BÁO' : 'THÔNG TIN'}</Badge><h3 className="mt-3 text-xl font-black tracking-tight">{selectedEvent.title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{selectedEvent.detail}</p><div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-xs"><div><small className="text-slate-400">Thời gian</small><b className="mt-1 block">{new Date(selectedEvent.timestamp).toLocaleString('vi-VN')}</b></div><div><small className="text-slate-400">Nguồn</small><b className="mt-1 block">{selectedEvent.source === 'ai' ? 'AI tại máy thi' : selectedEvent.source === 'browser' ? 'Trình duyệt' : 'Dữ liệu minh họa'}</b></div><div><small className="text-slate-400">Phòng thi</small><b className="mt-1 block">{selectedEvent.roomId}</b></div><div><small className="text-slate-400">Trạng thái</small><b className={`mt-1 block ${selectedEvent.reviewed ? 'text-emerald-600' : 'text-amber-600'}`}>{selectedEvent.reviewed ? 'Đã xác minh' : 'Chờ xác minh'}</b></div></div><div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4"><b className="flex items-center gap-2 text-xs text-blue-900"><UserRoundCheck className="size-4" /> Gợi ý cho giám thị</b><p className="mt-2 text-xs leading-5 text-blue-700/75">Quan sát trực tiếp vị trí {selectedEvent.stationId}. Không kết luận chỉ dựa trên cảnh báo AI.</p></div><div className="mt-6 grid gap-2"><Button disabled={selectedEvent.reviewed} onClick={() => reviewEvent(selectedEvent.id)} size="lg" className="h-11 bg-emerald-600 font-extrabold hover:bg-emerald-500"><CheckCircle2 /> {selectedEvent.reviewed ? 'Đã xác minh sự kiện' : 'Đánh dấu đã xác minh'}</Button><Button variant="outline" onClick={() => setSelectedId(null)} size="lg" className="h-11">Đóng chi tiết</Button></div></div></aside></div>;
      })()}
    </main>
  );
}
