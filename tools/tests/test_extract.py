import unittest

from tools.extract import build_prompt

SNAPSHOT = "Applicants must be under 21 years old at the time of application."


class TestBuildPrompt(unittest.TestCase):
    def test_contains_snapshot_text(self):
        self.assertIn(SNAPSHOT, build_prompt("primer", "Пример", SNAPSHOT))

    def test_demands_null_when_absent(self):
        prompt = build_prompt("primer", "Пример", SNAPSHOT)
        self.assertIn("null", prompt)
        self.assertIn("явно", prompt)

    def test_demands_verbatim_quote(self):
        prompt = build_prompt("primer", "Пример", SNAPSHOT)
        self.assertIn("дословн", prompt)
        self.assertIn("evidence", prompt)

    def test_forbids_outside_knowledge(self):
        prompt = build_prompt("primer", "Пример", SNAPSHOT)
        self.assertIn("не из текста", prompt)

    def test_shows_the_target_shape(self):
        prompt = build_prompt("primer", "Пример", SNAPSHOT)
        for field in ("citizenship", "graduationYear", "age", "gpa", "language"):
            self.assertIn(field, prompt)


if __name__ == "__main__":
    unittest.main()
