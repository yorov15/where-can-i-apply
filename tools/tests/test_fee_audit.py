"""Проверка источника каждого взноса из датированных партий сбора."""
import json
import unittest
from pathlib import Path

from tools.build import index_entry
from tools.snapshot import normalize, sha256_of_text

ROOT = Path(__file__).resolve().parents[2]


class TestFeeAudit(unittest.TestCase):
    def test_fee_values_quotes_and_hashes_match_their_own_saved_sources(self):
        entries = []
        for manifest in (ROOT / "raw/application-fees").glob("*/manifest.json"):
            entries.extend(json.loads(manifest.read_text(encoding="utf-8")))
        self.assertTrue(entries, "fee audit source manifest is missing")
        for entry in entries:
            with self.subTest(program=entry["id"]):
                text = (ROOT / entry["snapshot"]).read_text(encoding="utf-8")
                self.assertEqual(sha256_of_text(text), entry["source"]["contentHash"])
                self.assertIn(normalize(entry["quote"]), normalize(text))
                program = json.loads((ROOT / f"data/programs/{entry['id']}.json").read_text(encoding="utf-8"))
                fee = next(c["fee"] for c in program["textConditions"] if c.get("fee"))
                self.assertEqual(fee["amount"], entry["amount"])
                self.assertEqual(fee["currency"], entry["currency"])
                self.assertEqual(fee["evidence"], entry["quote"])
                self.assertEqual(fee["source"], entry["source"])
                self.assertEqual(index_entry(program).get("feeFree", False), entry["amount"] == 0 and not fee.get("waivedForAid", False))
