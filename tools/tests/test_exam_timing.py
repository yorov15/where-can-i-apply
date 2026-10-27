import copy
import hashlib
import tempfile
import unittest
from pathlib import Path
from tools.exam_timing import validate_timing, validate_per_part, validate_practice
from tools.route import load_tracks

class ExamTimingValidation(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.body = b'Results in 2 days.\n'
        path = self.root / 'raw/exams/test.txt'
        path.parent.mkdir(parents=True)
        path.write_bytes(self.body)
        self.proof = {'url': 'https://example.org/results', 'lastVerified': '2026-10-27', 'contentHash': 'sha256:' + hashlib.sha256(self.body).hexdigest(), 'pageHash': 'sha256:'+'a'*64, 'snapshot': 'raw/exams/test.txt', 'quotes': ['Results in 2 days.']}
        self.track = {'resultDays': {'default': [1,2]}, 'resultSource': self.proof}

    def test_all_published_tracks_validate_and_unknown_timings_remain_null(self):
        tracks, errors = load_tracks()
        self.assertEqual(errors, [])
        self.assertEqual(len(tracks), 12)
        self.assertIsNone(tracks['mext']['resultDays'])
        self.assertEqual(tracks['mext']['parts'], [])

    def test_valid_source_and_interval(self):
        self.assertEqual(validate_timing(self.track, self.root), [])
        (self.root/'raw/exams/test.txt').write_bytes(self.body.replace(b'\n',b'\r\n'))
        self.assertEqual(validate_timing(self.track, self.root), [])

    def test_invalid_interval_or_missing_source_is_rejected(self):
        for interval in [[2,1], [-1,2], [True,2], [1], '2']:
            item = copy.deepcopy(self.track)
            item['resultDays']['default'] = interval
            self.assertTrue(validate_timing(item, self.root))
        self.assertTrue(validate_timing({'resultDays': {'default': [1,2]}}, self.root))

    def test_source_cannot_escape_archive_or_mismatch_quote_or_hash(self):
        for key, value in [('snapshot', '../../outside.txt'), ('quotes', ['Invented fact']), ('contentHash', 'sha256:'+'f'*64), ('lastVerified', '2027-02-30')]:
            item = copy.deepcopy(self.track)
            item['resultSource'][key] = value
            self.assertTrue(validate_timing(item, self.root), key)

    def test_invalid_sessions_and_unsourced_retake_are_rejected(self):
        for session in [{'date':'2027-02-30','result':'2027-03-01'}, {'date':'2027-03-02','result':'2027-03-01'}]:
            self.assertTrue(validate_timing({'sessions':[session], 'sessionsSource':self.proof}, self.root))
        self.assertTrue(validate_timing({'retakeRule':{'minDays':3,'text':'Three days'}}, self.root))

    def test_parts_require_evidence_from_the_approved_programme(self):
        import json
        root = Path(__file__).resolve().parents[2]
        program = json.loads((root/'data/programs/nazarbayev.json').read_text(encoding='utf-8'))
        parts = json.loads((root/'data/prep/nazarbayev.json').read_text(encoding='utf-8'))['perPart']
        self.assertEqual(validate_per_part(parts,program), [])
        parts['IELTS']['source']['quote'] = 'Invented'
        self.assertTrue(validate_per_part(parts,program))

    def test_weekly_resources_need_valid_parts_urls_and_sources(self):
        item={'parts':[{'code':'R','name':'Reading'}], 'practice':{'url':'https://example.org/test','label':'Mock','source':self.proof},'practiceSource':self.proof,'weekTemplates':[{'id':'reading','part':'R','title':'Потренировать чтение','url':'https://example.org/test'}]}
        self.assertEqual(validate_practice(item,self.root),[])
        for key,value in [('part','UNKNOWN'),('url','javascript:alert(1)'),('title','x'*81)]:
            bad=copy.deepcopy(item);bad['weekTemplates'][0][key]=value
            self.assertTrue(validate_practice(bad,self.root))
        item['practiceSource']=None
        self.assertTrue(validate_practice(item,self.root))
