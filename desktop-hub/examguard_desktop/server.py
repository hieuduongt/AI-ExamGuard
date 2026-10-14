"""
Tạo máy chủ web của trung tâm LAN (hub) trên máy giám thị.

Máy chủ này vừa phục vụ trang web, vừa nhận cảnh báo qua các API /api/... (API = cửa giao tiếp
giữa hai chương trình).
"""
import os
from http.server import ThreadingHTTPServer

from .config import DEFAULT_PORT
from .http_handler import ExamGuardHTTPRequestHandler


def create_server():
    """
    Đây là gì: hàm tạo máy chủ web của hub.
    Mục tiêu: cho máy thí sinh trong cùng mạng LAN kết nối được tới máy giám thị.
    Chức năng: nghe trên mọi card mạng ("0.0.0.0") để máy khác trong LAN truy cập được; dùng
      cổng ghi trong biến môi trường EXAMGUARD_PORT (mặc định 8765). Nếu cổng đó đang bị
      chương trình khác chiếm thì tự chọn một cổng trống khác.
    Đầu ra: đối tượng máy chủ ThreadingHTTPServer (chưa chạy; nơi gọi phải cho nó chạy).
    Dùng ở đâu: app.py (main) và desktop-hub/run_hub.py (main).
    Liên kết với: config.py (DEFAULT_PORT), http_handler.py (ExamGuardHTTPRequestHandler xử lý
      từng yêu cầu).
    """
    requested_port = int(os.environ.get("EXAMGUARD_PORT", DEFAULT_PORT))
    try:
        return ThreadingHTTPServer(("0.0.0.0", requested_port), ExamGuardHTTPRequestHandler)
    except OSError:
        return ThreadingHTTPServer(("0.0.0.0", 0), ExamGuardHTTPRequestHandler)
