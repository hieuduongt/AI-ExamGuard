"""
Kiểm thử bộ tìm máy giám thị trên mạng LAN bằng mã kết nối 4 số (examguard_desktop/discovery.py).

Gồm kiểm thử phần ghi nhớ lời hô, gói tin UDP thật trên chính máy này, và các API liên quan.
"""
import json
import socket
import sys
import threading
import time
import unittest
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from examguard_desktop import discovery  # noqa: E402
from examguard_desktop.http_handler import ExamGuardHTTPRequestHandler  # noqa: E402


def announcement(code='4827', port=8765, room='P01', host='PC-GV', service='examguard-hub'):
    """
    Đây là gì: hàm phụ tạo một lời hô giả của máy giám thị.
    Mục tiêu: dễ dàng tạo lời hô đúng hoặc cố tình sai để thử.
    Chức năng: gói các giá trị truyền vào thành JSON rồi đổi sang byte.
    Đầu ra: chuỗi byte giống gói tin UDP thật.
    Dùng ở đâu: DiscoveryRegistryTests và DiscoveryApiTests trong file này.
    Liên kết với: discovery.build_announcement (bản thật), discovery.record_announcement.
    """
    return json.dumps({'service': service, 'version': 'v', 'code': code, 'room': room, 'host': host, 'port': port}).encode()


class DiscoveryRegistryTests(unittest.TestCase):
    """
    Đây là gì: nhóm ca kiểm thử phần ghi nhớ và lọc các máy giám thị nghe được.
    Mục tiêu: chắc chắn mã kết nối đúng 4 số, lọc theo mã đúng, gói tin lạ bị bỏ qua.
    Chức năng: gọi trực tiếp các hàm của discovery.py, có truyền thời điểm giả (now) để thử
      hết hạn mà không phải chờ.
    Đầu ra: báo đạt hoặc lỗi cho từng ca.
    Dùng ở đâu: chạy bằng `python3 -m unittest discover -s tests` trong desktop-hub/.
    Liên kết với: examguard_desktop/discovery.py.
    """

    def setUp(self):
        """
        Đây là gì: hàm chuẩn bị, chạy trước mỗi ca kiểm thử.
        Mục tiêu: mỗi ca bắt đầu với danh sách trống, không bị ca trước ảnh hưởng.
        Chức năng: xóa sạch danh sách máy giám thị đã nghe (discovery._found).
        Đầu ra: không trả về gì.
        Dùng ở đâu: thư viện unittest tự gọi.
        Liên kết với: discovery._found.
        """
        discovery._found.clear()

    def test_connect_code_is_four_digits(self):
        """Kiểm tra mã kết nối luôn gồm đúng 4 chữ số."""
        self.assertRegex(discovery.CONNECT_CODE, r'^\d{4}$')

    def test_announcement_round_trip_uses_sender_ip(self):
        """Kiểm tra lời hô soạn ra đọc lại được, và địa chỉ hub lấy từ IP máy gửi."""
        packet = discovery.build_announcement(9000, 'Phòng 2', 'PC-GV')
        self.assertTrue(discovery.record_announcement(packet, '10.0.0.7', now=100))
        self.assertEqual(discovery.discovered_hubs(now=101), [
            {'hubUrl': 'http://10.0.0.7:9000', 'room': 'Phòng 2', 'host': 'PC-GV', 'version': discovery.APP_VERSION},
        ])

    def test_codes_filter_but_are_never_listed(self):
        """Kiểm tra mã kết nối dùng để lọc hub nhưng không bao giờ xuất hiện trong danh sách."""
        discovery.record_announcement(announcement(code='1111', room='P01'), '10.0.0.1', now=100)
        discovery.record_announcement(announcement(code='2222', room='P02'), '10.0.0.2', now=100)
        self.assertEqual([hub['room'] for hub in discovery.discovered_hubs(now=100)], ['P01', 'P02'])
        self.assertEqual([hub['hubUrl'] for hub in discovery.discovered_hubs('2222', now=100)], ['http://10.0.0.2:8765'])
        self.assertEqual(discovery.discovered_hubs('9999', now=100), [])
        self.assertTrue(all('code' not in hub for hub in discovery.discovered_hubs(now=100)))

    def test_silent_hubs_expire(self):
        """Kiểm tra hub im lặng quá thời hạn thì bị xóa khỏi danh sách."""
        discovery.record_announcement(announcement(), '10.0.0.1', now=100)
        self.assertEqual(len(discovery.discovered_hubs(now=100 + discovery.HUB_EXPIRES_AFTER)), 1)
        self.assertEqual(discovery.discovered_hubs(now=100.1 + discovery.HUB_EXPIRES_AFTER), [])

    def test_foreign_or_malformed_packets_are_ignored(self):
        """Kiểm tra gói tin lạ, sai định dạng, sai mã hoặc sai cổng đều bị bỏ qua."""
        for packet in (b'not json', b'\xff\xfe', b'[1]', announcement(service='other'),
                       announcement(code='12a4'), announcement(code='123'), announcement(port=0),
                       announcement(port=70000), json.dumps({'service': 'examguard-hub', 'code': '1234', 'port': '8765'}).encode()):
            self.assertFalse(discovery.record_announcement(packet, '10.0.0.9'))
        self.assertEqual(discovery.discovered_hubs(), [])

    def test_only_an_open_proctor_dashboard_makes_the_hub_announce(self):
        """Kiểm tra hub chỉ được coi là "đang có giám thị" trong thời hạn sau lần đọc gần nhất."""
        discovery.mark_proctor_active('P01', now=1000)
        self.assertTrue(discovery.proctor_active(now=1000 + discovery.PROCTOR_ACTIVE_FOR))
        self.assertFalse(discovery.proctor_active(now=1000.1 + discovery.PROCTOR_ACTIVE_FOR))

    def test_real_udp_packet_reaches_the_listener(self):
        """Kiểm tra một gói tin UDP thật gửi trên chính máy này được tai nghe nhận và ghi nhớ."""
        listener = discovery.open_listener(port=0, host='127.0.0.1')
        port = listener.getsockname()[1]
        stop = threading.Event()
        thread = threading.Thread(target=discovery.listen_loop, args=(listener, stop), daemon=True)
        thread.start()
        sender = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            deadline = time.time() + 5
            while time.time() < deadline and not discovery.discovered_hubs():
                sender.sendto(announcement(code='4321', port=8765), ('127.0.0.1', port))
                time.sleep(0.1)
            self.assertEqual([hub['hubUrl'] for hub in discovery.discovered_hubs('4321')], ['http://127.0.0.1:8765'])
        finally:
            stop.set()
            thread.join(timeout=3)
            sender.close()
            listener.close()


class DiscoveryApiTests(unittest.TestCase):
    """
    Đây là gì: nhóm ca kiểm thử các API của hub liên quan tới tìm máy.
    Mục tiêu: chắc chắn /api/runtime, /api/snapshot?proctor=1 và /api/discover chạy đúng.
    Chức năng: bật một hub riêng ở cổng ngẫu nhiên rồi gọi các API đó.
    Đầu ra: báo đạt hoặc lỗi cho từng ca.
    Dùng ở đâu: chạy bằng `python3 -m unittest discover -s tests` trong desktop-hub/.
    Liên kết với: examguard_desktop/http_handler.py, examguard_desktop/discovery.py.
    """

    @classmethod
    def setUpClass(cls):
        """
        Đây là gì: hàm chuẩn bị, chạy một lần trước mọi ca kiểm thử trong nhóm.
        Mục tiêu: có một hub thật để gửi yêu cầu tới.
        Chức năng: tạo máy chủ ở 127.0.0.1 cổng ngẫu nhiên, chạy ở luồng phụ, ghi lại địa chỉ.
        Đầu ra: không trả về gì; cls.server, cls.thread, cls.origin được tạo.
        Dùng ở đâu: thư viện unittest tự gọi.
        Liên kết với: tearDownClass (dọn dẹp), ExamGuardHTTPRequestHandler.
        """
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), ExamGuardHTTPRequestHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        """
        Đây là gì: hàm dọn dẹp, chạy một lần sau mọi ca kiểm thử trong nhóm.
        Mục tiêu: tắt hub thử nghiệm, trả lại cổng mạng.
        Chức năng: dừng máy chủ, đóng nó và chờ luồng phụ kết thúc.
        Đầu ra: không trả về gì.
        Dùng ở đâu: thư viện unittest tự gọi.
        Liên kết với: setUpClass.
        """
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def get(self, path):
        """
        Đây là gì: hàm phụ gửi yêu cầu GET tới hub thử nghiệm.
        Mục tiêu: viết các ca kiểm thử ngắn gọn hơn.
        Chức năng: mở địa chỉ hub + path, chờ tối đa 5 giây, đọc kết quả JSON.
        Đầu ra: dữ liệu JSON hub trả về.
        Dùng ở đâu: các ca test_xxx trong DiscoveryApiTests.
        Liên kết với: setUpClass (cls.origin).
        """
        with urllib.request.urlopen(self.origin + path, timeout=5) as response:
            return json.loads(response.read().decode('utf-8'))

    def setUp(self):
        """
        Đây là gì: hàm chuẩn bị, chạy trước mỗi ca kiểm thử.
        Mục tiêu: mỗi ca bắt đầu sạch: chưa nghe thấy hub nào, bảng giám thị coi như đã đóng.
        Chức năng: xóa danh sách hub đã nghe; đặt lần đọc gần nhất của giám thị về thời điểm 0
          (rất lâu rồi) và tên phòng rỗng.
        Đầu ra: không trả về gì.
        Dùng ở đâu: thư viện unittest tự gọi.
        Liên kết với: discovery._found, discovery.mark_proctor_active.
        """
        discovery._found.clear()
        discovery.mark_proctor_active('', now=0)

    def test_runtime_reports_connect_code(self):
        """Kiểm tra /api/runtime trả mã kết nối và cho biết bộ tìm máy có đang chạy."""
        body = self.get('/api/runtime')
        self.assertEqual(body['connectCode'], discovery.CONNECT_CODE)
        self.assertIs(body['discovery'], discovery.is_running())

    def test_proctor_snapshot_marks_dashboard_open_with_room(self):
        """Kiểm tra chỉ /api/snapshot?proctor=1 mới ghi nhận bảng giám thị đang mở, kèm tên phòng."""
        self.assertFalse(discovery.proctor_active())
        self.get('/api/snapshot')
        self.assertFalse(discovery.proctor_active())
        body = self.get('/api/snapshot?proctor=1&room=Ph%C3%B2ng%2001')
        self.assertEqual(set(body), {'events', 'stations'})
        self.assertTrue(discovery.proctor_active())
        self.assertEqual(discovery._proctor_room, 'Phòng 01')

    def test_discover_lists_hubs_and_filters_by_code(self):
        """Kiểm tra /api/discover liệt kê các hub nghe được và lọc đúng theo ?code=."""
        discovery.record_announcement(announcement(code='1111', room='P01'), '10.0.0.1')
        discovery.record_announcement(announcement(code='2222', room='P02'), '10.0.0.2')
        body = self.get('/api/discover')
        self.assertTrue(body['ok'])
        self.assertEqual([hub['room'] for hub in body['hubs']], ['P01', 'P02'])
        self.assertEqual([hub['room'] for hub in self.get('/api/discover?code=2222')['hubs']], ['P02'])
        self.assertEqual(self.get('/api/discover?code=0000')['hubs'], [])


if __name__ == '__main__':
    unittest.main()
