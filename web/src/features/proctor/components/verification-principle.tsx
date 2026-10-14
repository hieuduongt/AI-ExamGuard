// File này vẽ thẻ "Nguyên tắc xác minh" ở trang giám thị: AI chỉ cảnh báo, giám thị kết luận.

import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Đây là gì: React component (một khối giao diện) thẻ nguyên tắc xác minh.
 * Mục tiêu: nhắc giám thị không kết luận vi phạm chỉ vì AI báo.
 * Chức năng: hiện khẩu hiệu "AI cảnh báo. Giám thị kết luận." và lời khuyên quan sát trực tiếp,
 *   trao đổi với thí sinh, ghi chú bối cảnh trước khi xử lý theo quy chế.
 * Đầu ra: khối giao diện thẻ nguyên tắc (chỉ để đọc).
 * Dùng ở đâu: ProctorScreen (web/src/features/proctor/proctor-screen.tsx).
 * Liên kết với: DataPolicyNote (web/src/features/admin/components/data-policy-note.tsx) nói cùng
 *   nguyên tắc ở trang quản trị.
 */
export function VerificationPrinciple() {
  return (
    <Card className="border-0 bg-[#0a1b35] py-0 text-white shadow-sm ring-0"><CardContent className="flex h-full min-h-52 items-center gap-5 p-6"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-400/12 text-emerald-300"><ShieldCheck className="size-7" /></span><div><Badge className="mb-3 border-0 bg-emerald-400/12 text-emerald-300">NGUYÊN TẮC XÁC MINH</Badge><h2 className="text-lg font-black">AI cảnh báo. Giám thị kết luận.</h2><p className="mt-2 text-xs leading-5 text-slate-400">Hãy quan sát trực tiếp, trao đổi với thí sinh khi cần và ghi chú bối cảnh trước khi xử lý theo quy chế.</p></div></CardContent></Card>
  );
}
