/**
 * File này là phần tiêu đề đầu trang thí sinh, kèm ô nhỏ báo trạng thái hiện tại.
 * Thuộc phần giao diện thí sinh (web/src/features/candidate/components/).
 */
import { Badge } from '@/components/ui/badge';

// Props: màu chấm trạng thái, có đang giám sát không, câu trạng thái hiện tại.
type Props = { statusTone: string; running: boolean; statusText: string };

/**
 * Đây là gì: React component tiêu đề trang thí sinh.
 * Mục tiêu: cho thí sinh biết mình đang ở khu vực nào và hệ thống đang làm gì.
 * Chức năng: hiện nhãn "KHU VỰC THÍ SINH", tiêu đề, lời giải thích rằng webcam được phân
 *   tích ngay trên máy; bên phải là chấm màu trạng thái (nhấp nháy khi đang giám sát) và câu
 *   trạng thái.
 * Đầu ra: khối giao diện tiêu đề.
 * Dùng ở đâu: đầu trang trong candidate-screen.tsx.
 * Liên kết với: statusText từ hooks/use-monitoring-session.ts; màu statusTone tính trong
 *   candidate-screen.tsx.
 */
export function CandidateHeading({ statusTone, running, statusText }: Props) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><Badge className="mb-3 bg-blue-100 text-blue-700">KHU VỰC THÍ SINH</Badge><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Kiểm tra thiết bị & bắt đầu giám sát</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Webcam được phân tích ngay trên máy này. Hệ thống chỉ gửi chỉ số trạng thái và sự kiện cần chú ý.</p></div>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><span className={`size-2.5 rounded-full ${statusTone} ${running ? 'animate-pulse' : ''}`} /><div><small className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Trạng thái</small><b className="text-xs">{statusText}</b></div></div>
    </div>
  );
}
