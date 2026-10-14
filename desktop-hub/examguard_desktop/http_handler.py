"""
Bộ xử lý yêu cầu web của máy chủ trung tâm LAN (hub) trên máy giám thị.

Có hai việc: phục vụ các tệp giao diện web đã xuất sẵn (web/out), và trả lời các API dưới /api/
(API = cửa giao tiếp giữa hai chương trình) để máy thí sinh gửi cảnh báo, bảng giám thị đọc dữ
liệu. Danh sách API ghi trong shared/hub-contract.json và docs/ky-thuat/api-lan.md.
"""
import json
import os
import urllib.parse
from http.server import SimpleHTTPRequestHandler

from . import discovery, exam_store
from .config import APP_VERSION, MAX_BODY_SIZE
from .network import get_lan_ip
from .paths import get_resource_path

# Các trường bắt buộc phải có trong mọi dữ liệu gửi lên (mã phòng, mã máy, mã và tên thí sinh);
# phải khớp identityFields trong shared/hub-contract.json (kiểm tra ở tests/test_contract.py).
IDENTITY_FIELDS = ("roomId", "stationId", "candidateId", "candidateName")


def is_non_empty_string(value):
    """
    Đây là gì: hàm kiểm tra "đây có phải chữ và không để trống không".
    Mục tiêu: chặn dữ liệu thiếu tên, thiếu mã (kể cả chỉ gõ toàn dấu cách).
    Chức năng: đúng khi value là chuỗi chữ và còn ký tự sau khi bỏ dấu cách ở hai đầu.
    Đầu ra: True hoặc False.
    Dùng ở đâu: do_POST (kiểm tra IDENTITY_FIELDS và mã sự kiện "id").
    Liên kết với: IDENTITY_FIELDS.
    """
    return isinstance(value, str) and bool(value.strip())


class ExamGuardHTTPRequestHandler(SimpleHTTPRequestHandler):
    """
    Đây là gì: lớp xử lý từng yêu cầu gửi tới máy chủ hub (mỗi yêu cầu tạo một đối tượng mới).
    Mục tiêu: một máy chủ duy nhất vừa cho xem trang web, vừa nhận và trả dữ liệu kỳ thi.
    Chức năng: dựa trên bộ phục vụ tệp có sẵn của Python, thêm: chọn đúng tệp HTML cho các
      trang, đặt đúng loại tệp, thêm tiêu đề cho phép gọi từ trang khác, và các API GET/POST/
      PATCH dưới /api/.
    Đầu ra: là một lớp; mỗi yêu cầu được trả lời bằng trang web hoặc dữ liệu JSON.
    Dùng ở đâu: server.py (create_server), tests/serve_hub.py và các file kiểm thử trong
      desktop-hub/tests/.
    Liên kết với: exam_store.py (kho dữ liệu), discovery.py (tìm máy), paths.py (thư mục out),
      web/src/services/hub/ (phía web gọi các API này).
    """
    server_version = "AIExamGuard/1.0"

    def __init__(self, *args, **kwargs):
        """
        Đây là gì: hàm khởi tạo, chạy mỗi khi có một yêu cầu mới.
        Mục tiêu: chỉ cho bộ phục vụ tệp biết thư mục giao diện web nằm ở đâu.
        Chức năng: tìm thư mục "out" rồi giao cho lớp cha dùng làm thư mục gốc.
        Đầu ra: không trả về gì.
        Dùng ở đâu: Python tự gọi khi máy chủ (server.py) nhận một yêu cầu.
        Liên kết với: paths.py (get_resource_path).
        """
        self.out_dir = get_resource_path("out")
        super().__init__(*args, directory=self.out_dir, **kwargs)

    # ---- phục vụ giao diện web tĩnh (các tệp có sẵn) ----

    def translate_path(self, path):
        """
        Đây là gì: hàm đổi đường dẫn trên địa chỉ web (ví dụ "/thi-sinh") thành tệp thật trên máy.
        Mục tiêu: mở đúng trang web, và không để ai đọc được tệp nằm ngoài thư mục out.
        Chức năng: bỏ phần "?..." và "#..."; đường dẫn /api/ để lớp cha xử lý. Nếu đường dẫn
          trỏ ra ngoài thư mục out thì trả trang 404. Thứ tự thử: tệp đúng tên, tệp cùng tên
          thêm ".html", tệp index.html trong thư mục, cuối cùng là trang 404.html.
        Đầu ra: đường dẫn tệp trên máy để gửi cho trình duyệt.
        Dùng ở đâu: Python tự gọi trong do_GET của lớp cha (SimpleHTTPRequestHandler).
        Liên kết với: thư mục web/out do `npm run build` trong web/ tạo ra.
        """
        path = urllib.parse.unquote(path.split("?", 1)[0].split("#", 1)[0])
        if path.startswith("/api/"):
            return super().translate_path(path)

        clean_rel = path.lstrip("/")
        full_path = os.path.normpath(os.path.join(self.out_dir, clean_rel))
        if os.path.commonpath([os.path.abspath(full_path), os.path.abspath(self.out_dir)]) != os.path.abspath(self.out_dir):
            return os.path.join(self.out_dir, "404.html")

        if os.path.isfile(full_path):
            return full_path

        # Bản xuất của Next có thể có cả tệp thi-sinh.html lẫn thư mục thi-sinh/ chứa dữ liệu
        # chuyển trang. Phải trả tệp HTML, không trả danh sách tệp trong thư mục.
        html_path = full_path.rstrip("/\\") + ".html"
        if os.path.exists(html_path):
            return html_path

        dir_index = os.path.join(full_path, "index.html")
        if os.path.exists(dir_index):
            return dir_index

        fallback_404 = os.path.join(self.out_dir, "404.html")
        return fallback_404 if os.path.exists(fallback_404) else full_path

    def guess_type(self, path):
        """
        Đây là gì: hàm cho biết loại của một tệp (trang, mã chạy, hình, âm thanh...).
        Mục tiêu: trình duyệt hiểu đúng tệp, đặc biệt tệp .wasm của AI camera và .js phải
          đúng loại thì mới chạy được.
        Chức năng: đặt loại cố định cho .js/.mjs, .css, .wasm, .json, .svg, .mp3; các đuôi
          khác để lớp cha tự đoán.
        Đầu ra: chuỗi loại tệp, ví dụ "application/wasm".
        Dùng ở đâu: Python tự gọi khi gửi một tệp cho trình duyệt.
        Liên kết với: các tệp trong web/out (gồm tài nguyên MediaPipe cho AI camera).
        """
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

    # ---- các hàm phụ dùng chung ----

    def end_headers(self):
        """
        Đây là gì: hàm thêm các dòng "tiêu đề" chung vào mọi câu trả lời trước khi gửi.
        Mục tiêu: trang web mở từ máy khác vẫn gọi được hub, và luôn thấy dữ liệu mới nhất.
        Chức năng: cho phép mọi trang gọi tới (CORS) với các kiểu GET, POST, PATCH, OPTIONS;
          dặn trình duyệt không lưu bản cũ (no-cache); rồi để lớp cha kết thúc phần tiêu đề.
        Đầu ra: không trả về gì.
        Dùng ở đâu: send_json, do_OPTIONS, và lớp cha khi gửi tệp.
        Liên kết với: tests/test_hub_api.py (kiểm tra đúng các tiêu đề này).
        """
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def send_json(self, status, payload):
        """
        Đây là gì: hàm gửi câu trả lời dạng JSON (cách viết dữ liệu máy dễ đọc).
        Mục tiêu: mọi API trả lời cùng một kiểu, giữ được chữ tiếng Việt có dấu.
        Chức năng: đổi payload thành JSON UTF-8 gọn, gửi mã trạng thái (ví dụ 200 là thành công,
          404 là không tìm thấy), loại nội dung, độ dài, rồi gửi phần thân.
        Đầu ra: không trả về gì; câu trả lời đã được gửi đi.
        Dùng ở đâu: do_GET, do_POST, do_PATCH.
        Liên kết với: end_headers.
        """
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        """
        Đây là gì: hàm đọc dữ liệu JSON mà máy khác gửi lên.
        Mục tiêu: nhận dữ liệu an toàn, không bị treo hay đầy bộ nhớ vì dữ liệu quá lớn.
        Chức năng: đọc độ dài khai báo; nếu không có, bằng 0 hoặc lớn hơn MAX_BODY_SIZE thì bỏ
          (không đọc phần thân); nếu chữ không đúng UTF-8 hoặc không phải JSON thì cũng bỏ.
        Đầu ra: dữ liệu đã đọc, hoặc None nếu không hợp lệ.
        Dùng ở đâu: do_POST, do_PATCH.
        Liên kết với: config.py (MAX_BODY_SIZE).
        """
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

    # ---- các API ----

    def do_OPTIONS(self):
        """
        Đây là gì: hàm trả lời yêu cầu "hỏi thăm trước" (OPTIONS) của trình duyệt.
        Mục tiêu: trình duyệt cho phép trang web ở máy khác gửi POST/PATCH tới hub.
        Chức năng: trả mã 204 (thành công, không có nội dung) kèm các tiêu đề CORS.
        Đầu ra: không trả về gì.
        Dùng ở đâu: Python tự gọi khi trình duyệt gửi yêu cầu OPTIONS.
        Liên kết với: end_headers.
        """
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        """
        Đây là gì: hàm trả lời các yêu cầu đọc (GET).
        Mục tiêu: cho trang web kiểm tra, lấy thông tin và đọc dữ liệu kỳ thi từ hub.
        Chức năng: /api/health trả "hub còn sống"; /api/runtime trả cổng, địa chỉ LAN, phiên
          bản, bộ tìm máy có chạy không và mã kết nối; /api/snapshot trả toàn bộ cảnh báo và
          máy thi (nếu có ?proctor=1 thì ghi nhận bảng giám thị đang mở kèm tên phòng);
          /api/discover trả danh sách máy giám thị nghe được (lọc theo ?code=). Đường dẫn khác
          thì gửi tệp giao diện web.
        Đầu ra: không trả về gì; câu trả lời đã được gửi đi.
        Dùng ở đâu: Python tự gọi khi có GET. Phía web: web/src/services/hub/hub-client.ts
          (health, runtime, snapshot), web/src/services/hub/hub-discovery.ts (discover).
        Liên kết với: exam_store.snapshot, discovery.py, network.py (get_lan_ip).
        """
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
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
                "discovery": discovery.is_running(),
                "connectCode": discovery.CONNECT_CODE,
            })
            return
        if route == "/api/snapshot":
            if query.get("proctor") == ["1"]:
                discovery.mark_proctor_active(query.get("room", [""])[0])
            self.send_json(200, exam_store.snapshot())
            return
        if route == "/api/discover":
            code = query.get("code", [""])[0].strip()
            self.send_json(200, {
                "ok": True,
                "running": discovery.is_running(),
                "hubs": discovery.discovered_hubs(code),
            })
            return
        super().do_GET()

    def do_POST(self):
        """
        Đây là gì: hàm nhận dữ liệu gửi lên (POST) từ máy thí sinh.
        Mục tiêu: lưu cảnh báo và trạng thái máy thi để giám thị theo dõi.
        Chức năng: dữ liệu phải là JSON dạng từ điển và có đủ IDENTITY_FIELDS, nếu không trả
          lỗi 400. /api/events cần thêm mã "id", lưu cảnh báo rồi trả 201; /api/stations lưu
          nhịp tim máy thi rồi trả 200; đường dẫn khác trả 404.
        Đầu ra: không trả về gì; câu trả lời đã được gửi đi.
        Dùng ở đâu: Python tự gọi khi có POST. Phía web: web/src/services/hub/outbox.ts
          (gửi cảnh báo), web/src/services/exam-sync.ts (gửi trạng thái máy).
        Liên kết với: exam_store.add_event, exam_store.save_station, read_json.
        """
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
        """
        Đây là gì: hàm sửa một phần dữ liệu (PATCH): đánh dấu cảnh báo đã xem/chưa xem.
        Mục tiêu: giám thị ghi lại cảnh báo nào mình đã kiểm tra.
        Chức năng: chỉ nhận đường dẫn /api/events/<mã>; đọc "reviewed" trong dữ liệu gửi kèm,
          nếu không gửi dữ liệu thì coi như "đã xem". Trả 200 nếu tìm thấy cảnh báo, 404 nếu không.
        Đầu ra: không trả về gì; câu trả lời đã được gửi đi.
        Dùng ở đâu: Python tự gọi khi có PATCH. Phía web: web/src/services/exam-sync.ts.
        Liên kết với: exam_store.set_reviewed, read_json.
        """
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
        """
        Đây là gì: hàm ghi nhật ký mỗi yêu cầu, được viết lại để không làm gì.
        Mục tiêu: không in hàng nghìn dòng ra màn hình (máy thí sinh gửi dữ liệu liên tục).
        Chức năng: bỏ qua mọi lời ghi nhật ký của lớp cha.
        Đầu ra: không trả về gì.
        Dùng ở đâu: Python tự gọi sau mỗi yêu cầu.
        Liên kết với: SimpleHTTPRequestHandler (lớp cha).
        """
        pass
