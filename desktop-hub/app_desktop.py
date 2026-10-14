"""
Điểm khởi động ứng dụng desktop AI ExamGuard: chạy bằng lệnh `python app_desktop.py`.

Đây cũng là điểm bắt đầu khi PyInstaller (công cụ đóng gói Python thành file EXE) build bản EXE
(xem desktop-hub/examguard.spec). Toàn bộ công việc nằm trong examguard_desktop/app.py (main).
"""
from examguard_desktop.app import main

if __name__ == "__main__":
    main()
