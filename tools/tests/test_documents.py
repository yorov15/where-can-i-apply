import copy
import json
import tempfile
import unittest
from pathlib import Path
from tools.documents import load_documents, check_document_refs

QUOTE = 'Applicants must submit a passport copy.'
HASH = 'sha256:' + 'a' * 64
PROGRAM = {'id': 'example', 'status': 'published', 'source': {'pages': [{'url': 'https://example.org/docs', 'contentHash': HASH}]},
           'textConditions': [{'kind': 'documents', 'ru': 'Копия паспорта', 'evidence': QUOTE}]}
DOCUMENT = {'code': 'passport', 'title': 'Подготовить копию паспорта', 'where': 'Возьми свой документ.', 'who': 'Ты', 'waitDays': None,
            'source': {'program': 'example', 'url': 'https://example.org/docs', 'quote': QUOTE, 'contentHash': HASH, 'lastVerified': '2026-10-27'}}

class DocumentValidation(unittest.TestCase):
    def load(self, item):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / 'passport.json').write_text(json.dumps(item), encoding='utf-8')
            return load_documents([PROGRAM], directory)

    def test_valid_quoted_instruction_with_unknown_wait_time(self):
        loaded, problems = self.load(DOCUMENT)
        self.assertEqual(problems, [])
        self.assertIsNone(loaded['passport']['waitDays'])

    def test_invented_or_unapproved_provenance_is_rejected(self):
        for field, value in [('quote', 'invented quote'), ('url', 'https://other.org/docs'), ('contentHash', 'sha256:wrong')]:
            item = copy.deepcopy(DOCUMENT)
            item['source'][field] = value
            with self.subTest(field=field): self.assertTrue(self.load(item)[1])

    def test_wait_estimates_need_a_label_and_their_own_source(self):
        item = copy.deepcopy(DOCUMENT)
        item['waitDays'] = 7
        self.assertTrue(self.load(item)[1])
        item['estimate'] = True
        self.assertTrue(self.load(item)[1])
        item['waitSource'] = {'url': 'https://example.org/times', 'quote': 'Usually seven days.', 'lastVerified': '2026-10-27', 'contentHash': HASH}
        self.assertEqual(self.load(item)[1], [])

    def test_paragraph_titles_and_missing_document_codes_are_rejected(self):
        item = copy.deepcopy(DOCUMENT)
        item['title'] = 'Это описание документа.'
        self.assertTrue(self.load(item)[1])
        self.assertTrue(check_document_refs([PROGRAM], {'example'}, {'passport': DOCUMENT}))
        program = copy.deepcopy(PROGRAM)
        program['textConditions'][0].update(doc='invented', docTitle='Подготовить копию')
        self.assertTrue(check_document_refs([program], {'example'}, {'passport': DOCUMENT}))

    def test_all_published_document_sources_and_prepared_refs_remain_valid(self):
        root = Path(__file__).resolve().parents[2]
        programs = [json.loads(p.read_text(encoding='utf-8')) for p in (root/'data/programs').glob('*.json')]
        documents, problems = load_documents(programs, root/'data/prep/docs')
        self.assertEqual(problems, [])
        self.assertGreaterEqual(len(documents), 10)
        prepared = {p.stem for p in (root/'data/prep').glob('*.json')}
        self.assertEqual(check_document_refs(programs, prepared, documents), [])
