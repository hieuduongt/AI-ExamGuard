import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (vercelHost ? `https://${vercelHost}` : 'http://localhost:3000');

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
