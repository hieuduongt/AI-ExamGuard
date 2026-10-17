import json
import sys
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from examguard_desktop import config, discovery, exam_store
from examguard_desktop.http_handler import IDENTITY_FIELDS
CONTRACT = json.loads((ROOT.parent / 'shared' / 'hub-contract.json').read_text(encoding='utf-8'))

class ContractTests(unittest.TestCase):

    def test_config_matches_contract(self):
        self.assertEqual(config.APP_VERSION, CONTRACT['appVersion'])
        self.assertEqual(config.DEFAULT_PORT, CONTRACT['defaultHubPort'])
        self.assertEqual(config.MAX_BODY_SIZE, CONTRACT['maxBodyBytes'])
        self.assertEqual(config.EVENT_LIMIT, CONTRACT['eventLimit'])
        self.assertEqual(config.DISCOVERY_PORT, CONTRACT['discoveryPort'])
        self.assertEqual(discovery.SERVICE, CONTRACT['discoveryService'])

    def test_required_identity_fields_match_contract(self):
        self.assertEqual(list(IDENTITY_FIELDS), CONTRACT['identityFields'])

    def test_verdicts_match_contract(self):
        self.assertEqual(list(exam_store.VALID_VERDICTS), CONTRACT['verdicts'])
if __name__ == '__main__':
    unittest.main()
