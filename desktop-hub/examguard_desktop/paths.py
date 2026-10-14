"""
Tìm đường dẫn tới các tệp giao diện web (thư mục out) mà máy chủ trung tâm (hub) phục vụ.

Phải tìm đúng cả khi chạy mã nguồn Python lẫn khi chạy bản EXE đã đóng gói bằng PyInstaller.
"""
import os
import sys

# Thư mục desktop-hub/ (thư mục cha của examguard_desktop/).
DESKTOP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_resource_path(relative_path):
    """
    Đây là gì: hàm tìm vị trí thật của một tệp/thư mục tài nguyên, ví dụ "out".
    Mục tiêu: chương trình chạy kiểu nào (EXE hay mã nguồn) cũng tìm được giao diện web.
    Chức năng: thử lần lượt: (1) thư mục tạm của bản EXE một tệp (sys._MEIPASS);
      (2) thư mục "_internal" cạnh file EXE; (3) ngay trong desktop-hub/; (4) cuối cùng là
      thư mục web/ bên cạnh (ví dụ web/out sau khi chạy `npm run build`).
    Đầu ra: đường dẫn đầy đủ tới tài nguyên (bước 4 trả về dù tệp có tồn tại hay không).
    Dùng ở đâu: http_handler.py, khi tạo ExamGuardHTTPRequestHandler (get_resource_path("out")).
    Liên kết với: desktop-hub/examguard.spec (đóng gói thư mục out vào EXE), web/ (nơi tạo ra out).
    """
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    exe_dir = os.path.abspath(os.path.dirname(sys.executable))
    internal_path = os.path.join(exe_dir, "_internal", relative_path)
    if os.path.exists(internal_path):
        return internal_path
    base_path = DESKTOP_DIR
    local_path = os.path.join(base_path, relative_path)
    if os.path.exists(local_path):
        return local_path
    return os.path.join(base_path, "..", "web", relative_path)
