# Vấn đề tồn đọng

Các điểm dưới đây được phát hiện khi quy hoạch lại cấu trúc. Theo yêu cầu **không thay đổi chức năng,
nghiệp vụ, hành vi**, chúng được giữ nguyên và ghi lại ở đây để xử lý sau, mỗi mục một thay đổi riêng
(kèm test).

## Hành vi

1. **Trang Quản trị luôn ghi "BroadcastChannel / localStorage demo"** ở thẻ kiến trúc khi không có Firebase,
   kể cả khi đang chạy chế độ LAN bằng EXE. Chỉ là chữ hiển thị, không ảnh hưởng hoạt động.
   (`web/src/features/admin/components/architecture-card.tsx`)

2. **Kiểm tra ngưỡng không đồng nhất.** Trang thí sinh chỉ nhận ngưỡng 1–60 giây
   (`domain/thresholds.ts › parseSavedThresholds`), còn trang Quản trị khi đọc lại cấu hình đã lưu thì
   nhận mọi giá trị (`features/admin/admin-settings.ts`). Ô nhập vẫn giới hạn 1–60 nên chỉ xảy ra khi
   localStorage bị sửa tay.

3. **Ngưỡng chỉ lưu trong trình duyệt của máy quản trị.** Máy thí sinh đọc `examguard:settings:v2` của
   chính nó, nên chỉnh ngưỡng ở máy giáo viên không tự áp dụng cho các máy học sinh.

4. **`head_pose` (cúi/ngẩng) dùng chung ngưỡng thời gian với quay đầu** (`headTurnSeconds`), không chỉnh riêng được.

5. **`normalizeHubUrl('http://')` trả về `http://http:8765`** thay vì chuỗi rỗng (đã ghi trong
   `web/tests/unit/hub-url.test.cjs`). Chỉ xảy ra khi người dùng gõ đúng `http://`; kiểm tra kết nối sẽ báo lỗi.

6. **`PATCH /api/events/{id}` không có thân hợp lệ được hiểu là "đã xác minh"** (xem `docs/ky-thuat/api-lan.md`).

7. **Máy chủ LAN đôi khi ngắt kết nối khi tải trang lần đầu.** Kiểm thử e2e trên macOS thấy khoảng 1/3 lần
   một file JS bị `ERR_CONNECTION_RESET` (cả bản trước và sau quy hoạch). Nghi do hàng đợi kết nối mặc định
   của `ThreadingHTTPServer` (`request_queue_size = 5`) khi trình duyệt tải song song nhiều file.
   Cần kiểm tra trên Windows với nhiều máy; hướng xử lý: tăng `request_queue_size` trong `desktop/examguard_desktop/server.py`.

## Tài liệu và công cụ

8. **Các script trong `docs/tools/`** chứa nội dung câu lệnh lịch sử (nhắc `lib/…`, `app_desktop.py` một file,
   `AI_ExamGuard_Portable.spec`) và một số đường dẫn đầu ra cũ (ví dụ `DU_AN_PYTHON/…`). Đây là hồ sơ
   quá trình xây dựng nộp cuộc thi nên chưa sửa; nếu chạy lại cần chỉnh đường dẫn đầu ra.

9. **Hồ sơ dự thi** nhắc lẫn lộn công cụ AI hỗ trợ (Kiro / Codex) giữa các tài liệu — cần thống nhất trước khi nộp.

## Triển khai

10. **Vercel**: sau khi chuyển mã nguồn web vào `web/`, phải đặt *Root Directory = `web`* trong cài đặt project.
11. **Bảo mật Firebase**: chưa có Authentication, phân quyền, App Check, Security Rules (xem `docs/ky-thuat/du-lieu-trinh-duyet.md`).
12. **Build EXE và e2e bằng Edge** cần chạy lại trên Windows sau quy hoạch (đã kiểm thử e2e bằng Chrome trên macOS).
