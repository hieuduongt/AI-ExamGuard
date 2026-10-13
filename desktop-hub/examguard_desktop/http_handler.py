"""HTTP handler: serves the exported web UI (web/out) and the LAN hub API under /api/."""
import json
import os
import urllib.parse
from http.server import SimpleHTTPRequestHandler

from . import exam_store
from .config import APP_VERSION, MAX_BODY_SIZE
from .network import get_lan_ip
from .paths import get_resource_path

IDENTITY_FIELDS = ("roomId", "stationId", "candidateId", "candidateName")


def is_non_empty_string(value):
    return isinstance(value, str) and bool(value.strip())


class ExamGuardHTTPRequestHandler(SimpleHTTPRequestHandler):
    server_version = "AIExamGuard/1.0"

    def __init__(self, *args, **kwargs):
        self.out_dir = get_resource_path("out")
        super().__init__(*args, directory=self.out_dir, **kwargs)

    # ---- static web UI ----

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
        if path.endswith(".mp3"):
            return "audio/mpeg"
        return super().guess_type(path)

    # ---- shared helpers ----

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

    # ---- API ----

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
            self.send_json(200, exam_store.snapshot())
            return
        super().do_GET()

    def do_POST(self):
        route = urllib.parse.urlparse(self.path).path
        payload = self.read_json()
        if not isinstance(payload, dict):
            self.send_json(400, {"ok": False, "error": "Dữ liệu không hợp lệ"})
            return

        if not all(is_non_empty_string(payload.get(field)) for field in IDENTITY_FIELDS):
            self.send_json(400, {"ok": False, "error": "Thiếu thông tin thí sinh hoặc máy thi"})
            return

        if route == "/api/events":
            if not is_non_empty_string(payload.get("id")):
                self.send_json(400, {"ok": False, "error": "Thiếu mã sự kiện"})
                return
            exam_store.add_event(payload)
            self.send_json(201, {"ok": True})
            return

        if route == "/api/stations":
            exam_store.save_station(payload)
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
        updated = exam_store.set_reviewed(event_id, reviewed)
        self.send_json(200 if updated else 404, {"ok": updated})

    def log_message(self, format, *args):
        pass
