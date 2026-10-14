// File này vẽ ô ghi chú "Nguyên tắc không thay đổi" trên trang quản trị:
// AI chỉ cảnh báo, giám thị mới là người kết luận.

import { ShieldCheck } from 'lucide-react';

/**
 * Đây là gì: React component (một khối giao diện) ô ghi chú nguyên tắc.
 * Mục tiêu: nhắc rằng AI không tự kết luận vi phạm; quyết định cuối thuộc về giám thị.
 * Chức năng: hiện một ô màu xanh lá với biểu tượng khiên và lời nhắc.
 * Đầu ra: khối giao diện ô ghi chú.
 * Dùng ở đâu: AdminScreen (web/src/features/admin/admin-screen.tsx), cột bên phải.
 * Liên kết với: VerificationPrinciple (web/src/features/proctor/components/
 *   verification-principle.tsx) nói cùng nguyên tắc ở trang giám thị.
 */
export function DataPolicyNote() {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" /><div><b className="block text-xs text-emerald-950">Nguyên tắc không thay đổi</b><p className="mt-1 text-[10px] leading-5 text-emerald-800/70">AI không tự kết luận vi phạm. Quyết định cuối cùng luôn thuộc về giám thị theo quy chế thi.</p></div></div></div>
  );
}
