import os
from http.server import ThreadingHTTPServer
from .config import DEFAULT_PORT
from .http_handler import ExamGuardHTTPRequestHandler

def create_server():
    requested_port = int(os.environ.get('EXAMGUARD_PORT', DEFAULT_PORT))
    try:
        return ThreadingHTTPServer(('0.0.0.0', requested_port), ExamGuardHTTPRequestHandler)
    except OSError:
        return ThreadingHTTPServer(('0.0.0.0', 0), ExamGuardHTTPRequestHandler)
