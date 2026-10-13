'use client';

import Link from 'next/link';
import { useState } from 'react';
import { openProctorWindow } from '@/lib/desktop-client';
import { getConfiguredHubUrl } from '@/lib/exam-store';
import { Settings, ShieldCheck } from 'lucide-react';

export function ExamGuardHeader({ active, monitoring = false }: { active?: 'candidate' | 'proctor' | 'admin'; monitoring?: boolean }) {
  const [openError, setOpenError] = useState('');
  async function openTeacher() {
    try {
      const opened = await openProctorWindow(getConfiguredHubUrl());
      setOpenError(opened ? '' : 'Hãy cho phép mở cửa sổ Giám thị để xem đồng thời với webcam.');
    } catch {
      setOpenError('Chưa mở được cửa sổ Giám thị. Phiên webcam vẫn tiếp tục.');
    }
  }
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-[min(1320px,calc(100%-28px))] items-center">
        <Link href="/" aria-disabled={monitoring} onClick={(event) => { if (monitoring) event.preventDefault(); }} className="flex items-center gap-2.5 text-slate-950">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-md shadow-blue-500/20"><ShieldCheck className="size-[18px]" /></span>
          <span><strong className="block text-sm font-black tracking-[.055em]">AI EXAMGUARD</strong><small className="block text-[9px] font-bold tracking-wide text-slate-400">GIÁM SÁT THI THÔNG MINH</small></span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold" aria-label="Chuyển khu vực">
          <Link href="/thi-sinh" className={`rounded-lg px-3 py-2 transition ${active === 'candidate' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Thí sinh</Link>
          {active === 'candidate' ? <button onClick={() => void openTeacher()} className="rounded-lg px-3 py-2 text-blue-700 hover:bg-white" title="Mở cửa sổ riêng, giữ webcam tiếp tục phân tích">Mở Giám thị ↗</button> : <Link href="/giam-thi" className={`rounded-lg px-3 py-2 transition ${active === 'proctor' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Giám thị</Link>}
          <Link href="/quan-tri" aria-disabled={monitoring} onClick={(event) => { if (monitoring) event.preventDefault(); }} aria-label="Quản trị" title={monitoring ? 'Dừng giám sát trước khi đổi cấu hình' : 'Quản trị'} className={`grid size-8 place-items-center rounded-lg transition ${monitoring ? 'opacity-40' : active === 'admin' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><Settings className="size-4" /></Link>
        </nav>
      </div>
      {openError && <p role="alert" className="px-4 pb-2 text-sm text-rose-700">{openError}</p>}
    </header>
  );
}
