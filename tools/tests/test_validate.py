import unittest

from tools.schema import empty_program
from tools.validate import validate_program

SNAPSHOT = (
    "Applicants must be citizens of eligible countries. "
    "Applicants who graduated before 2025 are not eligible. "
    "Applicants must be under 21 years old at the time of application."
)


def good_program():
    program = empty_program("primer", "Пример")
    program["hostCountry"] = "TR"
    program["applyUrl"] = "https://example.gov/apply"
    program["eligibility"]["citizenship"] = {
        "allow": "*",
        "deny": [],
        "evidence": "citizens of eligible countries",
    }
    program["eligibility"]["graduationYear"] = {
        "min": 2025,
        "max": None,
        "evidence": "graduated before 2025 are not eligible",
    }
    program["deadline"] = {
        "opens": "2027-01-10",
        "closes": "2027-02-20",
        "recurring": "annual",
        "confidence": "expected",
    }
    program["source"] = {
        "url": "https://example.gov/rules",
        "lastVerified": "2026-09-03",
        "contentHash": "sha256:0",
        "humanChecked": False,
    }
    return program


class TestEvidence(unittest.TestCase):
    def test_clean_program_passes(self):
        self.assertEqual(validate_program(good_program(), SNAPSHOT), [])

    def test_invented_quote_is_caught(self):
        program = good_program()
        program["eligibility"]["age"] = {
            "min": None,
            "max": 21,
            "asOf": "deadline",
            "evidence": "must be under 30 years old",
        }
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("цитата не найдена" in p for p in problems))

    def test_real_quote_with_typographic_characters_passes(self):
        program = good_program()
        program["eligibility"]["age"] = {
            "min": None,
            "max": 21,
            "asOf": "deadline",
            "evidence": "under\u00a021 years\u00a0old",
        }
        self.assertEqual(validate_program(program, SNAPSHOT), [])

    def test_rule_without_evidence_is_caught(self):
        program = good_program()
        program["eligibility"]["schoolYears"] = {"min": 12}
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("нет цитаты" in p for p in problems))


class TestRequired(unittest.TestCase):
    def test_null_in_required_field_is_caught(self):
        program = good_program()
        program["eligibility"]["citizenship"] = None
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("обязательное поле" in p for p in problems))

    def test_explicit_no_limit_is_allowed(self):
        program = good_program()
        program["eligibility"]["graduationYear"] = {
            "min": None,
            "max": None,
            "evidence": "graduated before 2025 are not eligible",
        }
        self.assertEqual(validate_program(program, SNAPSHOT), [])


class TestAbsence(unittest.TestCase):
    def absence(self, **over):
        rule = {
            "noLimit": True,
            "evidence": None,
            "checkedBy": "human",
            "checkedAt": "2026-09-03",
            "note": "На утверждённых страницах требования нет",
        }
        rule.update(over)
        return rule

    def test_signed_absence_passes_without_a_quote(self):
        program = good_program()
        program["eligibility"]["age"] = self.absence()
        self.assertEqual(validate_program(program, SNAPSHOT), [])

    def test_absence_with_a_value_is_caught(self):
        # Главная защита: ручаться можно за отсутствие ограничения,
        # но никогда за число. «Возраст до 25, я проверил» не пройдёт.
        program = good_program()
        program["eligibility"]["age"] = self.absence(max=25)
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("не может стоять вместе со значениями" in p for p in problems))

    def test_absence_without_human_signature_is_caught(self):
        program = good_program()
        program["eligibility"]["age"] = self.absence(checkedBy="model")
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("checkedBy" in p for p in problems))

    def test_absence_without_date_is_caught(self):
        program = good_program()
        program["eligibility"]["age"] = self.absence(checkedAt=None)
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("checkedAt" in p for p in problems))

    def test_absence_without_note_is_caught(self):
        program = good_program()
        program["eligibility"]["age"] = self.absence(note="")
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("note" in p for p in problems))

    def test_absence_with_invented_quote_is_caught(self):
        program = good_program()
        program["eligibility"]["age"] = self.absence(evidence="must be under 30")
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("цитата должна быть null" in p for p in problems))

    def test_required_field_can_be_signed_absent(self):
        program = good_program()
        program["eligibility"]["graduationYear"] = self.absence()
        self.assertEqual(validate_program(program, SNAPSHOT), [])


class TestCoherence(unittest.TestCase):
    def test_closes_before_opens_is_caught(self):
        program = good_program()
        program["deadline"]["closes"] = "2026-12-01"
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("раньше даты открытия" in p for p in problems))

    def test_absurd_age_is_caught(self):
        program = good_program()
        program["eligibility"]["age"] = {
            "min": None,
            "max": 200,
            "asOf": "deadline",
            "evidence": "under 21 years old",
        }
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("возраст" in p for p in problems))

    def test_unknown_scale_is_caught(self):
        program = good_program()
        program["eligibility"]["gpa"] = {
            "min": 70,
            "scale": "TJ_TEN",
            "evidence": "citizens of eligible countries",
        }
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("шкала" in p for p in problems))

    def test_bad_country_code_is_caught(self):
        program = good_program()
        program["eligibility"]["citizenship"]["deny"] = ["TJK"]
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("код страны" in p for p in problems))

    def test_unknown_field_in_eligibility_is_caught(self):
        program = good_program()
        program["eligibility"]["religion"] = {"evidence": "citizens of eligible countries"}
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("лишнее поле" in p for p in problems))


if __name__ == "__main__":
    unittest.main()
