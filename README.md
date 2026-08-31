# AI ExamGuard

Hệ thống web hỗ trợ giám thị phát hiện sớm tín hiệu bất thường trong phòng thi. Dự án được thiết kế theo tinh thần và họ công nghệ của **Sổ Chủ Nhiệm Thông Minh**, đồng thời bổ sung MediaPipe để xử lý webcam ngay trên máy thí sinh.

## Các khu vực chính

- `/` — trang giới thiệu và chọn vai trò.
- `/thi-sinh` — khai báo phòng/máy, xin quyền webcam, chạy Face Landmarker và Behavior Engine tại chỗ.
- `/giam-thi` — sơ đồ máy thi, luồng cảnh báo, xác minh sự kiện và xuất báo cáo CSV.
- `/quan-tri` — cấu hình phòng, ngưỡng thời gian, quyền riêng tư và xuất cấu hình JSON.

## Công nghệ

- React 19, TypeScript, Vinext/Next-compatible routing, Tailwind CSS 4 và shadcn.
- MediaPipe Tasks Vision `FaceLandmarker` để phát hiện tối đa hai khuôn mặt, các điểm mốc mặt, hướng đầu và hướng mắt.
- `Behavior Engine` có bộ đệm thời gian và khoảng nghỉ cảnh báo để giảm nhiễu.
- Firebase Firestore tùy chọn cho đồng bộ nhiều máy, tương tự dự án Sổ Chủ Nhiệm Thông Minh.
- `BroadcastChannel` + `localStorage` làm chế độ demo cục bộ khi chưa cấu hình Firebase.

## Chạy dự án

Yêu cầu Node.js 22.13 trở lên.

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Để thử luồng thời gian thực cục bộ, mở `/thi-sinh` và `/giam-thi` trong hai tab cùng trình duyệt.

Webcam chỉ hoạt động trên `localhost` hoặc website HTTPS. Mô hình MediaPipe được tải trong lần chạy đầu tiên; sau đó toàn bộ suy luận diễn ra trong trình duyệt của thí sinh.

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

Đặt thêm `NEXT_PUBLIC_SITE_URL` bằng URL HTTPS chính thức để metadata chia sẻ dùng đúng địa chỉ triển khai.

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
npx tsc --noEmit
npm run build
```
