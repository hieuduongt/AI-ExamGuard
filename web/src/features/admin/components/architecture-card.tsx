import { Cloud, Database, Laptop, Network, ServerCog, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { hasFirebaseConfig } from '@/services/exam-sync';
export function ArchitectureCard() {
    return (<Card className="border-0 bg-[#0a1b35] py-0 text-white shadow-xl shadow-slate-300/30 ring-0"><CardHeader className="border-b border-white/8 px-5 py-5"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><ServerCog className="size-4 text-cyan-300"/> Kiến trúc triển khai</CardTitle></CardHeader><CardContent className="p-5"><div className="grid gap-3">{[
            [Laptop, 'Máy thí sinh', 'Webcam + MediaPipe + Behavior Engine'],
            [Network, 'Kênh sự kiện', hasFirebaseConfig ? 'Firebase Firestore thời gian thực' : 'BroadcastChannel / localStorage demo'],
            [Cloud, 'Dashboard giám thị', 'Chỉ nhận trạng thái và cảnh báo'],
            [Database, 'Kho dữ liệu', 'Sự kiện, cấu hình và lịch sử xác minh'],
        ].map(([Icon, title, detail], index) => <div key={String(title)} className="relative flex gap-3 rounded-xl bg-white/[.045] p-3.5 ring-1 ring-white/7"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-cyan-300"><Icon className="size-[18px]"/></span><div><b className="block text-xs">{String(title)}</b><small className="mt-1 block text-[9px] leading-4 text-slate-400">{String(detail)}</small></div>{index < 3 && <i className="absolute -bottom-3 left-[31px] h-3 border-l border-dashed border-cyan-300/30"/>}</div>)}</div><div className={`mt-4 flex items-center gap-3 rounded-xl p-3 ${hasFirebaseConfig ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-300/10 text-amber-100'}`}><Wifi className="size-4"/><span className="text-[10px] font-bold">{hasFirebaseConfig ? 'Đã có cấu hình Firebase' : 'Chưa cấu hình Firebase — đang dùng demo cục bộ'}</span></div></CardContent></Card>);
}
