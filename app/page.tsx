import Link from 'next/link';
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Eye,
  LockKeyhole,
  MonitorCheck,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';

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

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="relative z-20 border-b border-white/8 bg-[#07162d]/92 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-18 w-[min(1180px,calc(100%-32px))] items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="AI ExamGuard - Trang chủ">
            <span className="grid size-10 place-items-center rounded-[14px] bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_8px_24px_rgba(20,135,255,.35)]">
              <ShieldCheck className="size-5" />
            </span>
            <span className="leading-none">
              <strong className="block text-[15px] font-black tracking-[.08em]">AI EXAMGUARD</strong>
              <small className="mt-1 block text-[10px] font-medium text-blue-200/75">GIÁM SÁT THI THÔNG MINH</small>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-blue-100/75 md:flex" aria-label="Điều hướng chính">
            <a href="#tinh-nang" className="transition hover:text-white">Tính năng</a>
            <a href="#quyen-rieng-tu" className="transition hover:text-white">Quyền riêng tư</a>
            <Link href="/giam-thi" className="rounded-xl border border-white/12 bg-white/8 px-4 py-2.5 text-white transition hover:bg-white/14">Vào phòng giám thị</Link>
          </nav>
        </div>
      </header>

      <section className="relative bg-[#07162d] pb-18 pt-14 text-white sm:pb-24 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(30,136,229,.23),transparent_32%),radial-gradient(circle_at_84%_20%,rgba(20,184,166,.16),transparent_29%),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:auto,auto,44px_44px,44px_44px]" />
        <div className="relative mx-auto grid w-[min(1180px,calc(100%-32px))] items-center gap-14 lg:grid-cols-[.86fr_1.14fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/8 px-3 py-1.5 text-xs font-bold tracking-wide text-cyan-200">
              <Sparkles className="size-3.5" /> AI XỬ LÝ NGAY TRÊN MÁY THÍ SINH
            </div>
            <h1 className="max-w-xl text-4xl font-black leading-[1.05] tracking-[-.05em] sm:text-6xl">
              Phòng thi nghiêm túc.<br />
              <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">Giám sát nhẹ nhàng.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-7 text-slate-300 sm:text-base">
              Nhận diện sớm các dấu hiệu bất thường qua webcam, gửi cảnh báo đúng lúc và để giám thị luôn là người đưa ra quyết định cuối cùng.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/thi-sinh" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(37,99,235,.32)] transition hover:-translate-y-0.5 hover:bg-blue-400">
                <Video className="size-4" /> Bắt đầu kiểm tra thiết bị <ArrowRight className="size-4" />
              </Link>
              <Link href="/giam-thi" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/7 px-5 text-sm font-bold text-white transition hover:bg-white/12">
                <MonitorCheck className="size-4" /> Mở dashboard giám thị
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-400" /> Không truyền video liên tục</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-400" /> Không cần GPU rời</span>
            </div>
          </div>

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
        </div>
      </section>

      <section id="tinh-nang" className="relative -mt-7 pb-16 sm:-mt-9">
        <div className="mx-auto grid w-[min(1080px,calc(100%-32px))] gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_22px_70px_rgba(28,61,105,.13)] md:grid-cols-3">
          {[
            [Eye, '5 nhóm hành vi', 'Khuôn mặt, hướng nhìn, tư thế và thao tác bàn phím/chuột.'],
            [BrainCircuit, 'Phân tích tại chỗ', 'Video được xử lý cục bộ, chỉ sự kiện cảnh báo được gửi đi.'],
            [LockKeyhole, 'Con người quyết định', 'AI chỉ hỗ trợ quan sát; giám thị xác minh mọi tình huống.'],
          ].map(([Icon, title, text]) => <article key={String(title)} className="flex gap-4 rounded-2xl p-5 transition hover:bg-slate-50"><span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-blue-50 text-blue-600"><Icon className="size-5" /></span><div><h2 className="text-sm font-extrabold text-slate-900">{String(title)}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{String(text)}</p></div></article>)}
        </div>
      </section>

      <section id="quyen-rieng-tu" className="mx-auto mb-16 flex w-[min(980px,calc(100%-32px))] flex-col items-center rounded-[24px] border border-emerald-100 bg-emerald-50/70 px-6 py-8 text-center sm:flex-row sm:text-left">
        <span className="mb-4 grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white sm:mb-0"><ShieldCheck /></span>
        <div className="sm:ml-5"><h2 className="text-base font-black text-emerald-950">Minh bạch, riêng tư và công bằng ngay từ thiết kế</h2><p className="mt-1 text-sm leading-6 text-emerald-800/70">Hệ thống không tự kết luận vi phạm, ưu tiên xử lý dữ liệu trên thiết bị và cung cấp ngưỡng cảnh báo rõ ràng cho từng phòng thi.</p></div>
        <Link href="/thi-sinh" className="mt-5 shrink-0 text-sm font-extrabold text-emerald-700 sm:ml-auto sm:mt-0 sm:pl-8">Kiểm tra máy <ArrowRight className="ml-1 inline size-4" /></Link>
      </section>
    </main>
  );
}
