# Chạy thử, kiểm thử, build và triển khai

## Chuẩn bị

| Công cụ | Phiên bản | Dùng cho |
| --- | --- | --- |
| Node.js | 24.x | `web/` |
| Python | 3.9+ (Windows: 3.11+ khuyến nghị) | `desktop-hub/` |
| Windows 10/11 + Edge WebView2 | — | Chạy cửa sổ ứng dụng và build EXE |

Lưu ý chung: nút bắt đầu của trang Thí sinh chỉ bật khi đã **kết nối được máy giám thị** (trung tâm
LAN), trừ khi web được build kèm Firebase. Vì vậy chạy thử luôn cần bật trung tâm LAN, chỉ mở web thì
chưa đủ.

## 1. Chạy thử trên macOS / Linux / Windows (không cần cửa sổ ứng dụng)

Trung tâm LAN chỉ dùng thư viện có sẵn của Python, không cần `pip install`.

**Cách A, giống bản EXE nhất** (một cổng 8765 phục vụ cả giao diện lẫn API):

```bash
cd web && npm ci && npm run build   # tạo web/out (làm lại mỗi khi sửa code web)
cd ../desktop-hub
python3 run_hub.py                  # in ra địa chỉ máy này và địa chỉ LAN; Ctrl+C để dừng
```

1. Mở Chrome: `http://localhost:8765/thi-sinh`.
2. Ô **Địa chỉ máy giám thị** nhập `localhost:8765` → **Kiểm tra kết nối** → thấy "Đã kết nối với máy giám thị."
3. Điền họ tên, SBD, phòng, máy; tích đồng ý → **Kiểm tra webcam và bắt đầu**.
   Lần đầu macOS hỏi quyền camera cho Chrome (System Settings → Privacy & Security → Camera).
4. Mở **cửa sổ Chrome riêng** (⌘N, không phải tab mới) tới `http://localhost:8765/giam-thi`.
   Chuyển tab trên cửa sổ thí sinh sẽ bị tính là rời màn hình thi và sinh cảnh báo.
5. Rời khỏi camera khoảng 5 giây → giám thị nhận cảnh báo "không có mặt", thí sinh thấy "Giám thị đã nhận".

Máy khác cùng Wi-Fi có thể mở bảng giám thị theo địa chỉ LAN mà `run_hub.py` in ra
(ví dụ `http://192.168.1.12:8765/giam-thi`). macOS có thể hỏi cho phép Python nhận kết nối, hãy chọn Allow.
Webcam trên máy khác thì không chạy qua địa chỉ `http://` LAN; thí sinh trên máy khác cần dùng bản EXE.

**Cách B, khi đang sửa code web** (tự tải lại khi lưu file):

```bash
cd desktop-hub && python3 run_hub.py    # cửa sổ terminal 1, giữ chạy
cd web && npm run dev                   # cửa sổ terminal 2
```

Mở `http://localhost:3000/thi-sinh`, nhập địa chỉ máy giám thị `http://localhost:8765`, rồi làm tiếp như
cách A. Bảng giám thị mở `http://localhost:3000/giam-thi` cùng trình duyệt (địa chỉ hub đã được ghi nhớ).

Không làm được trên macOS: mở cửa sổ ứng dụng `app_desktop.py` (cần Edge WebView2) và build EXE.

## 2. Chạy như bản EXE trên Windows (cửa sổ ứng dụng)

```bash
cd web && npm run build            # tạo web/out
cd ../desktop-hub
pip install -r requirements.txt
python app_desktop.py              # mở cửa sổ ứng dụng
```

## 3. Kiểm thử

Chạy trước khi commit:

```bash
cd web
npm run lint
npx tsc --noEmit
npm test                     # kiểm thử đơn vị: quy tắc cảnh báo, chỉ số AI, địa chỉ hub, đồng bộ, giám thị
npm run build

cd ../desktop-hub
python -m unittest discover -s tests -v    # API LAN, phục vụ trang, cửa sổ giám thị (cần pywebview)
python3 -m unittest discover -s tests -p "test_[hc]*.py" -v   # macOS: bỏ phần cửa sổ, không cần pywebview
```

### Kiểm thử toàn luồng (e2e)

Dùng trình duyệt thật, camera giả lập và mô hình MediaPipe thật: thí sinh kết nối → AI chạy →
mở cửa sổ giám thị → cảnh báo "không có mặt" tới giám thị → video đứng thì báo "AI đã tạm dừng" →
mất mạng rồi gửi lại → bấm Dừng.

```bash
cd web && npm run build
# Mở hai máy chủ thử nghiệm độc lập (mỗi lệnh in ra một địa chỉ):
python ../desktop-hub/tests/serve_hub.py      # → URL_THI_SINH
python ../desktop-hub/tests/serve_hub.py      # → URL_GIAM_THI
npm i --no-save playwright                # hoặc đặt PLAYWRIGHT_MODULE tới bản đã cài
node tests/e2e/alert-flow.cjs URL_THI_SINH URL_GIAM_THI
```

Mặc định dùng Microsoft Edge; máy không có Edge đặt `E2E_BROWSER_CHANNEL=chrome`.
Phần quay đầu trong bài test dùng chỉ số giả lập qua đúng bộ đếm thật; không thay thế việc thử với người thật.

## 4. Build EXE (Windows)

Từ thư mục gốc dự án, PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-exe.ps1
# Bản có tên phiên bản riêng, không đè EXE đang chạy:
powershell -ExecutionPolicy Bypass -File scripts/build-exe.ps1 -Name AI_ExamGuard_2026_09_08_3
```

Script lần lượt: `npm ci` + `npm run build` trong `web/` → PyInstaller với `desktop-hub/examguard.spec`
→ chép EXE vào `release/`. Làm tay tương đương:

```powershell
cd web; npm ci; npm run build
cd ../desktop-hub; $env:EXAMGUARD_EXE_NAME = 'AI_ExamGuard_Portable'; python -m PyInstaller --noconfirm examguard.spec
# kết quả: desktop-hub/dist/AI_ExamGuard_Portable.exe
```

Khi ra phiên bản mới, đổi `appVersion` trong `shared/hub-contract.json` và `APP_VERSION` trong
`desktop-hub/examguard_desktop/config.py` (test hợp đồng sẽ báo nếu quên một trong hai).

## 5. Triển khai web lên Vercel (tùy chọn)

- Trong Vercel → Project Settings → **Root Directory** đặt là `web`.
- Đặt các biến `NEXT_PUBLIC_FIREBASE_*` (xem `web/.env.example`) trong Environment Variables rồi redeploy.
  `NEXT_PUBLIC_SITE_URL` chỉ cần khi dùng tên miền riêng.
- Không đưa `.env.local` lên Git.
