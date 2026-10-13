# AI ExamGuard — Hệ thống AI hỗ trợ giám sát thi trên máy tính

> "Một giám thị có thể nhìn nhiều thí sinh, nhưng không thể nhìn mọi vị trí trong mọi giây."

AI ExamGuard dùng webcam của từng máy thi để phát hiện sớm các **dấu hiệu cần chú ý** (vắng mặt, có thêm người,
quay đầu lâu, cúi/ngẩng lâu, nhìn lệch màn hình, rời cửa sổ bài thi) và báo về máy giám thị qua mạng LAN.

- AI chạy **ngay trên máy thí sinh**; máy giám thị chỉ nhận cảnh báo và chỉ số trạng thái, **không nhận video**.
- AI ExamGuard **không phát hiện "gian lận"**: AI chỉ nêu nghi vấn, **giám thị xem bối cảnh và quyết định**.
- Nguyên tắc: *Quan sát tín hiệu → Kiểm tra thời gian → Tạo cảnh báo → Con người xác minh.*

Phiên bản hiện tại: `2026.09.08.3` · Chạy trên Windows 10/11 (bản EXE), mạng LAN, không cần Internet.

## Dự án gồm những phần nào?

```text
DUANDUNGAI/
├── web/         Giao diện + AI nhận diện (TypeScript, Next.js). Chạy trong cửa sổ EXE hoặc trình duyệt.
├── desktop-hub/ Ứng dụng Windows (Python): máy chủ "trung tâm cảnh báo LAN" + cửa sổ ứng dụng.
├── shared/      Hợp đồng chung giữa hai phần (cổng, phiên bản, trường bắt buộc, API).
├── docs/        Tài liệu: tổng quan, quy tắc cảnh báo, API, vận hành, hồ sơ dự thi.
├── scripts/     Script tiện ích (build EXE trên Windows).
└── release/     File EXE đã build (không đưa lên Git).
```

`web/` được build ra thư mục `web/out/` (HTML/JS tĩnh + mô hình AI), sau đó `desktop-hub/` gói `web/out/`
cùng chương trình Python thành **một file EXE** dùng chung cho máy giáo viên và máy học sinh.
Khi chạy, EXE bật máy chủ LAN và hiển thị giao diện trong cửa sổ Edge WebView2.

```text
web/ ──npm run build──▶ web/out/ ──PyInstaller (desktop-hub/examguard.spec)──▶ release/AI_ExamGuard_*.exe
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
| Tìm code của từng bước trong tài liệu "32 câu lệnh" | [docs/ky-thuat/doi-chieu-32-buoc.md](docs/ky-thuat/doi-chieu-32-buoc.md) |
| Đọc hồ sơ dự thi | [docs/tai-lieu-du-thi/](docs/tai-lieu-du-thi/) |
| Tra nghĩa thuật ngữ | [docs/thuat-ngu.md](docs/thuat-ngu.md) |
| Xem các vấn đề đã biết nhưng chưa xử lý | [docs/van-de-ton-dong.md](docs/van-de-ton-dong.md) |

Mục lục đầy đủ: [docs/README.md](docs/README.md).

## Chạy nhanh

Trang Thí sinh chỉ cho bấm bắt đầu khi đã kết nối được máy giám thị (trung tâm LAN), nên lúc chạy
thử luôn cần bật trung tâm LAN (Node.js 24, Python 3.9+):

```bash
cd web && npm ci && npm run build      # tạo web/out
cd ../desktop-hub
python3 run_hub.py                     # mọi hệ điều hành: chỉ bật trung tâm LAN ở cổng 8765
# Windows, mở cửa sổ ứng dụng như bản EXE: pip install -r requirements.txt && python app_desktop.py
```

Mở Chrome tới `http://localhost:8765/thi-sinh`, nhập địa chỉ máy giám thị `localhost:8765` → **Kiểm tra
kết nối** → điền thông tin → bắt đầu. Mở `http://localhost:8765/giam-thi` ở **một cửa sổ riêng**
(chuyển tab trên cửa sổ thí sinh sẽ bị tính là rời màn hình thi). Hướng dẫn chi tiết, kể cả trên macOS:
[docs/van-hanh/chay-va-build.md](docs/van-hanh/chay-va-build.md).

Build EXE (Windows, PowerShell): `powershell -ExecutionPolicy Bypass -File scripts/build-exe.ps1`.

## Nguyên tắc an toàn và giới hạn

- AI chỉ hỗ trợ quan sát, không tự kết luận vi phạm; thí sinh phải đồng ý trước khi webcam bật, không thu âm.
- Video không được truyền đi trong cấu hình mặc định; lưu ảnh cảnh báo mặc định tắt.
- Danh tính (họ tên, SBD, phòng, máy) do thí sinh khai báo để giám thị đối chiếu; **không nhận diện danh tính bằng khuôn mặt**.
- Góc quay đầu, cúi/ngẩng, hướng mắt là **ước tính**; chất lượng phụ thuộc webcam, ánh sáng, tư thế.
  Sản phẩm **không nhận diện điện thoại**; cúi đầu lâu có thể chỉ là đang viết nháp.
- Bản LAN dành cho mạng nội bộ tin cậy, chưa có xác thực; không mở cổng `8765` ra Internet.
- Ngưỡng hiện tại là ngưỡng thiết kế để trình diễn, cần hiệu chỉnh và thử với nhiều máy trước khi dùng thật.
