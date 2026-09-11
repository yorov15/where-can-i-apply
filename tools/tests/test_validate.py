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


LANGUAGE_SNAPSHOT = SNAPSHOT + (
    " IELTS - 6.5 overall, with a minimum of 5.5 on each section."
    " TOEFL iBT - 90 in total."
)


def with_language(rule):
    program = good_program()
    program["eligibility"]["language"] = rule
    return program


class TestLanguageTests(unittest.TestCase):
    def test_threshold_with_its_own_quote_passes(self):
        program = with_language({
            "anyOf": [
                {"test": "IELTS", "min": 6.5},
                {"test": "TOEFL_IBT", "min": 90, "evidence": "TOEFL iBT - 90 in total"},
            ],
            "evidence": "IELTS - 6.5 overall",
        })
        self.assertEqual(validate_program(program, LANGUAGE_SNAPSHOT), [])

    def test_invented_threshold_quote_is_caught(self):
        program = with_language({
            "anyOf": [
                {"test": "IELTS", "min": 6.5},
                {"test": "TOEFL_IBT", "min": 80, "evidence": "TOEFL iBT - 80 in total"},
            ],
            "evidence": "IELTS - 6.5 overall",
        })
        problems = validate_program(program, LANGUAGE_SNAPSHOT)
        self.assertTrue(any("цитата к TOEFL_IBT не найдена" in p for p in problems))

    def test_threshold_is_checked_against_its_own_quote(self):
        # Число из цитаты правила не должно подтверждать чужой порог.
        program = with_language({
            "anyOf": [
                {"test": "IELTS", "min": 6.5},
                {"test": "TOEFL_IBT", "min": 6.5, "evidence": "TOEFL iBT - 90 in total"},
            ],
            "evidence": "IELTS - 6.5 overall",
        })
        problems = validate_program(program, LANGUAGE_SNAPSHOT)
        self.assertTrue(any("TOEFL_IBT min = 6.5" in p for p in problems))

    def test_threshold_without_own_quote_uses_rule_quote(self):
        program = with_language({
            "anyOf": [{"test": "IELTS", "min": 6.5}, {"test": "TOEFL_IBT", "min": 90}],
            "evidence": "IELTS - 6.5 overall",
        })
        problems = validate_program(program, LANGUAGE_SNAPSHOT)
        self.assertTrue(any("TOEFL_IBT min = 90" in p for p in problems))

    def test_unknown_test_is_caught(self):
        program = with_language({
            "anyOf": [{"test": "TOEFL", "min": 90, "evidence": "TOEFL iBT - 90 in total"}],
            "evidence": "IELTS - 6.5 overall",
        })
        problems = validate_program(program, LANGUAGE_SNAPSHOT)
        self.assertTrue(any("анкета не знает" in p for p in problems))


class TestTextConditions(unittest.TestCase):
    def test_condition_with_real_quote_passes(self):
        program = good_program()
        program["textConditions"] = [
            {"ru": "Моложе 21 года на момент подачи.", "evidence": "under 21 years old"}
        ]
        self.assertEqual(validate_program(program, SNAPSHOT), [])

    def test_condition_with_invented_quote_is_caught(self):
        program = good_program()
        program["textConditions"] = [
            {"ru": "Моложе 25 лет.", "evidence": "under 25 years old"}
        ]
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("условие 1: цитата не найдена" in p for p in problems))

    def test_condition_without_quote_is_caught(self):
        program = good_program()
        program["textConditions"] = [{"ru": "Что-то важное.", "evidence": ""}]
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("условие 1: нет цитаты" in p for p in problems))


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

    def test_required_check_can_be_deferred(self):
        # До подписей обязательные поля не требуются: подпись — ровно то,
        # чем пустое поле заполняется, и отвергать запись раньше значит
        # не дать её заполнить вообще.
        program = good_program()
        program["eligibility"]["graduationYear"] = None
        self.assertEqual(validate_program(program, SNAPSHOT, check_required=False), [])

    def test_deferring_does_not_hide_other_problems(self):
        program = good_program()
        program["eligibility"]["graduationYear"] = None
        program["eligibility"]["age"] = {
            "max": 21,
            "asOf": "deadline",
            "evidence": "выдуманная цитата",
        }
        problems = validate_program(program, SNAPSHOT, check_required=False)
        self.assertTrue(any("цитата не найдена" in p for p in problems))

    def test_full_check_still_demands_required_fields(self):
        program = good_program()
        program["eligibility"]["graduationYear"] = None
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

    def test_assistant_signature_passes(self):
        program = good_program()
        program["eligibility"]["age"] = self.absence(checkedBy="assistant")
        self.assertEqual(validate_program(program, SNAPSHOT), [])

    def test_assistant_still_cannot_vouch_for_a_number(self):
        program = good_program()
        program["eligibility"]["age"] = self.absence(checkedBy="assistant", max=25)
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("не может стоять вместе со значениями" in p for p in problems))

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


class TestRelativeAndExclusive(unittest.TestCase):
    def test_max_exclusive_passes(self):
        program = good_program()
        program["eligibility"]["age"] = {
            "min": None,
            "maxExclusive": 21,
            "evidence": "under 21 years old",
        }
        self.assertEqual(validate_program(program, SNAPSHOT), [])

    def test_two_upper_bounds_at_once_is_caught(self):
        program = good_program()
        program["eligibility"]["age"] = {
            "max": 21,
            "maxExclusive": 21,
            "evidence": "under 21 years old",
        }
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("граница должна быть одна" in p for p in problems))

    def test_absurd_exclusive_age_is_caught(self):
        program = good_program()
        program["eligibility"]["age"] = {
            "maxExclusive": 200,
            "evidence": "under 21 years old",
        }
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("вне разумных границ" in p for p in problems))

    def test_missing_as_of_is_allowed(self):
        # Источник часто не говорит, на какой момент считается возраст.
        program = good_program()
        program["eligibility"]["age"] = {
            "maxExclusive": 21,
            "evidence": "under 21 years old",
        }
        self.assertEqual(validate_program(program, SNAPSHOT), [])

    def test_garbage_as_of_is_still_caught(self):
        program = good_program()
        program["eligibility"]["age"] = {
            "maxExclusive": 21,
            "asOf": "когда-нибудь",
            "evidence": "under 21 years old",
        }
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("asOf" in p for p in problems))

    def test_relative_graduation_year_passes(self):
        program = good_program()
        program["eligibility"]["graduationYear"] = {
            "min": None,
            "maxRelative": "applicationYear",
            "evidence": "graduated before 2025 are not eligible",
        }
        self.assertEqual(validate_program(program, SNAPSHOT), [])

    def test_unknown_relative_bound_is_caught(self):
        program = good_program()
        program["eligibility"]["graduationYear"] = {
            "maxRelative": "когда захочется",
            "evidence": "graduated before 2025 are not eligible",
        }
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("неизвестная относительная граница" in p for p in problems))

    def test_relative_together_with_number_is_caught(self):
        program = good_program()
        program["eligibility"]["graduationYear"] = {
            "max": 2027,
            "maxRelative": "applicationYear",
            "evidence": "graduated before 2025 are not eligible",
        }
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("граница должна быть одна" in p for p in problems))

    def test_new_keys_cannot_hide_under_a_signature(self):
        # Подпись человека остаётся только под отсутствием ограничения:
        # новые ключи со значениями не должны стать лазейкой.
        program = good_program()
        program["eligibility"]["age"] = {
            "noLimit": True,
            "maxExclusive": 21,
            "evidence": None,
            "checkedBy": "human",
            "checkedAt": "2026-09-03",
            "note": "смотрел",
        }
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("maxExclusive" in p for p in problems))


class TestDelegated(unittest.TestCase):
    def delegated(self, **over):
        rule = {"definedBy": "institution", "evidence": "citizens of eligible countries"}
        rule.update(over)
        return rule

    def test_reference_to_the_host_institution_passes(self):
        program = good_program()
        program["eligibility"]["language"] = self.delegated()
        self.assertEqual(validate_program(program, SNAPSHOT), [])

    def test_quote_is_still_required(self):
        # В отличие от подписи человека: это пересказ источника, а не
        # утверждение об отсутствии требования.
        program = good_program()
        program["eligibility"]["language"] = {"definedBy": "institution"}
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("нет цитаты" in p for p in problems))

    def test_invented_quote_is_caught(self):
        program = good_program()
        program["eligibility"]["language"] = self.delegated(evidence="как решит вуз")
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("цитата не найдена" in p for p in problems))

    def test_value_alongside_is_caught(self):
        program = good_program()
        program["eligibility"]["gpa"] = self.delegated(min=80, scale="PERCENT")
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("либо порог известен" in p for p in problems))

    def test_unknown_delegate_is_caught(self):
        program = good_program()
        program["eligibility"]["language"] = self.delegated(definedBy="somebody")
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("definedBy" in p for p in problems))

    def test_cannot_be_combined_with_a_signature(self):
        program = good_program()
        program["eligibility"]["language"] = self.delegated(noLimit=True)
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("разные утверждения" in p for p in problems))


class TestRelativeAsOf(unittest.TestCase):
    def with_as_of(self, as_of):
        program = good_program()
        # Порог и цитата должны сходиться: раньше здесь стояло min 18 под
        # цитатой про 21, и это годами никого не смущало.
        program["eligibility"]["age"] = {
            "max": 21,
            "asOf": as_of,
            "evidence": "under 21 years old",
        }
        return program

    def test_relative_date_passes(self):
        rule = {"relativeTo": "applicationYear", "monthDay": "08-31"}
        self.assertEqual(validate_program(self.with_as_of(rule), SNAPSHOT), [])

    def test_bad_month_day_is_caught(self):
        rule = {"relativeTo": "applicationYear", "monthDay": "31-08"}
        problems = validate_program(self.with_as_of(rule), SNAPSHOT)
        self.assertTrue(any("monthDay" in p for p in problems))

    def test_unknown_anchor_is_caught(self):
        rule = {"relativeTo": "moonPhase", "monthDay": "08-31"}
        problems = validate_program(self.with_as_of(rule), SNAPSHOT)
        self.assertTrue(any("relativeTo" in p for p in problems))

    def test_plain_date_still_works(self):
        self.assertEqual(validate_program(self.with_as_of("2026-08-31"), SNAPSHOT), [])

    def test_garbage_is_still_caught(self):
        problems = validate_program(self.with_as_of("когда-нибудь"), SNAPSHOT)
        self.assertTrue(any("asOf" in p for p in problems))


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


class TestNotMeasured(unittest.TestCase):
    """Требование есть, но инструмент его не считает."""

    TEXT = "Italian B2 certification issued by the CLIQ is required"

    def program(self, **rule):
        return {
            "eligibility": {"language": rule},
            "deadline": {"opens": None, "closes": None,
                         "recurring": "annual", "confidence": "expected"},
        }

    def test_quote_is_still_required(self):
        # Без цитаты пометка стала бы отговоркой: требованием можно было
        # бы объявить что угодно, не показав ни строчки источника.
        problems = validate_program(
            self.program(notMeasured=True), self.TEXT, check_required=False
        )
        self.assertTrue(any("цитаты" in p for p in problems), problems)

    def test_passes_with_a_real_quote(self):
        problems = validate_program(
            self.program(notMeasured=True, evidence="issued by the CLIQ"),
            self.TEXT,
            check_required=False,
        )
        self.assertEqual(problems, [])

    def test_numbers_must_be_written_as_numbers(self):
        problems = validate_program(
            self.program(notMeasured=True, evidence="issued by the CLIQ",
                         anyOf=[{"test": "IELTS", "min": 6}]),
            self.TEXT,
            check_required=False,
        )
        self.assertTrue(any("число записывается числом" in p for p in problems), problems)

    def test_cannot_claim_absence_and_presence_at_once(self):
        problems = validate_program(
            self.program(notMeasured=True, noLimit=True, evidence="issued by the CLIQ"),
            self.TEXT,
            check_required=False,
        )
        self.assertTrue(any("противоположные" in p for p in problems), problems)

    def test_only_true_is_accepted(self):
        problems = validate_program(
            self.program(notMeasured="yes", evidence="issued by the CLIQ"),
            self.TEXT,
            check_required=False,
        )
        self.assertTrue(any("только значение true" in p for p in problems), problems)


if __name__ == "__main__":
    unittest.main()
