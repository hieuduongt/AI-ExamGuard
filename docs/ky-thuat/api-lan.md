# API trung tâm cảnh báo LAN

**Nói ngắn gọn:** trung tâm LAN trên máy giáo viên giống một bưu điện có 7 ô cửa giao dịch (API). Máy học sinh
tới ô "gửi cảnh báo" và ô "báo bình an mỗi 2 giây"; trang Giám thị tới ô "cho xem hết thư" mỗi giây. Ngoài ra
bưu điện còn "hô" qua loa (UDP) để máy học sinh tìm thấy nó bằng mã 4 số. Phần dưới là chi tiết cho lập trình viên.

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
`200 {"ok": true, "port": 8765, "hubUrl": "http://<IP LAN>:8765", "version": "2026.09.08.3", "discovery": true, "connectCode": "4821"}`
— trang giám thị dùng để hiển thị địa chỉ và mã kết nối cho học sinh. `hubUrl` lấy IP LAN **hiện tại** mỗi lần gọi.
`discovery` = máy chủ đang nghe UDP (xem "Tự tìm máy giám thị" bên dưới); `connectCode` sinh ngẫu nhiên mỗi lần
mở ứng dụng. Trang giám thị mở từ chính trung tâm (không có `?hub=`) luôn đọc trung tâm đó, bỏ qua địa chỉ cũ đã lưu.

### `GET /api/snapshot`
`200 {"events": [...], "stations": [...]}`. `events` sắp xếp theo `timestamp` giảm dần; `stations` theo `roomId`
rồi `stationId`. Dashboard gọi mỗi giây với `?proctor=1&room=<tên phòng trong Quản trị>`: hai tham số này chỉ
báo cho trung tâm biết đang có dashboard mở (để phát tín hiệu UDP), không đổi dữ liệu trả về.

### `GET /api/discover?code=XXXX`
`200 {"ok": true, "running": true, "hubs": [{"hubUrl": "http://192.168.1.10:8765", "room": "Phòng thi 01", "host": "PC-GV", "version": "..."}]}`
— các máy giám thị mà trung tâm **của chính máy này** nghe được trong 8 giây gần nhất. Có `code` thì chỉ trả máy
có đúng mã đó; mã không bao giờ nằm trong kết quả. `running: false` khi không nghe được UDP (trang thí sinh khi đó
chỉ hiện ô nhập địa chỉ). Trang thí sinh gọi khi chưa kết nối.

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

## Tự tìm máy giám thị (UDP, cổng `8766`)

Mã: `desktop-hub/examguard_desktop/discovery.py`; test: `desktop-hub/tests/test_hub_discovery.py`.

- Mọi trung tâm đều nghe UDP cổng `8766` (`discoveryPort` trong `shared/hub-contract.json`).
- Chỉ khi có dashboard giám thị đang mở (đã gọi `/api/snapshot?proctor=1` trong 10 giây gần nhất), trung tâm mới
  phát mỗi 2 giây một gói JSON tới `255.255.255.255` và địa chỉ broadcast /24 của card mạng chính:
  `{"service": "examguard-hub", "version": "...", "code": "4821", "room": "Phòng thi 01", "host": "PC-GV", "port": 8765}`.
- Bên nhận lấy IP từ chính gói tin (không tin IP ghi trong nội dung), bỏ qua gói sai `service`, sai cổng, mã không
  đủ 4 số hoặc lớn hơn 2 KB. Máy im lặng quá 8 giây bị xóa khỏi danh sách.
- Mã kết nối gửi dạng chữ thường trong LAN: chỉ để phân biệt các máy giám thị, **không phải mật khẩu**.
