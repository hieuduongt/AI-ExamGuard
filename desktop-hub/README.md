# desktop-hub/ — Ứng dụng Windows và trung tâm cảnh báo LAN

## Đọc trong 1 phút

Đây là phần **chạy trên máy tính Windows**, viết bằng Python và đóng gói thành **một file EXE**.
Cùng một file EXE dùng cho cả máy giáo viên và máy học sinh.

Ví von: nếu mỗi máy học sinh là một **lớp học gửi thư**, thì máy giáo viên là **bưu điện trung tâm**.
Phần `desktop-hub/` chính là bưu điện đó:

- **Nhận thư:** các máy học sinh gửi cảnh báo và "thư báo bình an" (nhịp tim mỗi 2 giây) tới đây.
- **Cho xem thư:** trang Giám thị hỏi bưu điện mỗi giây "có gì mới không?" để vẽ sơ đồ máy thi.
- **Treo biển hiệu:** khi trang Giám thị đang mở, bưu điện cứ 2 giây lại "hô" vào mạng LAN:
  *"Bưu điện mã 4821, phòng thi 01, ở địa chỉ này!"*. Máy học sinh gõ mã 4821 là tìm thấy ngay,
  không cần nhớ địa chỉ dài.

Khi mở EXE, chương trình làm 3 việc:

1. Bật một **máy chủ web nhỏ** ở cổng `8765` (nếu bận thì tự chọn cổng khác) trên mọi card mạng.
   Máy chủ này vừa phục vụ giao diện (`web/out/`), vừa là **trung tâm cảnh báo LAN** (các API `/api/...`).
2. Bật **bộ tìm máy giám thị**: nghe và (khi trang Giám thị mở) phát tín hiệu trên cổng UDP `8766`.
3. Mở **cửa sổ ứng dụng** (pywebview + Microsoft Edge WebView2) trỏ vào `http://127.0.0.1:<cổng>`.
   Vì trang được tải từ `127.0.0.1`, trình duyệt cho phép bật webcam. Trang thí sinh còn có thể nhờ phần này
   mở **cửa sổ giám thị riêng** mà không làm tắt webcam.

Dữ liệu chỉ nằm **trong bộ nhớ**: đóng EXE trên máy giáo viên là mất, nên cần "Xuất báo cáo" trước.
Máy chủ chỉ dùng thư viện chuẩn của Python, không cần cài thêm gì; chỉ phần cửa sổ cần `pywebview`.

## Các API, nói đơn giản

| API | Ai gọi | Để làm gì |
| --- | --- | --- |
| `GET /api/health` | Máy học sinh | "Bưu điện có mở cửa không?" khi bấm Kiểm tra kết nối |
| `GET /api/runtime` | Trang giám thị | Lấy địa chỉ LAN hiện tại, phiên bản, mã kết nối để hiện cho học sinh |
| `GET /api/snapshot` | Trang giám thị, mỗi giây | Lấy toàn bộ cảnh báo + trạng thái các máy |
| `POST /api/events` | Máy học sinh | Gửi một cảnh báo (có thể kèm đoạn hình ngắn) |
| `POST /api/stations` | Máy học sinh, mỗi 2 giây | Gửi nhịp tim (trạng thái máy, trạng thái AI) |
| `DELETE /api/stations/{room}/{máy}` | Trang giám thị | Gỡ máy khỏi lưới (không xóa cảnh báo đã ghi) |
| `PATCH /api/events/{id}` | Trang giám thị | Đánh dấu đã xem + kết luận `confirmed` / `false_alarm` |
| `GET` / `POST /api/settings` | Quản trị / thí sinh | Cấu hình phòng: ngưỡng giây + quyền riêng tư (đoạn hình) |
| `GET /api/discover?code=` | Máy học sinh | "Trong mạng có máy giám thị nào mang mã này không?" |

Mã lỗi, giới hạn, dạng dữ liệu, gói tin UDP: [docs/ky-thuat/api-lan.md](../docs/ky-thuat/api-lan.md).

## Cấu trúc thư mục

```text
desktop-hub/
├── app_desktop.py              Điểm khởi động (`python app_desktop.py`), cũng là điểm vào khi build EXE
├── run_hub.py                  Chỉ bật trung tâm LAN (cổng 8765) + bộ tìm máy, không mở cửa sổ (macOS/Linux, chạy thử)
├── examguard_desktop/          Toàn bộ logic, mỗi file một việc:
│   ├── config.py               Phiên bản, cổng 8765 (TCP) và 8766 (UDP), giới hạn ~1,5 MB / 500 cảnh báo
│   ├── app.py                  main(): bật máy chủ → bật bộ tìm máy → mở cửa sổ → đóng cửa sổ thì tắt máy chủ
│   ├── server.py               Tạo máy chủ ở 0.0.0.0, tự đổi cổng nếu 8765 đang bận
│   ├── http_handler.py         Phục vụ trang web + các API /api/... (events, stations, settings, DELETE…)
│   ├── exam_store.py           Kho dữ liệu trong bộ nhớ: cảnh báo (+ verdict/clip), máy, settings (khóa đa luồng)
│   ├── discovery.py            Tự tìm máy giám thị: mã kết nối 4 số, phát/nghe UDP 8766
│   ├── desktop_window.py       Cửa sổ chính và cửa sổ giám thị (pywebview)
│   ├── network.py              Tìm địa chỉ IP LAN để hiển thị cho học sinh
│   └── paths.py                Tìm thư mục giao diện `out` (trong EXE, hoặc ../web/out khi chạy mã nguồn)
├── examguard.spec              Cấu hình PyInstaller: gói code + web/out thành 1 file EXE
├── requirements.txt            Thư viện cần cài (pywebview, pythonnet, PyInstaller)
└── tests/
    ├── test_desktop.py         Phục vụ trang, chống trùng cảnh báo, cửa sổ giám thị (cần pywebview)
    ├── test_hub_api.py         "Hợp đồng" API LAN: mã lỗi, giới hạn, CORS…
    ├── test_hub_discovery.py   Tự tìm máy giám thị: gói UDP thật, lọc theo mã, hết hạn, /api/discover
    ├── test_contract.py        Hằng số khớp với ../shared/hub-contract.json
    └── serve_hub.py            Máy chủ thử nghiệm (127.0.0.1, cổng ngẫu nhiên), dùng cho kiểm thử e2e
```

Chỉ `desktop_window.py` và `app.py` cần `webview`. Phần máy chủ (`server.py`, `http_handler.py`,
`exam_store.py`, `discovery.py`) chạy được trên mọi hệ điều hành, nên test API chạy được cả trên macOS/Linux.

## Tự tìm máy giám thị hoạt động thế nào?

```text
MÁY GIÁO VIÊN (trang Giám thị đang mở)            MÁY HỌC SINH (EXE của chính nó)
  /api/snapshot?proctor=1&room=Phòng thi 01         nghe UDP 8766, ghi nhớ máy giám thị
        │ "có dashboard đang mở"                    nghe được trong 8 giây gần nhất
        ▼                                                     ▲
  mỗi 2 giây phát UDP broadcast ──────────────────────────────┘
  {"service":"examguard-hub","code":"4821","room":"Phòng thi 01","host":"PC-GV","port":8765}
                                                    Trang thí sinh: GET /api/discover?code=4821
                                                    → http://<IP người gửi>:8765 → tự kết nối
```

- Mỗi lần mở ứng dụng, mã kết nối được sinh ngẫu nhiên (`secrets.randbelow`).
- Chỉ phát khi trang Giám thị đã hỏi dữ liệu trong 10 giây gần nhất, nên máy học sinh không tự xưng là giám thị.
- Địa chỉ lấy từ **IP người gửi gói tin**, không tin IP ghi bên trong gói.
- Gói sai tên dịch vụ, sai cổng, mã không đủ 4 số hoặc lớn hơn 2 KB đều bị bỏ.
- Không mở được cổng UDP thì máy chủ HTTP vẫn chạy bình thường; trang thí sinh chỉ hiện ô nhập địa chỉ.
- Mã đi dạng chữ thường trong mạng: chỉ để phân biệt các máy giám thị, **không phải mật khẩu**.

## Chạy và kiểm tra

Cần Python 3.9+ (Windows khuyến nghị 3.11+). Chạy cửa sổ ứng dụng cần Windows 10/11 có Edge WebView2.
Luôn build giao diện trước: `(cd ../web && npm ci && npm run build)`.

```bash
# Mọi hệ điều hành, không cần pip install:
python3 run_hub.py                                          # in địa chỉ máy này, địa chỉ LAN và mã kết nối
python3 -m unittest discover -s tests -p "test_[hc]*.py"    # test máy chủ (bỏ phần cửa sổ)

# Windows, giống hệt bản EXE:
pip install -r requirements.txt
python app_desktop.py                                       # mở cửa sổ ứng dụng
python -m unittest discover -s tests -v                     # toàn bộ test
```

- Đổi cổng: đặt biến môi trường `EXAMGUARD_PORT`, ví dụ `EXAMGUARD_PORT=8775 python3 run_hub.py`.
- `run_hub.py` nghe mọi card mạng như bản EXE nên máy khác trong LAN truy cập được.
  `tests/serve_hub.py` chỉ nghe `127.0.0.1` ở cổng ngẫu nhiên, dành cho e2e.
- macOS có thể hỏi cho phép Python nhận kết nối: chọn Allow.

Build EXE trên Windows (PowerShell, từ thư mục gốc dự án):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-exe.ps1                                # → release/AI_ExamGuard_Portable.exe
powershell -ExecutionPolicy Bypass -File scripts/build-exe.ps1 -Name AI_ExamGuard_2026_09_08_3
```

Chi tiết: [docs/van-hanh/chay-va-build.md](../docs/van-hanh/chay-va-build.md).

## Muốn sửa X thì sửa ở đâu?

| Muốn | Sửa |
| --- | --- |
| Tăng phiên bản, đổi cổng, giới hạn | `../shared/hub-contract.json` trước, rồi `examguard_desktop/config.py` (cổng HTTP: cả `web/src/services/hub/hub-url.ts`); test hợp đồng báo chỗ lệch |
| Thêm API mới | `examguard_desktop/http_handler.py` (+ dữ liệu trong `exam_store.py`, test trong `tests/test_hub_api.py`, mô tả trong `docs/ky-thuat/api-lan.md`, khai báo trong `shared/hub-contract.json`) |
| Đổi nhịp phát, thời gian hết hạn của bộ tìm máy | Các hằng số đầu file `examguard_desktop/discovery.py` |
| Lưu dữ liệu ra file thay vì bộ nhớ | `examguard_desktop/exam_store.py` (giữ nguyên tên hàm) |
| Kích thước, tiêu đề cửa sổ | `examguard_desktop/desktop_window.py` |
| Thêm file vào EXE | `examguard.spec` (`datas`) |

## Những thứ KHÔNG được đổi tùy tiện

- Đường dẫn, mã trả về, dạng dữ liệu của API và gói tin UDP ([docs/ky-thuat/api-lan.md](../docs/ky-thuat/api-lan.md)).
  Học sinh và giáo viên có thể chạy hai bản EXE khác nhau, nên mọi thay đổi phải tương thích ngược.
- Thứ tự tìm thư mục giao diện trong `paths.py` (EXE onefile → `_internal` → `out` cạnh code → `../web/out`).
- `DesktopApi.open_proctor` chỉ được mở đúng trang `/giam-thi` cục bộ. Không bao giờ cho giao diện web gọi lệnh hệ thống.
