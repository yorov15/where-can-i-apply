import hashlib
import json
from pathlib import Path
import unittest

from tools.build import details_entry, index_entry

ROOT = Path(__file__).resolve().parents[2]


class TestApplyChannelAudit(unittest.TestCase):
    def test_saved_quotes_links_utf8_and_byte_hashes(self):
        latest = {}
        manifests = sorted((ROOT / 'raw/apply-channels').glob('*/manifest.json'))
        self.assertTrue(manifests)
        for manifest in manifests:
            for entry in json.loads(manifest.read_text(encoding='utf8')):
                latest[entry['id']] = entry
                for route in entry['routes']:
                    with self.subTest(program=entry['id'], channel=route['name']):
                        raw = (ROOT / route['snapshot']).read_bytes()
                        text = raw.decode('utf8', errors='strict')
                        self.assertNotIn('\ufffd', text)
                        self.assertIn(route['evidence'], text)
                        if route['url'] is not None:
                            self.assertIn(route['url'], text)
                        self.assertEqual('sha256:' + hashlib.sha256(raw).hexdigest(),
                                         route['source']['contentHash'])
        for ident, entry in latest.items():
            program = json.loads((ROOT / f'data/programs/{ident}.json').read_text(encoding='utf8'))
            expected = [{k: v for k, v in route.items() if k != 'snapshot'} for route in entry['routes']]
            self.assertEqual(program['applyChannel']['routes'], expected)
            self.assertNotIn('applyChannel', index_entry(program))
            rendered = details_entry(program)['applyChannel']['routes']
            self.assertEqual(len(rendered), len(expected))
            for route in rendered:
                self.assertNotIn('evidence', route)
                self.assertNotIn('contentHash', route['source'])

    def test_thirty_pilot_reviews_and_saved_inspection_proofs(self):
        file = ROOT / 'raw/apply-channels/2026-10-28/reviews.json'
        reviews = json.loads(file.read_text(encoding='utf8'))
        self.assertEqual(len(reviews), 30)
        self.assertEqual(len({r['id'] for r in reviews}), 30)
        for row in reviews:
            self.assertIn(row['status'], ('added', 'not_stated'))
            self.assertTrue(row['reason'])
            self.assertTrue(row['sources'])
            for source in row['sources']:
                if 'snapshot' not in source:
                    self.assertTrue(source.get('error'))
                    continue
                raw = (ROOT / source['snapshot']).read_bytes()
                self.assertNotIn('\ufffd', raw.decode('utf8', errors='strict'))
                self.assertEqual('sha256:' + hashlib.sha256(raw).hexdigest(), source['contentHash'])
