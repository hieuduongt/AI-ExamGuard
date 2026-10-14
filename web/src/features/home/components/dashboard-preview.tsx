/**
 * File này vẽ hình minh họa màn hình giám thị trên trang chủ.
 * Đây chỉ là hình minh họa cố định, không phải dữ liệu thật đang diễn ra.
 */
import { BrainCircuit, Eye, MonitorCheck, Video } from 'lucide-react';

/**
 * Danh sách 15 máy thi mẫu, mỗi máy gồm tên và trạng thái:
 * "ok" = bình thường (xanh lá), "warn" = cảnh báo (vàng), "danger" = cần kiểm tra (đỏ).
 */
const seats = [
  ['PC-01', 'ok'], ['PC-02', 'ok'], ['PC-03', 'danger'], ['PC-04', 'ok'], ['PC-05', 'ok'],
  ['PC-06', 'ok'], ['PC-07', 'warn'], ['PC-08', 'ok'], ['PC-09', 'ok'], ['PC-10', 'ok'],
  ['PC-11', 'ok'], ['PC-12', 'warn'], ['PC-13', 'ok'], ['PC-14', 'ok'], ['PC-15', 'ok'],
] as const;

/**
 * Ba cảnh báo mẫu: [tên máy, nội dung, giờ, loại]. Loại "eye" hiện biểu tượng con mắt,
 * các loại khác hiện biểu tượng camera; màu theo loại (đỏ, vàng, xanh).
 */
const alerts = [
  ['PC-07', 'Quay đầu phải kéo dài', '10:21:14', 'warn'],
  ['PC-12', 'Hướng mắt lệch phải', '10:20:33', 'eye'],
  ['PC-03', 'Không có mặt trước máy', '10:19:58', 'danger'],
] as const;

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   vẽ một màn hình giám thị thu nhỏ để minh họa.
 * Mục tiêu: cho người xem hình dung màn hình giám thị trông thế nào trước khi dùng thật.
 * Chức năng: vẽ lưới 15 máy thi tô màu theo trạng thái (từ seats) và danh sách "Sự kiện cần
 *   chú ý" (từ alerts). Dữ liệu là cố định, không kết nối mạng hay camera.
 * Đầu ra: giao diện khung minh họa.
 * Dùng ở đâu: HeroSection (web/src/features/home/components/hero-section.tsx).
 * Liên kết với: màn hình giám thị thật ở web/src/features/proctor/ (hình này mô phỏng nó).
 */
export function DashboardPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-10 rounded-full bg-blue-500/12 blur-3xl" />
      <div className="relative overflow-hidden rounded-[26px] border border-white/12 bg-[#0d1d37] shadow-[0_35px_90px_rgba(0,0,0,.38)]">
        <div className="flex h-12 items-center justify-between border-b border-white/8 px-5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /> PHÒNG 01 · ĐANG GIÁM SÁT</div>
          <span className="rounded-md bg-white/6 px-2 py-1 text-[10px] font-semibold text-slate-400">15 thí sinh</span>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-[.9fr_1.1fr]">
          <section className="rounded-2xl bg-white/[.045] p-4 ring-1 ring-white/8">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-xs font-extrabold">Trạng thái máy thi</h2><span className="text-[10px] text-emerald-300">13 bình thường</span></div>
            <div className="grid grid-cols-5 gap-2">
              {seats.map(([name, status]) => <div key={name} className="text-center"><span className={`mx-auto grid aspect-[4/3] w-full place-items-center rounded-md border ${status === 'danger' ? 'border-rose-400/80 bg-rose-400/12 text-rose-200' : status === 'warn' ? 'border-amber-300/70 bg-amber-300/10 text-amber-100' : 'border-emerald-400/45 bg-emerald-400/8 text-emerald-200'}`}><MonitorCheck className="size-3.5" /></span><small className="mt-1 block text-[7px] font-bold text-slate-500">{name}</small></div>)}
            </div>
            <div className="mt-4 flex gap-4 text-[8px] font-semibold text-slate-400"><span><i className="mr-1 inline-block size-1.5 rounded-full bg-emerald-400" />Bình thường</span><span><i className="mr-1 inline-block size-1.5 rounded-full bg-amber-300" />Cảnh báo</span><span><i className="mr-1 inline-block size-1.5 rounded-full bg-rose-400" />Kiểm tra</span></div>
          </section>
          <section className="overflow-hidden rounded-2xl bg-white/[.045] ring-1 ring-white/8">
            <div className="flex h-11 items-center gap-2 border-b border-white/8 px-4"><span className="grid size-6 place-items-center rounded-lg bg-blue-500/15 text-blue-300"><BrainCircuit className="size-3.5" /></span><h2 className="text-xs font-extrabold">Sự kiện cần chú ý</h2><span className="ml-auto rounded-full bg-rose-400/15 px-2 py-0.5 text-[9px] font-bold text-rose-300">3 mới</span></div>
            <div>
              {alerts.map(([pc, label, time, type]) => <div key={pc} className="grid grid-cols-[28px_1fr_auto] items-center gap-2 border-b border-white/6 px-4 py-3 last:border-0"><span className={`grid size-7 place-items-center rounded-lg ${type === 'danger' ? 'bg-rose-400/12 text-rose-300' : type === 'warn' ? 'bg-amber-300/12 text-amber-200' : 'bg-cyan-300/10 text-cyan-200'}`}>{type === 'eye' ? <Eye className="size-3.5" /> : <Video className="size-3.5" />}</span><div><b className="block text-[10px] text-slate-200">{pc}</b><small className="mt-0.5 block text-[9px] text-slate-400">{label}</small></div><time className="text-[8px] text-slate-600">{time}</time></div>)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
