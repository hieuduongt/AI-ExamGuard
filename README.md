# AI ExamGuard — Trợ lý AI giúp giám thị trông thi trên máy tính

> "Một giám thị có thể nhìn nhiều thí sinh, nhưng không thể nhìn mọi vị trí trong mọi giây."

## Đọc trong 1 phút

Hãy tưởng tượng phòng thi tin học có 30 máy. Thầy cô giám thị chỉ có hai mắt, nên khó thấy hết
lúc một bạn rời chỗ, quay sang bạn bên cạnh rất lâu, hay có người lạ ngồi cùng.

AI ExamGuard giống như **một "trợ lý quan sát" ngồi sau mỗi webcam**:

1. Webcam của từng máy thi nhìn khuôn mặt thí sinh. AI trên **chính máy đó** đo: có mấy khuôn mặt,
   đầu đang quay bao nhiêu độ, mắt có nhìn ra ngoài màn hình không.
2. Nếu một dấu hiệu **kéo dài đủ lâu** (ví dụ quay đầu hơn 3 giây), máy thi gửi một **cảnh báo** qua mạng
   nội bộ (LAN) tới máy của giám thị.
3. Máy giám thị hiện máy đó màu vàng/đỏ, kêu tiếng "bíp" và ghi rõ: phòng nào, máy số mấy, bạn nào,
   chuyện gì, lúc mấy giờ.
4. **Giám thị đi tới xem tận nơi và tự quyết định.** AI không bao giờ tự kết luận ai gian lận.

Nguyên tắc cả dự án: *Quan sát tín hiệu → Kiểm tra thời gian → Tạo cảnh báo → Con người xác minh.*

Ba điều quan trọng:

- **Không gửi video đi đâu cả.** Hình ảnh chỉ được phân tích ngay trên máy thi; thứ gửi đi chỉ là vài con số
  và các cảnh báo.
- **Không cần Internet.** Chỉ cần các máy cắm chung mạng LAN hoặc chung Wi-Fi.
- **Một file EXE duy nhất** dùng cho cả máy giáo viên lẫn máy học sinh (Windows 10/11).

Phiên bản hiện tại: `2026.09.08.3`.

## Ai nên đọc gì?

| Bạn là… | Đọc |
| --- | --- |
| Giáo viên, học sinh dùng phần mềm trong phòng thi | [docs/van-hanh/HUONG_DAN_CHAY_EXE.txt](docs/van-hanh/HUONG_DAN_CHAY_EXE.txt) |
| Người muốn hiểu hệ thống làm gì, vì sao làm vậy | [docs/tong-quan.md](docs/tong-quan.md) |
| Người muốn biết khi nào AI báo động | [docs/nghiep-vu/quy-tac-canh-bao.md](docs/nghiep-vu/quy-tac-canh-bao.md) |
| Gặp từ lạ (hub, LAN, API, cooldown…) | [docs/thuat-ngu.md](docs/thuat-ngu.md) |
| Lập trình viên sửa giao diện hoặc AI | [web/README.md](web/README.md) |
| Lập trình viên sửa ứng dụng Windows / máy chủ LAN | [desktop-hub/README.md](desktop-hub/README.md) |
| Lập trình viên đổi giá trị dùng chung (cổng, phiên bản…) | [shared/README.md](shared/README.md) |
| Chạy thử, kiểm thử, build EXE | [docs/van-hanh/chay-va-build.md](docs/van-hanh/chay-va-build.md) |
| Ban giám khảo | [docs/tai-lieu-du-thi/](docs/tai-lieu-du-thi/) và [docs/ky-thuat/doi-chieu-32-buoc.md](docs/ky-thuat/doi-chieu-32-buoc.md) |

Mục lục toàn bộ tài liệu: [docs/README.md](docs/README.md).

## Dự án gồm những phần nào?

Ví von: nếu cả hệ thống là **một nhà hàng**, thì `web/` là phòng ăn và đầu bếp (cái khách nhìn thấy,
và AI "nấu" ra cảnh báo), `desktop-hub/` là quầy lễ tân kiêm tổng đài (nhận và chuyển mọi cảnh báo),
còn `shared/` là bản thực đơn chung mà cả hai bên phải đọc giống nhau.

```text
DUANDUNGAI/
├── web/          Giao diện 4 trang + AI nhận diện khuôn mặt (TypeScript, Next.js)
├── desktop-hub/  Ứng dụng Windows (Python): máy chủ "trung tâm cảnh báo LAN" + cửa sổ ứng dụng
├── shared/       "Hợp đồng" chung giữa hai phần: cổng mạng, phiên bản, loại cảnh báo, danh sách API
├── docs/         Tài liệu: tổng quan, quy tắc cảnh báo, API, hướng dẫn vận hành, hồ sơ dự thi
├── scripts/      build-exe.ps1: một lệnh build ra file EXE (Windows)
└── release/      Các file EXE đã build (không đưa lên Git)
```

Cách ba phần ghép lại thành một file EXE:

```text
web/ ──npm run build──▶ web/out/ (HTML, JS, mô hình AI)
                            │
desktop-hub/ ───────────────┴──PyInstaller──▶ release/AI_ExamGuard_*.exe
```

Khi mở EXE: chương trình Python bật máy chủ LAN (cổng `8765`), rồi mở một cửa sổ hiển thị giao diện web
lấy từ chính máy chủ đó.

## Một ca thi diễn ra thế nào?

```text
 MÁY GIÁO VIÊN                                   MÁY HỌC SINH (mỗi máy một EXE)
 ─────────────                                   ──────────────────────────────
 1. Mở EXE → "Vào phòng giám thị"
    Màn hình hiện:  Mã kết nối 4821
                    http://192.168.1.10:8765
                                                 2. Mở EXE → "Bắt đầu kiểm tra thiết bị"
                                                    Nhập họ tên, SBD, phòng, số máy
                                                    Gõ mã 4821 → tự tìm thấy máy giáo viên
                                                 3. Đồng ý giám sát → bật webcam → AI chạy
                                                 4. Mỗi 2 giây: gửi "tôi vẫn ổn" (nhịp tim)
 5. Sơ đồ máy: xanh / vàng / đỏ / mất kết nối  ◀─── Khi có dấu hiệu kéo dài: gửi cảnh báo
    Có cảnh báo: kêu tiếng + dải đỏ
 6. Giám thị xem tận nơi → "Đánh dấu đã xác minh"
 7. Cuối ca: "Xuất báo cáo" (CSV)
```

Nếu mạng Wi-Fi chặn việc tự tìm, học sinh gõ địa chỉ `http://192.168.1.10:8765` thay cho mã.

## Chạy thử nhanh (lập trình viên)

Cần Node.js 24 (22 vẫn chạy được) và Python 3.9+. Không cần cài thư viện Python nào để chạy thử.

```bash
cd web && npm ci && npm run build      # build giao diện ra web/out
cd ../desktop-hub
python3 run_hub.py                     # bật trung tâm LAN ở cổng 8765 (mọi hệ điều hành)
```

1. Mở Chrome: `http://localhost:8765/thi-sinh`, ô **Địa chỉ máy giám thị** nhập `localhost:8765`
   → **Kiểm tra kết nối** → điền thông tin → **Kiểm tra webcam và bắt đầu**.
2. Mở `http://localhost:8765/giam-thi` ở **một cửa sổ Chrome riêng** (không phải tab mới; chuyển tab trên
   cửa sổ thí sinh bị tính là "rời màn hình thi").
3. Rời khỏi webcam khoảng 5 giây → giám thị nhận cảnh báo "Không có mặt trước máy" kèm tiếng báo động.

Trên Windows, mở đúng cửa sổ ứng dụng như bản EXE: `pip install -r requirements.txt && python app_desktop.py`.
Build EXE (PowerShell, từ thư mục gốc): `powershell -ExecutionPolicy Bypass -File scripts/build-exe.ps1`.
Đầy đủ (macOS, thử mã kết nối, kiểm thử, e2e): [docs/van-hanh/chay-va-build.md](docs/van-hanh/chay-va-build.md).

## Công nghệ

| Phần | Dùng |
| --- | --- |
| Giao diện | Next.js 16 (xuất tĩnh), React 19, TypeScript, Tailwind CSS 4, shadcn, lucide-react |
| AI | Google MediaPipe Face Landmarker (chạy trong trình duyệt, mô hình đóng kèm, không cần Internet) |
| Máy chủ LAN | Python, chỉ thư viện chuẩn (`http.server`, `socket`, `threading`) |
| Ứng dụng Windows | pywebview + Microsoft Edge WebView2, đóng gói bằng PyInstaller |
| Đồng bộ qua Internet (tùy chọn) | Firebase Firestore |

## Nguyên tắc an toàn và giới hạn

- AI chỉ hỗ trợ quan sát, **không tự kết luận vi phạm**. Thí sinh phải đồng ý trước khi webcam bật; không thu âm.
- Video không rời khỏi máy thi; lưu ảnh cảnh báo mặc định tắt.
- Danh tính (họ tên, SBD, phòng, máy) do thí sinh tự khai để giám thị đối chiếu; **không nhận diện người bằng khuôn mặt**.
- Góc quay đầu, cúi/ngẩng, hướng mắt chỉ là **ước tính**; phụ thuộc webcam, ánh sáng, tư thế ngồi.
  Phần mềm **không nhận diện điện thoại**; cúi đầu lâu có thể chỉ là đang viết nháp.
- Bản LAN dành cho mạng nội bộ tin cậy, chưa có đăng nhập. Không mở cổng `8765`/`8766` ra Internet.
  Mã kết nối 4 số chỉ để phân biệt các máy giám thị, **không phải mật khẩu**.
- Dữ liệu ca thi nằm trong bộ nhớ máy giáo viên: đóng EXE là mất, hãy **Xuất báo cáo** trước.
- Ngưỡng hiện tại dùng để trình diễn; cần hiệu chỉnh và thử với nhiều máy trước khi dùng thật.
  Các vấn đề đã biết: [docs/van-de-ton-dong.md](docs/van-de-ton-dong.md).
