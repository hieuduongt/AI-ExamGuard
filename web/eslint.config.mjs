/**
 * Đây là gì: file cấu hình ESLint, công cụ tự đọc mã nguồn để tìm lỗi và chỗ viết chưa chuẩn.
 * Mục tiêu: giữ mã nguồn trang web sạch, đồng đều và tránh lỗi hay gặp.
 * Chức năng: dùng bộ luật khuyên dùng của Next.js (cả luật cho TypeScript) và bỏ qua các
 *   thư mục không phải mã do người viết (kết quả build, thư viện có sẵn).
 * Đầu ra: một danh sách cấu hình được xuất ra cho ESLint đọc.
 * Dùng ở đâu: lệnh "npm run lint" (hoặc "npx eslint ...") trong thư mục web/.
 * Liên kết với: web/package.json (khai báo lệnh lint), các gói eslint-config-next.
 */
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  // Bộ luật của Next.js, chú trọng tốc độ tải trang và lỗi React hay gặp.
  ...nextVitals,
  // Bộ luật thêm cho mã TypeScript.
  ...nextTs,
  // Các thư mục/file ESLint không cần kiểm tra.
  globalIgnores([
    // Thư mục tạm khi chạy và build Next.js.
    '.next/**',
    // Thư mục kết quả xuất tĩnh (npm run build).
    'out/**',
    // Thư viện MediaPipe (AI nhận diện khuôn mặt) chép sẵn vào, không phải mã của dự án.
    'public/mediapipe/**',
    // File khai báo kiểu do Next.js tự sinh.
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
