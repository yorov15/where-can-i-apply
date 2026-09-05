import unittest

from tools.look import mentions


class TestMentions(unittest.TestCase):
    def test_finds_the_word(self):
        got = mentions("возрастных ограничений нет", "ограничений", width=5)
        self.assertEqual(len(got), 1)
        self.assertIn("ограничений", got[0])

    def test_case_does_not_matter(self):
        # Человек напечатает «gpa», а в источнике «GPA». Пустой ответ на
        # такой запрос — прямая ложь: он подпишется под отсутствием того,
        # что на странице есть.
        self.assertEqual(len(mentions("Minimum GPA is 3.0", "gpa")), 1)

    def test_every_occurrence_is_listed(self):
        self.assertEqual(len(mentions("age, then age, then age", "age")), 3)

    def test_missing_word_gives_nothing(self):
        self.assertEqual(mentions("никаких требований к возрасту", "IELTS"), [])

    def test_context_is_shown_around_the_word(self):
        text = "left side here AGE right side there"
        got = mentions(text, "age", width=11)
        self.assertIn("side here", got[0])
        self.assertIn("right side", got[0])

    def test_newlines_are_flattened(self):
        # Совпадение, разорванное переносами, нечитаемо в терминале.
        got = mentions("first\n\n  age  \n\nlast", "age", width=20)
        self.assertEqual(got, ["first age last"])

    def test_empty_query_finds_nothing(self):
        self.assertEqual(mentions("любой текст", ""), [])

    def test_overlapping_word_is_not_counted_twice(self):
        self.assertEqual(len(mentions("aaaa", "aa")), 2)


if __name__ == "__main__":
    unittest.main()
