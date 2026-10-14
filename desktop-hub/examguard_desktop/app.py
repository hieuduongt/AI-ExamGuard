"""
Điểm khởi động đầy đủ của ứng dụng desktop AI ExamGuard (bản EXE trên Windows).

File này bật máy chủ trung tâm LAN (hub), bật bộ tìm máy trên mạng LAN, rồi mở cửa sổ ứng dụng.
Khi người dùng đóng hết cửa sổ thì tắt máy chủ.
"""
import threading

from . import discovery
from .desktop_window import open_main_window, run_gui
from .server import create_server


def main():
    """
    Đây là gì: hàm chính, chạy toàn bộ ứng dụng desktop từ đầu đến khi đóng.
    Mục tiêu: một lần bấm mở là có đủ máy chủ trung tâm, bộ tìm máy và cửa sổ giao diện.
    Chức năng: tạo máy chủ, chạy nó ở một luồng phụ (luồng = một "công nhân" làm việc song
      song) để không chặn cửa sổ; bật bộ tìm máy qua mạng LAN với đúng cổng máy chủ; mở cửa sổ
      chính; chờ đến khi mọi cửa sổ đóng thì tắt và giải phóng máy chủ.
    Đầu ra: không trả về gì; hàm chỉ kết thúc khi người dùng đóng ứng dụng.
    Dùng ở đâu: desktop-hub/app_desktop.py (khi chạy `python app_desktop.py` hoặc mở file EXE).
    Liên kết với: server.py (create_server), discovery.py (start), desktop_window.py
      (open_main_window, run_gui).
    """
    server = create_server()
    server.daemon_threads = True
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    port = server.server_address[1]
    discovery.start(port)
    open_main_window(port)

    try:
        run_gui()
    finally:
        server.shutdown()
        server.server_close()
