import unittest

from tools.snapshot import html_to_text, normalize, sha256_of_text


class TestHtmlToText(unittest.TestCase):
    def test_tags_removed(self):
        self.assertEqual(html_to_text("<p>Привет <b>мир</b></p>"), "Привет мир")

    def test_script_and_style_dropped(self):
        html = "<style>p{color:red}</style><p>Текст</p><script>alert(1)</script>"
        self.assertEqual(html_to_text(html), "Текст")

    def test_entities_decoded(self):
        self.assertEqual(html_to_text("<p>18&nbsp;&mdash;&nbsp;25</p>"), "18 - 25")


class TestNormalize(unittest.TestCase):
    def test_whitespace_collapsed(self):
        self.assertEqual(normalize("  a\n\n  b\t c  "), "a b c")

    def test_typographic_quotes_flattened(self):
        self.assertEqual(normalize("“age” ‘limit’"), '"age" \'limit\'')

    def test_dashes_flattened(self):
        self.assertEqual(normalize("18–25"), "18-25")

    def test_nbsp_becomes_space(self):
        # Экранированный код, а не сам символ: неразрывный пробел
        # в исходнике неотличим от обычного, и тест молча стал бы пустым.
        self.assertEqual(normalize("18\u00a0лет"), "18 лет")


class TestHash(unittest.TestCase):
    def test_prefix_and_stability(self):
        got = sha256_of_text("abc")
        self.assertTrue(got.startswith("sha256:"))
        self.assertEqual(got, sha256_of_text("abc"))

    def test_different_text_different_hash(self):
        self.assertNotEqual(sha256_of_text("abc"), sha256_of_text("abd"))


if __name__ == "__main__":
    unittest.main()
