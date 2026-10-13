import { Check, Eye, Keyboard, LockKeyhole, RotateCcw, ScanFace } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// What the system watches for; static explanation shown before the exam starts.
export function CheckListCard() {
  return (
    <Card className="border-0 bg-[#091a34] py-0 text-white shadow-xl shadow-slate-300/30 ring-0">
      <CardHeader className="px-6 pt-6"><CardTitle className="font-extrabold">Hệ thống sẽ kiểm tra</CardTitle><CardDescription className="text-slate-400">Các tín hiệu được lọc theo bộ đệm 2–5 giây để giảm báo nhầm.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 p-6 pt-4">
        {[
          [ScanFace, 'Khuôn mặt', 'Vắng mặt hoặc xuất hiện người thứ hai'],
          [Eye, 'Hướng nhìn', 'Nhìn lệch trái, phải, lên hoặc xuống'],
          [RotateCcw, 'Tư thế đầu', 'Quay, cúi hoặc ngẩng kéo dài'],
          [Keyboard, 'Tương tác trình duyệt', 'Chuyển tab, sao chép hoặc in'],
        ].map(([Icon, title, detail]) => <div key={String(title)} className="flex items-center gap-4 rounded-2xl border border-white/7 bg-white/[.045] p-4"><span className="grid size-10 place-items-center rounded-xl bg-blue-500/15 text-cyan-300"><Icon className="size-5" /></span><div><b className="block text-sm">{String(title)}</b><small className="mt-1 block text-xs text-slate-400">{String(detail)}</small></div><Check className="ml-auto size-4 text-emerald-400" /></div>)}
        <div className="mt-1 flex items-start gap-3 rounded-xl bg-emerald-400/8 p-4 text-emerald-200"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><p className="text-xs leading-5">Video không được truyền liên tục lên máy giám thị trong cấu hình mặc định.</p></div>
      </CardContent>
    </Card>
  );
}
