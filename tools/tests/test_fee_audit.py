"""Проверка источника каждого взноса из датированных партий сбора."""
import json
import hashlib
import unittest
from pathlib import Path

from tools.build import index_entry
from tools.snapshot import normalize

ROOT = Path(__file__).resolve().parents[2]


class TestFeeAudit(unittest.TestCase):
    def test_fee_values_quotes_and_hashes_match_their_own_saved_sources(self):
        entries = []
        for manifest in (ROOT / "raw/application-fees").glob("*/manifest.json"):
            entries.extend(json.loads(manifest.read_text(encoding="utf-8")))
        self.assertTrue(entries, "fee audit source manifest is missing")
        for entry in entries:
            with self.subTest(program=entry["id"]):
                raw = (ROOT / entry["snapshot"]).read_bytes()
                text = raw.decode('utf-8', errors='strict')
                self.assertNotIn('\ufffd', text)
                self.assertNotIn('\ufffd', entry['quote'])
                self.assertEqual('sha256:' + hashlib.sha256(raw).hexdigest(), entry["source"]["contentHash"])
                self.assertIn(normalize(entry["quote"]), normalize(text))
                if 'batch2' in entry['snapshot']:
                    self.assertIn(entry['quote'], text)
                program = json.loads((ROOT / f"data/programs/{entry['id']}.json").read_text(encoding="utf-8"))
                fee = next(c["fee"] for c in program["textConditions"] if c.get("fee"))
                self.assertEqual(fee["amount"], entry["amount"])
                self.assertEqual(fee["currency"], entry["currency"])
                self.assertEqual(fee["evidence"], entry["quote"])
                self.assertEqual(fee["source"], entry["source"])
                self.assertEqual(index_entry(program).get("feeFree", False), entry["amount"] == 0 and fee.get('unconditional') is True and not fee.get("waivedForAid", False))

    def test_aalto_snapshot_keeps_euro_in_utf8(self):
        text = (ROOT / 'raw/application-fees/2026-10-28/aalto-finland.txt').read_bytes().decode('utf-8', errors='strict')
        self.assertIn('\u20ac100', normalize(text))
        self.assertNotIn('\ufffd', text)

    def test_review_source_files_are_strict_utf8_and_byte_hashes_match(self):
        for file in (ROOT / 'raw/application-fees').glob('*/reviews.json'):
            entries = json.loads(file.read_text(encoding='utf8'))
            self.assertEqual(len(entries), len({entry['id'] for entry in entries}))
            for entry in entries:
                for source in entry['sources']:
                    if 'snapshot' not in source:
                        self.assertTrue(source.get('error'))
                        continue
                    with self.subTest(program=entry['id'], url=source['url']):
                        raw = (ROOT / source['snapshot']).read_bytes()
                        self.assertNotIn('\ufffd', raw.decode('utf8', errors='strict'))
                        self.assertEqual('sha256:' + hashlib.sha256(raw).hexdigest(), source['contentHash'])
