import { BrainCircuit, Eye, MonitorCheck, Video } from 'lucide-react';

// Static illustration of the proctor dashboard; not live data.
const seats = [
  ['PC-01', 'ok'], ['PC-02', 'ok'], ['PC-03', 'danger'], ['PC-04', 'ok'], ['PC-05', 'ok'],
  ['PC-06', 'ok'], ['PC-07', 'warn'], ['PC-08', 'ok'], ['PC-09', 'ok'], ['PC-10', 'ok'],
  ['PC-11', 'ok'], ['PC-12', 'warn'], ['PC-13', 'ok'], ['PC-14', 'ok'], ['PC-15', 'ok'],
] as const;

const alerts = [
  ['PC-07', 'Quay đầu phải kéo dài', '10:21:14', 'warn'],
  ['PC-12', 'Hướng mắt lệch phải', '10:20:33', 'eye'],
  ['PC-03', 'Không có mặt trước máy', '10:19:58', 'danger'],
] as const;

export function DashboardPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-10 rounded-full bg-blue-500/12 blur-3xl" />
      <div className="relative overflow-hidden rounded-[26px] border border-white/12 bg-[#0d1d37] shadow-[0_35px_90px_rgba(0,0,0,.38)]">
        <div className="flex h-12 items-center justify-between border-b border-white/8 px-5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /> PHÒNG 01 · ĐANG GIÁM SÁT</div>
          <span className="rounded-md bg-white/6 px-2 py-1 text-[10px] font-semibold text-slate-400">15 thí sinh</span>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-[.9fr_1.1fr]">
          <section className="rounded-2xl bg-white/[.045] p-4 ring-1 ring-white/8">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-xs font-extrabold">Trạng thái máy thi</h2><span className="text-[10px] text-emerald-300">13 bình thường</span></div>
            <div className="grid grid-cols-5 gap-2">
              {seats.map(([name, status]) => <div key={name} className="text-center"><span className={`mx-auto grid aspect-[4/3] w-full place-items-center rounded-md border ${status === 'danger' ? 'border-rose-400/80 bg-rose-400/12 text-rose-200' : status === 'warn' ? 'border-amber-300/70 bg-amber-300/10 text-amber-100' : 'border-emerald-400/45 bg-emerald-400/8 text-emerald-200'}`}><MonitorCheck className="size-3.5" /></span><small className="mt-1 block text-[7px] font-bold text-slate-500">{name}</small></div>)}
            </div>
            <div className="mt-4 flex gap-4 text-[8px] font-semibold text-slate-400"><span><i className="mr-1 inline-block size-1.5 rounded-full bg-emerald-400" />Bình thường</span><span><i className="mr-1 inline-block size-1.5 rounded-full bg-amber-300" />Cảnh báo</span><span><i className="mr-1 inline-block size-1.5 rounded-full bg-rose-400" />Kiểm tra</span></div>
          </section>
          <section className="overflow-hidden rounded-2xl bg-white/[.045] ring-1 ring-white/8">
            <div className="flex h-11 items-center gap-2 border-b border-white/8 px-4"><span className="grid size-6 place-items-center rounded-lg bg-blue-500/15 text-blue-300"><BrainCircuit className="size-3.5" /></span><h2 className="text-xs font-extrabold">Sự kiện cần chú ý</h2><span className="ml-auto rounded-full bg-rose-400/15 px-2 py-0.5 text-[9px] font-bold text-rose-300">3 mới</span></div>
            <div>
              {alerts.map(([pc, label, time, type]) => <div key={pc} className="grid grid-cols-[28px_1fr_auto] items-center gap-2 border-b border-white/6 px-4 py-3 last:border-0"><span className={`grid size-7 place-items-center rounded-lg ${type === 'danger' ? 'bg-rose-400/12 text-rose-300' : type === 'warn' ? 'bg-amber-300/12 text-amber-200' : 'bg-cyan-300/10 text-cyan-200'}`}>{type === 'eye' ? <Eye className="size-3.5" /> : <Video className="size-3.5" />}</span><div><b className="block text-[10px] text-slate-200">{pc}</b><small className="mt-0.5 block text-[9px] text-slate-400">{label}</small></div><time className="text-[8px] text-slate-600">{time}</time></div>)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
