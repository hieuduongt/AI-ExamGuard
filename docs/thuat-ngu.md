# Thuật ngữ

| Thuật ngữ | Nghĩa trong dự án |
| --- | --- |
| **Trung tâm LAN / hub** | Máy chủ nhỏ chạy bên trong EXE trên máy giáo viên, nhận cảnh báo từ các máy học sinh qua mạng nội bộ. |
| **Máy thi / station** | Một máy học sinh, xác định bằng mã phòng + số máy. |
| **Sự kiện / cảnh báo / event** | Một lần AI hoặc trình duyệt phát hiện dấu hiệu cần chú ý. |
| **Heartbeat / nhịp tim** | Gói trạng thái máy thí sinh gửi mỗi 2 giây để giám thị biết máy còn hoạt động. |
| **Ngưỡng / threshold** | Số giây một dấu hiệu phải kéo dài trước khi thành cảnh báo. |
| **Cooldown** | Thời gian chờ (mặc định 12 giây) trước khi được tạo lại cùng một loại cảnh báo. |
| **Behavior Engine** | Bộ đếm thời gian quyết định khi nào tín hiệu thành cảnh báo (`web/src/domain/behavior-engine.ts`). |
| **MediaPipe Face Landmarker** | Mô hình AI của Google tìm khuôn mặt và 478 điểm mốc trên mặt, chạy trong trình duyệt. |
| **Yaw / Pitch** | Góc quay đầu trái-phải / cúi-ngẩng, ước tính từ điểm mốc. |
| **Gaze** | Hướng nhìn của mắt, tính theo vị trí con ngươi trong hốc mắt. |
| **Outbox / hàng đợi gửi lại** | Danh sách cảnh báo chưa gửi được, lưu trong trình duyệt để gửi lại khi có mạng. |
| **Stalled / AI tạm dừng** | Camera vẫn mở nhưng không có khung hình mới được phân tích trong 3 giây. |
| **Chế độ demo** | Các tab trong cùng trình duyệt chia sẻ dữ liệu qua localStorage + BroadcastChannel; không nối được hai máy. |
| **Xuất tĩnh / static export** | `npm run build` biến giao diện thành các file HTML/JS trong `web/out/` để EXE phục vụ. |
| **PyInstaller** | Công cụ gói chương trình Python + thư mục giao diện thành một file EXE. |
| **pywebview / WebView2** | Thư viện mở cửa sổ ứng dụng dùng nhân trình duyệt Edge có sẵn trên Windows. |
| **Domain** | Phần code chứa quy tắc nghiệp vụ thuần túy, không phụ thuộc giao diện hay mạng. |
| **Feature** | Phần code của một màn hình/vai trò (thí sinh, giám thị, quản trị, trang chủ). |
| **Hook** | Hàm React `useXxx` gom state và xử lý của một mảng việc, tách khỏi phần hiển thị. |
| **Hợp đồng (contract)** | Thứ mà hai bên phải thống nhất và không được đổi tùy ý: đường dẫn API, khóa lưu trữ, dạng dữ liệu. |
