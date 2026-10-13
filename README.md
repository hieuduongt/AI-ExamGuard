# AI ExamGuard

Hệ thống hỗ trợ giám thị phát hiện sớm dấu hiệu bất thường trong phòng thi trên máy tính.
Webcam của thí sinh được AI phân tích **ngay trên máy thí sinh**; máy giám thị chỉ nhận
các cảnh báo và chỉ số trạng thái, không nhận video. AI chỉ gợi ý, **giám thị mới là người kết luận**.

Phiên bản hiện tại: `2026.09.08.3`.

## Dự án gồm những phần nào?

```text
DUANDUNGAI/
├── web/         Giao diện + AI nhận diện (Next.js). Chạy trên trình duyệt hoặc bên trong EXE.
├── desktop-hub/ Ứng dụng Windows (Python): máy chủ "trung tâm cảnh báo LAN" + cửa sổ ứng dụng.
├── shared/      Hợp đồng chung giữa hai phần (cổng, phiên bản, trường bắt buộc, API).
├── docs/        Tài liệu: tổng quan, quy tắc cảnh báo, API, vận hành, hồ sơ dự thi.
├── scripts/     Script tiện ích (build EXE trên Windows).
└── release/     File EXE đã build (không đưa lên Git).
```

Hai phần code liên quan theo một chiều: `web/` được build ra thư mục `web/out/` (HTML/JS tĩnh),
sau đó `desktop-hub/` gói `web/out/` cùng chương trình Python thành **một file EXE**.

```text
web/ (mã nguồn) ──npm run build──▶ web/out/ ──PyInstaller (desktop-hub/)──▶ release/AI_ExamGuard_*.exe
```

## Tôi muốn…

| Mục đích | Đọc |
| --- | --- |
| Hiểu hệ thống làm gì, chạy thế nào | [docs/tong-quan.md](docs/tong-quan.md) |
| Dùng EXE trong phòng thi (giáo viên, học sinh) | [docs/van-hanh/HUONG_DAN_CHAY_EXE.txt](docs/van-hanh/HUONG_DAN_CHAY_EXE.txt) |
| Biết khi nào AI tạo cảnh báo | [docs/nghiep-vu/quy-tac-canh-bao.md](docs/nghiep-vu/quy-tac-canh-bao.md) |
| Sửa giao diện hoặc AI | [web/README.md](web/README.md) |
| Sửa ứng dụng Windows / máy chủ LAN | [desktop-hub/README.md](desktop-hub/README.md) |
| Đổi giá trị mà cả hai phần dùng chung (cổng, phiên bản…) | [shared/README.md](shared/README.md) |
| Chạy thử, kiểm thử, build EXE, triển khai web | [docs/van-hanh/chay-va-build.md](docs/van-hanh/chay-va-build.md) |
| Tra nghĩa thuật ngữ | [docs/thuat-ngu.md](docs/thuat-ngu.md) |
| Xem các vấn đề đã biết nhưng chưa xử lý | [docs/van-de-ton-dong.md](docs/van-de-ton-dong.md) |

Mục lục đầy đủ: [docs/README.md](docs/README.md).

## Chạy nhanh (lập trình viên)

```bash
cd web
npm ci
npm run dev          # mở http://localhost:3000
```

Mở `/thi-sinh` và `/giam-thi` ở hai tab để thử luồng cảnh báo trên một máy.
Build EXE (Windows): `powershell -File scripts/build-exe.ps1`.

## Nguyên tắc an toàn

- AI chỉ hỗ trợ quan sát, không tự kết luận vi phạm.
- Video không được truyền liên tục đi đâu cả trong cấu hình mặc định; lưu ảnh cảnh báo mặc định tắt.
- Bản LAN dành cho mạng nội bộ tin cậy; không mở cổng `8765` ra Internet.
- Các ngưỡng hiện tại là ngưỡng kỹ thuật để trình diễn, cần hiệu chỉnh theo thực tế trước khi dùng thật.
