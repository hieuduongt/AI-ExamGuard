// File này vẽ thẻ "Phân bố sự kiện" ở trang giám thị: các thanh ngang cho biết mỗi nhóm
// cảnh báo xảy ra nhiều hay ít.

import { CircleDot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExamEvent } from '@/domain/exam-types';

/**
 * Đây là gì: React component (một khối giao diện) biểu đồ thanh ngang về các loại cảnh báo.
 * Mục tiêu: cho giám thị thấy loại hành vi nào đang xảy ra nhiều nhất trong phòng.
 * Chức năng: đếm cảnh báo theo 4 nhóm: không có mặt, hướng nhìn/quay đầu, rời cửa sổ bài thi,
 *   nhiều khuôn mặt; vẽ mỗi nhóm một thanh, dài theo tỉ lệ so với nhóm lớn nhất (ít nhất 5%).
 * Đầu ra: khối giao diện thẻ phân bố.
 * Dùng ở đâu: ProctorScreen (web/src/features/proctor/proctor-screen.tsx).
 * Liên kết với: các loại cảnh báo (AlertType) trong web/src/domain/exam-types.ts.
 */
export function EventDistribution({ events }: { events: ExamEvent[] }) {
  return (
    <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><CircleDot className="size-4 text-violet-600" /> Phân bố sự kiện</CardTitle></CardHeader><CardContent className="grid gap-4 p-5">{[
      ['Không có mặt', events.filter((event) => event.type === 'no_face').length, 'bg-rose-500'],
      ['Hướng nhìn / quay đầu', events.filter((event) => event.type === 'gaze_away' || event.type === 'head_turn').length, 'bg-amber-400'],
      ['Rời cửa sổ bài thi', events.filter((event) => event.type === 'focus_lost').length, 'bg-violet-500'],
      ['Nhiều khuôn mặt', events.filter((event) => event.type === 'multiple_faces').length, 'bg-cyan-500'],
    ].map(([label, value, color]) => { const count = Number(value); const max = Math.max(...events.reduce<number[]>((all, item) => { const index = ['no_face', 'gaze_away', 'focus_lost', 'multiple_faces'].indexOf(item.type); if (index >= 0) all[index] = (all[index] ?? 0) + 1; return all; }, [0, 0, 0, 0]), 1); return <div key={String(label)}><div className="mb-2 flex justify-between text-[10px] font-bold"><span className="text-slate-500">{String(label)}</span><span>{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(5, count / max * 100)}%` }} /></div></div>; })}</CardContent></Card>
  );
}
