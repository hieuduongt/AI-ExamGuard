"""LAN discovery of the proctor hub by connect code (examguard_desktop/discovery.py)."""
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
    return json.dumps({'service': service, 'version': 'v', 'code': code, 'room': room, 'host': host, 'port': port}).encode()


class DiscoveryRegistryTests(unittest.TestCase):
    def setUp(self):
        discovery._found.clear()

    def test_connect_code_is_four_digits(self):
        self.assertRegex(discovery.CONNECT_CODE, r'^\d{4}$')

    def test_announcement_round_trip_uses_sender_ip(self):
        packet = discovery.build_announcement(9000, 'Phòng 2', 'PC-GV')
        self.assertTrue(discovery.record_announcement(packet, '10.0.0.7', now=100))
        self.assertEqual(discovery.discovered_hubs(now=101), [
            {'hubUrl': 'http://10.0.0.7:9000', 'room': 'Phòng 2', 'host': 'PC-GV', 'version': discovery.APP_VERSION},
        ])

    def test_codes_filter_but_are_never_listed(self):
        discovery.record_announcement(announcement(code='1111', room='P01'), '10.0.0.1', now=100)
        discovery.record_announcement(announcement(code='2222', room='P02'), '10.0.0.2', now=100)
        self.assertEqual([hub['room'] for hub in discovery.discovered_hubs(now=100)], ['P01', 'P02'])
        self.assertEqual([hub['hubUrl'] for hub in discovery.discovered_hubs('2222', now=100)], ['http://10.0.0.2:8765'])
        self.assertEqual(discovery.discovered_hubs('9999', now=100), [])
        self.assertTrue(all('code' not in hub for hub in discovery.discovered_hubs(now=100)))

    def test_silent_hubs_expire(self):
        discovery.record_announcement(announcement(), '10.0.0.1', now=100)
        self.assertEqual(len(discovery.discovered_hubs(now=100 + discovery.HUB_EXPIRES_AFTER)), 1)
        self.assertEqual(discovery.discovered_hubs(now=100.1 + discovery.HUB_EXPIRES_AFTER), [])

    def test_foreign_or_malformed_packets_are_ignored(self):
        for packet in (b'not json', b'\xff\xfe', b'[1]', announcement(service='other'),
                       announcement(code='12a4'), announcement(code='123'), announcement(port=0),
                       announcement(port=70000), json.dumps({'service': 'examguard-hub', 'code': '1234', 'port': '8765'}).encode()):
            self.assertFalse(discovery.record_announcement(packet, '10.0.0.9'))
        self.assertEqual(discovery.discovered_hubs(), [])

    def test_only_an_open_proctor_dashboard_makes_the_hub_announce(self):
        discovery.mark_proctor_active('P01', now=1000)
        self.assertTrue(discovery.proctor_active(now=1000 + discovery.PROCTOR_ACTIVE_FOR))
        self.assertFalse(discovery.proctor_active(now=1000.1 + discovery.PROCTOR_ACTIVE_FOR))

    def test_real_udp_packet_reaches_the_listener(self):
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

    def get(self, path):
        with urllib.request.urlopen(self.origin + path, timeout=5) as response:
            return json.loads(response.read().decode('utf-8'))

    def setUp(self):
        discovery._found.clear()
        discovery.mark_proctor_active('', now=0)

    def test_runtime_reports_connect_code(self):
        body = self.get('/api/runtime')
        self.assertEqual(body['connectCode'], discovery.CONNECT_CODE)
        self.assertIs(body['discovery'], discovery.is_running())

    def test_proctor_snapshot_marks_dashboard_open_with_room(self):
        self.assertFalse(discovery.proctor_active())
        self.get('/api/snapshot')
        self.assertFalse(discovery.proctor_active())
        body = self.get('/api/snapshot?proctor=1&room=Ph%C3%B2ng%2001')
        self.assertEqual(set(body), {'events', 'stations'})
        self.assertTrue(discovery.proctor_active())
        self.assertEqual(discovery._proctor_room, 'Phòng 01')

    def test_discover_lists_hubs_and_filters_by_code(self):
        discovery.record_announcement(announcement(code='1111', room='P01'), '10.0.0.1')
        discovery.record_announcement(announcement(code='2222', room='P02'), '10.0.0.2')
        body = self.get('/api/discover')
        self.assertTrue(body['ok'])
        self.assertEqual([hub['room'] for hub in body['hubs']], ['P01', 'P02'])
        self.assertEqual([hub['room'] for hub in self.get('/api/discover?code=2222')['hubs']], ['P02'])
        self.assertEqual(self.get('/api/discover?code=0000')['hubs'], [])


if __name__ == '__main__':
    unittest.main()
