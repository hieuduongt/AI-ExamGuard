import { ShieldCheck } from 'lucide-react';

export function DataPolicyNote() {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" /><div><b className="block text-xs text-emerald-950">Nguyên tắc không thay đổi</b><p className="mt-1 text-[10px] leading-5 text-emerald-800/70">AI không tự kết luận vi phạm. Quyết định cuối cùng luôn thuộc về giám thị theo quy chế thi.</p></div></div></div>
  );
}
