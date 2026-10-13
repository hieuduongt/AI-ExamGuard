# ==============================================================================
# DU AN: AI EXAMGUARD - HE THONG GIAM SAT THI THONG MINH
# NGON NGU: PYTHON 3 (DESKTOP APPLICATION)
# ==============================================================================

import os
import sys
import socket
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse
import webview

def get_resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    exe_dir = os.path.abspath(os.path.dirname(sys.executable))
    internal_path = os.path.join(exe_dir, '_internal', relative_path)
    if os.path.exists(internal_path):
        return internal_path
    base_path = os.path.abspath(os.path.dirname(__file__))
    return os.path.join(base_path, relative_path)

class CleanUrlHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.ui_dir = get_resource_path('ui')
        super().__init__(*args, directory=self.ui_dir, **kwargs)

    def translate_path(self, path):
        path = urllib.parse.unquote(path.split('?', 1)[0].split('#', 1)[0])
        clean_rel = path.lstrip('/')
        full_path = os.path.normpath(os.path.join(self.ui_dir, clean_rel))

        if os.path.exists(full_path):
            if os.path.isdir(full_path):
                index_path = os.path.join(full_path, 'index.html')
                if os.path.exists(index_path):
                    return index_path
            return full_path

        html_path = full_path + '.html'
        if os.path.exists(html_path):
            return html_path

        dir_index = os.path.join(full_path, 'index.html')
        if os.path.exists(dir_index):
            return dir_index

        fallback_404 = os.path.join(self.ui_dir, '404.html')
        if os.path.exists(fallback_404):
            return fallback_404

        return full_path

    def guess_type(self, path):
        if path.endswith('.js') or path.endswith('.mjs'):
            return 'application/javascript; charset=utf-8'
        if path.endswith('.css'):
            return 'text/css; charset=utf-8'
        if path.endswith('.wasm'):
            return 'application/wasm'
        if path.endswith('.json'):
            return 'application/json; charset=utf-8'
        if path.endswith('.svg'):
            return 'image/svg+xml'
        return super().guess_type(path)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        pass

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def start_server(port):
    server = HTTPServer(('127.0.0.1', port), CleanUrlHTTPRequestHandler)
    server.serve_forever()

def main():
    port = find_free_port()
    server_thread = threading.Thread(target=start_server, args=(port,), daemon=True)
    server_thread.start()

    url = f'http://127.0.0.1:{port}/'

    window = webview.create_window(
        title='AI ExamGuard - He Thong Giam Sat Thi Thong Minh',
        url=url,
        width=1380,
        height=880,
        min_size=(1024, 700),
        text_select=True,
        confirm_close=False
    )

    webview.start(gui='edgechromium', debug=False)

if __name__ == '__main__':
    main()
