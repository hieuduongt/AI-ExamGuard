"""
Kiểm thử chống lỗi tái phát cho hub và cửa sổ desktop.

Chạy trên một hub riêng tạo ra để thử; không dùng dữ liệu thí sinh thật, không mở cửa sổ thật
(cửa sổ được thay bằng đồ giả - Mock).
"""
import json
import sys
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from examguard_desktop import config, desktop_window
from examguard_desktop.http_handler import ExamGuardHTTPRequestHandler


class HubTests(unittest.TestCase):
    """
    Đây là gì: nhóm ca kiểm thử hub qua mạng thật trên chính máy này.
    Mục tiêu: chắc chắn trang web mở đúng và cảnh báo không bị nhân đôi hay mất dấu "đã xem".
    Chức năng: bật một hub riêng ở cổng ngẫu nhiên, gửi yêu cầu thật tới nó, rồi kiểm tra.
    Đầu ra: báo đạt hoặc lỗi cho từng ca.
    Dùng ở đâu: chạy bằng `python3 -m unittest discover -s tests` trong desktop-hub/.
    Liên kết với: examguard_desktop/http_handler.py, examguard_desktop/exam_store.py.
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

    def request(self, path, payload=None, method='GET'):
        """
        Đây là gì: hàm phụ gửi một yêu cầu tới hub thử nghiệm.
        Mục tiêu: viết các ca kiểm thử ngắn gọn hơn.
        Chức năng: nếu có payload thì đổi thành JSON làm phần thân; gửi với kiểu method, chờ
          tối đa 5 giây.
        Đầu ra: câu trả lời của hub (dùng được với `with`); lỗi HTTP sẽ báo thành ngoại lệ.
        Dùng ở đâu: các ca test_xxx trong HubTests.
        Liên kết với: setUpClass (cls.origin).
        """
        body = json.dumps(payload).encode() if payload is not None else None
        request = urllib.request.Request(self.origin + path, data=body, method=method,
                                         headers={'Content-Type': 'application/json'})
        return urllib.request.urlopen(request, timeout=5)

    def test_direct_routes_serve_html_not_next_payload_directories(self):
        """Kiểm tra /thi-sinh và /giam-thi trả trang HTML, không trả danh sách tệp thư mục."""
        for route, marker in [('/thi-sinh', 'candidate-name'), ('/giam-thi', 'Giám thị')]:
            for suffix in ['', '/', '?hub=http%3A%2F%2F127.0.0.1%3A8765']:
                with self.subTest(route=route + suffix), self.request(route + suffix) as response:
                    body = response.read().decode('utf-8')
                    self.assertIn('<!DOCTYPE html>', body)
                    self.assertIn(marker, body)
                    self.assertNotIn('Directory listing', body)

    def test_replayed_event_does_not_duplicate_or_undo_review(self):
        """Kiểm tra gửi lại cùng một cảnh báo không tạo bản trùng, không xóa dấu "đã xem"."""
        event = {'id': 'test-idempotence', 'roomId': 'QA-ROOM', 'stationId': 'QA-PC',
                 'candidateId': 'QA-ID', 'candidateName': 'QA Student',
                 'type': 'head_turn', 'timestamp': 1, 'reviewed': False}
        with self.request('/api/events', event, 'POST') as response:
            self.assertEqual(response.status, 201)
        with self.request('/api/events/test-idempotence', {'reviewed': True}, 'PATCH') as response:
            self.assertEqual(response.status, 200)
        with self.request('/api/events', event, 'POST') as response:
            self.assertEqual(response.status, 201)
        with self.request('/api/snapshot') as response:
            matches = [e for e in json.load(response)['events'] if e['id'] == event['id']]
        self.assertEqual(len(matches), 1)
        self.assertTrue(matches[0]['reviewed'])
        self.assertEqual(matches[0]['candidateId'], 'QA-ID')

    def test_runtime_identifies_build(self):
        """Kiểm tra /api/runtime trả đúng số phiên bản ứng dụng."""
        with self.request('/api/runtime') as response:
            self.assertEqual(json.load(response)['version'], config.APP_VERSION)


class DesktopWindowTests(unittest.TestCase):
    """
    Đây là gì: nhóm ca kiểm thử cửa sổ Giám thị của ứng dụng desktop.
    Mục tiêu: chắc chắn nút "Mở Giám thị" mở cửa sổ riêng, dùng lại được, và chặn địa chỉ lạ.
    Chức năng: thay thư viện cửa sổ webview bằng đồ giả (Mock) rồi gọi DesktopApi.open_proctor.
    Đầu ra: báo đạt hoặc lỗi.
    Dùng ở đâu: chạy bằng `python3 -m unittest discover -s tests` trong desktop-hub/.
    Liên kết với: examguard_desktop/desktop_window.py (DesktopApi).
    """

    def test_proctor_opens_separate_window_and_reuses_it(self):
        """Kiểm tra mở cửa sổ Giám thị riêng, lần sau dùng lại, và từ chối địa chỉ file://."""
        api = desktop_window.DesktopApi(12345)
        main_window, proctor_window = Mock(), Mock()
        windows = [main_window]
        with patch.object(desktop_window.webview, 'windows', windows), patch.object(desktop_window.webview, 'create_window', return_value=proctor_window) as create:
            self.assertTrue(api.open_proctor('http://192.168.1.10:8765'))
            self.assertEqual(create.call_args.kwargs['url'],
                             'http://127.0.0.1:12345/giam-thi?hub=http%3A%2F%2F192.168.1.10%3A8765')
            main_window.load_url.assert_not_called()
            windows.append(proctor_window)
            self.assertTrue(api.open_proctor('http://192.168.1.10:8765'))
            create.assert_called_once()
            proctor_window.restore.assert_called_once()
            self.assertFalse(api.open_proctor('file:///C:/'))


if __name__ == '__main__':
    unittest.main()
