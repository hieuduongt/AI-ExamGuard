# web/ — Giao diện và AI nhận diện

## Đọc trong 1 phút

Thư mục này chứa **mọi thứ người dùng nhìn thấy**, và cả **bộ não AI** chạy trên máy học sinh.

Ví von: `web/` giống một cuốn sách 4 chương. Mỗi chương (trang) dành cho một người:

| Trang | Ai dùng | Trang này làm gì |
| --- | --- | --- |
| `/` | Mọi người | Giới thiệu, chọn vai trò |
| `/thi-sinh` | Học sinh | Khai báo thông tin, kết nối máy giám thị (bằng mã 4 số hoặc địa chỉ), bật webcam; AI phân tích và gửi cảnh báo |
| `/giam-thi` | Giáo viên | Hiện mã kết nối + địa chỉ cho học sinh, sơ đồ máy thi, cảnh báo (dải đỏ), Xác nhận đúng / Báo nhầm, xem đoạn hình, xuất CSV / biên bản, xóa máy khỏi lưới |
| `/quan-tri` | Nhà trường | Đặt tên phòng, ngưỡng thời gian (kể cả cúi/ngẩng riêng), quyền riêng tư (đoạn hình); **Lưu** đẩy lên hub |

AI ở đây là **MediaPipe Face Landmarker** của Google: nhìn mỗi khung hình webcam và chấm **478 điểm** trên
khuôn mặt (khóe mắt, chóp mũi, cằm…). Từ vị trí các điểm đó, code tính ra: có mấy khuôn mặt, đầu quay
bao nhiêu độ, mắt nhìn đi đâu. Mô hình được đóng kèm trong `public/mediapipe/` nên **không cần Internet**.

Hai tầng quan trọng: **nhìn** (`ai/vision-provider.ts` + MediaPipe) chỉ ra vài con số; **đếm giây**
(`domain/behavior-engine.ts`) mới tạo cảnh báo. Giám thị mới kết luận đúng / báo nhầm.

Sau khi build (`npm run build`), cả thư mục biến thành các file HTML/JS tĩnh trong `out/`.
Ứng dụng Windows ở [`../desktop-hub/`](../desktop-hub/README.md) sẽ phục vụ thư mục `out/` này.

## Một cảnh báo được tạo ra thế nào?

Đây là con đường của một cảnh báo, kèm file code phụ trách từng bước:

```text
Webcam ──▶ AI chấm điểm khuôn mặt ──▶ Tính góc, đếm số mặt ──▶ Bộ đếm thời gian ──▶ Gửi cảnh báo
           ai/face-landmarker-       ai/vision-provider.ts     domain/behavior-     services/exam-sync.ts
           loader.ts + face-metrics  (+ face-metrics)          engine.ts            → services/hub/
```

1. `features/candidate/hooks/use-monitoring-session.ts` mở webcam, lặp từng khung hình và đưa cho AI;
   đọc ngưỡng / công tắc đoạn hình từ hub (`services/hub/hub-settings.ts`) khi bắt đầu và đang chạy.
2. `ai/vision-provider.ts` là cửa tầng nhìn: MediaPipe → `VisionMetrics` (số mặt, yaw/pitch, gaze, fps).
   Có nhánh dự phòng `future-custom` (ổ cắm trống).
3. `domain/behavior-engine.ts` là **bộ đếm giờ**: chỉ khi một dấu hiệu kéo dài đủ ngưỡng mới tạo cảnh báo
   (quay đầu 3s, cúi/ngẩng 6s, …). Nhiễu dưới 0,4 giây được bỏ qua; camera đứng hình thì không tính giờ.
4. Nếu Quản trị bật lưu đoạn hình: `alert-clip-recorder.ts` ghép ~3 giây trước + ~2 giây trong lúc xảy ra.
5. `services/exam-sync.ts` gửi cảnh báo tới máy giám thị. Bản chữ mất mạng thì `services/hub/outbox.ts`
   xếp hàng (không nhét clip vào localStorage). Hub bỏ qua trùng `id`.
6. Song song, cứ 2 giây máy thi gửi một **nhịp tim** (trạng thái máy) để giám thị biết máy còn sống.
7. Trang giám thị (`features/proctor/hooks/use-proctor-feed.ts`) hỏi máy chủ mỗi 1 giây, thấy cảnh báo mới
   thì hiện dải đỏ (**không** phát tiếng — đã gỡ âm thanh).

Quy tắc chi tiết (ngưỡng, màu, trạng thái AI): [docs/nghiep-vu/quy-tac-canh-bao.md](../docs/nghiep-vu/quy-tac-canh-bao.md).

## Học sinh kết nối với máy giám thị thế nào?

Có hai cách, đều nằm trong khối **Kết nối máy giám thị** của trang `/thi-sinh`:

| Cách | Khi nào dùng | Code |
| --- | --- | --- |
| **Gõ mã kết nối 4 số** đang hiện trên màn hình giám thị | Chạy bằng EXE, mạng cho phép tự tìm | `features/candidate/hooks/use-hub-discovery.ts`, `services/hub/hub-discovery.ts` |
| **Gõ địa chỉ** như `http://192.168.1.10:8765` rồi bấm "Kiểm tra kết nối" | Luôn dùng được | `features/candidate/hooks/use-hub-connection.ts`, `services/hub/hub-url.ts` |

Ô mã kết nối chỉ hiện khi trang được trung tâm LAN phục vụ (bản EXE hoặc `run_hub.py`), vì việc "nghe ngóng"
các máy giám thị trong mạng là do máy chủ Python làm (`GET /api/discover`). Với `npm run dev` / `dev:https` thì chỉ có ô địa chỉ.

Trang giám thị mở từ chính trung tâm của máy thì luôn đọc trung tâm đó và hiện **IP hiện tại** của máy,
không dùng địa chỉ cũ đã lưu trong trình duyệt (`setPageHubUrl` trong `services/hub/hub-url.ts`).

## Cấu trúc thư mục

Code chia thành **4 tầng**. Tầng trên được dùng tầng dưới, **không bao giờ ngược lại**:

```text
src/app/  ──▶  src/features/  ──▶  src/services/, src/ai/  ──▶  src/domain/
(địa chỉ       (màn hình của        (gửi/nhận dữ liệu,           (quy tắc nghiệp vụ thuần,
 trang)         từng vai trò)        làm việc với AI)              không biết gì về giao diện hay mạng)
```

Nhờ vậy, muốn đổi luật cảnh báo chỉ cần sửa `domain/` mà không đụng giao diện, và test được `domain/`
mà không cần trình duyệt.

```text
web/
├── src/
│   ├── app/                    Mỗi thư mục = một đường dẫn URL. Chỉ vài dòng, gọi màn hình trong features/
│   │   ├── page.tsx            → /           (HomeScreen)
│   │   ├── thi-sinh/page.tsx   → /thi-sinh   (CandidateScreen)
│   │   ├── giam-thi/page.tsx   → /giam-thi   (ProctorScreen)
│   │   ├── quan-tri/page.tsx   → /quan-tri   (AdminScreen)
│   │   ├── layout.tsx          Khung HTML chung, font, metadata
│   │   └── globals.css         Màu sắc, theme
│   │
│   ├── features/               Mỗi vai trò một thư mục
│   │   ├── candidate/          THÍ SINH
│   │   │   ├── candidate-screen.tsx        Ghép các khối giao diện lại
│   │   │   ├── hooks/
│   │   │   │   ├── use-monitoring-session.ts   Phiên giám sát: webcam → AI → cảnh báo → nhịp tim 2 giây
│   │   │   │   ├── alert-clip-recorder.ts      Đoạn hình ngắn ~3s trước + ~2s trong lúc (khi bật)
│   │   │   │   ├── use-hub-connection.ts       Địa chỉ máy giám thị + kiểm tra kết nối
│   │   │   │   ├── use-hub-discovery.ts        Tìm máy giám thị trong LAN bằng mã kết nối 4 số
│   │   │   │   ├── use-delivery-status.ts      Cảnh báo nào giám thị đã nhận / còn chờ gửi
│   │   │   │   └── use-browser-guard.ts        Phát hiện chuyển tab, Ctrl/Cmd + C/V/X/P
│   │   │   ├── components/     Từng khối giao diện: form, ô kết nối, camera, tín hiệu, sự kiện…
│   │   │   └── camera-errors.ts  Đổi lỗi webcam thành câu dễ hiểu
│   │   ├── proctor/            GIÁM THỊ
│   │   │   ├── proctor-screen.tsx
│   │   │   ├── hooks/use-proctor-feed.ts   Dữ liệu trực tiếp, địa chỉ + mã kết nối, cảnh báo mới nhất
│   │   │   ├── event-filters.ts            Lọc cảnh báo; đếm false_alarm; máy im lặng quá 7 giây = offline
│   │   │   ├── csv-export.ts               Báo cáo CSV đầy đủ + biên bản (confirmed + false_alarm)
│   │   │   └── components/                 Dải địa chỉ, sơ đồ máy (nút xóa), danh sách, chi tiết (hai nút kết luận)…
│   │   ├── admin/              QUẢN TRỊ
│   │   │   ├── admin-screen.tsx            Lưu local + đẩy settings/thresholds lên hub
│   │   │   ├── admin-settings.ts           Đọc/xuất cấu hình JSON
│   │   │   └── components/                 Ngưỡng (kể cả headPoseSeconds), quyền riêng tư…
│   │   └── home/               TRANG CHỦ: components/
│   │
│   ├── domain/                 QUY TẮC NGHIỆP VỤ
│   │   ├── exam-types.ts       Kiểu dữ liệu: ExamEvent (kèm verdict?, clip?), StationStatus, VisionMetrics…
│   │   ├── thresholds.ts       Ngưỡng mặc định (5/2/3/6/5/12s), giới hạn góc (14°, 20°, 0,55, 0,7)
│   │   ├── behavior-engine.ts  Bộ đếm thời gian: khi nào tín hiệu thành cảnh báo
│   │   ├── alert-catalog.ts    Tên tiếng Việt và mức độ (đỏ/vàng) của từng loại cảnh báo
│   │   └── station-health.ts   Máy đang xanh / vàng / đỏ
│   │
│   ├── ai/                     LÀM VIỆC VỚI MEDIAPIPE (+ cửa nhìn)
│   │   ├── vision-provider.ts  Cửa tầng nhìn: MediaPipe → VisionMetrics; future-custom dự phòng
│   │   ├── face-landmarker-loader.ts  Tải mô hình: bản đóng kèm trước, Internet sau; thử GPU rồi CPU
│   │   ├── face-metrics.ts     478 điểm mốc → số mặt, góc quay, góc cúi, hướng mắt
│   │   └── face-overlay.ts     Vẽ lưới khuôn mặt lên video
│   │
│   ├── services/               GỬI / NHẬN DỮ LIỆU
│   │   ├── exam-sync.ts        CỬA DUY NHẤT mà màn hình được gọi: publishEvent, publishStation,
│   │   │                       markEventReviewed(verdict), removeStation, subscribeExamData…
│   │   ├── hub/                Kênh LAN tới trung tâm trên máy giám thị:
│   │   │   ├── hub-url.ts          Chuẩn hóa/ghi nhớ địa chỉ, chọn trung tâm đang dùng
│   │   │   ├── hub-client.ts       Gọi /api/health, /api/runtime, /api/snapshot…
│   │   │   ├── hub-transport.ts    fetch có hạn chờ 3,5 giây, báo đã kết nối / mất kết nối
│   │   │   ├── hub-discovery.ts    Danh sách máy giám thị tìm thấy (/api/discover), so khớp tên phòng
│   │   │   ├── hub-settings.ts     GET/POST /api/settings (ngưỡng + quyền riêng tư)
│   │   │   └── outbox.ts           Hàng đợi gửi lại cảnh báo chữ khi mất mạng (không nhét media)
│   │   ├── firebase/           Kênh Firestore (chỉ bật khi có cấu hình)
│   │   ├── local-demo/         Kênh demo trong cùng trình duyệt (localStorage + BroadcastChannel)
│   │   ├── browser-signals.ts  Tên các tín hiệu nội bộ giữa các phần của trang
│   │   └── desktop-bridge.ts   Nhờ ứng dụng desktop mở cửa sổ giám thị riêng
│   │
│   ├── components/
│   │   ├── layout/examguard-header.tsx  Thanh điều hướng trên cùng
│   │   └── ui/                 6 component shadcn: badge, button, card, input, progress, switch
│   └── lib/utils.ts            Hàm `cn` gộp class Tailwind
│
├── public/
│   └── mediapipe/              Mô hình AI + WASM (không sửa tay)
├── scripts/
│   └── gen-dev-certs.mjs       Tạo cert HTTPS theo IP LAN hiện tại (`npm run certs:dev`)
├── tests/
│   ├── unit/                   Kiểm thử đơn vị (`npm test`), chạy thẳng file .ts không cần build
│   ├── e2e/alert-flow.cjs      Kiểm thử toàn luồng bằng trình duyệt thật + camera giả
│   └── helpers/load-source.cjs Nạp file TypeScript cho test
└── next.config.ts, tsconfig.json, eslint.config.mjs, package.json…
```

Alias `@/` trỏ tới `src/` (ví dụ `import … from '@/domain/thresholds'`).

## Chạy và kiểm tra

Cần Node.js 24.x (22.x vẫn chạy, chỉ cảnh báo phiên bản).

```bash
npm ci               # cài thư viện (lần đầu, hoặc khi package-lock.json đổi)
npm run dev          # HTTP: http://localhost:3000 (máy khác LAN thường không bật được webcam)
npm run certs:dev    # Tạo lại cert HTTPS theo IP LAN hiện tại (đổi Wi‑Fi / IP thì chạy lại)
npm run dev:https    # HTTPS LAN + webcam: https://<IP-LAN>:3000
                     # Cert tự ký → máy khác: Advanced → Proceed (hoặc “Tiếp tục”). Sai IP trong cert → npm run certs:dev
                     # Tách hub: python ../desktop-hub/run_hub.py — web proxy /api → :8765
npm run lint         # kiểm tra quy tắc viết code
npx tsc --noEmit     # kiểm tra kiểu TypeScript
npm test             # kiểm thử đơn vị
npm run build        # xuất bản tĩnh ra out/ (desktop-hub/ dùng thư mục này)
```

Lưu ý khi chạy thử:

- Trang Thí sinh chỉ cho bấm bắt đầu khi **đã kết nối được máy giám thị**. Vì vậy cần bật thêm
  `../desktop-hub/run_hub.py` rồi nhập địa chỉ `http://localhost:8765`.
- Trình duyệt chỉ cho bật webcam trên `localhost` hoặc HTTPS. Mở bằng địa chỉ LAN `http://192.168…` thì
  webcam bị chặn — dùng `npm run dev:https` hoặc bản EXE.
- Đổi ngưỡng / công tắc đoạn hình ở Quản trị phải bấm **Lưu thay đổi** (đẩy hub) thì máy thí sinh mới nhận.
- Firebase (tùy chọn): chép `.env.example` thành `.env.local` và điền cấu hình. Để trống thì dùng kênh LAN.

Kiểm thử toàn luồng (e2e), build EXE, macOS: [docs/van-hanh/chay-va-build.md](../docs/van-hanh/chay-va-build.md).

## Muốn sửa X thì sửa ở đâu?

| Muốn | Sửa |
| --- | --- |
| Đổi ngưỡng thời gian mặc định hoặc giới hạn góc | `src/domain/thresholds.ts` |
| Đổi cách đếm thời gian, chống nhiễu | `src/domain/behavior-engine.ts` (+ `tests/unit/behavior-engine.test.cjs`) |
| Đổi tên hiển thị / mức độ của cảnh báo | `src/domain/alert-catalog.ts` |
| Thêm loại cảnh báo mới | `shared/hub-contract.json` → `exam-types.ts` (AlertType) → `alert-catalog.ts` → `behavior-engine.ts` hoặc `use-browser-guard.ts` → biểu tượng trong `features/proctor/alert-style.ts` |
| Cách tính góc quay đầu, hướng mắt | `src/ai/face-metrics.ts` |
| Đổi / gắn nhà cung cấp tầng nhìn | `src/ai/vision-provider.ts` |
| Đoạn hình ngắn khi cảnh báo | `features/candidate/hooks/alert-clip-recorder.ts` + công tắc Quản trị |
| Kết luận đúng / báo nhầm + biên bản | `event-detail-drawer.tsx`, `event-filters.ts`, `csv-export.ts`, hub `set_reviewed` |
| Xóa máy khỏi lưới giám thị | `proctor-screen.tsx` → `exam-sync.removeStation` → `DELETE /api/stations/...` |
| Đẩy ngưỡng / privacy lên hub | `admin-screen.tsx` + `services/hub/hub-settings.ts` |
| Sửa một khối giao diện | `src/features/<vai-trò>/components/` |
| Đổi cách tìm máy giám thị bằng mã | `features/candidate/hooks/use-hub-discovery.ts`, `components/hub-connection-panel.tsx` |
| Thêm kênh đồng bộ mới | Tạo thư mục trong `src/services/`, nối vào `src/services/exam-sync.ts` |
| Thêm trang mới | `src/app/<duong-dan>/page.tsx` + `src/features/<ten>/` |
| Thêm component shadcn | `npx shadcn add <tên>` (sinh vào `src/components/ui/`) |

## Những thứ KHÔNG được đổi tùy tiện

Các giá trị dưới đây là "hợp đồng" giữa các máy hoặc giữa các phiên bản. Đổi chúng thì máy cũ và máy mới
không hiểu nhau, hoặc mất dữ liệu đã lưu trong trình duyệt. Chi tiết:
[docs/ky-thuat/du-lieu-trinh-duyet.md](../docs/ky-thuat/du-lieu-trinh-duyet.md),
[docs/ky-thuat/api-lan.md](../docs/ky-thuat/api-lan.md).

- Đường dẫn trang: `/`, `/thi-sinh`, `/giam-thi`, `/quan-tri`.
- Khóa localStorage `examguard:*`, kênh `examguard:live:v2`, tên sự kiện `examguard-*`.
- Đường dẫn và dạng dữ liệu API LAN (`/api/...`), cổng mặc định, danh sách loại cảnh báo / verdict. Nguồn chuẩn là
  [`shared/hub-contract.json`](../shared/hub-contract.json), được `tests/unit/contract.test.cjs` kiểm tra.
- `id` và nhãn của các ô nhập, nút (`candidate-name`, `candidate-id`, `room-id`, `station-id`,
  "Địa chỉ máy giám thị", "Kiểm tra kết nối"…): kiểm thử e2e dựa vào chúng.
