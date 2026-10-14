"""
Kiểm thử "khóa chặt" cách các API của hub trả lời, đúng như trang web đang dựa vào.

Mô tả các API nằm ở docs/ky-thuat/api-lan.md. Sửa hub mà làm lệch cách trả lời thì các ca ở
đây báo lỗi.
"""
import http.client
import json
import sys
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from examguard_desktop.http_handler import ExamGuardHTTPRequestHandler  # noqa: E402

# Bộ thông tin nhận dạng giả (phòng, máy, mã và tên thí sinh) dùng chung cho các ca kiểm thử.
IDENTITY = {'roomId': 'API-ROOM', 'stationId': 'API-PC', 'candidateId': 'API-ID', 'candidateName': 'API Student'}


class HubApiTests(unittest.TestCase):
    """
    Đây là gì: nhóm ca kiểm thử từng API của hub.
    Mục tiêu: chắc chắn hub trả đúng mã trạng thái, đúng dữ liệu, đúng thông báo lỗi tiếng Việt.
    Chức năng: bật một hub riêng ở cổng ngẫu nhiên rồi gửi yêu cầu đúng, sai, thiếu, quá lớn.
    Đầu ra: báo đạt hoặc lỗi cho từng ca.
    Dùng ở đâu: chạy bằng `python3 -m unittest discover -s tests` trong desktop-hub/.
    Liên kết với: examguard_desktop/http_handler.py, examguard_desktop/exam_store.py,
      shared/hub-contract.json.
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

    def call(self, path, payload=None, method='GET', raw=None):
        """
        Đây là gì: hàm phụ gửi một yêu cầu tới hub thử nghiệm và đọc câu trả lời.
        Mục tiêu: kiểm tra được cả câu trả lời thành công lẫn câu trả lời lỗi (400, 404...).
        Chức năng: phần thân là raw (byte gửi nguyên văn) nếu có, nếu không thì đổi payload
          thành JSON; gửi đi, chờ tối đa 5 giây; nếu hub trả lỗi thì vẫn đọc nội dung lỗi.
        Đầu ra: bộ ba (mã trạng thái, dữ liệu JSON hoặc None, các tiêu đề).
        Dùng ở đâu: snapshot() và các ca test_xxx trong HubApiTests.
        Liên kết với: setUpClass (cls.origin).
        """
        body = raw if raw is not None else (json.dumps(payload).encode() if payload is not None else None)
        request = urllib.request.Request(self.origin + path, data=body, method=method,
                                         headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                text = response.read().decode('utf-8')
                return response.status, (json.loads(text) if text else None), response.headers
        except urllib.error.HTTPError as error:
            text = error.read().decode('utf-8')
            return error.code, (json.loads(text) if text else None), error.headers

    def snapshot(self):
        """
        Đây là gì: hàm phụ lấy toàn bộ dữ liệu hiện có của hub thử nghiệm.
        Mục tiêu: kiểm tra xem dữ liệu đã được lưu đúng chưa.
        Chức năng: gọi GET /api/snapshot và chỉ lấy phần dữ liệu.
        Đầu ra: từ điển {"events": [...], "stations": [...]}.
        Dùng ở đâu: các ca test_xxx trong HubApiTests.
        Liên kết với: call(), exam_store.snapshot (phía hub).
        """
        return self.call('/api/snapshot')[1]

    def test_health(self):
        """Kiểm tra /api/health trả 200 và báo hub đang chạy."""
        self.assertEqual(self.call('/api/health')[:2], (200, {'ok': True, 'service': 'AI ExamGuard LAN Hub'}))

    def test_runtime_reports_port_and_hub_url(self):
        """Kiểm tra /api/runtime trả đúng cổng và địa chỉ hub dạng http://...:<cổng>."""
        status, body, _ = self.call('/api/runtime')
        self.assertEqual(status, 200)
        self.assertEqual(body['port'], self.server.server_port)
        self.assertTrue(body['hubUrl'].startswith('http://') and body['hubUrl'].endswith(f':{self.server.server_port}'))

    def test_cors_and_no_cache_headers(self):
        """Kiểm tra OPTIONS trả 204 kèm tiêu đề cho phép gọi từ trang khác và cấm lưu bản cũ."""
        status, _, headers = self.call('/api/health', method='OPTIONS')
        self.assertEqual(status, 204)
        self.assertEqual(headers['Access-Control-Allow-Origin'], '*')
        self.assertEqual(headers['Access-Control-Allow-Methods'], 'GET, POST, PATCH, OPTIONS')
        self.assertEqual(headers['Access-Control-Allow-Headers'], 'Content-Type')
        self.assertEqual(headers['Cache-Control'], 'no-cache, no-store, must-revalidate')

    def test_rejects_invalid_json_and_missing_identity(self):
        """Kiểm tra từ chối (400) dữ liệu không phải JSON, thiếu thông tin thí sinh hoặc mã sự kiện."""
        self.assertEqual(self.call('/api/events', raw=b'not json', method='POST')[:2],
                         (400, {'ok': False, 'error': 'Dữ liệu không hợp lệ'}))
        self.assertEqual(self.call('/api/events', [1, 2], method='POST')[0], 400)
        missing = dict(IDENTITY, candidateName='  ', id='x')
        self.assertEqual(self.call('/api/events', missing, method='POST')[:2],
                         (400, {'ok': False, 'error': 'Thiếu thông tin thí sinh hoặc máy thi'}))
        self.assertEqual(self.call('/api/events', IDENTITY, method='POST')[:2],
                         (400, {'ok': False, 'error': 'Thiếu mã sự kiện'}))

    def test_unknown_routes(self):
        """Kiểm tra API không tồn tại hoặc cảnh báo không tồn tại thì trả 404."""
        self.assertEqual(self.call('/api/nope', IDENTITY, method='POST')[:2],
                         (404, {'ok': False, 'error': 'Không tìm thấy API'}))
        self.assertEqual(self.call('/api/stations/x', {}, method='PATCH')[:2],
                         (404, {'ok': False, 'error': 'Không tìm thấy API'}))
        self.assertEqual(self.call('/api/events/does-not-exist', {'reviewed': True}, method='PATCH')[:2],
                         (404, {'ok': False}))

    def test_station_heartbeat_replaces_previous_and_is_stamped(self):
        """Kiểm tra nhịp tim mới của một máy thi thay bản cũ và được ghi giờ máy chủ nhận."""
        self.call('/api/stations', dict(IDENTITY, state='normal'), method='POST')
        status, body, _ = self.call('/api/stations', dict(IDENTITY, state='warning'), method='POST')
        self.assertEqual((status, body), (200, {'ok': True}))
        mine = [s for s in self.snapshot()['stations'] if s['stationId'] == 'API-PC']
        self.assertEqual(len(mine), 1)
        self.assertEqual(mine[0]['state'], 'warning')
        self.assertIsInstance(mine[0]['serverSeenAt'], int)

    def test_patch_without_body_marks_reviewed(self):
        """Kiểm tra PATCH không kèm dữ liệu thì đánh dấu "đã xem", gửi reviewed=False thì bỏ dấu."""
        self.call('/api/events', dict(IDENTITY, id='api-patch', timestamp=5, reviewed=False), method='POST')
        self.assertEqual(self.call('/api/events/api-patch', method='PATCH')[:2], (200, {'ok': True}))
        event = next(e for e in self.snapshot()['events'] if e['id'] == 'api-patch')
        self.assertTrue(event['reviewed'])
        self.call('/api/events/api-patch', {'reviewed': False}, method='PATCH')
        event = next(e for e in self.snapshot()['events'] if e['id'] == 'api-patch')
        self.assertFalse(event['reviewed'])

    def test_keeps_only_newest_500_events_sorted_by_timestamp(self):
        """Kiểm tra hub chỉ giữ 500 cảnh báo mới nhất, xếp theo thời gian mới trước."""
        for index in range(505):
            self.call('/api/events', dict(IDENTITY, id=f'api-limit-{index}', timestamp=10_000 + index), method='POST')
        events = self.snapshot()['events']
        ids = {e['id'] for e in events}
        self.assertEqual(len(events), 500)
        self.assertIn('api-limit-504', ids)
        self.assertNotIn('api-limit-4', ids)
        timestamps = [e.get('timestamp', 0) for e in events]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))

    def test_body_over_1mb_is_rejected_without_reading_it(self):
        """Kiểm tra dữ liệu khai báo lớn hơn 1 MB bị từ chối (400) mà hub không cần đọc nó."""
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        connection.putrequest('POST', '/api/events')
        connection.putheader('Content-Type', 'application/json')
        connection.putheader('Content-Length', '1000001')
        connection.endheaders()
        response = connection.getresponse()
        self.assertEqual(response.status, 400)
        connection.close()


if __name__ == '__main__':
    unittest.main()
