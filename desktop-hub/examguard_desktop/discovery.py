"""LAN discovery: candidate machines find the proctor machine by a 4-digit connect
code instead of typing its IP address.

Every running hub listens for UDP broadcasts on DISCOVERY_PORT. A hub announces
itself only while a proctor dashboard is reading from it (see mark_proctor_active),
so candidate machines — which run the same app — never announce. Announcements
are plain text on the LAN: the code tells rooms apart, it is not a password.
"""
import json
import secrets
import socket
import threading
import time

from .config import APP_VERSION, DISCOVERY_PORT
from .network import get_lan_ip

SERVICE = "examguard-hub"
ANNOUNCE_INTERVAL = 2.0
PROCTOR_ACTIVE_FOR = 10.0
HUB_EXPIRES_AFTER = 8.0
MAX_PACKET = 2048
MAX_TEXT = 80

CONNECT_CODE = f"{secrets.randbelow(10000):04d}"

_lock = threading.Lock()
_proctor_seen_at = 0.0
_proctor_room = ""
_found = {}
_running = False


def is_running():
    return _running


def mark_proctor_active(room="", now=None):
    global _proctor_seen_at, _proctor_room
    with _lock:
        _proctor_seen_at = time.time() if now is None else now
        _proctor_room = str(room or "")[:MAX_TEXT]


def proctor_active(now=None):
    now = time.time() if now is None else now
    with _lock:
        return now - _proctor_seen_at <= PROCTOR_ACTIVE_FOR


def build_announcement(http_port, room, host):
    return json.dumps({
        "service": SERVICE,
        "version": APP_VERSION,
        "code": CONNECT_CODE,
        "room": room,
        "host": host,
        "port": http_port,
    }, ensure_ascii=False).encode("utf-8")


def record_announcement(data, sender_ip, now=None):
    """Stores a proctor announcement; the hub address comes from the sender's IP."""
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
    """Proctor hubs heard recently. Codes are only used for matching, never listed."""
    now = time.time() if now is None else now
    with _lock:
        for key in [key for key, hub in _found.items() if now - hub["lastSeen"] > HUB_EXPIRES_AFTER]:
            del _found[key]
        hubs = [hub for hub in _found.values() if not code or hub["code"] == code]
    hubs.sort(key=lambda hub: (hub["room"], hub["host"], hub["hubUrl"]))
    return [{"hubUrl": hub["hubUrl"], "room": hub["room"], "host": hub["host"], "version": hub["version"]} for hub in hubs]


def broadcast_targets():
    targets = ["255.255.255.255"]
    parts = get_lan_ip().split(".")
    if len(parts) == 4 and parts[0] != "127":
        targets.append(".".join(parts[:3] + ["255"]))
    return targets


def open_listener(port=DISCOVERY_PORT, host=""):
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
    """Starts listening and announcing (once). Without UDP the hub still works;
    candidates then type the address by hand."""
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
