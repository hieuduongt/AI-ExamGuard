import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function HomeHeader() {
  return (
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
  );
}
