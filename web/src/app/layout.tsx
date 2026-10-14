/**
 * File này là "khung chung" (layout) bọc ngoài mọi trang của trang web AI ExamGuard.
 * Nó nạp phông chữ, nạp file trang trí chung (globals.css) và khai báo thông tin trang
 * (tiêu đề, mô tả, ảnh xem trước khi chia sẻ link) cho trình duyệt và mạng xã hội.
 */
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

/** Hai phông chữ Geist (chữ thường và chữ đều nét kiểu máy đánh chữ), gắn vào biến CSS. */
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

/**
 * Địa chỉ gốc của trang web, dùng để tạo đường dẫn đầy đủ cho ảnh xem trước (og.png).
 * Ưu tiên biến môi trường NEXT_PUBLIC_SITE_URL, rồi địa chỉ do Vercel (dịch vụ đăng trang web)
 * cung cấp, cuối cùng là "http://localhost:3000" khi chạy thử trên máy.
 */
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (vercelHost ? `https://${vercelHost}` : 'http://localhost:3000');

/**
 * Thông tin giới thiệu trang (metadata): tiêu đề trên thẻ trình duyệt, mô tả, biểu tượng nhỏ
 * (favicon.svg) và ảnh xem trước khi chia sẻ link lên Facebook/Twitter (og.png trong web/public/).
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'AI ExamGuard — Giám sát thi thông minh',
  description: 'Hệ thống AI hỗ trợ giám thị phát hiện sớm hành vi bất thường trong phòng thi, xử lý dữ liệu ngay trên máy thí sinh.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'AI ExamGuard — Giám sát thi thông minh',
    description: 'Phát hiện sớm, cảnh báo đúng lúc, con người quyết định.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'AI ExamGuard — Giám sát thi thông minh' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI ExamGuard — Giám sát thi thông minh',
    description: 'Phát hiện sớm, cảnh báo đúng lúc, con người quyết định.',
    images: ['/og.png'],
  },
};

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   làm khung ngoài cùng của mọi trang.
 * Mục tiêu: để mọi trang dùng chung ngôn ngữ tiếng Việt, phông chữ và kiểu trang trí.
 * Chức năng: tạo thẻ <html lang="vi"> và <body> gắn phông Geist, rồi đặt nội dung trang
 *   (children, tức là phần khối cha truyền vào bên trong) vào giữa.
 * Đầu ra: khung HTML hoàn chỉnh chứa trang đang mở.
 * Dùng ở đâu: Next.js tự bọc quanh mọi trang trong web/src/app/ ("/", "/thi-sinh",
 *   "/giam-thi", "/quan-tri").
 * Liên kết với: web/src/app/globals.css, hằng số metadata ở trên.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
