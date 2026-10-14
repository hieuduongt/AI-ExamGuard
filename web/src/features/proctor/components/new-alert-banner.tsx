// File này vẽ dải đỏ "Cảnh báo mới cần kiểm tra" ở đầu trang giám thị khi vừa có cảnh báo mới.

import { BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExamEvent } from '@/domain/exam-types';

// Props (thông tin khối cha truyền cho khối con): cảnh báo mới nhất và việc mở nó ra xem.
type Props = { latestAlert: ExamEvent; onOpen: () => void };

/**
 * Đây là gì: React component (một khối giao diện) dải báo cảnh báo mới.
 * Mục tiêu: làm giám thị chú ý ngay khi có cảnh báo mới chưa xem.
 * Chức năng: hiện phòng, máy, họ tên, số báo danh, tiêu đề cảnh báo, chuông nhấp nháy và nút
 *   "Xem cảnh báo".
 * Đầu ra: khối giao diện dải báo màu đỏ.
 * Dùng ở đâu: ProctorScreen (web/src/features/proctor/proctor-screen.tsx), khi có latestAlert.
 * Liên kết với: latestAlert do useProctorFeed (../hooks/use-proctor-feed.ts) phát hiện;
 *   EventDetailDrawer mở ra khi bấm nút.
 */
export function NewAlertBanner({ latestAlert, onOpen }: Props) {
  return <section role="alert" className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-600 text-white"><BellRing className="size-5 animate-pulse" /></span><div className="min-w-0 flex-1"><b className="block text-xs uppercase tracking-wide text-rose-700">Cảnh báo mới cần kiểm tra</b><p className="mt-1 text-sm font-black text-rose-950">{latestAlert.roomId} · {latestAlert.stationId} · {latestAlert.candidateName} ({latestAlert.candidateId})</p><p className="mt-1 text-xs text-rose-700">{latestAlert.title}</p></div><Button onClick={onOpen} className="shrink-0 bg-rose-600 hover:bg-rose-500">Xem cảnh báo</Button></section>;
}
