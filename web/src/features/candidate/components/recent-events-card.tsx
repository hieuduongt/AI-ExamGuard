/**
 * File này là thẻ "Sự kiện trên máy này": các cảnh báo gần đây của máy thí sinh và việc
 * giám thị đã nhận được chưa. Thuộc phần giao diện thí sinh
 * (web/src/features/candidate/components/).
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AlertType, ExamEvent } from '@/domain/exam-types';

// Props: các cảnh báo gần đây, danh sách mã cảnh báo giám thị đã nhận, hàm tạo cảnh báo thử.
type Props = { recentEvents: ExamEvent[]; deliveredIds: string[]; createTestAlert: (type: AlertType) => void };

/**
 * Đây là gì: React component thẻ các cảnh báo trên máy này.
 * Mục tiêu: cho thí sinh biết máy mình đã phát cảnh báo nào và giám thị đã nhận chưa.
 * Chức năng: liệt kê các cảnh báo gần đây (chấm màu theo mức độ, tiêu đề, giờ), mỗi cái ghi
 *   "Giám thị đã nhận" hoặc "Đang chờ gửi đến giám thị"; nếu chưa có thì hiện lời động viên.
 *   Có mục thu gọn "Kiểm tra đường truyền cảnh báo" với 2 nút gửi cảnh báo thử vàng và đỏ.
 * Đầu ra: khối giao diện thẻ sự kiện.
 * Dùng ở đâu: candidate-screen.tsx, cột bên phải khi đang giám sát.
 * Liên kết với: recentEvents và createTestAlert từ hooks/use-monitoring-session.ts;
 *   deliveredIds từ hooks/use-delivery-status.ts.
 */
export function RecentEventsCard({ recentEvents, deliveredIds, createTestAlert }: Props) {
  return (
    <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80">
      <CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><AlertTriangle className="size-4 text-amber-500" /> Sự kiện trên máy này</CardTitle></CardHeader>
      <CardContent className="p-3">
        {recentEvents.length ? recentEvents.map((event) => <div key={event.id} className="flex gap-3 rounded-xl p-3 hover:bg-slate-50"><span className={`mt-0.5 size-2 shrink-0 rounded-full ${event.severity === 'critical' ? 'bg-rose-500' : event.severity === 'warning' ? 'bg-amber-400' : 'bg-cyan-500'}`} /><div><b className="block text-xs">{event.title}</b><small className="mt-1 block text-[10px] leading-4 text-slate-400">{new Date(event.timestamp).toLocaleTimeString('vi-VN')}</small><small className={`mt-1 block text-sm ${deliveredIds.includes(event.id) ? 'text-emerald-700' : 'text-amber-700'}`}>{deliveredIds.includes(event.id) ? 'Giám thị đã nhận' : 'Đang chờ gửi đến giám thị'}</small></div></div>) : <div className="py-6 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-500" /><p className="mt-2 text-xs font-bold text-slate-700">Chưa có sự kiện cảnh báo</p><small className="mt-1 block text-[10px] text-slate-400">Hãy giữ tư thế ổn định và nhìn vào màn hình.</small></div>}
        <details className="mt-2 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-[10px] font-bold text-slate-500">Kiểm tra đường truyền cảnh báo</summary><div className="mt-3 grid grid-cols-2 gap-2"><Button variant="outline" size="xs" onClick={() => createTestAlert('gaze_away')}>Thử cảnh báo vàng</Button><Button variant="outline" size="xs" onClick={() => createTestAlert('no_face')}>Thử cảnh báo đỏ</Button></div></details>
      </CardContent>
    </Card>
  );
}
