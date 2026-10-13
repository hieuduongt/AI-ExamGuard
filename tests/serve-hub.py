"""Isolated local server for regression tests; never uses the live teacher hub."""
import sys
from pathlib import Path
from http.server import ThreadingHTTPServer

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app_desktop import ExamGuardHTTPRequestHandler  # noqa: E402

server = ThreadingHTTPServer(('127.0.0.1', 0), ExamGuardHTTPRequestHandler)
server.daemon_threads = True
print(f'http://127.0.0.1:{server.server_port}', flush=True)
try:
    server.serve_forever()
finally:
    server.server_close()
