# DỰ ÁN AI EXAMGUARD (PHIÊN BẢN PYTHON DESKTOP)

## 1. Giới thiệu
Đây là toàn bộ mã nguồn trọn gói của dự án **AI ExamGuard** được phát triển trên nền tảng **Python 3**. Dự án được gom riêng vào thư mục này để bạn dễ dàng mang đi thi, thuyết trình và nộp bài.

---

## 2. Cấu trúc thư mục dự án

- **main.py**: [File chính] Mã nguồn Python điều khiển toàn bộ ứng dụng Desktop (khởi tạo local server, gắn router, mở cửa sổ Edge WebView2, cấp quyền webcam và chạy AI).
- **chay_ung_dung.bat**: File nhấp đúp để chạy ứng dụng Python trực tiếp (python main.py).
- **dong_goi_exe.bat**: File nhấp đúp để tự động đóng gói ra file .exe bằng PyInstaller.
- **
equirements.txt**: Danh sách thư viện Python cần thiết (pywebview, pyinstaller, pythonnet).
- **ui/**: Toàn bộ giao diện người dùng và các tệp mô hình AI MediaPipe ace_landmarker.task ngoại tuyến.
- **dist/**: Thư mục chứa file **AI_ExamGuard_Portable.exe** đã đóng gói sẵn để copy sang máy khác.
- **	ai_lieu/**: Chứa file thuyết minh báo cáo Word **AI_ExamGuard_Mo_ta_tinh_nang_vai_tro_va_cong_nghe.docx** và script tạo tài liệu.

---

## 3. Cách chạy và thuyết trình khi đi thi

### Cách 1: Chạy từ file .exe (Nhanh nhất & không cần cài Python)
1. Mở thư mục dist/.
2. Nhấp đúp vào file **AI_ExamGuard_Portable.exe** để mở ứng dụng.
3. Có thể copy file này vào USB để cắm sang bất kỳ máy tính nào của Ban giám khảo.

### Cách 2: Chạy trực tiếp từ mã nguồn Python
1. Nhấp đúp vào file **chay_ung_dung.bat** (hoặc mở Terminal gõ python main.py).
2. Cửa sổ ứng dụng sẽ mở ra ngay lập tức.
