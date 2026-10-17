"""
Kho dữ liệu kỳ thi nằm trong bộ nhớ của máy chủ trung tâm (hub), dùng chung cho mọi yêu cầu.

Gồm danh sách cảnh báo và trạng thái từng máy thi. Dữ liệu mất khi đóng ứng dụng (không ghi
ra đĩa).
"""
import threading
import time

from .config import EVENT_LIMIT

# Khóa dùng chung: nhiều máy gửi cùng lúc thì lần lượt từng yêu cầu được sửa dữ liệu.
data_lock = threading.Lock()
# Danh sách cảnh báo, cái mới nhất ở đầu.
exam_events = []
# Trạng thái từng máy thi, khóa là "<mã phòng>::<mã máy>".
exam_stations = {}
# Cài đặt phòng thi do trang Quản trị đẩy lên (máy thí sinh đọc lại khi bắt đầu phiên).
room_settings = {
    "storeSnapshots": False,
    "requireConsent": True,
}


def add_event(payload):
    """
    Đây là gì: hàm cất một cảnh báo mới vào bộ nhớ của máy giám thị.
    Mục tiêu: lưu lại mọi cảnh báo thí sinh gửi lên để giám thị xem.
    Chức năng: đặt cảnh báo mới nhất lên đầu danh sách; nếu cảnh báo cùng mã (id) đã có
      thì bỏ qua, để việc gửi lại không xóa mất dấu "đã xem" của giám thị; chỉ giữ tối đa
      EVENT_LIMIT cảnh báo.
    Đầu ra: không trả về gì; danh sách exam_events được cập nhật.
    Dùng ở đâu: http_handler.py, khi máy thí sinh gửi POST /api/events.
    Liên kết với: snapshot() (đọc lại danh sách này), config.py (EVENT_LIMIT).
    """
    with data_lock:
        if not any(item.get("id") == payload["id"] for item in exam_events):
            exam_events.insert(0, payload)
            del exam_events[EVENT_LIMIT:]


def save_station(payload):
    """
    Đây là gì: hàm lưu "nhịp tim" (tin báo định kỳ "tôi vẫn đang chạy") của một máy thi.
    Mục tiêu: giám thị biết máy nào đang hoạt động và đang ở trạng thái gì.
    Chức năng: ghi thêm giờ máy chủ nhận được (serverSeenAt, tính bằng mili giây); mỗi cặp
      phòng + máy chỉ giữ một bản ghi, bản mới nhất thay bản cũ.
    Đầu ra: không trả về gì; exam_stations được cập nhật.
    Dùng ở đâu: http_handler.py, khi máy thí sinh gửi POST /api/stations.
    Liên kết với: snapshot() (đọc lại), web/src/services/exam-sync.ts (phía web gửi nhịp tim).
    """
    payload["serverSeenAt"] = int(time.time() * 1000)
    key = f"{payload['roomId']}::{payload['stationId']}"
    with data_lock:
        exam_stations[key] = payload


def snapshot():
    """
    Đây là gì: hàm chụp "ảnh nhanh" toàn bộ dữ liệu hiện có.
    Mục tiêu: cho bảng giám thị lấy đủ cảnh báo và trạng thái máy trong một lần hỏi.
    Chức năng: sắp xếp cảnh báo theo thời gian, mới nhất trước; sắp xếp máy thi theo mã phòng
      rồi mã máy.
    Đầu ra: từ điển {"events": [...], "stations": [...]}.
    Dùng ở đâu: http_handler.py, khi có yêu cầu GET /api/snapshot.
    Liên kết với: web/src/services/hub/hub-client.ts (fetchHubSnapshot đọc kết quả này).
    """
    with data_lock:
        events = sorted(exam_events, key=lambda item: item.get("timestamp", 0), reverse=True)
        stations = sorted(
            exam_stations.values(),
            key=lambda item: (item.get("roomId", ""), item.get("stationId", "")),
        )
    return {"events": events, "stations": stations}


def get_settings():
    """
    Đây là gì: hàm đọc cài đặt phòng thi đang lưu trên hub.
    Mục tiêu: máy thí sinh biết có bật lưu đoạn hình ngắn hay không.
    """
    with data_lock:
        return dict(room_settings)


def save_settings(payload):
    """
    Đây là gì: hàm cập nhật cài đặt phòng thi trên hub.
    Mục tiêu: trang Quản trị bật/tắt lưu đoạn hình thì mọi máy thí sinh nối hub đều nhận được.
    """
    if not isinstance(payload, dict):
        return get_settings()
    with data_lock:
        if "storeSnapshots" in payload:
            room_settings["storeSnapshots"] = bool(payload.get("storeSnapshots"))
        if "requireConsent" in payload:
            room_settings["requireConsent"] = bool(payload.get("requireConsent"))
        return dict(room_settings)


# Các kết luận giám thị được phép ghi vào cảnh báo (khớp shared/hub-contract.json › verdicts).
VALID_VERDICTS = ("confirmed", "false_alarm")


def set_reviewed(event_id, reviewed, verdict=None):
    """
    Đây là gì: hàm đánh dấu một cảnh báo là "đã xem" hoặc "chưa xem", kèm kết luận.
    Mục tiêu: giám thị ghi lại cảnh báo nào mình đã kiểm tra và kết luận đúng hay báo nhầm.
    Chức năng: tìm cảnh báo có mã event_id rồi đặt trường reviewed; nếu verdict là
      "confirmed" hoặc "false_alarm" thì ghi thêm; nếu bỏ dấu đã xem thì xóa verdict cũ.
    Đầu ra: True nếu tìm thấy và đã sửa, False nếu không có cảnh báo đó.
    Dùng ở đâu: http_handler.py, khi có yêu cầu PATCH /api/events/<mã>.
    Liên kết với: web/src/services/exam-sync.ts (phía web gửi yêu cầu đánh dấu).
    """
    with data_lock:
        for event in exam_events:
            if event.get("id") == event_id:
                event["reviewed"] = reviewed
                if verdict in VALID_VERDICTS:
                    event["verdict"] = verdict
                elif not reviewed:
                    event.pop("verdict", None)
                return True
    return False
