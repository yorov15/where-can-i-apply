import json
import tempfile
import unittest
from pathlib import Path

from tools.interview import detect, is_interview_condition, is_topic_condition, build_interview, write_interview, interview_text

ROOT = Path(__file__).resolve().parents[2]


def condition(evidence, ru='Текст условия', kind='steps'):
    return {'evidence': evidence, 'ru': ru, 'kind': kind, 'field': None}


def program(*conditions, id='example'):
    return {'id': id, 'status': 'published', 'textConditions': list(conditions),
            'source': {'url': 'https://example.org/admission', 'lastVerified': '2026-10-01'}}


class InterviewRule(unittest.TestCase):
    def test_quoted_interview_counts(self):
        for text in ['Interview serves as a final step of admission process.',
                     'Shortlisted applicants may be invited to attend an interview.',
                     'Intewiew date 1st round : May 21',  # опечатка на странице, цитата дословная
                     '서류 및 면접 전형을 통해 인재를 선발하며',
                     '日本語で行い、個人面接とします。',
                     '2. 笔试面试',
                     'Подача документов на собеседование осуществляется в двух форматах:']:
            with self.subTest(text=text):
                self.assertTrue(is_interview_condition(condition(text)))

    def test_no_interview_is_not_an_interview(self):
        for text in ['Interviews are not a part of the application process.',
                     'Interviews are not a required part of the application process.',
                     'Please note that Amherst College does not offer interviews for prospective students.',
                     'Bates College Admission does not require interviews as part of our application review process.',
                     'Williams does not conduct interviews with prospective students',
                     'Interview not required.',
                     'There is no separate application or interview required; the committee considers all students.',
                     'Due to limited availability, interviews are reserved for United States citizens or permanent residents only.',
                     'a fee waiver code at an exhibition, seminar or interview session that you have attended']:
            with self.subTest(text=text):
                self.assertFalse(is_interview_condition(condition(text)))

    def test_russian_retelling_saying_no_interview_wins(self):
        self.assertFalse(is_interview_condition(condition('Interview', ru='Экзаменов и собеседования нет: решают по документам. Без собеседования.')))

    def test_optional_interview_offered_by_the_college_counts(self):
        self.assertTrue(is_interview_condition(condition('Interviews - Interviews are recommended but not required.')))
        self.assertTrue(is_interview_condition(condition('Haverford interviews are optional but highly recommended.')))

    def test_third_party_english_interview_is_not_the_program_interview(self):
        for text in ['Applicants are encouraged to submit interviews via InitialView or Vericant.',
                     'Duolingo, Vericant or InitialView interviews are considered optional supplements.',
                     'we strongly recommend that you use one of the interview tools']:
            with self.subTest(text=text):
                self.assertFalse(is_interview_condition(condition(text)))
        # …но если в той же цитате названо собственное собеседование колледжа — оно есть.
        self.assertTrue(is_interview_condition(condition(
            'if you plan to submit an independent interview, you may not register for a Bowdoin interview.')))

    def test_oral_language_exam_is_not_an_interview(self):
        self.assertFalse(is_interview_condition(condition('The test consists of an oral examination, a listening and a written examination.')))

    def test_retelling_alone_is_not_a_basis(self):
        # Пересказ упоминает собеседование, а цитата — про сроки: основания нет.
        self.assertFalse(is_interview_condition(condition('Online Application: November 15, 2025 - March 15, 2026',
                                                          ru='затем экзамен и собеседование')))
        self.assertFalse(is_interview_condition({'ru': 'собеседование', 'kind': 'steps'}))

    def test_topics_describe_content_or_language(self):
        self.assertTrue(is_topic_condition(condition('The interview will include technical questions in informatics and mathematics.')))
        self.assertTrue(is_topic_condition(condition('The interview will last around 50 minutes and will be conducted entirely in English.')))
        self.assertFalse(is_topic_condition(condition('Interviews for shortlisted candidates: May, June 2026')))


class InterviewEntry(unittest.TestCase):
    def test_detect_prefers_requirements_and_keeps_quotes_verbatim(self):
        note = condition('Some applicants may be invited for an interview.', kind='note')
        must = condition('  An interview is required of all applicants.  ', kind='must')
        entry = detect(program(note, condition('Deadline: 1 May'), must))
        self.assertEqual([quote['evidence'] for quote in entry['quotes']],
                         ['An interview is required of all applicants.', 'Some applicants may be invited for an interview.'])
        self.assertEqual(entry['url'], 'https://example.org/admission')
        self.assertEqual(entry['lastVerified'], '2026-10-01')
        self.assertEqual(entry['topics'], [])

    def test_detect_returns_none_without_quote(self):
        self.assertIsNone(detect(program(condition('Deadline: 1 May', ru='потом собеседование'))))
        self.assertIsNone(detect({'id': 'empty'}))

    def test_same_quote_is_shown_once(self):
        text = 'Selection by documents and interview.'
        entry = detect(program(condition(text, kind='steps'), condition(text, kind='money')))
        self.assertEqual(len(entry['quotes']), 1)

    def test_written_file_is_valid_json_with_one_program_per_line(self):
        data = build_interview([program(condition('Interview required.'), id='b'), program(condition('Deadline'), id='a')])
        self.assertEqual(list(data['programs']), ['b'])
        with tempfile.TemporaryDirectory() as temporary:
            (Path(temporary) / 'data').mkdir()
            self.assertEqual(write_interview(Path(temporary), [program(condition('Interview required.'))]), 0)
            text = (Path(temporary) / 'data' / 'interview.json').read_text(encoding='utf-8')
        self.assertEqual(json.loads(text)['programs']['example']['quotes'][0]['evidence'], 'Interview required.')
        self.assertEqual(text, interview_text(json.loads(text)))


class InterviewOnRealData(unittest.TestCase):
    """Сверка с настоящими данными: глазами проверенные случаи не должны уплыть."""

    @classmethod
    def setUpClass(cls):
        cls.programs = {path.stem: json.loads(path.read_text(encoding='utf-8'))
                        for path in sorted((ROOT / 'data' / 'programs').glob('*.json'))}

    def test_known_programs(self):
        for pid in ['ada-university', 'cambridge', 'constructor-university', 'gist-korea', 'tokyo', 'unist', 'enu', 'mit', 'bowdoin-college']:
            if pid in self.programs:
                with self.subTest(pid=pid):
                    self.assertIsNotNone(detect(self.programs[pid]))
        for pid in ['amherst-college', 'columbia-university', 'nyu', 'williams-college', 'keio-pearl', 'wesleyan', 'washu',
                    'copenhagen', 'islamic-university-madinah', 'sophia-fla', 'postech']:
            if pid in self.programs:
                with self.subTest(pid=pid):
                    self.assertIsNone(detect(self.programs[pid]))

    def test_every_quote_is_verbatim_from_the_program(self):
        for pid, entry in build_interview(list(self.programs.values()))['programs'].items():
            evidence = [c.get('evidence') or '' for c in self.programs[pid].get('textConditions') or []]
            for quote in entry['quotes'] + entry['topics']:
                with self.subTest(pid=pid):
                    self.assertTrue(any(quote['evidence'] in text for text in evidence))


if __name__ == '__main__':
    unittest.main()
