# Dữ liệu lưu trong trình duyệt, Firestore và tín hiệu nội bộ

Đổi bất kỳ tên nào dưới đây sẽ làm mất dữ liệu đã lưu trên máy người dùng hoặc làm các tab/máy
không hiểu nhau. Nếu buộc phải đổi cấu trúc, hãy tăng hậu tố phiên bản (`v2` → `v3`) và viết code đọc bản cũ.

## localStorage

| Khóa | Nội dung | Ghi bởi |
| --- | --- | --- |
| `examguard:settings:v2` | Cấu hình quản trị: `thresholds`, `roomName`, `stationCount`, `storeSnapshots`, `requireConsent` | `features/admin` (đọc lại ngưỡng ở `domain/thresholds.ts`) |
| `examguard:teacher-hub:v1` | Địa chỉ máy giám thị đã chuẩn hóa, ví dụ `http://192.168.1.10:8765` | `services/hub/hub-url.ts` |
| `examguard:outbox:v1` | Hàng đợi cảnh báo chưa gửi được: `[{ hubUrl, event }]` | `services/hub/outbox.ts` |
| `examguard:events:v2` | Cảnh báo của chế độ demo (tối đa 500) | `services/local-demo/local-store.ts` |
| `examguard:stations:v2` | Trạng thái máy của chế độ demo (tối đa 150) | `services/local-demo/local-store.ts` |

## BroadcastChannel

`examguard:live:v2` — báo cho các tab khác cùng trình duyệt khi dữ liệu demo thay đổi
(`{kind: 'event' | 'station' | 'review', ...}`).

## Sự kiện nội bộ trên `window` (CustomEvent)

Khai báo trong `web/src/services/browser-signals.ts`:

| Tên | Ý nghĩa | Dữ liệu kèm |
| --- | --- | --- |
| `examguard-hub-status` | Kết nối tới máy giám thị vừa thành công / mất | `'connected'` hoặc `'disconnected'` |
| `examguard-delivery` | Một cảnh báo vừa được máy giám thị nhận | `{ id }` |
| `examguard-events` | Dữ liệu cảnh báo demo trong tab này đổi | — |
| `examguard-stations` | Dữ liệu máy demo trong tab này đổi | — |

## Firestore (khi có cấu hình Firebase)

- `examEvents/{eventId}` — cảnh báo (dashboard đọc 500 bản mới nhất theo `timestamp`).
- `examStations/{roomId}__{stationId}` (dấu `/` thay bằng `_`) — trạng thái gần nhất của từng máy
  (xem `services/firebase/firestore-sync.ts`).

Trước khi dùng thật cần thêm Firebase Authentication, phân quyền theo vai trò, App Check và
Security Rules; không dùng rules công khai `allow read, write: if true`.

## Cầu nối desktop

Khi chạy trong EXE, trang có `window.pywebview.api.open_proctor(hubUrl)` để mở cửa sổ giám thị riêng
(`web/src/services/desktop-bridge.ts` ↔ `desktop-hub/examguard_desktop/desktop_window.py`).
