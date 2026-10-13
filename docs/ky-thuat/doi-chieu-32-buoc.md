# Đối chiếu 32 bước phát triển với mã nguồn hiện tại

Tài liệu dự thi `tai-lieu-du-thi/AI_ExamGuard_32_Cau_Lenh_Tao_Du_An_Va_Build_EXE.docx` ghi lại 32 câu lệnh
nhóm dùng để xây dựng sản phẩm, với tên file của **cấu trúc ban đầu** (`lib/…`, `app_desktop.py` một file,
`AI_ExamGuard_Portable.spec`). Sau khi quy hoạch lại cấu trúc (tag Git `truoc-quy-hoach` là bản trước khi quy hoạch),
chức năng không đổi nhưng code nằm ở chỗ khác. Bảng dưới giúp tìm nhanh phần code của từng bước.

## Đổi tên chính

| Cấu trúc ban đầu | Cấu trúc hiện tại |
| --- | --- |
| `app/`, `components/`, `lib/`, `public/`, `tests/` ở thư mục gốc | `web/src/…`, `web/public/`, `web/tests/` |
| `lib/exam-types.ts` | `web/src/domain/exam-types.ts` + `alert-catalog.ts` |
| `lib/behavior-engine.ts` | `web/src/domain/behavior-engine.ts` + `thresholds.ts` |
| `lib/exam-store.ts` | `web/src/services/exam-sync.ts` + `services/hub/`, `services/firebase/`, `services/local-demo/` |
| `lib/desktop-client.ts` | `web/src/services/desktop-bridge.ts` |
| `lib/firebase-client.ts` | `web/src/services/firebase/firebase-client.ts` |
| `tests/behavior-engine.test.cjs`, `tests/load-source.cjs` | `web/tests/unit/behavior-engine.test.cjs`, `web/tests/helpers/load-source.cjs` |
| `app/thi-sinh/page.tsx` (một file lớn) | `web/src/features/candidate/` (hooks + components) |
| `app/giam-thi/page.tsx`, `app/quan-tri/page.tsx`, `app/page.tsx` | `web/src/features/proctor/`, `features/admin/`, `features/home/` |
| `app_desktop.py` (một file) | `desktop-hub/app_desktop.py` (khởi động) + `desktop-hub/examguard_desktop/` |
| `AI_ExamGuard_Portable.spec` | `desktop-hub/examguard.spec` |
| `tests/test_desktop.py`, `tests/serve-hub.py` | `desktop-hub/tests/test_desktop.py`, `desktop-hub/tests/serve_hub.py` |
| `tests/alert-flow.cjs` | `web/tests/e2e/alert-flow.cjs` |
| `HUONG_DAN_CHAY_EXE.txt` | `docs/van-hanh/HUONG_DAN_CHAY_EXE.txt` |

## Từng bước

| Bước | Nội dung | Mã nguồn hiện tại |
| --- | --- | --- |
| 01 | Thiết lập cách làm việc | Toàn dự án |
| 02 | Môi trường phát triển | `web/package.json` (Node 24), `web/package-lock.json`, `desktop-hub/requirements.txt` |
| 03 | Bộ khung 4 trang, xuất tĩnh ra `out` | `web/src/app/`, `web/next.config.ts` |
| 04 | Giao diện tiếng Việt, màu xanh/vàng/đỏ | `web/src/features/*/components/`, `web/src/components/layout/examguard-header.tsx`, `web/src/app/globals.css` |
| 05 | Kiểu dữ liệu phiên thi, tên cảnh báo | `web/src/domain/exam-types.ts`, `web/src/domain/alert-catalog.ts` |
| 06 | Máy chủ LAN và 6 API | `desktop-hub/examguard_desktop/server.py`, `http_handler.py`, `exam_store.py`, `network.py` |
| 07 | An toàn API và đường dẫn | `http_handler.py` (kiểm tra dữ liệu, chặn tệp ngoài `out`, ưu tiên `.html`), `exam_store.py` (khóa, giới hạn 500), `config.py` (1 MB); test `desktop-hub/tests/test_hub_api.py` |
| 08 | Biểu mẫu thí sinh, kiểm tra kết nối | `web/src/features/candidate/components/session-form-card.tsx`, `hub-connection-panel.tsx`, `hooks/use-hub-connection.ts` (bổ sung sau: `hooks/use-hub-discovery.ts`, tìm máy giám thị bằng mã kết nối) |
| 09 | Vòng đời webcam, lỗi camera | `web/src/features/candidate/hooks/use-monitoring-session.ts`, `camera-errors.ts`, `components/camera-panel.tsx` |
| 10 | Mô hình MediaPipe tại máy, GPU → CPU | `web/public/mediapipe/`, `web/src/ai/face-landmarker-loader.ts` |
| 11 | Tính tín hiệu khuôn mặt, vẽ khung | `web/src/ai/face-metrics.ts`, `face-overlay.ts`; test `web/tests/unit/face-metrics.test.cjs` |
| 12 | Bộ đếm hành vi có lọc nhiễu | `web/src/domain/behavior-engine.ts`, `web/src/domain/thresholds.ts` |
| 13 | Phân biệt nghi vấn với hành vi bình thường | `web/src/domain/behavior-engine.ts` (chỉ xét đầu/mắt khi đúng 1 mặt) |
| 14 | Nhịp trạng thái 2 giây, AI tạm dừng 3 giây, mất kết nối 7 giây | `use-monitoring-session.ts` (`detectionLoop`, `updateStation`), `web/src/features/proctor/event-filters.ts` |
| 15 | Tiến trình cảnh báo trên trang thí sinh | `web/src/features/candidate/components/live-signals-card.tsx` |
| 16 | Chuyển tab, Ctrl/Cmd + C/V/X/P | `web/src/features/candidate/hooks/use-browser-guard.ts` |
| 17 | Kết nối thí sinh với máy giám thị | `web/src/services/exam-sync.ts`, `services/hub/hub-url.ts`, `hub-client.ts`, `hub-transport.ts`, `hub-discovery.ts`; `desktop-hub/examguard_desktop/discovery.py` |
| 18 | Hàng đợi gửi lại, không trùng | `web/src/services/hub/outbox.ts`, `features/candidate/hooks/use-delivery-status.ts`, `desktop-hub/examguard_desktop/exam_store.py` (`add_event`) |
| 19 | Dashboard đọc `/api/snapshot` mỗi giây | `web/src/features/proctor/hooks/use-proctor-feed.ts`, `exam-sync.ts` (`subscribeExamData`), `components/station-grid.tsx` |
| 20 | Dải cảnh báo mới, bộ lọc | `web/src/features/proctor/components/new-alert-banner.tsx`, `event-feed.tsx`, `event-filters.ts` |
| 21 | Xác minh, xuất CSV | `web/src/features/proctor/components/event-detail-drawer.tsx`, `csv-export.ts` |
| 22 | Trang quản trị cấu hình | `web/src/features/admin/` — xem ghi chú bên dưới |
| 23 | Mở Giám thị ở cửa sổ riêng | `web/src/components/layout/examguard-header.tsx`, `web/src/services/desktop-bridge.ts`, `desktop-hub/examguard_desktop/desktop_window.py` (`DesktopApi`) |
| 24 | Unit test bộ phát hiện | `web/tests/unit/` |
| 25 | Kiểm thử toàn luồng | `web/tests/e2e/alert-flow.cjs`, `desktop-hub/tests/serve_hub.py` |
| 26 | Thử với webcam thật | Thủ công, theo `docs/van-hanh/HUONG_DAN_CHAY_EXE.txt` |
| 27 | Hoàn thiện ứng dụng desktop | `desktop-hub/app_desktop.py`, `examguard_desktop/app.py`, `desktop_window.py`, `paths.py` |
| 28 | Kiểm tra trước phát hành | `docs/van-hanh/chay-va-build.md` |
| 29 | Quy trình build EXE | `desktop-hub/examguard.spec`, `desktop-hub/requirements.txt`, `scripts/build-exe.ps1` |
| 30 | Build EXE | `scripts/build-exe.ps1` → `release/` |
| 31 | Thử trên máy Windows khác | `docs/van-hanh/HUONG_DAN_CHAY_EXE.txt` |
| 32 | Bàn giao | `README.md`, `docs/` |

## Chỗ khác với mô tả trong 32 bước

Mã nguồn (cả trước và sau quy hoạch) khác câu lệnh gốc ở vài điểm; quy hoạch không thay đổi các điểm này:

- **Bước 22:** trang Quản trị có chỉnh ngưỡng, quyền riêng tư và *xuất* cấu hình JSON, nhưng **chưa có** nút khôi phục
  mặc định và *nhập* cấu hình JSON. "Chế độ máy cấu hình thấp" nằm ở trang Thí sinh, không ở trang Quản trị.
- **Bước 02, 29:** `requirements.txt` ghi phiên bản tối thiểu (`>=`), chưa khóa cứng phiên bản.
- **Bước 29:** script build ban đầu không có trong mã nguồn; `scripts/build-exe.ps1` được thêm khi quy hoạch.
- **Bước 30:** EXE nằm ở `desktop-hub/dist/` sau khi build, rồi được chép sang `release/`.
