# desktop/ — Ứng dụng Windows và trung tâm cảnh báo LAN

## 1. Phần này làm gì?

Chương trình Python được đóng gói thành **một file EXE** chạy trên Windows. Khi mở, nó:

1. Bật một máy chủ web nhỏ (mặc định cổng `8765`, bận thì tự chọn cổng khác) trên mọi card mạng.
   Máy chủ này vừa phục vụ giao diện (`web/out/`), vừa là **trung tâm cảnh báo LAN**: nhận cảnh báo và
   trạng thái từ các máy thí sinh, trả lại cho dashboard giám thị.
2. Mở cửa sổ ứng dụng (pywebview + Microsoft Edge WebView2) trỏ vào máy chủ đó.
3. Cho phép trang thí sinh mở **cửa sổ giám thị riêng** mà không làm tắt webcam.

Dữ liệu chỉ nằm trong bộ nhớ: đóng EXE trên máy giáo viên là mất, nên cần "Xuất báo cáo" trước.
Cùng một file EXE dùng cho cả máy giáo viên và máy học sinh.

## 2. Cấu trúc thư mục

```text
desktop/
├── app_desktop.py              Điểm khởi động (`python app_desktop.py`), cũng là điểm vào khi build EXE
├── examguard_desktop/          Toàn bộ logic, mỗi file một việc:
│   ├── config.py               Phiên bản, cổng mặc định 8765, giới hạn 1 MB / 500 sự kiện
│   ├── app.py                  main(): bật máy chủ → mở cửa sổ → khi đóng cửa sổ thì tắt máy chủ
│   ├── server.py               Tạo máy chủ, tự đổi cổng nếu 8765 đang bận
│   ├── http_handler.py         Phục vụ trang web + các API /api/...
│   ├── exam_store.py           Kho dữ liệu trong bộ nhớ: sự kiện, trạng thái máy (có khóa đa luồng)
│   ├── desktop_window.py       Cửa sổ chính và cửa sổ giám thị (pywebview)
│   ├── network.py              Tìm địa chỉ IP LAN để hiển thị cho học sinh
│   └── paths.py                Tìm thư mục giao diện `out` (trong EXE hoặc ở ../web/out khi chạy từ mã nguồn)
├── examguard.spec              Cấu hình PyInstaller: gói app + web/out thành 1 file EXE
├── requirements.txt            Thư viện Python cần cài
└── tests/
    ├── test_desktop.py         Kiểm thử phục vụ trang, chống trùng sự kiện, cửa sổ giám thị
    ├── test_hub_api.py         Kiểm thử "hợp đồng" API LAN (mã lỗi, giới hạn, CORS…)
    └── serve_hub.py            Máy chủ thử nghiệm độc lập, dùng cho kiểm thử e2e
```

Chỉ `desktop_window.py` và `app.py` cần thư viện `webview`; phần máy chủ (`server.py`,
`http_handler.py`, `exam_store.py`) chạy được trên mọi hệ điều hành, nên test API chạy được cả trên macOS/Linux.

## 3. Chạy và kiểm tra

Yêu cầu Python 3.9+; chạy cửa sổ ứng dụng cần Windows 10/11 có Edge WebView2.

```bash
pip install -r requirements.txt
# Cần build giao diện trước: (cd ../web && npm ci && npm run build)
python app_desktop.py                         # chạy ứng dụng (Windows)
python -m unittest discover -s tests -v       # kiểm thử
python tests/serve_hub.py                     # chỉ bật máy chủ (in ra địa chỉ), không mở cửa sổ
```

Đổi cổng: đặt biến môi trường `EXAMGUARD_PORT`.

Build EXE trên Windows (từ thư mục gốc dự án):

```powershell
powershell -File scripts/build-exe.ps1                              # ra release/AI_ExamGuard_Portable.exe
powershell -File scripts/build-exe.ps1 -Name AI_ExamGuard_2026_09_08_3
```

Chi tiết: [docs/van-hanh/chay-va-build.md](../docs/van-hanh/chay-va-build.md).

## 4. Muốn sửa X thì sửa ở đâu?

| Muốn | Sửa |
| --- | --- |
| Tăng phiên bản | `examguard_desktop/config.py` (`APP_VERSION`) |
| Đổi cổng mặc định, giới hạn số sự kiện | `examguard_desktop/config.py` (đồng bộ với `DEFAULT_HUB_PORT` trong `web/src/services/hub/hub-url.ts`) |
| Thêm API mới | `examguard_desktop/http_handler.py` (+ dữ liệu trong `exam_store.py`, + test trong `tests/test_hub_api.py`, + `docs/ky-thuat/api-lan.md`) |
| Lưu dữ liệu ra file thay vì bộ nhớ | `examguard_desktop/exam_store.py` (giữ nguyên tên hàm) |
| Kích thước, tiêu đề cửa sổ | `examguard_desktop/desktop_window.py` |
| Thêm file vào EXE | `examguard.spec` (`datas`) |

## 5. Những thứ KHÔNG được đổi tùy tiện

- Đường dẫn, mã trả về và dạng dữ liệu của API: xem [docs/ky-thuat/api-lan.md](../docs/ky-thuat/api-lan.md).
  Học sinh và giáo viên có thể chạy hai bản EXE khác nhau.
- Thứ tự tìm thư mục giao diện trong `paths.py` (EXE onefile → `_internal` → `out` cạnh code → `../web/out`).
- `DesktopApi.open_proctor` chỉ được mở đúng trang `/giam-thi` cục bộ; không bao giờ cho giao diện web gọi lệnh hệ thống.
