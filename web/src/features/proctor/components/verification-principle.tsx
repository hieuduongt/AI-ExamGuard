import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
export function VerificationPrinciple() {
    return (<Card className="border-0 bg-[#0a1b35] py-0 text-white shadow-sm ring-0"><CardContent className="flex h-full min-h-52 items-center gap-5 p-6"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-400/12 text-emerald-300"><ShieldCheck className="size-7"/></span><div><Badge className="mb-3 border-0 bg-emerald-400/12 text-emerald-300">NGUYÊN TẮC XÁC MINH</Badge><h2 className="text-lg font-black">AI cảnh báo. Giám thị kết luận.</h2><p className="mt-2 text-xs leading-5 text-slate-400">Hãy quan sát trực tiếp, trao đổi với thí sinh khi cần và ghi chú bối cảnh trước khi xử lý theo quy chế.</p></div></CardContent></Card>);
}
