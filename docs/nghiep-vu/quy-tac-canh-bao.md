# Quy tắc tạo cảnh báo

**Nói ngắn gọn:** AI không báo ngay khi bạn liếc sang một chút. Nó giống trọng tài cầm đồng hồ bấm giờ:
chỉ khi một dấu hiệu **kéo dài liên tục đủ lâu** (ví dụ quay đầu hơn 3 giây, vắng mặt hơn 5 giây) mới thổi còi.
Thổi còi xong phải nghỉ 12 giây mới được thổi lại cùng lỗi đó. Còi chỉ để gọi giám thị tới xem, **không phải
phán quyết**.

Mã nguồn tương ứng: `web/src/domain/` (thresholds, behavior-engine, alert-catalog, station-health)
và `web/src/features/candidate/hooks/`. Kiểm thử: `web/tests/unit/behavior-engine.test.cjs`, `domain.test.cjs`.

## 1. Các loại cảnh báo

| Mã | Tên hiển thị | Mức | Điều kiện trên mỗi khung hình | Phải kéo dài (mặc định) |
| --- | --- | --- | --- | --- |
| `no_face` | Không có mặt trước máy | Đỏ | Không thấy khuôn mặt nào | 5 giây |
| `multiple_faces` | Xuất hiện nhiều khuôn mặt | Đỏ | Thấy từ 2 khuôn mặt | 2 giây |
| `head_turn` | Quay đầu trái/phải kéo dài | Vàng | 1 mặt, góc quay ngang > 14° | 3 giây |
| `head_pose` | Cúi/ngẩng đầu bất thường | Vàng | 1 mặt, góc cúi/ngẩng > 20° | 6 giây (tách riêng, chỉnh được ở trang Quản trị) |
| `gaze_away` | Hướng mắt lệch màn hình | Vàng | 1 mặt, mắt lệch ngang > 0,55 hoặc dọc > 0,7 | 5 giây |
| `focus_lost` | Rời khỏi cửa sổ bài thi | Vàng | Trang bị ẩn (chuyển tab, thu nhỏ) | Ngay lập tức |
| `restricted_input` | Thao tác bàn phím bị hạn chế | Vàng | Ctrl/Cmd + C, V, X hoặc P | Ngay lập tức |

Các góc là **ước tính** từ điểm mốc khuôn mặt, không phải phép đo chính xác.

## 2. Cách đếm thời gian (chống báo nhầm)

- Chỉ cộng thời gian giữa **hai khung hình liên tiếp cùng vi phạm**.
- Tín hiệu biến mất dưới **0,4 giây** (nhiễu ngắn) thì bộ đếm vẫn giữ; biến mất từ 0,4 giây trở lên thì về 0.
- Nếu hai khung hình cách nhau quá **1,5 giây** (camera đứng, máy treo) thì mọi bộ đếm về 0:
  không bao giờ tính thời gian camera dừng là thời gian "đã quan sát".
- Khi vừa đủ ngưỡng, cảnh báo được tạo; sau đó cùng loại cảnh báo phải chờ **12 giây** (cooldown)
  mới được tạo tiếp. Cooldown tính riêng từng loại. Cảnh báo thử (nút "Thử cảnh báo…") bỏ qua cooldown.
- Bắt đầu phiên mới thì mọi bộ đếm và cooldown được xóa.

Trang thí sinh hiển thị "Tiến trình tạo cảnh báo" (ví dụ `1,8 / 3s`) để học sinh và giáo viên thấy
AI đang đếm gì.

## 3. Ngưỡng có thể chỉnh

Trang Quản trị cho chỉnh các ngưỡng thời gian (không thấy mặt, nhiều khuôn mặt, quay đầu, **cúi/ngẩng**,
mắt lệch, cooldown), mỗi giá trị từ 1 đến 60 giây. Bấm **Lưu thay đổi** sẽ:

1. Lưu vào trình duyệt máy quản trị (khóa `examguard:settings:v2`).
2. Đẩy lên hub (`POST /api/settings`) kèm công tắc quyền riêng tư (đồng ý giám sát, lưu đoạn hình).

Máy thí sinh đọc cấu hình từ hub khi bắt đầu phiên và định kỳ khi đang chạy (ưu tiên hub hơn local).
Giá trị ngoài 1–60 bị bỏ qua và dùng mặc định. Giới hạn góc (14°, 20°, 0,55, 0,7) không chỉnh trên giao diện,
nằm ở `web/src/domain/thresholds.ts`.

## 4. Màu trạng thái của máy

| Màu | Ý nghĩa |
| --- | --- |
| Đỏ (critical) | Số khuôn mặt khác 1 |
| Vàng (warning) | Có 1 mặt nhưng góc đầu hoặc hướng mắt vượt giới hạn; hoặc AI chưa sẵn sàng / đã tạm dừng |
| Xanh (normal) | 1 khuôn mặt, mọi chỉ số trong giới hạn |
| Mất kết nối (offline) | Máy giám thị không nhận được tín hiệu từ máy đó quá 7 giây, hoặc thí sinh bấm Dừng |

## 5. Trạng thái AI

Máy thí sinh gửi trạng thái mỗi 2 giây kèm tình trạng AI:

- `loading`: đang tải mô hình.
- `ready`: có khung hình mới được phân tích trong 3 giây gần nhất.
- `stalled`: camera mở nhưng 3 giây không có khung hình mới được phân tích ("AI đã tạm dừng").
- `error`: không tải được mô hình (chỉ còn camera) hoặc lỗi webcam.
- `stopped`: thí sinh bấm Dừng.

**Camera có hình chưa có nghĩa AI đang chạy**: giám thị cần nhìn trạng thái AI.

## 6. Gửi cảnh báo và kết luận của giám thị

- Mỗi cảnh báo có mã riêng. Nếu mất mạng, bản chữ được xếp hàng trong trình duyệt và gửi lại khi
  có kết nối (kể cả sau khi tải lại trang). Clip/ảnh **không** nhét localStorage. Trung tâm LAN bỏ qua
  cảnh báo trùng mã, nên gửi lại không làm trùng và không làm mất kết luận đã ghi.
- "Giám thị đã nhận" chỉ hiện sau khi máy giám thị trả lời đã nhận.
- Giám thị mở chi tiết → **Xác nhận đúng** (`confirmed`) hoặc **Báo nhầm** (`false_alarm`).
  Thống kê báo nhầm (kể cả theo loại) dùng để chỉnh ngưỡng.
- Nếu Quản trị bật “Lưu đoạn hình ngắn khi cảnh báo”: clip gắn vào cảnh báo **lúc AI phát cảnh báo**,
  không phải lúc bấm nút kết luận.
- Trung tâm LAN giữ tối đa 500 cảnh báo mới nhất, trong bộ nhớ. Đóng EXE máy giáo viên là mất:
  cần **Xuất báo cáo** / **Biên bản đã xác nhận** (CSV gồm cả đúng và báo nhầm đã kết luận) trước khi kết thúc ca thi.
- Giám thị có thể **xóa máy** khỏi lưới (`DELETE /api/stations/...`) khi máy offline / thử xong; không xóa cảnh báo đã ghi.

## 7. Nguyên tắc

- AI chỉ đưa ra nghi vấn; giám thị là người kết luận theo quy chế.
- Thí sinh phải xác nhận đã đọc thông báo giám sát trước khi bật webcam.
- Ngưỡng hiện tại là ngưỡng kỹ thuật để trình diễn; cần hiệu chỉnh theo ánh sáng, vị trí camera và
  đối tượng trước khi dùng thật.
