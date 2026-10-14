/**
 * File này vẽ dải thông báo về quyền riêng tư ở cuối trang chủ.
 */
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   dải màu xanh nói về sự minh bạch, riêng tư và công bằng.
 * Mục tiêu: trấn an người dùng rằng hệ thống không tự kết luận vi phạm và ưu tiên xử lý
 *   dữ liệu ngay trên máy.
 * Chức năng: hiện biểu tượng khiên, tiêu đề, đoạn giải thích và liên kết "Kiểm tra máy"
 *   sang "/thi-sinh".
 * Đầu ra: giao diện dải quyền riêng tư, có id="quyen-rieng-tu".
 * Dùng ở đâu: HomeScreen (web/src/features/home/home-screen.tsx).
 * Liên kết với: liên kết "Quyền riêng tư" trong home-header.tsx nhảy tới id này.
 */
export function PrivacyBanner() {
  return (
    <section id="quyen-rieng-tu" className="mx-auto mb-16 flex w-[min(980px,calc(100%-32px))] flex-col items-center rounded-[24px] border border-emerald-100 bg-emerald-50/70 px-6 py-8 text-center sm:flex-row sm:text-left">
      <span className="mb-4 grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white sm:mb-0"><ShieldCheck /></span>
      <div className="sm:ml-5"><h2 className="text-base font-black text-emerald-950">Minh bạch, riêng tư và công bằng ngay từ thiết kế</h2><p className="mt-1 text-sm leading-6 text-emerald-800/70">Hệ thống không tự kết luận vi phạm, ưu tiên xử lý dữ liệu trên thiết bị và cung cấp ngưỡng cảnh báo rõ ràng cho từng phòng thi.</p></div>
      <Link href="/thi-sinh" className="mt-5 shrink-0 text-sm font-extrabold text-emerald-700 sm:ml-auto sm:mt-0 sm:pl-8">Kiểm tra máy <ArrowRight className="ml-1 inline size-4" /></Link>
    </section>
  );
}
