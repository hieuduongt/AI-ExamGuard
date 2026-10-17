// File này vẽ thẻ "Trạng thái máy thí sinh" ở trang giám thị: lưới ô vuông, mỗi ô là một
// máy thí sinh, tô màu theo tình trạng.

import { MonitorCheck, Trash2, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExamEvent, StationStatus } from '@/domain/exam-types';

// Props (thông tin khối cha truyền cho khối con): danh sách máy, danh sách cảnh báo và việc
// mở một cảnh báo / xóa máy.
type Props = {
  activeStations: StationStatus[];
  events: ExamEvent[];
  onSelectEvent: (id: string) => void;
  onRemoveStation: (roomId: string, stationId: string) => void;
};

/**
 * Đây là gì: React component (một khối giao diện) lưới máy thí sinh.
 * Mục tiêu: cho giám thị thấy ngay máy nào ổn, máy nào cần theo dõi, máy nào cần kiểm tra.
 * Chức năng: mỗi máy thí sinh là một ô màu theo trạng thái; bấm ô mở cảnh báo chưa xem gần
 *   nhất; nút thùng rác gỡ máy khỏi lưới (không xóa cảnh báo đã ghi).
 * Đầu ra: khối giao diện thẻ lưới máy.
 * Dùng ở đâu: ProctorScreen (web/src/features/proctor/proctor-screen.tsx).
 */
export function StationGrid({ activeStations, events, onSelectEvent, onRemoveStation }: Props) {
  return (
    <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80">
      <CardHeader className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <CardTitle className="text-sm font-extrabold">Trạng thái máy thí sinh</CardTitle>
          <p className="mt-1 text-[10px] text-slate-400">Cập nhật trạng thái gần nhất theo thời gian thực · nút thùng rác để gỡ máy đã ngắt</p>
        </div>
        <div className="flex gap-3 text-[9px] font-bold text-slate-400">
          <span><i className="mr-1 inline-block size-2 rounded-full bg-emerald-500" />Ổn định</span>
          <span><i className="mr-1 inline-block size-2 rounded-full bg-amber-400" />Theo dõi</span>
          <span><i className="mr-1 inline-block size-2 rounded-full bg-rose-500" />Kiểm tra</span>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3 p-5 sm:grid-cols-5">
        {activeStations.map((station) => {
          const tone = station.state === 'critical' ? 'border-rose-200 bg-rose-50 text-rose-700' : station.state === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700' : station.state === 'offline' ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-emerald-200 bg-emerald-50/70 text-emerald-700';
          const recent = events.find((event) => event.roomId === station.roomId && event.stationId === station.stationId && !event.reviewed);
          const progress = station.behaviorProgress?.find((item) => item.type === 'head_turn');
          const aiText = station.state === 'offline' ? 'Phiên đã dừng / mất kết nối' : station.analysisState === 'ready' ? 'AI đang phân tích' : station.analysisState === 'loading' ? 'Đang tải AI' : station.analysisMessage || 'AI chưa có dữ liệu mới';
          return (
            <div key={`${station.roomId}::${station.stationId}`} className={`group relative rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}>
              <button
                type="button"
                title="Xóa máy khỏi lưới"
                aria-label={`Xóa máy ${station.stationId}`}
                onClick={(event) => {
                  event.stopPropagation();
                  if (window.confirm(`Xóa máy ${station.stationId} (${station.candidateName}) khỏi lưới giám thị?\nCảnh báo đã ghi vẫn giữ lại.`)) {
                    onRemoveStation(station.roomId, station.stationId);
                  }
                }}
                className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 opacity-70 transition hover:bg-white/80 hover:text-rose-600 hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
              <button type="button" onClick={() => recent && onSelectEvent(recent.id)} className="w-full text-left">
                <span className="flex items-center justify-between pr-6">
                  <MonitorCheck className="size-5" />
                  {station.alertCount > 0 && (
                    <i className="grid size-5 place-items-center rounded-full bg-current text-[9px] font-black text-white [background:currentColor]">
                      <b className="text-white">{station.alertCount}</b>
                    </i>
                  )}
                </span>
                <small className="mt-3 block truncate text-[8px] font-bold uppercase opacity-60">{station.roomId}</small>
                <b className="mt-0.5 block text-xs">{station.stationId}</b>
                <small className="mt-1 block truncate text-[9px] opacity-80">{station.candidateName}</small>
                <small className="mt-0.5 block truncate text-[8px] font-bold opacity-60">{station.candidateId}</small>
                <small className="mt-2 block text-xs">{aiText}</small>
                {progress && station.state !== 'offline' && (
                  <small className="mt-1 block text-xs font-semibold">
                    Quay đầu: {Math.min(progress.elapsedSeconds, progress.requiredSeconds).toFixed(1)} / {progress.requiredSeconds}s
                  </small>
                )}
                {recent && <span className="mt-2 block rounded bg-rose-100 p-1 text-xs font-bold text-rose-800">Có cảnh báo chưa xem</span>}
              </button>
            </div>
          );
        })}
        {!activeStations.length && (
          <div className="col-span-full grid min-h-52 place-items-center text-center">
            <div>
              <Wifi className="mx-auto size-8 text-slate-300" />
              <b className="mt-3 block text-sm text-slate-700">Chưa có máy thí sinh kết nối</b>
              <p className="mt-1 text-xs leading-5 text-slate-400">Mở AI ExamGuard trên máy thí sinh, nhập địa chỉ LAN phía trên và bắt đầu giám sát.</p>
            </div>
          </div>
        )}
      </CardContent>
      <div className="grid grid-cols-3 border-t border-slate-100 px-5 py-4 text-center">
        <div>
          <b className="block text-sm font-black">{Math.round(activeStations.reduce((sum, station) => sum + station.metrics.fps, 0) / Math.max(activeStations.length, 1))}</b>
          <small className="text-[9px] text-slate-400">FPS AI trung bình</small>
        </div>
        <div className="border-x border-slate-100">
          <b className="block text-sm font-black text-emerald-600">{activeStations.filter((station) => station.state !== 'offline').length}/{activeStations.length}</b>
          <small className="text-[9px] text-slate-400">Máy đang kết nối</small>
        </div>
        <div>
          <b className="block text-sm font-black">{events.length}</b>
          <small className="text-[9px] text-slate-400">Tổng sự kiện</small>
        </div>
      </div>
    </Card>
  );
}
