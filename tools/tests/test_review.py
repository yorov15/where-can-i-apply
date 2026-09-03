import unittest

from tools.review import approve, empty_fields, field_changes, sign_absence


class TestEmptyFields(unittest.TestCase):
    def test_lists_only_null_rules(self):
        program = {
            "eligibility": {
                "citizenship": {"allow": "*", "evidence": "x"},
                "age": None,
                "gpa": None,
            }
        }
        self.assertEqual(empty_fields(program), ["schoolCountry", "schoolYears",
                                                 "graduationYear", "age", "gpa", "language"])

    def test_nothing_empty_when_all_filled(self):
        rules = {f: {"evidence": "x"} for f in (
            "citizenship", "schoolCountry", "schoolYears",
            "graduationYear", "age", "gpa", "language")}
        self.assertEqual(empty_fields({"eligibility": rules}), [])


class TestSignAbsence(unittest.TestCase):
    def test_writes_the_signature(self):
        got = sign_absence({"eligibility": {"age": None}}, "age", "2026-09-03", "смотрел")
        rule = got["eligibility"]["age"]
        self.assertIs(rule["noLimit"], True)
        self.assertEqual(rule["checkedBy"], "human")
        self.assertEqual(rule["checkedAt"], "2026-09-03")
        self.assertEqual(rule["note"], "смотрел")
        self.assertIsNone(rule["evidence"])

    def test_carries_no_values(self):
        # Ручаться можно за отсутствие ограничения, но никогда за число.
        rule = sign_absence({"eligibility": {}}, "age", "2026-09-03", "x")["eligibility"]["age"]
        for key in ("min", "max", "allow", "deny", "anyOf", "scale", "asOf"):
            self.assertNotIn(key, rule)

    def test_does_not_mutate_input(self):
        program = {"eligibility": {"age": None}}
        sign_absence(program, "age", "2026-09-03", "x")
        self.assertIsNone(program["eligibility"]["age"])


class TestFieldChanges(unittest.TestCase):
    def test_new_program_lists_every_filled_field(self):
        proposed = {"eligibility": {"citizenship": {"allow": "*"}, "age": None}}
        changes = field_changes(None, proposed)
        self.assertEqual([c["field"] for c in changes], ["citizenship"])
        self.assertIsNone(changes[0]["before"])

    def test_unchanged_field_is_not_listed(self):
        rule = {"allow": "*", "evidence": "x"}
        current = {"eligibility": {"citizenship": rule}}
        proposed = {"eligibility": {"citizenship": dict(rule)}}
        self.assertEqual(field_changes(current, proposed), [])

    def test_changed_field_shows_before_and_after(self):
        current = {"eligibility": {"age": {"max": 21, "evidence": "x"}}}
        proposed = {"eligibility": {"age": {"max": 22, "evidence": "y"}}}
        changes = field_changes(current, proposed)
        self.assertEqual(changes[0]["before"]["max"], 21)
        self.assertEqual(changes[0]["after"]["max"], 22)

    def test_field_becoming_null_is_reported(self):
        current = {"eligibility": {"age": {"max": 21, "evidence": "x"}}}
        proposed = {"eligibility": {"age": None}}
        changes = field_changes(current, proposed)
        self.assertEqual(changes[0]["field"], "age")
        self.assertIsNone(changes[0]["after"])


class TestApprove(unittest.TestCase):
    def test_marks_human_checked_and_published(self):
        program = {"status": "draft", "source": {"humanChecked": False}}
        got = approve(program, "2026-09-03", "https://a.gov/x", "sha256:1")
        self.assertTrue(got["source"]["humanChecked"])
        self.assertEqual(got["status"], "published")

    def test_records_source_and_date(self):
        program = {"status": "draft", "source": {"humanChecked": False}}
        got = approve(program, "2026-09-03", "https://a.gov/x", "sha256:1")
        self.assertEqual(got["source"]["url"], "https://a.gov/x")
        self.assertEqual(got["source"]["lastVerified"], "2026-09-03")
        self.assertEqual(got["source"]["contentHash"], "sha256:1")

    def test_does_not_mutate_input(self):
        program = {"status": "draft", "source": {"humanChecked": False}}
        approve(program, "2026-09-03", "https://a.gov/x", "sha256:1")
        self.assertEqual(program["status"], "draft")


if __name__ == "__main__":
    unittest.main()
