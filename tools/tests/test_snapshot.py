import unittest

from tools.snapshot import (
    html_to_text,
    normalize,
    sha256_of_text,
    source_fingerprint,
    strip_volatile,
)


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

    def test_non_breaking_hyphen_flattened(self):
        # Настоящий случай с ntc.tj: «синфи 11‑ум» набрано неразрывным
        # дефисом. Человек, копирующий цитату, наберёт обычный, и без
        # этой замены проверка цитаты не нашла бы верную фразу.
        self.assertEqual(normalize("синфи 11‑ум"), "синфи 11-ум")

    def test_nbsp_becomes_space(self):
        # Экранированный код, а не сам символ: неразрывный пробел
        # в исходнике неотличим от обычного, и тест молча стал бы пустым.
        self.assertEqual(normalize("18\u00a0лет"), "18 лет")


class TestZeroWidth(unittest.TestCase):
    def test_bom_at_start_is_removed(self):
        # BOM пробелом не считается, поэтому схлопывание пробелов его не
        # уберёт — а цитата, начинающаяся с него, не найдётся никогда.
        self.assertEqual(normalize("\ufeffТекст"), "Текст")

    def test_zero_width_space_inside_word_is_removed(self):
        self.assertEqual(normalize("Текст\u200bдалее"), "Текстдалее")


class TestStripVolatile(unittest.TestCase):
    def test_view_counter_is_removed(self):
        text = "Требования Диданд: 48745 Дальше текст"
        self.assertEqual(
            strip_volatile(text, [r"Диданд: \d+"]), "Требования Дальше текст"
        )

    def test_same_page_with_different_counter_gives_same_result(self):
        patterns = [r"Диданд: \d+"]
        first = strip_volatile("Правила Диданд: 1 конец", patterns)
        second = strip_volatile("Правила Диданд: 999999 конец", patterns)
        self.assertEqual(first, second)

    def test_requirements_survive_the_cleaning(self):
        text = "Диданд: 48745 Возраст до 21 года"
        self.assertIn("до 21 года", strip_volatile(text, [r"Диданд: \d+"]))

    def test_no_patterns_changes_nothing_but_spaces(self):
        self.assertEqual(strip_volatile("а  б", []), "а б")


class TestHash(unittest.TestCase):
    def test_prefix_and_stability(self):
        got = sha256_of_text("abc")
        self.assertTrue(got.startswith("sha256:"))
        self.assertEqual(got, sha256_of_text("abc"))

    def test_different_text_different_hash(self):
        self.assertNotEqual(sha256_of_text("abc"), sha256_of_text("abd"))


class TestSourceFingerprint(unittest.TestCase):
    """Отпечаток всего источника, а не одной его страницы."""

    def pages(self, *hashes):
        return [
            {"url": f"https://a.gov/{n}", "contentHash": value}
            for n, value in enumerate(hashes)
        ]

    def test_same_pages_give_the_same_fingerprint(self):
        self.assertEqual(
            source_fingerprint(self.pages("sha256:1", "sha256:2")),
            source_fingerprint(self.pages("sha256:1", "sha256:2")),
        )

    def test_change_on_the_last_page_changes_the_fingerprint(self):
        self.assertNotEqual(
            source_fingerprint(self.pages("sha256:1", "sha256:2", "sha256:3")),
            source_fingerprint(self.pages("sha256:1", "sha256:2", "sha256:9")),
        )

    def test_order_matters(self):
        self.assertNotEqual(
            source_fingerprint(self.pages("sha256:1", "sha256:2")),
            source_fingerprint(self.pages("sha256:2", "sha256:1")),
        )

    def test_added_page_changes_the_fingerprint(self):
        self.assertNotEqual(
            source_fingerprint(self.pages("sha256:1")),
            source_fingerprint(self.pages("sha256:1", "sha256:2")),
        )


if __name__ == "__main__":
    unittest.main()
