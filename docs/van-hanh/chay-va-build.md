# Chạy thử, kiểm thử, build và triển khai

## Chuẩn bị

| Công cụ | Phiên bản | Dùng cho |
| --- | --- | --- |
| Node.js | 24.x | `web/` |
| Python | 3.9+ (Windows: 3.11+ khuyến nghị) | `desktop/` |
| Windows 10/11 + Edge WebView2 | — | Chạy cửa sổ ứng dụng và build EXE |

## 1. Chạy thử giao diện (mọi hệ điều hành)

```bash
cd web
npm ci
npm run dev        # http://localhost:3000
```

Mở `/thi-sinh` và `/giam-thi` ở hai tab cùng trình duyệt để thử luồng cảnh báo (chế độ demo).

## 2. Chạy thử như bản EXE (máy chủ LAN thật)

```bash
cd web && npm run build            # tạo web/out
cd ../desktop
pip install -r requirements.txt
python app_desktop.py              # Windows: mở cửa sổ ứng dụng
python tests/serve_hub.py          # mọi hệ điều hành: chỉ bật máy chủ, in địa chỉ để mở bằng trình duyệt
```

## 3. Kiểm thử

Chạy trước khi commit:

```bash
cd web
npm run lint
npx tsc --noEmit
npm test                     # kiểm thử đơn vị: quy tắc cảnh báo, chỉ số AI, địa chỉ hub, đồng bộ, giám thị
npm run build

cd ../desktop
python -m unittest discover -s tests -v    # API LAN, phục vụ trang, cửa sổ giám thị (cần pywebview)
```

### Kiểm thử toàn luồng (e2e)

Dùng trình duyệt thật, camera giả lập và mô hình MediaPipe thật: thí sinh kết nối → AI chạy →
mở cửa sổ giám thị → cảnh báo "không có mặt" tới giám thị → video đứng thì báo "AI đã tạm dừng" →
mất mạng rồi gửi lại → bấm Dừng.

```bash
cd web && npm run build
# Mở hai máy chủ thử nghiệm độc lập (mỗi lệnh in ra một địa chỉ):
python ../desktop/tests/serve_hub.py      # → URL_THI_SINH
python ../desktop/tests/serve_hub.py      # → URL_GIAM_THI
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

Script lần lượt: `npm ci` + `npm run build` trong `web/` → PyInstaller với `desktop/examguard.spec`
→ chép EXE vào `release/`. Làm tay tương đương:

```powershell
cd web; npm ci; npm run build
cd ../desktop; $env:EXAMGUARD_EXE_NAME = 'AI_ExamGuard_Portable'; python -m PyInstaller --noconfirm examguard.spec
# kết quả: desktop/dist/AI_ExamGuard_Portable.exe
```

Khi ra phiên bản mới, đổi `APP_VERSION` trong `desktop/examguard_desktop/config.py`.

## 5. Triển khai web lên Vercel (tùy chọn)

- Trong Vercel → Project Settings → **Root Directory** đặt là `web`.
- Đặt các biến `NEXT_PUBLIC_FIREBASE_*` (xem `web/.env.example`) trong Environment Variables rồi redeploy.
  `NEXT_PUBLIC_SITE_URL` chỉ cần khi dùng tên miền riêng.
- Không đưa `.env.local` lên Git.
