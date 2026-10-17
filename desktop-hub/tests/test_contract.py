"""
Kiểm thử "hợp đồng": các con số cài đặt của hub phải khớp shared/hub-contract.json.

Trang web cũng dựa vào chính những con số đó, nên lệch nhau là web và hub không nói chuyện được.
"""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from examguard_desktop import config, discovery, exam_store  # noqa: E402
from examguard_desktop.http_handler import IDENTITY_FIELDS  # noqa: E402

# Nội dung tệp shared/hub-contract.json đã đọc sẵn.
CONTRACT = json.loads((ROOT.parent / 'shared' / 'hub-contract.json').read_text(encoding='utf-8'))


class ContractTests(unittest.TestCase):
    """
    Đây là gì: nhóm ca kiểm thử so hub với "hợp đồng" chung.
    Mục tiêu: phát hiện ngay khi ai đó sửa cổng, phiên bản, giới hạn... ở một bên mà quên bên kia.
    Chức năng: so từng giá trị trong config.py, discovery.py, http_handler.py với CONTRACT.
    Đầu ra: báo đạt hoặc báo lỗi chỉ ra giá trị bị lệch.
    Dùng ở đâu: chạy bằng `python3 -m unittest discover -s tests` trong desktop-hub/.
    Liên kết với: shared/hub-contract.json, web/tests/unit/contract.test.cjs (phía web).
    """

    def test_config_matches_contract(self):
        """Kiểm tra phiên bản, các cổng, giới hạn dữ liệu và tên dịch vụ khớp hợp đồng."""
        self.assertEqual(config.APP_VERSION, CONTRACT['appVersion'])
        self.assertEqual(config.DEFAULT_PORT, CONTRACT['defaultHubPort'])
        self.assertEqual(config.MAX_BODY_SIZE, CONTRACT['maxBodyBytes'])
        self.assertEqual(config.EVENT_LIMIT, CONTRACT['eventLimit'])
        self.assertEqual(config.DISCOVERY_PORT, CONTRACT['discoveryPort'])
        self.assertEqual(discovery.SERVICE, CONTRACT['discoveryService'])

    def test_required_identity_fields_match_contract(self):
        """Kiểm tra danh sách trường bắt buộc (phòng, máy, mã và tên thí sinh) khớp hợp đồng."""
        self.assertEqual(list(IDENTITY_FIELDS), CONTRACT['identityFields'])

    def test_verdicts_match_contract(self):
        """Kiểm tra danh sách kết luận giám thị khớp hợp đồng."""
        self.assertEqual(list(exam_store.VALID_VERDICTS), CONTRACT['verdicts'])


if __name__ == '__main__':
    unittest.main()
