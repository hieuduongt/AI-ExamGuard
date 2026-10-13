# web/ — Giao diện và AI nhận diện

## 1. Phần này làm gì?

Toàn bộ những gì người dùng nhìn thấy, gồm 4 trang:

| Trang | Ai dùng | Làm gì |
| --- | --- | --- |
| `/` | Mọi người | Giới thiệu, chọn vai trò |
| `/thi-sinh` | Học sinh | Khai báo thông tin, bật webcam, AI phân tích và gửi cảnh báo |
| `/giam-thi` | Giáo viên | Sơ đồ máy thi, danh sách cảnh báo, xác minh, xuất CSV |
| `/quan-tri` | Quản trị | Cấu hình phòng, ngưỡng thời gian, quyền riêng tư |

AI (MediaPipe Face Landmarker) chạy ngay trong trình duyệt của học sinh. Mô hình và WASM được
đóng kèm trong `public/mediapipe/` nên chạy được khi không có Internet.

Công nghệ: Next.js 16 (xuất tĩnh ra `out/`), React 19, TypeScript, Tailwind CSS 4, shadcn,
MediaPipe Tasks Vision, Firebase Firestore (tùy chọn).

## 2. Cấu trúc thư mục

Code được chia theo **tầng**, tầng trên được phép dùng tầng dưới, không làm ngược lại:

```text
src/app/  →  src/features/  →  src/services/ , src/ai/  →  src/domain/
(trang)      (màn hình)         (truyền dữ liệu, AI)        (quy tắc nghiệp vụ)
```

```text
web/
├── src/
│   ├── app/                    Định tuyến: mỗi thư mục = 1 đường dẫn URL. Chỉ 3–5 dòng, gọi màn hình ở features/.
│   │   ├── page.tsx            → /           (HomeScreen)
│   │   ├── thi-sinh/page.tsx   → /thi-sinh   (CandidateScreen)
│   │   ├── giam-thi/page.tsx   → /giam-thi   (ProctorScreen)
│   │   ├── quan-tri/page.tsx   → /quan-tri   (AdminScreen)
│   │   ├── layout.tsx          Khung HTML chung, font, metadata
│   │   └── globals.css         Màu sắc, theme
│   │
│   ├── features/               Mỗi vai trò một thư mục, bên trong chia nhỏ:
│   │   ├── candidate/          Thí sinh
│   │   │   ├── candidate-screen.tsx      Ghép các khối giao diện
│   │   │   ├── hooks/
│   │   │   │   ├── use-monitoring-session.ts   Phiên giám sát: webcam → AI → cảnh báo → nhịp tim 2 giây
│   │   │   │   ├── use-hub-connection.ts       Địa chỉ máy giám thị + kiểm tra kết nối
│   │   │   │   ├── use-delivery-status.ts      Cảnh báo nào giám thị đã nhận / còn chờ gửi
│   │   │   │   └── use-browser-guard.ts        Phát hiện chuyển tab, Ctrl/Cmd + C/V/X/P
│   │   │   ├── components/     Từng khối giao diện (form, camera, tín hiệu, sự kiện…)
│   │   │   └── camera-errors.ts  Thông báo lỗi webcam dễ hiểu
│   │   ├── proctor/            Giám thị: hooks/use-proctor-feed.ts (dữ liệu trực tiếp),
│   │   │                       event-filters.ts, csv-export.ts, components/…
│   │   ├── admin/              Quản trị: admin-settings.ts (đọc/xuất cấu hình), components/…
│   │   └── home/               Trang chủ: components/…
│   │
│   ├── domain/                 QUY TẮC NGHIỆP VỤ — không phụ thuộc giao diện hay mạng
│   │   ├── exam-types.ts       Kiểu dữ liệu: sự kiện, trạng thái máy, chỉ số AI, ngưỡng
│   │   ├── thresholds.ts       Ngưỡng mặc định (5s/2s/3s/5s/12s) và giới hạn góc
│   │   ├── behavior-engine.ts  Bộ đếm thời gian: khi nào tín hiệu thành cảnh báo
│   │   ├── alert-catalog.ts    Tên tiếng Việt và mức độ (đỏ/vàng) của từng cảnh báo
│   │   └── station-health.ts   Máy đang xanh / vàng / đỏ
│   │
│   ├── ai/                     Làm việc với MediaPipe
│   │   ├── face-landmarker-loader.ts  Tải mô hình (bản đóng kèm trước, Internet sau; GPU rồi CPU)
│   │   ├── face-metrics.ts     Từ điểm mốc khuôn mặt → số mặt, góc quay, góc cúi, hướng mắt
│   │   └── face-overlay.ts     Vẽ khung lưới lên video
│   │
│   ├── services/               Gửi / nhận dữ liệu
│   │   ├── exam-sync.ts        CỬA DUY NHẤT các màn hình dùng: publishEvent, publishStation,
│   │   │                       markEventReviewed, subscribeExamData…
│   │   ├── hub/                Kênh LAN tới máy giám thị (desktop/): địa chỉ, hàng đợi gửi lại, gọi API
│   │   ├── firebase/           Kênh Firestore (chỉ bật khi có cấu hình)
│   │   ├── local-demo/         Kênh demo trong cùng trình duyệt (localStorage + BroadcastChannel)
│   │   ├── browser-signals.ts  Tên các tín hiệu nội bộ giữa các phần của trang
│   │   └── desktop-bridge.ts   Gọi ứng dụng desktop mở cửa sổ giám thị riêng
│   │
│   ├── components/
│   │   ├── layout/examguard-header.tsx  Thanh điều hướng trên cùng
│   │   └── ui/                 6 component shadcn đang dùng (badge, button, card, input, progress, switch)
│   └── lib/utils.ts            Hàm `cn` gộp class Tailwind
│
├── public/mediapipe/           Mô hình AI + WASM (không sửa tay)
├── tests/
│   ├── unit/                   Kiểm thử đơn vị (`npm test`)
│   ├── e2e/alert-flow.cjs      Kiểm thử toàn luồng với trình duyệt thật
│   └── helpers/load-source.cjs Nạp file TypeScript để test không cần build
└── next.config.ts, tsconfig.json, eslint.config.mjs, package.json …
```

Alias `@/` trỏ tới `src/` (ví dụ `@/domain/thresholds`).

## 3. Chạy và kiểm tra

Yêu cầu Node.js 24.x (22.x vẫn chạy được, chỉ cảnh báo).

```bash
npm ci               # cài thư viện lần đầu
npm run dev          # chạy thử: http://localhost:3000
npm run lint         # kiểm tra quy tắc code
npx tsc --noEmit     # kiểm tra kiểu TypeScript
npm test             # kiểm thử đơn vị
npm run build        # xuất bản tĩnh ra out/ (desktop/ dùng thư mục này)
```

Webcam chỉ hoạt động trên `localhost` hoặc HTTPS. Kiểm thử toàn luồng (e2e) và build EXE:
xem [docs/van-hanh/chay-va-build.md](../docs/van-hanh/chay-va-build.md).

Firebase (tùy chọn): sao chép `.env.example` thành `.env.local` và điền cấu hình. Để trống thì
ứng dụng dùng kênh LAN / demo.

## 4. Muốn sửa X thì sửa ở đâu?

| Muốn | Sửa |
| --- | --- |
| Đổi ngưỡng thời gian mặc định hoặc giới hạn góc | `src/domain/thresholds.ts` |
| Đổi cách đếm thời gian, chống nhiễu | `src/domain/behavior-engine.ts` (+ `tests/unit/behavior-engine.test.cjs`) |
| Đổi tên hiển thị / mức độ của cảnh báo | `src/domain/alert-catalog.ts` |
| Thêm loại cảnh báo mới | `exam-types.ts` (AlertType) → `alert-catalog.ts` → `behavior-engine.ts` hoặc `use-browser-guard.ts` → icon trong `features/proctor/alert-style.ts` |
| Cách tính góc quay đầu, hướng mắt | `src/ai/face-metrics.ts` |
| Sửa một khối giao diện | `src/features/<vai-trò>/components/` |
| Thêm kênh đồng bộ mới | Tạo thư mục trong `src/services/`, nối vào `src/services/exam-sync.ts` |
| Thêm trang mới | `src/app/<duong-dan>/page.tsx` + `src/features/<ten>/` |
| Thêm component shadcn | `npx shadcn add <tên>` (sinh vào `src/components/ui/`) |

## 5. Những thứ KHÔNG được đổi tùy tiện

Các giá trị dưới đây là "hợp đồng" giữa các máy hoặc giữa các phiên bản. Đổi sẽ làm máy cũ/mới
không hiểu nhau hoặc mất dữ liệu đã lưu trong trình duyệt. Chi tiết:
[docs/ky-thuat/du-lieu-trinh-duyet.md](../docs/ky-thuat/du-lieu-trinh-duyet.md) và
[docs/ky-thuat/api-lan.md](../docs/ky-thuat/api-lan.md).

- Đường dẫn trang: `/`, `/thi-sinh`, `/giam-thi`, `/quan-tri`.
- Khóa localStorage `examguard:*`, kênh `examguard:live:v2`, tên sự kiện `examguard-*`.
- Đường dẫn và dạng dữ liệu API LAN (`/api/...`).
- `id` của các ô nhập (`candidate-name`, `candidate-id`, `room-id`, `station-id`…) và nội dung nút — kiểm thử e2e dựa vào chúng.
