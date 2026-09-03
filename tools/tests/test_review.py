import unittest

from tools.review import approve, field_changes


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
