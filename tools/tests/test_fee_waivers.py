import copy
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from tools.fee_waivers import load_fee_waivers, attach_fee_waivers

ROOT = Path(__file__).resolve().parents[2]


class FeeWaiverTests(unittest.TestCase):
    def test_published_records_have_existing_approved_sources_and_matching_evidence(self):
        records = load_fee_waivers(ROOT)
        lookup = {item['programId']: item for item in records}
        self.assertEqual(lookup['nyu-shanghai']['mode'], 'request')
        self.assertEqual(lookup['bowdoin-college']['mode'], 'automatic')
        self.assertEqual(lookup['uwashington']['mode'], 'unavailable')
        self.assertTrue(all(len(' '.join(item['evidence']).split()) <= 25 for item in records))

    def fixture(self, root, entry):
        (root / 'tools').mkdir()
        (root / 'data').mkdir()
        (root / 'raw/fee-waivers').mkdir(parents=True)
        (root / 'tools/sources.toml').write_text('[nyu-shanghai]\nurls=["https://shanghai.nyu.edu/page/how-apply"]\n', encoding='utf-8')
        (root / 'tools/fee-waiver-sources.json').write_text('{}', encoding='utf-8')
        shutil.copy(ROOT / entry['source']['snapshot'], root / entry['source']['snapshot'])
        (root / 'data/fee-waivers.json').write_text(json.dumps({'version': 1, 'programs': [entry]}), encoding='utf-8')

    def test_forged_domain_hash_quote_scope_and_snapshot_escape_fail_the_build_gate(self):
        entry = next(item for item in load_fee_waivers(ROOT) if item['programId'] == 'nyu-shanghai')
        mutations = [
            lambda row: row['source'].update(url='https://example.invalid/waiver'),
            lambda row: row['source'].update(contentHash='sha256:' + '0' * 64),
            lambda row: row['source'].update(snapshot='../secrets.txt'),
            lambda row: row.update(evidence=['This statement is absent.']),
            lambda row: row.update(mode='automatic', scope='notSpecified'),
            lambda row: row['source'].update(lastVerified='2099-01-01'),
            lambda row: row.update(mode='free'),
        ]
        for change in mutations:
            with self.subTest(change=change), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                changed = copy.deepcopy(entry)
                change(changed)
                self.fixture(root, entry)
                (root / 'data/fee-waivers.json').write_text(json.dumps({'version': 1, 'programs': [changed]}), encoding='utf-8')
                with self.assertRaises(ValueError):
                    load_fee_waivers(root)

    def test_browser_details_carry_only_public_conditions_and_dedicated_verification_date(self):
        records = load_fee_waivers(ROOT)
        details = {'programs': {entry['programId']: {'source': {'lastVerified': '2026-09-01'}} for entry in records}}
        attach_fee_waivers(details, records)
        for item in details['programs'].values():
            self.assertNotIn('evidence', item['feeWaiver'])
            self.assertNotIn('snapshot', item['feeWaiver']['source'])
            self.assertEqual(item['source']['lastVerified'], '2026-09-01')
            self.assertEqual(item['feeWaiver']['source']['lastVerified'], '2026-11-05')
        with self.assertRaises(ValueError):
            attach_fee_waivers({'programs': {}}, records)
