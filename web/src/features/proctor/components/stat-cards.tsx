// File này vẽ hàng 5 ô số liệu ở trang giám thị: tổng máy, bình thường, cảnh báo vàng,
// ưu tiên kiểm tra, chưa xác minh.

import { AlertTriangle, BellRing, CheckCircle2, MonitorCheck, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { countStations } from '../event-filters';

/**
 * Đây là gì: React component (một khối giao diện) hàng thẻ số liệu.
 * Mục tiêu: cho giám thị nắm tình hình cả phòng chỉ trong một cái nhìn.
 * Chức năng: vẽ 5 thẻ, mỗi thẻ có biểu tượng, tên, màu riêng và con số luôn đủ 2 chữ số
 *   (ví dụ "05").
 * Đầu ra: khối giao diện hàng thẻ số liệu.
 * Dùng ở đâu: ProctorScreen (web/src/features/proctor/proctor-screen.tsx).
 * Liên kết với: countStations (../event-filters.ts) tính ra các con số.
 */
export function StatCards({ counts }: { counts: ReturnType<typeof countStations> }) {
  const statCards = [
    { Icon: MonitorCheck, label: 'Tổng máy thi', count: counts.total, tone: 'text-blue-600 bg-blue-50' },
    { Icon: CheckCircle2, label: 'Bình thường', count: counts.normal, tone: 'text-emerald-600 bg-emerald-50' },
    { Icon: AlertTriangle, label: 'Cảnh báo vàng', count: counts.warning, tone: 'text-amber-600 bg-amber-50' },
    { Icon: ShieldAlert, label: 'Ưu tiên kiểm tra', count: counts.critical, tone: 'text-rose-600 bg-rose-50' },
    { Icon: BellRing, label: 'Chưa xác minh', count: counts.unreviewed, tone: 'text-violet-600 bg-violet-50' },
  ];
  return (
    <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
      {statCards.map(({ Icon, label, count, tone }) => <Card key={label} className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardContent className="flex items-center gap-3 p-4"><span className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></span><div><small className="block text-[10px] font-bold text-slate-400">{label}</small><strong className="mt-1 block text-xl font-black">{String(count).padStart(2, '0')}</strong></div></CardContent></Card>)}
    </section>
  );
}
