"""
Công cụ nhỏ về mạng cho máy chủ trung tâm (hub): tìm địa chỉ IP của máy này trong mạng LAN.
"""
import socket


def get_lan_ip():
    """
    Đây là gì: hàm tìm địa chỉ IP nội bộ (LAN) của máy đang chạy hub, ví dụ "192.168.1.10".
    Mục tiêu: cho máy thí sinh biết phải gửi cảnh báo về địa chỉ nào.
    Chức năng: giả vờ "gọi" ra ngoài (8.8.8.8) bằng UDP để máy tự chọn card mạng đang dùng,
      rồi đọc địa chỉ của card đó (không thật sự gửi dữ liệu). Nếu lỗi thì hỏi theo tên máy;
      vẫn lỗi thì dùng "127.0.0.1" (chính máy này).
    Đầu ra: chuỗi địa chỉ IP.
    Dùng ở đâu: http_handler.py (trả hubUrl trong GET /api/runtime), discovery.py
      (broadcast_targets), desktop-hub/run_hub.py (in địa chỉ LAN ra màn hình).
    Liên kết với: thư viện socket có sẵn của Python.
    """
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
