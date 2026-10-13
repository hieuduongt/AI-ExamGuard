# API trung tâm cảnh báo LAN

Máy chủ trong `desktop-hub/examguard_desktop/http_handler.py`, mặc định cổng `8765` (bận thì tự chọn cổng khác;
đổi bằng biến môi trường `EXAMGUARD_PORT`). Kiểm thử hợp đồng: `desktop-hub/tests/test_hub_api.py`.
Phía gọi: `web/src/services/hub/`.
Các giá trị chung (cổng, giới hạn, trường bắt buộc) nằm ở [`shared/hub-contract.json`](../../shared/hub-contract.json).

> Máy học sinh và máy giáo viên có thể chạy hai phiên bản EXE khác nhau. Mọi thay đổi ở đây phải
> giữ tương thích ngược.

## Quy ước chung

- Dữ liệu JSON UTF-8. Thân yêu cầu tối đa **1 MB**; lớn hơn, rỗng hoặc không phải JSON → coi là không hợp lệ.
- Mọi phản hồi có `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS`,
  `Access-Control-Allow-Headers: Content-Type`, `Cache-Control: no-cache, no-store, must-revalidate`.
- `OPTIONS` bất kỳ → `204`.
- Đường dẫn không phải `/api/` → phục vụ giao diện từ `web/out` (`/thi-sinh` trả `thi-sinh.html`, không liệt kê thư mục;
  không tìm thấy → `404.html`).
- Dữ liệu chỉ nằm trong bộ nhớ, mất khi tắt ứng dụng.

## Các API

### `GET /api/health`
`200 {"ok": true, "service": "AI ExamGuard LAN Hub"}` — dùng khi học sinh bấm "Kiểm tra kết nối".

### `GET /api/runtime`
`200 {"ok": true, "port": 8765, "hubUrl": "http://<IP LAN>:8765", "version": "2026.09.08.3"}` — trang giám thị
dùng để hiển thị địa chỉ cho học sinh.

### `GET /api/snapshot`
`200 {"events": [...], "stations": [...]}`. `events` sắp xếp theo `timestamp` giảm dần; `stations` theo `roomId`
rồi `stationId`. Dashboard gọi mỗi giây.

### `POST /api/events` — gửi một cảnh báo
Thân: một `ExamEvent` (xem `web/src/domain/exam-types.ts`). Bắt buộc `roomId`, `stationId`, `candidateId`,
`candidateName`, `id` là chuỗi không rỗng.

| Kết quả | Mã |
| --- | --- |
| Thành công (kể cả gửi lại trùng `id` — bản cũ được giữ nguyên) | `201 {"ok": true}` |
| JSON lỗi / không phải object / quá 1 MB | `400 {"ok": false, "error": "Dữ liệu không hợp lệ"}` |
| Thiếu thông tin thí sinh | `400 {"ok": false, "error": "Thiếu thông tin thí sinh hoặc máy thi"}` |
| Thiếu `id` | `400 {"ok": false, "error": "Thiếu mã sự kiện"}` |

Chỉ giữ **500** cảnh báo mới nhất.

### `POST /api/stations` — nhịp tim của máy thí sinh (mỗi 2 giây)
Thân: một `StationStatus`. Bắt buộc 4 trường thông tin thí sinh như trên. Máy chủ thêm `serverSeenAt`
(mili giây) và **thay thế** bản ghi cũ có cùng `roomId` + `stationId`. Trả `200 {"ok": true}`.

### `PATCH /api/events/{id}` — đánh dấu xác minh
Thân: `{"reviewed": true|false}`. Thân rỗng hoặc không hợp lệ được hiểu là `reviewed = true`.
Trả `200 {"ok": true}` nếu tìm thấy, `404 {"ok": false}` nếu không.

### Khác
`POST`/`PATCH` vào đường dẫn không có → `404 {"ok": false, "error": "Không tìm thấy API"}`.
