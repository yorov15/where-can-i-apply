import unittest

from tools.sources import check_sources


def entry(**over):
    base = {
        "name": "Пример",
        "urls": ["https://example.gov/rules"],
        "approvedBy": "human",
        "approvedAt": "2026-09-03",
    }
    base.update(over)
    return base


class TestCheckSources(unittest.TestCase):
    def test_valid_entry_has_no_complaints(self):
        self.assertEqual(check_sources({"turkiye-burslari": entry()}), [])

    def test_id_must_be_slug(self):
        problems = check_sources({"Turkiye Burslari": entry()})
        self.assertTrue(any("идентификатор" in p for p in problems))

    def test_urls_must_not_be_empty(self):
        problems = check_sources({"a-b": entry(urls=[])})
        self.assertTrue(any("нет ни одного адреса" in p for p in problems))

    def test_url_must_be_https(self):
        problems = check_sources({"a-b": entry(urls=["http://example.gov/"])})
        self.assertTrue(any("https" in p for p in problems))

    def test_approval_date_must_be_iso(self):
        problems = check_sources({"a-b": entry(approvedAt="03.09.2026")})
        self.assertTrue(any("дата утверждения" in p for p in problems))

    def test_file_only_entry_is_allowed(self):
        # Часть источников программе недоступна: JavaScript, 412, форма.
        # Человек сохраняет файл сам — это не обход, страницу открывает он.
        entry_with_file = entry(urls=[], files=[{"path": "manual/a.html", "url": "https://a.gov/x"}])
        self.assertEqual(check_sources({"a-b": entry_with_file}), [])

    def test_file_without_origin_url_is_caught(self):
        # Без адреса запись нельзя перепроверить, а это главное обещание.
        broken = entry(urls=[], files=[{"path": "manual/a.html"}])
        problems = check_sources({"a-b": broken})
        self.assertTrue(any("нельзя перепроверить" in p for p in problems))

    def test_file_without_path_is_caught(self):
        broken = entry(urls=[], files=[{"url": "https://a.gov/x"}])
        problems = check_sources({"a-b": broken})
        self.assertTrue(any("без path" in p for p in problems))

    def test_file_origin_must_be_https(self):
        broken = entry(urls=[], files=[{"path": "manual/a.html", "url": "http://a.gov/x"}])
        problems = check_sources({"a-b": broken})
        self.assertTrue(any("не по https" in p for p in problems))

    def test_neither_urls_nor_files_is_caught(self):
        problems = check_sources({"a-b": entry(urls=[])})
        self.assertTrue(any("нет ни одного адреса" in p for p in problems))

    def test_volatile_is_optional(self):
        self.assertEqual(check_sources({"a-b": entry()}), [])

    def test_valid_volatile_pattern_passes(self):
        problems = check_sources({"a-b": entry(volatile=[r"Диданд: \d+"])})
        self.assertEqual(problems, [])

    def test_broken_volatile_pattern_is_caught(self):
        problems = check_sources({"a-b": entry(volatile=["Диданд: [\\d+"])})
        self.assertTrue(any("volatile" in p for p in problems))

    def test_missing_field_is_reported(self):
        broken = entry()
        del broken["approvedBy"]
        problems = check_sources({"a-b": broken})
        self.assertTrue(any("approvedBy" in p for p in problems))


if __name__ == "__main__":
    unittest.main()
