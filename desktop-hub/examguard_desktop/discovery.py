"""
Bộ tìm máy giám thị trong mạng LAN: máy thí sinh tìm ra máy giám thị bằng mã kết nối 4 số,
không cần gõ địa chỉ IP.

Mọi hub đang chạy đều lắng nghe các gói tin UDP broadcast (hô to cho mọi máy trong cùng mạng nghe
thấy) ở cổng DISCOVERY_PORT. Một hub chỉ tự hô khi đang có bảng giám thị đọc dữ liệu từ nó (xem
mark_proctor_active), nên máy thí sinh - dù chạy cùng ứng dụng - không bao giờ hô. Lời hô là chữ
thường gửi công khai trên LAN: mã kết nối chỉ để phân biệt các phòng, không phải mật khẩu.
"""
import json
import secrets
import socket
import threading
import time

from .config import APP_VERSION, DISCOVERY_PORT
from .network import get_lan_ip

# Tên dịch vụ ghi trong lời hô; phải khớp shared/hub-contract.json (discoveryService).
SERVICE = "examguard-hub"
# Cứ 2 giây hô một lần.
ANNOUNCE_INTERVAL = 2.0
# Bảng giám thị được coi là "đang mở" trong 10 giây kể từ lần đọc dữ liệu gần nhất.
PROCTOR_ACTIVE_FOR = 10.0
# Hub nào im lặng quá 8 giây thì bị xóa khỏi danh sách đã nghe thấy.
HUB_EXPIRES_AFTER = 8.0
# Kích thước tối đa một gói tin nhận vào (byte), và độ dài tối đa của chữ (tên phòng, tên máy).
MAX_PACKET = 2048
MAX_TEXT = 80

# Mã kết nối 4 số ngẫu nhiên (0000-9999), tạo một lần mỗi khi bật ứng dụng.
CONNECT_CODE = f"{secrets.randbelow(10000):04d}"

# Dữ liệu dùng chung giữa các luồng, luôn đọc/ghi khi đang giữ _lock.
_lock = threading.Lock()
_proctor_seen_at = 0.0
_proctor_room = ""
_found = {}
_running = False


def is_running():
    """
    Đây là gì: hàm hỏi "bộ tìm máy đã được bật chưa".
    Mục tiêu: cho trang web biết có dùng được ô nhập mã kết nối hay không.
    Chức năng: đọc cờ _running do start() đặt.
    Đầu ra: True nếu đã bật, False nếu chưa.
    Dùng ở đâu: http_handler.py (GET /api/runtime và GET /api/discover).
    Liên kết với: start().
    """
    return _running


def mark_proctor_active(room="", now=None):
    """
    Đây là gì: hàm ghi nhận "bảng giám thị đang mở và đang đọc dữ liệu từ hub này".
    Mục tiêu: chỉ máy giám thị mới tự hô trên LAN, máy thí sinh thì không.
    Chức năng: lưu thời điểm hiện tại (hoặc now nếu được truyền vào, dùng khi kiểm thử) và tên
      phòng (cắt còn tối đa MAX_TEXT ký tự).
    Đầu ra: không trả về gì.
    Dùng ở đâu: http_handler.py, khi có GET /api/snapshot?proctor=1&room=... (do
      fetchHubSnapshot trong web/src/services/hub/hub-client.ts gửi); tests/test_hub_discovery.py.
    Liên kết với: proctor_active(), announce_loop() (dùng tên phòng khi hô).
    """
    global _proctor_seen_at, _proctor_room
    with _lock:
        _proctor_seen_at = time.time() if now is None else now
        _proctor_room = str(room or "")[:MAX_TEXT]


def proctor_active(now=None):
    """
    Đây là gì: hàm hỏi "bảng giám thị có đang mở không".
    Mục tiêu: quyết định hub có nên hô trên LAN lúc này hay không.
    Chức năng: so thời điểm hiện tại với lần cuối bảng giám thị đọc dữ liệu; nếu chưa quá
      PROCTOR_ACTIVE_FOR giây thì coi là đang mở.
    Đầu ra: True hoặc False.
    Dùng ở đâu: announce_loop(); tests/test_hub_discovery.py.
    Liên kết với: mark_proctor_active() (nơi ghi thời điểm).
    """
    now = time.time() if now is None else now
    with _lock:
        return now - _proctor_seen_at <= PROCTOR_ACTIVE_FOR


def build_announcement(http_port, room, host):
    """
    Đây là gì: hàm soạn nội dung lời hô của máy giám thị.
    Mục tiêu: cho máy thí sinh biết đủ thông tin để kết nối.
    Chức năng: gói tên dịch vụ, phiên bản, mã kết nối, tên phòng, tên máy và cổng web thành
      chữ dạng JSON (một cách viết dữ liệu mà máy dễ đọc), rồi đổi sang byte UTF-8.
    Đầu ra: chuỗi byte sẵn sàng gửi qua UDP.
    Dùng ở đâu: announce_loop(); tests/test_hub_discovery.py.
    Liên kết với: record_announcement() (phía nhận đọc lại đúng các trường này).
    """
    return json.dumps({
        "service": SERVICE,
        "version": APP_VERSION,
        "code": CONNECT_CODE,
        "room": room,
        "host": host,
        "port": http_port,
    }, ensure_ascii=False).encode("utf-8")


def record_announcement(data, sender_ip, now=None):
    """
    Đây là gì: hàm ghi nhớ một lời hô nghe được từ máy giám thị.
    Mục tiêu: lập danh sách các máy giám thị đang có trên LAN.
    Chức năng: đọc gói tin; bỏ qua nếu không phải JSON, sai tên dịch vụ, cổng ngoài 1-65535,
      hoặc mã kết nối không đúng 4 chữ số. Địa chỉ hub lấy từ IP của máy gửi (không tin địa
      chỉ ghi trong gói tin). Các chữ được cắt còn tối đa MAX_TEXT ký tự.
    Đầu ra: True nếu đã lưu, False nếu gói tin bị bỏ qua.
    Dùng ở đâu: listen_loop(); tests/test_hub_discovery.py.
    Liên kết với: build_announcement() (phía gửi), discovered_hubs() (đọc danh sách này).
    """
    try:
        message = json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        return False
    if not isinstance(message, dict) or message.get("service") != SERVICE:
        return False
    port, code = message.get("port"), message.get("code")
    if not isinstance(port, int) or not 0 < port < 65536:
        return False
    if not (isinstance(code, str) and len(code) == 4 and code.isdigit()):
        return False
    hub = {
        "hubUrl": f"http://{sender_ip}:{port}",
        "code": code,
        "room": str(message.get("room", ""))[:MAX_TEXT],
        "host": str(message.get("host", ""))[:MAX_TEXT],
        "version": str(message.get("version", ""))[:MAX_TEXT],
        "lastSeen": time.time() if now is None else now,
    }
    with _lock:
        _found[(sender_ip, port)] = hub
    return True


def discovered_hubs(code="", now=None):
    """
    Đây là gì: hàm liệt kê các máy giám thị vừa nghe thấy gần đây.
    Mục tiêu: cho thí sinh chọn đúng phòng thi của mình.
    Chức năng: xóa các hub im lặng quá HUB_EXPIRES_AFTER giây; nếu có code thì chỉ giữ hub có
      đúng mã đó; sắp xếp theo phòng, tên máy, địa chỉ. Mã kết nối chỉ dùng để so khớp, không
      bao giờ được đưa vào danh sách trả về.
    Đầu ra: danh sách các mục {hubUrl, room, host, version}.
    Dùng ở đâu: http_handler.py (GET /api/discover); tests/test_hub_discovery.py.
    Liên kết với: record_announcement() (nơi thêm hub), web/src/services/hub/hub-discovery.ts
      (fetchDiscoveredHubs đọc danh sách này).
    """
    now = time.time() if now is None else now
    with _lock:
        for key in [key for key, hub in _found.items() if now - hub["lastSeen"] > HUB_EXPIRES_AFTER]:
            del _found[key]
        hubs = [hub for hub in _found.values() if not code or hub["code"] == code]
    hubs.sort(key=lambda hub: (hub["room"], hub["host"], hub["hubUrl"]))
    return [{"hubUrl": hub["hubUrl"], "room": hub["room"], "host": hub["host"], "version": hub["version"]} for hub in hubs]


def broadcast_targets():
    """
    Đây là gì: hàm chọn các địa chỉ để hô tới.
    Mục tiêu: lời hô đến được mọi máy trong mạng, kể cả mạng chặn kiểu hô chung.
    Chức năng: luôn có "255.255.255.255" (hô cho mọi máy); thêm địa chỉ hô riêng của mạng con
      hiện tại, ví dụ IP 192.168.1.10 thì thêm 192.168.1.255 (bỏ qua nếu IP là 127.x).
    Đầu ra: danh sách địa chỉ IP dạng chuỗi.
    Dùng ở đâu: announce_loop().
    Liên kết với: network.py (get_lan_ip).
    """
    targets = ["255.255.255.255"]
    parts = get_lan_ip().split(".")
    if len(parts) == 4 and parts[0] != "127":
        targets.append(".".join(parts[:3] + ["255"]))
    return targets


def open_listener(port=DISCOVERY_PORT, host=""):
    """
    Đây là gì: hàm mở "tai nghe" UDP để nghe lời hô trên LAN.
    Mục tiêu: nhận được lời hô của các máy giám thị khác.
    Chức năng: tạo ổ cắm UDP, cho phép nhiều chương trình cùng dùng chung cổng (nếu hệ điều
      hành hỗ trợ), gắn vào cổng port, và chỉ chờ mỗi lần tối đa 1 giây để vòng nghe còn
      kiểm tra được lệnh dừng.
    Đầu ra: ổ cắm (socket) đã sẵn sàng nghe; báo lỗi OSError nếu không mở được.
    Dùng ở đâu: start(); tests/test_hub_discovery.py.
    Liên kết với: listen_loop() (dùng ổ cắm này), config.py (DISCOVERY_PORT).
    """
    listener = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    if hasattr(socket, "SO_REUSEPORT"):
        try:
            listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
        except OSError:
            pass
    listener.bind((host, port))
    listener.settimeout(1.0)
    return listener


def listen_loop(listener, stop):
    """
    Đây là gì: vòng lặp nghe lời hô, chạy mãi ở một luồng phụ.
    Mục tiêu: liên tục cập nhật danh sách máy giám thị trên LAN.
    Chức năng: nhận từng gói tin rồi đưa cho record_announcement; hết 1 giây không có gì thì
      nghe tiếp; gặp lỗi mạng thì nghỉ 1 giây rồi thử lại. Dừng khi cờ stop được bật.
    Đầu ra: không trả về gì.
    Dùng ở đâu: start() (chạy trong luồng "examguard-discovery-listen");
      tests/test_hub_discovery.py.
    Liên kết với: open_listener(), record_announcement().
    """
    while not stop.is_set():
        try:
            data, (sender_ip, _) = listener.recvfrom(MAX_PACKET)
        except socket.timeout:
            continue
        except OSError:
            if stop.wait(1.0):
                break
            continue
        record_announcement(data, sender_ip)


def announce_loop(http_port, stop):
    """
    Đây là gì: vòng lặp hô trên LAN, chạy mãi ở một luồng phụ.
    Mục tiêu: máy thí sinh tìm thấy máy giám thị chỉ bằng mã kết nối.
    Chức năng: cứ ANNOUNCE_INTERVAL giây kiểm tra một lần; chỉ khi bảng giám thị đang mở
      (proctor_active) mới soạn lời hô kèm tên phòng và gửi tới mọi địa chỉ trong
      broadcast_targets ở cổng DISCOVERY_PORT; lỗi gửi thì bỏ qua. Dừng khi cờ stop được bật.
    Đầu ra: không trả về gì.
    Dùng ở đâu: start() (chạy trong luồng "examguard-discovery-announce").
    Liên kết với: proctor_active(), build_announcement(), broadcast_targets().
    """
    host = socket.gethostname()
    sender = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sender.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    while True:
        if proctor_active():
            with _lock:
                room = _proctor_room
            packet = build_announcement(http_port, room, host)
            for target in broadcast_targets():
                try:
                    sender.sendto(packet, (target, DISCOVERY_PORT))
                except OSError:
                    pass
        if stop.wait(ANNOUNCE_INTERVAL):
            break
    sender.close()


def start(http_port):
    """
    Đây là gì: hàm bật bộ tìm máy trên LAN.
    Mục tiêu: cho hub vừa nghe được, vừa hô được trên mạng.
    Chức năng: chỉ bật một lần (gọi lại thì bỏ qua); mở tai nghe UDP, nếu được thì chạy
      listen_loop ở luồng phụ; luôn chạy announce_loop ở luồng phụ khác. Nếu không dùng được
      UDP thì hub vẫn chạy bình thường, khi đó thí sinh gõ địa chỉ bằng tay.
    Đầu ra: luôn trả về True.
    Dùng ở đâu: app.py (main) và desktop-hub/run_hub.py (main).
    Liên kết với: open_listener(), listen_loop(), announce_loop(), is_running().
    """
    global _running
    with _lock:
        if _running:
            return True
        _running = True
    stop = threading.Event()
    try:
        listener = open_listener()
    except OSError:
        listener = None
    if listener is not None:
        threading.Thread(target=listen_loop, args=(listener, stop), daemon=True, name="examguard-discovery-listen").start()
    threading.Thread(target=announce_loop, args=(http_port, stop), daemon=True, name="examguard-discovery-announce").start()
    return True
