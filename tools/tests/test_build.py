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
        "lastVerified": "2026-09-03",
        "contentHash": "sha256:0",
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


if __name__ == "__main__":
    unittest.main()
