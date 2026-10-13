import json
import os
import socket
import sys
import threading
import time
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import webview


DEFAULT_PORT = 8765
MAX_BODY_SIZE = 1_000_000
EVENT_LIMIT = 500
APP_VERSION = '2026.09.08.3'
data_lock = threading.Lock()
exam_events = []
exam_stations = {}


def get_resource_path(relative_path):
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    exe_dir = os.path.abspath(os.path.dirname(sys.executable))
    internal_path = os.path.join(exe_dir, "_internal", relative_path)
    if os.path.exists(internal_path):
        return internal_path
    base_path = os.path.abspath(os.path.dirname(__file__))
    return os.path.join(base_path, relative_path)


def get_lan_ip():
    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        probe.connect(("8.8.8.8", 80))
        return probe.getsockname()[0]
    except OSError:
        try:
            return socket.gethostbyname(socket.gethostname())
        except OSError:
            return "127.0.0.1"
    finally:
        probe.close()


def is_non_empty_string(value):
    return isinstance(value, str) and bool(value.strip())


class ExamGuardHTTPRequestHandler(SimpleHTTPRequestHandler):
    server_version = "AIExamGuard/1.0"

    def __init__(self, *args, **kwargs):
        self.out_dir = get_resource_path("out")
        super().__init__(*args, directory=self.out_dir, **kwargs)

    def translate_path(self, path):
        path = urllib.parse.unquote(path.split("?", 1)[0].split("#", 1)[0])
        if path.startswith("/api/"):
            return super().translate_path(path)

        clean_rel = path.lstrip("/")
        full_path = os.path.normpath(os.path.join(self.out_dir, clean_rel))
        if os.path.commonpath([os.path.abspath(full_path), os.path.abspath(self.out_dir)]) != os.path.abspath(self.out_dir):
            return os.path.join(self.out_dir, "404.html")

        if os.path.isfile(full_path):
            return full_path

        # Next's export can contain both thi-sinh.html and a thi-sinh/
        # directory holding router payloads. Serve the HTML, not a listing.
        html_path = full_path.rstrip("/\\") + ".html"
        if os.path.exists(html_path):
            return html_path

        dir_index = os.path.join(full_path, "index.html")
        if os.path.exists(dir_index):
            return dir_index

        fallback_404 = os.path.join(self.out_dir, "404.html")
        return fallback_404 if os.path.exists(fallback_404) else full_path

    def guess_type(self, path):
        if path.endswith((".js", ".mjs")):
            return "application/javascript; charset=utf-8"
        if path.endswith(".css"):
            return "text/css; charset=utf-8"
        if path.endswith(".wasm"):
            return "application/wasm"
        if path.endswith(".json"):
            return "application/json; charset=utf-8"
        if path.endswith(".svg"):
            return "image/svg+xml"
        return super().guess_type(path)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if length <= 0 or length > MAX_BODY_SIZE:
            return None
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        route = urllib.parse.urlparse(self.path).path
        if route == "/api/health":
            self.send_json(200, {"ok": True, "service": "AI ExamGuard LAN Hub"})
            return
        if route == "/api/runtime":
            port = self.server.server_address[1]
            self.send_json(200, {
                "ok": True,
                "port": port,
                "hubUrl": f"http://{get_lan_ip()}:{port}",
                "version": APP_VERSION,
            })
            return
        if route == "/api/snapshot":
            with data_lock:
                events = sorted(exam_events, key=lambda item: item.get("timestamp", 0), reverse=True)
                stations = sorted(
                    exam_stations.values(),
                    key=lambda item: (item.get("roomId", ""), item.get("stationId", "")),
                )
            self.send_json(200, {"events": events, "stations": stations})
            return
        super().do_GET()

    def do_POST(self):
        route = urllib.parse.urlparse(self.path).path
        payload = self.read_json()
        if not isinstance(payload, dict):
            self.send_json(400, {"ok": False, "error": "Dữ liệu không hợp lệ"})
            return

        identity_fields = ("roomId", "stationId", "candidateId", "candidateName")
        if not all(is_non_empty_string(payload.get(field)) for field in identity_fields):
            self.send_json(400, {"ok": False, "error": "Thiếu thông tin thí sinh hoặc máy thi"})
            return

        if route == "/api/events":
            if not is_non_empty_string(payload.get("id")):
                self.send_json(400, {"ok": False, "error": "Thiếu mã sự kiện"})
                return
            with data_lock:
                if not any(item.get("id") == payload["id"] for item in exam_events):
                    exam_events.insert(0, payload)
                    del exam_events[EVENT_LIMIT:]
            self.send_json(201, {"ok": True})
            return

        if route == "/api/stations":
            payload["serverSeenAt"] = int(time.time() * 1000)
            key = f"{payload['roomId']}::{payload['stationId']}"
            with data_lock:
                exam_stations[key] = payload
            self.send_json(200, {"ok": True})
            return

        self.send_json(404, {"ok": False, "error": "Không tìm thấy API"})

    def do_PATCH(self):
        route = urllib.parse.urlparse(self.path).path
        prefix = "/api/events/"
        if not route.startswith(prefix):
            self.send_json(404, {"ok": False, "error": "Không tìm thấy API"})
            return
        event_id = urllib.parse.unquote(route[len(prefix):])
        payload = self.read_json()
        reviewed = bool(payload.get("reviewed")) if isinstance(payload, dict) else True
        updated = False
        with data_lock:
            for event in exam_events:
                if event.get("id") == event_id:
                    event["reviewed"] = reviewed
                    updated = True
                    break
        self.send_json(200 if updated else 404, {"ok": updated})

    def log_message(self, format, *args):
        pass


def create_server():
    requested_port = int(os.environ.get("EXAMGUARD_PORT", DEFAULT_PORT))
    try:
        return ThreadingHTTPServer(("0.0.0.0", requested_port), ExamGuardHTTPRequestHandler)
    except OSError:
        return ThreadingHTTPServer(("0.0.0.0", 0), ExamGuardHTTPRequestHandler)


class DesktopApi:
    def __init__(self, port):
        self._port = port
        self._proctor = None
        self._lock = threading.Lock()

    def open_proctor(self, hub_url=""):
        # Only this fixed local route is exposed to the UI, never shell commands.
        parsed = urllib.parse.urlparse(hub_url)
        if hub_url and (parsed.scheme not in ("http", "https") or not parsed.hostname):
            return False
        with self._lock:
            url = f"http://127.0.0.1:{self._port}/giam-thi"
            if hub_url:
                url += "?" + urllib.parse.urlencode({"hub": hub_url})
            if self._proctor in webview.windows:
                self._proctor.load_url(url)
                self._proctor.show()
                self._proctor.restore()
            else:
                self._proctor = webview.create_window(
                    title=f"AI ExamGuard - Giám thị - {APP_VERSION}", url=url,
                    width=1280, height=820, min_size=(900, 650), text_select=True,
                )
        return self._proctor is not None


def main():
    server = create_server()
    server.daemon_threads = True
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    port = server.server_address[1]
    webview.create_window(
        title=f"AI ExamGuard - {APP_VERSION}",
        js_api=DesktopApi(port),
        url=f"http://127.0.0.1:{port}/",
        width=1380,
        height=880,
        min_size=(1024, 700),
        text_select=True,
        confirm_close=False,
    )

    try:
        webview.start(gui="edgechromium", debug=False)
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
