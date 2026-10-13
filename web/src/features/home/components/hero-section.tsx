import Link from 'next/link';
import { ArrowRight, CheckCircle2, MonitorCheck, Sparkles, Video } from 'lucide-react';
import { DashboardPreview } from './dashboard-preview';

export function HeroSection() {
  return (
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

        <DashboardPreview />
      </div>
    </section>
  );
}
