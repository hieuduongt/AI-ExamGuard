/**
 * Đây là gì: file cấu hình Next.js, bộ khung dùng để xây trang web AI ExamGuard.
 * Mục tiêu: xuất trang web thành các file tĩnh (HTML, CSS, JS) để chạy được mà không cần
 *   máy chủ Node.js, kể cả khi không có Internet.
 * Chức năng: bật chế độ xuất tĩnh; tắt tối ưu ảnh; khi `next dev` proxy /api/* sang hub LAN
 *   (mặc định http://127.0.0.1:8765) để chạy tách web + hub không bị 404 trên cổng 3000;
 *   mở rộng allowedDevOrigins để máy khác trong LAN tải được /_next/*.
 * Đầu ra: một đối tượng cấu hình được xuất ra cho Next.js đọc.
 * Dùng ở đâu: Next.js tự đọc file này khi chạy "npm run dev" hoặc "npm run build" trong web/.
 * Liên kết với: thư mục web/out (kết quả build) được chương trình hub trên máy giám thị
 *   phục vụ lại cho các máy trong phòng (desktop-hub/examguard_desktop/http_handler.py).
 */
import os from 'node:os';
import type { NextConfig } from 'next';

const hubProxyTarget = (process.env.EXAMGUARD_HUB_URL || process.env.NEXT_PUBLIC_HUB_URL || 'http://127.0.0.1:8765')
  .trim()
  .replace(/\/+$/, '');

/** Mọi IPv4 LAN hiện có + mẫu *.*.*.* (Next không hỗ trợ "*" bắt mọi host). */
function allowAllLanDevOrigins() {
  const origins = new Set<string>([
    'localhost',
    '127.0.0.1',
    // Khớp mọi địa chỉ IPv4 dạng a.b.c.d (mỗi * = một octet).
    '*.*.*.*',
  ]);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      const family = String(net.family);
      if (family === 'IPv4' || family === '4') origins.add(net.address);
    }
  }
  for (const value of (process.env.ALLOWED_DEV_ORIGINS || '').split(',')) {
    const host = value.trim();
    if (host) origins.add(host);
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  // Xuất toàn bộ trang web thành file tĩnh vào thư mục out/.
  output: 'export',
  // Cho phép máy khác mở `next dev` qua mọi IP LAN (không bị chặn /_next/chunks).
  allowedDevOrigins: allowAllLanDevOrigins(),
  // Cấu hình về ảnh.
  images: {
    // Dùng ảnh nguyên bản, không tối ưu, vì chế độ xuất tĩnh không có máy chủ để tối ưu ảnh.
    unoptimized: true,
  },
  // Chỉ có tác dụng lúc `next dev` (bản export tĩnh không dùng rewrite).
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${hubProxyTarget}/api/:path*` },
    ];
  },
};

export default nextConfig;
