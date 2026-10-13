# Thuật ngữ

Giải thích bằng lời thường trước, nghĩa kỹ thuật trong dự án sau.

## Mạng và máy

| Thuật ngữ | Hiểu đơn giản | Trong dự án |
| --- | --- | --- |
| **LAN / mạng nội bộ** | Các máy cắm chung một bộ phát Wi-Fi hoặc dây mạng trong trường, nói chuyện với nhau không cần Internet. | Mọi máy thi và máy giáo viên phải chung một LAN. |
| **Địa chỉ IP** | "Số nhà" của một máy trong mạng, ví dụ `192.168.1.10`. Đổi mạng là đổi số nhà. | Trang Giám thị luôn hiện IP **hiện tại** của máy giáo viên. |
| **Cổng (port)** | "Số phòng" trong một ngôi nhà: một máy có nhiều chương trình, mỗi chương trình nghe ở một cổng. | `8765` (TCP): trung tâm LAN. `8766` (UDP): tự tìm máy giám thị. |
| **Địa chỉ máy giám thị** | Số nhà + số phòng, viết liền: `http://192.168.1.10:8765`. | Học sinh có thể gõ trực tiếp nếu không dùng mã kết nối. |
| **Mã kết nối** | Mật hiệu 4 số để máy học sinh nhận ra đúng máy giáo viên trong mạng. | Sinh ngẫu nhiên mỗi lần mở EXE, hiện trên trang Giám thị. **Không phải mật khẩu.** |
| **Broadcast (phát quảng bá)** | Nói qua loa cho cả mạng cùng nghe, không gửi riêng cho ai. | Máy giáo viên phát mỗi 2 giây "tôi là máy giám thị mã 4821". Một số Wi-Fi chặn việc này. |
| **Tường lửa (firewall)** | "Bác bảo vệ" của máy tính, quyết định cho ai ra vào cổng nào. | Windows Firewall phải cho phép AI ExamGuard trên mạng Private. |
| **Trung tâm LAN / hub** | Bưu điện trung tâm nhận thư từ các máy thi. | Máy chủ nhỏ chạy bên trong EXE (`desktop-hub/`). Máy nào cũng có, nhưng học sinh kết nối vào hub của máy giáo viên. |
| **API** | "Ô cửa giao dịch" của bưu điện, mỗi ô làm một việc. | Các đường dẫn `/api/...`, xem `ky-thuat/api-lan.md`. |
| **localhost / 127.0.0.1** | Cách một máy tự gọi chính nó. | EXE tải giao diện từ `127.0.0.1` nên trình duyệt cho bật webcam. |

## Thi và cảnh báo

| Thuật ngữ | Hiểu đơn giản | Trong dự án |
| --- | --- | --- |
| **Máy thi / station** | Một máy học sinh. | Xác định bằng mã phòng + số máy. |
| **Cảnh báo / sự kiện / event** | Một lần phát hiện dấu hiệu cần giám thị chú ý. | Gửi kèm phòng, máy, họ tên, SBD, loại, thời điểm. |
| **Nhịp tim / heartbeat** | Cứ 2 giây máy thi báo "tôi vẫn đây". | Im lặng quá 7 giây thì giám thị thấy máy "mất kết nối". |
| **Ngưỡng / threshold** | Một dấu hiệu phải kéo dài bao lâu mới đáng báo. | Mặc định: vắng mặt 5 giây, nhiều mặt 2 giây, quay đầu 3 giây, mắt lệch 5 giây. |
| **Cooldown** | Thời gian "nghỉ" trước khi được báo lại cùng chuyện đó. | Mặc định 12 giây, tính riêng từng loại cảnh báo. |
| **Xác minh** | Giám thị đã tới xem và ghi nhận. | Nút "Đánh dấu đã xác minh"; AI không bao giờ tự kết luận. |
| **Hàng đợi gửi lại / outbox** | Hộp thư chờ: mất mạng thì cất thư lại, có mạng thì gửi tiếp. | Lưu trong trình duyệt, không gửi trùng. |
| **AI tạm dừng / stalled** | Camera vẫn mở nhưng AI không nhận được hình mới. | 3 giây không có khung hình mới được phân tích. |

## AI

| Thuật ngữ | Hiểu đơn giản | Trong dự án |
| --- | --- | --- |
| **MediaPipe Face Landmarker** | Mô hình AI của Google chấm 478 điểm lên khuôn mặt (mắt, mũi, cằm…). | Chạy ngay trong trình duyệt máy học sinh, không cần Internet. |
| **Yaw / Pitch** | Yaw: lắc đầu trái-phải. Pitch: gật đầu cúi-ngẩng. | Ước tính từ điểm mốc; giới hạn 14° và 20°. |
| **Gaze** | Mắt đang nhìn về đâu. | Tính theo vị trí con ngươi trong hốc mắt. |
| **FPS** | Số khung hình AI xử lý mỗi giây. | Hiện trên trang thí sinh và gửi kèm nhịp tim. |
| **Behavior Engine** | Đồng hồ bấm giờ cho từng dấu hiệu. | `web/src/domain/behavior-engine.ts`. |

## Lập trình

| Thuật ngữ | Hiểu đơn giản | Trong dự án |
| --- | --- | --- |
| **Frontend / giao diện** | Phần người dùng nhìn và bấm. | `web/` |
| **Backend / máy chủ** | Phần chạy phía sau, nhận và trả dữ liệu. | `desktop-hub/` |
| **Xuất tĩnh / static export** | Biến giao diện thành các file HTML/JS sẵn, không cần máy chủ Node.js. | `npm run build` → `web/out/`. |
| **EXE / PyInstaller** | Gói chương trình thành một file bấm đúp là chạy. | PyInstaller gói Python + `web/out/` thành một EXE. |
| **pywebview / WebView2** | Cửa sổ ứng dụng dùng nhân trình duyệt Edge có sẵn trên Windows. | Mở giao diện từ `127.0.0.1`. |
| **localStorage** | "Ngăn kéo" của trình duyệt để cất ít dữ liệu, tắt máy vẫn còn. | Khóa `examguard:*`, xem `ky-thuat/du-lieu-trinh-duyet.md`. |
| **Domain** | Phần code chứa luật chơi, không biết gì về giao diện hay mạng. | `web/src/domain/` |
| **Feature** | Phần code của một màn hình / vai trò. | `web/src/features/` |
| **Hook** | Hàm React `useXxx` gom dữ liệu và xử lý của một việc, tách khỏi phần hiển thị. | Ví dụ `use-hub-discovery.ts`. |
| **Hợp đồng (contract)** | Điều hai bên đã thống nhất, không được tự ý đổi. | `shared/hub-contract.json`. |
| **Kiểm thử đơn vị / e2e** | Đơn vị: thử từng hàm nhỏ. e2e: thử cả luồng như người dùng thật. | `npm test`, `python -m unittest`, `web/tests/e2e/alert-flow.cjs`. |
| **Chế độ demo** | Các tab trong cùng một trình duyệt chia sẻ dữ liệu, không nối được hai máy. | `web/src/services/local-demo/` |
