"""Regression tests against an isolated hub; no real student data or windows."""
import json
import sys
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app_desktop as app


class HubTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), app.ExamGuardHTTPRequestHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, path, payload=None, method='GET'):
        body = json.dumps(payload).encode() if payload is not None else None
        request = urllib.request.Request(self.origin + path, data=body, method=method,
                                         headers={'Content-Type': 'application/json'})
        return urllib.request.urlopen(request, timeout=5)

    def test_direct_routes_serve_html_not_next_payload_directories(self):
        for route, marker in [('/thi-sinh', 'candidate-name'), ('/giam-thi', 'Giám thị')]:
            for suffix in ['', '/', '?hub=http%3A%2F%2F127.0.0.1%3A8765']:
                with self.subTest(route=route + suffix), self.request(route + suffix) as response:
                    body = response.read().decode('utf-8')
                    self.assertIn('<!DOCTYPE html>', body)
                    self.assertIn(marker, body)
                    self.assertNotIn('Directory listing', body)

    def test_replayed_event_does_not_duplicate_or_undo_review(self):
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
        with self.request('/api/runtime') as response:
            self.assertEqual(json.load(response)['version'], app.APP_VERSION)


class DesktopWindowTests(unittest.TestCase):
    def test_proctor_opens_separate_window_and_reuses_it(self):
        api = app.DesktopApi(12345)
        main_window, proctor_window = Mock(), Mock()
        windows = [main_window]
        with patch.object(app.webview, 'windows', windows), patch.object(app.webview, 'create_window', return_value=proctor_window) as create:
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
