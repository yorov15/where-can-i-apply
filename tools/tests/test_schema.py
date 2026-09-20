import unittest

from tools.schema import FIELDS, KINDS, REQUIRED_FIELDS, SCALES, empty_program, is_country_code


class TestSchema(unittest.TestCase):
    def test_seven_fields_in_engine_order(self):
        self.assertEqual(
            FIELDS,
            (
                "citizenship",
                "schoolCountry",
                "schoolYears",
                "graduationYear",
                "age",
                "gpa",
                "language",
            ),
        )

    def test_required_fields(self):
        self.assertEqual(REQUIRED_FIELDS, frozenset({"citizenship", "graduationYear"}))

    def test_known_scales(self):
        self.assertIn("TJ_5", SCALES)
        self.assertIn("PERCENT", SCALES)

    def test_kinds_are_the_four_the_site_knows(self):
        # Тот же список, что в js/lib/kinds.js: новый тип, известный только
        # сборщику, сайт показал бы сырым словом.
        self.assertEqual(KINDS, ("government", "national", "need-aid", "university"))

    def test_country_code_shape(self):
        self.assertTrue(is_country_code("TJ"))
        self.assertFalse(is_country_code("tj"))
        self.assertFalse(is_country_code("TJK"))
        self.assertFalse(is_country_code("Таджикистан"))
        self.assertFalse(is_country_code(None))


class TestEmptyProgram(unittest.TestCase):
    def test_has_all_seven_rules_as_null(self):
        program = empty_program("primer", "Пример")
        self.assertEqual(set(program["eligibility"]), set(FIELDS))
        self.assertTrue(all(program["eligibility"][f] is None for f in FIELDS))

    def test_kind_is_left_for_a_human(self):
        # Тип — редакторское решение, его не берут ни с сайта программы, ни
        # у модели, поэтому у новой записи он пуст, пока человек не поставит.
        self.assertIsNone(empty_program("primer", "Пример")["kind"])

    def test_is_draft_and_unchecked(self):
        program = empty_program("primer", "Пример")
        self.assertEqual(program["status"], "draft")
        self.assertFalse(program["source"]["humanChecked"])


if __name__ == "__main__":
    unittest.main()
