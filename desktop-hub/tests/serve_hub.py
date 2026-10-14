"""
Máy chủ hub riêng để kiểm thử, chỉ chạy trên chính máy này (127.0.0.1) ở một cổng ngẫu nhiên.

Dùng cho kiểm thử toàn luồng (web/tests/e2e/alert-flow.cjs, xem docs/van-hanh/chay-va-build.md);
không bao giờ đụng tới hub thật của giám thị. Khi chạy, in ra địa chỉ để truyền cho bài kiểm thử.
"""
import sys
from pathlib import Path
from http.server import ThreadingHTTPServer

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from examguard_desktop.http_handler import ExamGuardHTTPRequestHandler  # noqa: E402

server = ThreadingHTTPServer(('127.0.0.1', 0), ExamGuardHTTPRequestHandler)
server.daemon_threads = True
print(f'http://127.0.0.1:{server.server_port}', flush=True)
try:
    server.serve_forever()
finally:
    server.server_close()
