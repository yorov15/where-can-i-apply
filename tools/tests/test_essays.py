import copy
import json
import unittest
from pathlib import Path
from tools.essays import validate_essays

ROOT = Path(__file__).resolve().parents[2]


class EssayValidationTest(unittest.TestCase):
    def setUp(self):
        self.prep = json.loads((ROOT/'data/prep/kaist.json').read_text(encoding='utf-8'))
        self.program = json.loads((ROOT/'data/programs/kaist.json').read_text(encoding='utf-8'))

    def check_bad(self, change):
        item = copy.deepcopy(self.prep)
        change(item)
        self.assertTrue(validate_essays(item, self.program, ROOT))

    def test_all_published_essay_specs_are_sourced_and_restrictions_preserved(self):
        count = 0
        for path in (ROOT/'data/prep').glob('*.json'):
            prep = json.loads(path.read_text(encoding='utf-8'))
            if 'essays' not in prep:
                continue
            program = json.loads((ROOT/'data/programs'/path.name).read_text(encoding='utf-8'))
            self.assertEqual(validate_essays(prep, program, ROOT), [], path.name)
            count += 1
        self.assertGreaterEqual(count, 10)
        for ident in ['icu-japan', 'nagoya-g30', 'hokkaido-isp', 'tohoku-gateway-college']:
            prep = json.loads((ROOT/f'data/prep/{ident}.json').read_text(encoding='utf-8'))
            self.assertEqual(prep['essayPolicy']['review'], 'blocked')

    def test_fake_prompt_quote_page_hash_and_escape_path_fail(self):
        for key, value in [('prompt', 'Invented question'), ('characters', 999), ('bytes', True)]:
            self.check_bad(lambda p, k=key, v=value: p['essays'][0].update({k:v}))
        for key, value in [('quotes', ['Invented quotation']), ('pageHash', 'sha256:'+'0'*64),
                           ('contentHash', 'sha256:'+'0'*64), ('snapshot', 'AGENTS.md'), ('lastVerified', 'yesterday'), ('url', 'https://evil.invalid')]:
            self.check_bad(lambda p, k=key, v=value: p['essays'][0]['source'].update({k:v}))

    def test_duplicate_ids_invalid_word_range_and_unsourced_policy_fail(self):
        self.check_bad(lambda p: p['essays'].append(copy.deepcopy(p['essays'][0])))
        self.check_bad(lambda p: p['essays'][0].update(words={'min':700,'max':600}))
        self.check_bad(lambda p: p['essays'][0].update(words={'max':999}))
        self.check_bad(lambda p: p.update(essayPolicy={'review':'allowed'}))
        self.check_bad(lambda p: p.update(essayPolicy={'review':'blocked','note':'No AI'}))
