/**
 * File này vẽ dải "ba điểm nổi bật" trên trang chủ: nhóm hành vi theo dõi, phân tích ngay
 * trên máy, và con người là người quyết định cuối cùng.
 */
import { BrainCircuit, Eye, LockKeyhole } from 'lucide-react';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   hiện ba thẻ tính năng nổi bật.
 * Mục tiêu: giúp người xem hiểu nhanh hệ thống theo dõi gì và tôn trọng quyền riêng tư ra sao.
 * Chức năng: từ một danh sách ba mục (biểu tượng, tiêu đề, mô tả), vẽ ra ba thẻ nằm cạnh nhau.
 * Đầu ra: giao diện dải tính năng, có id="tinh-nang".
 * Dùng ở đâu: HomeScreen (web/src/features/home/home-screen.tsx).
 * Liên kết với: liên kết "Tính năng" trong home-header.tsx nhảy tới id="tinh-nang" này.
 */
export function FeatureHighlights() {
  return (
    <section id="tinh-nang" className="relative -mt-7 pb-16 sm:-mt-9">
      <div className="mx-auto grid w-[min(1080px,calc(100%-32px))] gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_22px_70px_rgba(28,61,105,.13)] md:grid-cols-3">
        {[
          [Eye, '5 nhóm hành vi', 'Khuôn mặt, hướng nhìn, tư thế và thao tác bàn phím/chuột.'],
          [BrainCircuit, 'Phân tích tại chỗ', 'Video được xử lý cục bộ, chỉ sự kiện cảnh báo được gửi đi.'],
          [LockKeyhole, 'Con người quyết định', 'AI chỉ hỗ trợ quan sát; giám thị xác minh mọi tình huống.'],
        ].map(([Icon, title, text]) => <article key={String(title)} className="flex gap-4 rounded-2xl p-5 transition hover:bg-slate-50"><span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-blue-50 text-blue-600"><Icon className="size-5" /></span><div><h2 className="text-sm font-extrabold text-slate-900">{String(title)}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{String(text)}</p></div></article>)}
      </div>
    </section>
  );
}
