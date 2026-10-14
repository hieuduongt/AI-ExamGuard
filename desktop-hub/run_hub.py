"""
Chỉ bật máy chủ trung tâm LAN (hub), không mở cửa sổ ứng dụng: chạy `python run_hub.py`.

Dùng trên macOS/Linux hoặc để chạy thử. Phục vụ thư mục ../web/out (phải chạy `npm run build`
trong web/ trước) và các API /api/... ở cổng 8765 (hoặc cổng ghi trong EXAMGUARD_PORT), trên mọi
card mạng. Chỉ cần thư viện có sẵn của Python, không phải cài thêm gì.
"""
from examguard_desktop import discovery
from examguard_desktop.network import get_lan_ip
from examguard_desktop.server import create_server


def main():
    """
    Đây là gì: hàm chính, chạy hub ở cửa sổ dòng lệnh (terminal) không có giao diện riêng.
    Mục tiêu: thử hệ thống trên máy không phải Windows, hoặc khi không cần cửa sổ ứng dụng.
    Chức năng: tạo máy chủ, bật bộ tìm máy trên LAN, in ra địa chỉ máy này, địa chỉ LAN và mã
      kết nối 4 số, rồi phục vụ mãi đến khi bấm Ctrl+C. Dữ liệu chỉ nằm trong bộ nhớ.
    Đầu ra: không trả về gì.
    Dùng ở đâu: chạy trực tiếp `python run_hub.py` (hướng dẫn trong desktop-hub/README.md,
      docs/van-hanh/chay-va-build.md, web/README.md).
    Liên kết với: examguard_desktop/server.py (create_server), examguard_desktop/discovery.py
      (start, CONNECT_CODE), examguard_desktop/network.py (get_lan_ip).
    """
    server = create_server()
    port = server.server_address[1]
    discovery.start(port)
    print("AI ExamGuard LAN hub")
    print(f"  This machine: http://localhost:{port}")
    print(f"  Other machines on the LAN: http://{get_lan_ip()}:{port}")
    print(f"  Connect code (shown on the proctor dashboard): {discovery.CONNECT_CODE}")
    print("Press Ctrl+C to stop. Data is kept in memory only.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
