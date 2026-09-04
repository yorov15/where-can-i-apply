import json
import unittest

from tools.build import build_index, index_entry

PROGRAM = {
    "id": "primer",
    "status": "published",
    "name": {"ru": "Пример", "orig": "Example"},
    "hostCountry": "TR",
    "level": "bachelor",
    "coverage": {"tuition": True, "living": True, "travel": False, "note": {"ru": "нечто"}},
    "eligibility": {
        "citizenship": {"allow": "*", "deny": [], "evidence": "длинная цитата"},
        "schoolCountry": None,
        "schoolYears": None,
        "graduationYear": {"min": 2025, "max": None, "evidence": "другая цитата"},
        "age": None,
        "gpa": None,
        "language": None,
    },
    "textConditions": [{"ru": "условие", "evidence": "цитата"}],
    "deadline": {
        "opens": "2027-01-10",
        "closes": "2027-02-20",
        "recurring": "annual",
        "confidence": "expected",
    },
    "applyUrl": "https://example.gov/apply",
    "coversInstitutions": {"kind": "list", "approxCount": 1, "note": {"ru": ""}},
    "source": {
        "url": "https://example.gov/rules",
        "pages": [{"url": "https://example.gov/rules", "contentHash": "sha256:0"}],
        "lastVerified": "2026-09-03",
        "humanChecked": True,
    },
}


class TestIndexEntry(unittest.TestCase):
    def test_evidence_is_stripped(self):
        entry = index_entry(PROGRAM)
        self.assertNotIn("evidence", json.dumps(entry, ensure_ascii=False))

    def test_rules_survive_without_quotes(self):
        entry = index_entry(PROGRAM)
        self.assertEqual(entry["eligibility"]["graduationYear"]["min"], 2025)
        self.assertIsNone(entry["eligibility"]["age"])

    def test_deadline_and_name_survive(self):
        entry = index_entry(PROGRAM)
        self.assertEqual(entry["deadline"]["closes"], "2027-02-20")
        self.assertEqual(entry["name"]["ru"], "Пример")

    def test_source_is_not_in_index(self):
        self.assertNotIn("source", index_entry(PROGRAM))

    def test_text_conditions_reach_the_site(self):
        # Они собраны, проверены цитатами — и до карточки не доезжали.
        # Красная карточка MEXT говорила «нужно 12 лет школы» и молчала
        # о том, что засчитывается сопоставимое образование.
        entry = index_entry(PROGRAM)
        self.assertEqual([c["ru"] for c in entry["textConditions"]], ["условие"])

    def test_text_condition_quotes_stay_behind(self):
        # Цитата нужна тому, кто проверяет запись, а не тому, кто читает
        # карточку. В индексе это лишние байты на мобильном интернете.
        entry = index_entry(PROGRAM)
        self.assertNotIn("evidence", json.dumps(entry, ensure_ascii=False))

    def test_program_without_conditions_gets_an_empty_list(self):
        program = json.loads(json.dumps(PROGRAM))
        del program["textConditions"]
        self.assertEqual(index_entry(program)["textConditions"], [])

    def test_no_limit_flag_survives_but_note_does_not(self):
        # Без флага движок не отличит «человек проверил, требования нет»
        # от «не знаем» — и карточка снова станет жёлтой.
        program = json.loads(json.dumps(PROGRAM))
        program["eligibility"]["age"] = {
            "noLimit": True,
            "evidence": None,
            "checkedBy": "human",
            "checkedAt": "2026-09-03",
            "note": "длинная заметка человека",
        }
        entry = index_entry(program)
        self.assertIs(entry["eligibility"]["age"]["noLimit"], True)
        self.assertEqual(entry["eligibility"]["age"]["checkedAt"], "2026-09-03")
        self.assertNotIn("note", entry["eligibility"]["age"])


class TestBuildIndex(unittest.TestCase):
    def test_drafts_are_not_published(self):
        draft = dict(PROGRAM, id="draft", status="draft")
        index = build_index([PROGRAM, draft], "2026-09-03")
        self.assertEqual([p["id"] for p in index["programs"]], ["primer"])

    def test_unchecked_programs_are_not_published(self):
        sneaky = dict(PROGRAM, id="sneaky")
        sneaky["source"] = dict(PROGRAM["source"], humanChecked=False)
        index = build_index([PROGRAM, sneaky], "2026-09-03")
        self.assertEqual([p["id"] for p in index["programs"]], ["primer"])

    def test_generated_at_is_recorded(self):
        index = build_index([PROGRAM], "2026-09-03")
        self.assertEqual(index["generatedAt"], "2026-09-03")

    def test_programs_are_sorted_by_id(self):
        second = dict(PROGRAM, id="alpha")
        index = build_index([PROGRAM, second], "2026-09-03")
        self.assertEqual([p["id"] for p in index["programs"]], ["alpha", "primer"])


class TestSourceWithoutPages(unittest.TestCase):
    """Запись, за источником которой никто не следит, публиковать нельзя."""

    def program(self, **source):
        copy = json.loads(json.dumps(PROGRAM))
        copy["source"] = source
        return copy

    def test_record_without_pages_is_not_published(self):
        # Иначе устаревшие требования выдавались бы уверенно и бессрочно:
        # check.py такую запись пропускает, а сайт её показывает.
        index = build_index(
            [self.program(url="https://example.gov/rules", humanChecked=True)],
            "2026-09-04",
        )
        self.assertEqual(index["programs"], [])

    def test_empty_page_list_counts_as_none(self):
        index = build_index(
            [self.program(url="https://example.gov/rules", pages=[], humanChecked=True)],
            "2026-09-04",
        )
        self.assertEqual(index["programs"], [])

    def test_record_with_pages_is_published(self):
        index = build_index([json.loads(json.dumps(PROGRAM))], "2026-09-04")
        self.assertEqual([p["id"] for p in index["programs"]], [PROGRAM["id"]])


if __name__ == "__main__":
    unittest.main()
