# AI ExamGuard

Hệ thống web hỗ trợ giám thị phát hiện sớm tín hiệu bất thường trong phòng thi. Dự án được thiết kế theo tinh thần và họ công nghệ của **Sổ Chủ Nhiệm Thông Minh**, đồng thời bổ sung MediaPipe để xử lý webcam ngay trên máy thí sinh.

## Các khu vực chính

- `/` — trang giới thiệu và chọn vai trò.
- `/thi-sinh` — khai báo phòng/máy, xin quyền webcam, chạy Face Landmarker và Behavior Engine tại chỗ.
- `/giam-thi` — sơ đồ máy thi, luồng cảnh báo, xác minh sự kiện và xuất báo cáo CSV.
- `/quan-tri` — cấu hình phòng, ngưỡng thời gian, quyền riêng tư và xuất cấu hình JSON.

## Công nghệ

- Next.js 16, React 19, TypeScript, Tailwind CSS 4 và shadcn.
- MediaPipe Tasks Vision `FaceLandmarker` để phát hiện tối đa hai khuôn mặt, các điểm mốc mặt, hướng đầu và hướng mắt.
- `Behavior Engine` có bộ đệm thời gian và khoảng nghỉ cảnh báo để giảm nhiễu.
- Firebase Firestore tùy chọn cho đồng bộ nhiều máy, tương tự dự án Sổ Chủ Nhiệm Thông Minh.
- `BroadcastChannel` + `localStorage` làm chế độ demo cục bộ khi chưa cấu hình Firebase.

## Chạy dự án

Yêu cầu Node.js 24.x.

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Để thử luồng thời gian thực cục bộ, mở `/thi-sinh` và `/giam-thi` trong hai tab cùng trình duyệt.

Webcam chỉ hoạt động trên `localhost` hoặc website HTTPS. Mô hình MediaPipe được tải trong lần chạy đầu tiên; sau đó toàn bộ suy luận diễn ra trong trình duyệt của thí sinh.

## Chạy nhiều máy bằng bản EXE trong mạng LAN

Bản desktop tích hợp một trung tâm cảnh báo LAN tại cổng `8765`, không cần Firebase:

1. Máy giáo viên chạy `AI_ExamGuard_Portable.exe`, mở `/giam-thi` và sao chép địa chỉ LAN được hiển thị.
2. Mỗi máy học sinh chạy cùng file EXE, mở `/thi-sinh`, nhập họ tên, số báo danh, phòng và số máy.
3. Máy học sinh nhập địa chỉ của máy giáo viên, bấm **Kiểm tra kết nối**, sau đó mới bắt đầu giám sát.
4. Khi có cảnh báo, dashboard hiển thị phòng, máy, số báo danh và họ tên tương ứng.

Các máy phải dùng chung LAN/Wi-Fi và Windows Firewall phải cho phép ứng dụng trên mạng Private. Đây là chế độ mạng nội bộ tin cậy; không mở cổng `8765` ra Internet. Dữ liệu tại trung tâm LAN nằm trong bộ nhớ, vì vậy cần xuất CSV trước khi đóng ứng dụng máy giáo viên.

## Kết nối Firebase

Sao chép `.env.example` thành `.env.local`, sau đó điền cấu hình Web App của Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Trên Vercel, ứng dụng tự nhận tên miền từ `VERCEL_PROJECT_PRODUCTION_URL`. Chỉ cần đặt `NEXT_PUBLIC_SITE_URL` nếu muốn dùng một tên miền tùy chỉnh khác.

## Triển khai trên Vercel

Có thể nhập Git repository vào Vercel và để hệ thống tự nhận framework **Next.js**, hoặc triển khai bằng CLI:

```bash
npx vercel
npx vercel --prod
```

Thiết lập các biến `NEXT_PUBLIC_FIREBASE_*` trong **Project Settings → Environment Variables**, sau đó redeploy. Không đưa `.env.local` lên Git.

Ứng dụng sử dụng hai collection:

- `examStations/{stationId}` — trạng thái gần nhất của từng máy.
- `examEvents/{eventId}` — sự kiện cảnh báo và trạng thái xác minh.

Trước khi dùng trong kỳ thi thật, cần bổ sung Firebase Authentication, custom claims theo vai trò, App Check và Firestore Security Rules. Không dùng rules công khai `allow read, write: if true` trong môi trường chính thức.

## Luồng xử lý

```text
Webcam máy thí sinh
  → MediaPipe Face Landmarker
  → chỉ số khuôn mặt / hướng mắt / tư thế
  → Behavior Engine + bộ đệm 2–5 giây
  → trạng thái xanh / vàng / đỏ tại máy
  → chỉ gửi sự kiện và số liệu lên Firestore
  → dashboard giám thị xác minh
```

Các tín hiệu đang được theo dõi:

1. Không có khuôn mặt trước máy.
2. Xuất hiện nhiều khuôn mặt.
3. Quay đầu trái/phải kéo dài.
4. Cúi/ngẩng đầu bất thường.
5. Hướng mắt lệch khỏi vùng màn hình.
6. Chuyển tab hoặc dùng tổ hợp phím sao chép/in.

## Nguyên tắc an toàn

- AI chỉ hỗ trợ quan sát, không tự kết luận vi phạm.
- Video không được truyền liên tục lên dashboard trong cấu hình mặc định.
- Lưu ảnh cảnh báo mặc định bị tắt.
- Các ngưỡng trong bản mẫu là ngưỡng kỹ thuật để trình diễn, cần hiệu chỉnh và kiểm thử theo đối tượng, điều kiện ánh sáng và quy chế của đơn vị.
- Cần công khai thông báo giám sát, thời hạn lưu dữ liệu, quyền truy cập và quy trình khiếu nại trước khi triển khai thật.

## Kiểm tra chất lượng

```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
python -m unittest discover -s tests -p test_desktop.py -v
```

Kiểm tra tích hợp (trên dữ liệu QA riêng): chạy hai tiến trình `python tests/serve-hub.py`,
sau đó `node tests/alert-flow.cjs URL_THI_SINH URL_GIAM_THI`.
Script cần Playwright và Microsoft Edge; có thể đặt `PLAYWRIGHT_MODULE` đến thư mục
Playwright đã cài. Bài kiểm tra sử dụng camera giả lập không có người với MediaPipe
thật, mở cửa sổ giám thị riêng, xác nhận đúng danh tính và trạng thái nhận cảnh báo.
Phần quay đầu dùng chỉ số giả lập qua đúng bộ phát hiện sản xuất, kiểm tra cả lỗi
mạng và gửi lại. Đây không thay thế kiểm thử quay đầu với người thật/webcam thực tế.

Đóng gói bản sửa mà không ghi đè EXE đang chạy (PowerShell):

```powershell
npm run build
$env:EXAMGUARD_EXE_NAME = 'AI_ExamGuard_2026_09_08_3'
pyinstaller --noconfirm AI_ExamGuard_Portable.spec
```

Bản 2026.09.08.3 mở Giám thị trong cửa sổ riêng khi đang ở Thí sinh, giữ bộ đếm
qua nhiễu ngắn, báo rõ AI ngừng phân tích và lưu hàng đợi cảnh báo để gửi lại.
Xem `HUONG_DAN_CHAY_EXE.txt` để kiểm tra trên một máy hoặc nhiều máy LAN.
