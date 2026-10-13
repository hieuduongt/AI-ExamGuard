"""Pins the LAN hub API contract used by the web app (see docs/ky-thuat/api-lan.md)."""
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

IDENTITY = {'roomId': 'API-ROOM', 'stationId': 'API-PC', 'candidateId': 'API-ID', 'candidateName': 'API Student'}


class HubApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), ExamGuardHTTPRequestHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def call(self, path, payload=None, method='GET', raw=None):
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
        return self.call('/api/snapshot')[1]

    def test_health(self):
        self.assertEqual(self.call('/api/health')[:2], (200, {'ok': True, 'service': 'AI ExamGuard LAN Hub'}))

    def test_runtime_reports_port_and_hub_url(self):
        status, body, _ = self.call('/api/runtime')
        self.assertEqual(status, 200)
        self.assertEqual(body['port'], self.server.server_port)
        self.assertTrue(body['hubUrl'].startswith('http://') and body['hubUrl'].endswith(f':{self.server.server_port}'))

    def test_cors_and_no_cache_headers(self):
        status, _, headers = self.call('/api/health', method='OPTIONS')
        self.assertEqual(status, 204)
        self.assertEqual(headers['Access-Control-Allow-Origin'], '*')
        self.assertEqual(headers['Access-Control-Allow-Methods'], 'GET, POST, PATCH, OPTIONS')
        self.assertEqual(headers['Access-Control-Allow-Headers'], 'Content-Type')
        self.assertEqual(headers['Cache-Control'], 'no-cache, no-store, must-revalidate')

    def test_rejects_invalid_json_and_missing_identity(self):
        self.assertEqual(self.call('/api/events', raw=b'not json', method='POST')[:2],
                         (400, {'ok': False, 'error': 'Dữ liệu không hợp lệ'}))
        self.assertEqual(self.call('/api/events', [1, 2], method='POST')[0], 400)
        missing = dict(IDENTITY, candidateName='  ', id='x')
        self.assertEqual(self.call('/api/events', missing, method='POST')[:2],
                         (400, {'ok': False, 'error': 'Thiếu thông tin thí sinh hoặc máy thi'}))
        self.assertEqual(self.call('/api/events', IDENTITY, method='POST')[:2],
                         (400, {'ok': False, 'error': 'Thiếu mã sự kiện'}))

    def test_unknown_routes(self):
        self.assertEqual(self.call('/api/nope', IDENTITY, method='POST')[:2],
                         (404, {'ok': False, 'error': 'Không tìm thấy API'}))
        self.assertEqual(self.call('/api/stations/x', {}, method='PATCH')[:2],
                         (404, {'ok': False, 'error': 'Không tìm thấy API'}))
        self.assertEqual(self.call('/api/events/does-not-exist', {'reviewed': True}, method='PATCH')[:2],
                         (404, {'ok': False}))

    def test_station_heartbeat_replaces_previous_and_is_stamped(self):
        self.call('/api/stations', dict(IDENTITY, state='normal'), method='POST')
        status, body, _ = self.call('/api/stations', dict(IDENTITY, state='warning'), method='POST')
        self.assertEqual((status, body), (200, {'ok': True}))
        mine = [s for s in self.snapshot()['stations'] if s['stationId'] == 'API-PC']
        self.assertEqual(len(mine), 1)
        self.assertEqual(mine[0]['state'], 'warning')
        self.assertIsInstance(mine[0]['serverSeenAt'], int)

    def test_patch_without_body_marks_reviewed(self):
        self.call('/api/events', dict(IDENTITY, id='api-patch', timestamp=5, reviewed=False), method='POST')
        self.assertEqual(self.call('/api/events/api-patch', method='PATCH')[:2], (200, {'ok': True}))
        event = next(e for e in self.snapshot()['events'] if e['id'] == 'api-patch')
        self.assertTrue(event['reviewed'])
        self.call('/api/events/api-patch', {'reviewed': False}, method='PATCH')
        event = next(e for e in self.snapshot()['events'] if e['id'] == 'api-patch')
        self.assertFalse(event['reviewed'])

    def test_keeps_only_newest_500_events_sorted_by_timestamp(self):
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
