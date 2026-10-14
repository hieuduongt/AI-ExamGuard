// File này vẽ thẻ "Luồng cảnh báo" ở trang giám thị: danh sách cảnh báo mới nhất, kèm ô
// tìm kiếm và các nút lọc.

import { BellRing, Check, CheckCircle2, ChevronRight, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ExamEvent } from '@/domain/exam-types';
import { alertIcons, severityClasses } from '../alert-style';
import type { FilterValue } from '../event-filters';
import { timeLabel } from '../time-label';

// Props (thông tin khối cha truyền cho khối con): danh sách đã lọc, bộ lọc, từ khóa, cảnh báo
// đang chọn và các việc cần làm khi người dùng thay đổi chúng.
type Props = {
  filteredEvents: ExamEvent[];
  filter: FilterValue;
  onFilterChange: (value: FilterValue) => void;
  queryText: string;
  onQueryChange: (value: string) => void;
  selectedId: string | null;
  onSelectEvent: (id: string) => void;
};

/**
 * Đây là gì: React component (một khối giao diện) danh sách cảnh báo.
 * Mục tiêu: cho giám thị lướt các cảnh báo, tìm theo phòng/máy/số báo danh và chọn một cái
 *   để xem chi tiết.
 * Chức năng: ô tìm kiếm; 5 nút lọc (Tất cả, Chưa xem, Đỏ, Vàng, Thông tin); mỗi cảnh báo là
 *   một hàng có biểu tượng, phòng, máy, tiêu đề, họ tên, thời gian, dấu "Đã xem"; hàng đang
 *   chọn được tô xanh; nếu không có gì khớp thì hiện lời nhắc đổi bộ lọc.
 * Đầu ra: khối giao diện thẻ luồng cảnh báo.
 * Dùng ở đâu: ProctorScreen (web/src/features/proctor/proctor-screen.tsx).
 * Liên kết với: FilterValue và filterEvents (../event-filters.ts, tạo ra filteredEvents);
 *   alertIcons, severityClasses
 *   (../alert-style.ts); timeLabel (../time-label.ts); EventDetailDrawer mở khi chọn một hàng.
 */
export function EventFeed({ filteredEvents, filter, onFilterChange, queryText, onQueryChange, selectedId, onSelectEvent }: Props) {
  return (
    <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80">
      <CardHeader className="border-b border-slate-100 px-5 py-4"><div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><BellRing className="size-4 text-blue-600" /> Luồng cảnh báo</CardTitle><p className="mt-1 text-[10px] text-slate-400">Chọn một sự kiện để xem chi tiết và xác minh</p></div><div className="relative"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" /><Input value={queryText} onChange={(event) => onQueryChange(event.target.value)} placeholder="Tìm phòng, máy, SBD…" className="h-9 w-48 bg-slate-50 pl-9 text-xs" /></div></div><div className="mt-3 flex flex-wrap gap-2"><Filter className="mr-1 mt-1.5 size-3.5 text-slate-400" />{([['all', 'Tất cả'], ['unreviewed', 'Chưa xem'], ['critical', 'Đỏ'], ['warning', 'Vàng'], ['info', 'Thông tin']] as const).map(([value, label]) => <button key={value} onClick={() => onFilterChange(value)} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${filter === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'}`}>{label}</button>)}</div></CardHeader>
      <CardContent className="max-h-[520px] overflow-y-auto p-2">
        {filteredEvents.length ? filteredEvents.map((event) => {
          const Icon = alertIcons[event.type];
          const tone = severityClasses(event.severity);
          return <button key={event.id} onClick={() => onSelectEvent(event.id)} className={`grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 ${selectedId === event.id ? 'bg-blue-50 ring-1 ring-blue-100' : ''}`}><span className={`grid size-10 place-items-center rounded-xl ${tone.surface} ${tone.text}`}><Icon className="size-[18px]" /></span><div className="min-w-0"><div className="flex items-center gap-2"><b className="text-xs text-slate-900">{event.roomId} · {event.stationId}</b><span className={`size-1.5 rounded-full ${tone.dot}`} />{event.reviewed && <span className="text-[9px] font-bold text-emerald-600"><Check className="mr-0.5 inline size-3" />Đã xem</span>}</div><p className="mt-1 truncate text-[11px] font-semibold text-slate-600">{event.title}</p><small className="mt-1 block truncate text-[9px] text-slate-400">{event.candidateName} · {event.candidateId} · {timeLabel(event.timestamp)}</small></div><ChevronRight className="size-4 text-slate-300" /></button>;
        }) : <div className="grid min-h-72 place-items-center text-center"><div><CheckCircle2 className="mx-auto size-9 text-emerald-500" /><b className="mt-3 block text-sm">Không có cảnh báo phù hợp</b><p className="mt-1 text-xs text-slate-400">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p></div></div>}
      </CardContent>
    </Card>
  );
}
