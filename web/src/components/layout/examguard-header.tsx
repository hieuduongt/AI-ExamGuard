'use client';
/**
 * File này vẽ thanh tiêu đề dùng chung cho ba màn hình: thí sinh, giám thị và quản trị.
 * Dòng đầu tiên của file báo cho Next.js biết khối này chạy trong trình duyệt
 * (vì cần bấm nút, mở cửa sổ mới).
 */

import Link from 'next/link';
import { useState } from 'react';
import { openProctorWindow } from '@/services/desktop-bridge';
import { getConfiguredHubUrl } from '@/services/exam-sync';
import { Settings, ShieldCheck } from 'lucide-react';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   thanh tiêu đề trên cùng có logo và nút chuyển giữa các khu vực.
 * Mục tiêu: giúp người dùng chuyển qua lại giữa Thí sinh, Giám thị, Quản trị, nhưng không
 *   làm gián đoạn phiên giám sát đang chạy.
 * Chức năng: nhận props (thông tin khối cha truyền cho khối con): active = khu vực đang mở
 *   (để tô sáng nút), monitoring = đang giám sát hay không. Khi đang giám sát thì khóa
 *   logo về trang chủ và nút Quản trị (phải dừng giám sát trước khi đổi cấu hình). Ở màn hình
 *   thí sinh, nút "Giám thị" đổi thành "Mở Giám thị ↗" để mở cửa sổ riêng, giữ camera chạy.
 *   Nếu mở cửa sổ thất bại thì hiện dòng báo lỗi màu đỏ (lưu trong state openError, tức dữ
 *   liệu màn hình đang nhớ).
 * Đầu ra: giao diện thanh tiêu đề.
 * Dùng ở đâu: web/src/features/candidate/candidate-screen.tsx, web/src/features/proctor/
 *   proctor-screen.tsx, web/src/features/admin/admin-screen.tsx.
 * Liên kết với: openProctorWindow (web/src/services/desktop-bridge.ts), getConfiguredHubUrl
 *   (web/src/services/hub/hub-url.ts, lấy qua web/src/services/exam-sync.ts).
 */
export function ExamGuardHeader({ active, monitoring = false }: { active?: 'candidate' | 'proctor' | 'admin'; monitoring?: boolean }) {
  const [openError, setOpenError] = useState('');
  /**
   * Đây là gì: hàm con mở màn hình giám thị trong cửa sổ riêng.
   * Mục tiêu: để thí sinh/giám thị xem màn hình giám thị cùng lúc mà camera vẫn tiếp tục
   *   phân tích ở cửa sổ hiện tại.
   * Chức năng: lấy địa chỉ hub (máy trung tâm của giám thị, nơi mọi máy thí sinh gửi cảnh báo
   *   về) đã lưu, rồi nhờ openProctorWindow mở cửa sổ; đây là việc cần chờ (async). Nếu trình
   *   duyệt chặn cửa sổ mới hoặc có lỗi thì ghi câu nhắc vào openError; mở được thì xóa lỗi.
   * Đầu ra: không trả về gì; chỉ cập nhật openError.
   * Dùng ở đâu: nút "Mở Giám thị ↗" ngay trong khối này (chỉ hiện khi active là 'candidate').
   * Liên kết với: openProctorWindow (web/src/services/desktop-bridge.ts), getConfiguredHubUrl.
   */
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
