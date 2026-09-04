import unittest

from tools.check import compare_pages, days_until, frequency_for, is_due
from tools.fetch import page_to_text
from tools.snapshot import sha256_of_text, strip_volatile


def deadline(closes):
    return {"opens": None, "closes": closes, "recurring": "annual", "confidence": "confirmed"}


class TestDaysUntil(unittest.TestCase):
    def test_counts_days(self):
        self.assertEqual(days_until("2026-09-13", "2026-09-03"), 10)

    def test_past_deadline_is_negative(self):
        self.assertEqual(days_until("2026-09-01", "2026-09-03"), -2)

    def test_missing_date_is_none(self):
        self.assertIsNone(days_until(None, "2026-09-03"))


class TestFrequency(unittest.TestCase):
    def test_close_deadline_checked_daily(self):
        self.assertEqual(frequency_for(deadline("2026-09-20"), "2026-09-03"), "daily")

    def test_medium_deadline_checked_weekly(self):
        self.assertEqual(frequency_for(deadline("2026-10-20"), "2026-09-03"), "weekly")

    def test_far_deadline_checked_monthly(self):
        self.assertEqual(frequency_for(deadline("2027-06-01"), "2026-09-03"), "monthly")

    def test_unknown_deadline_checked_monthly(self):
        self.assertEqual(frequency_for(deadline(None), "2026-09-03"), "monthly")

    def test_passed_deadline_checked_monthly(self):
        self.assertEqual(frequency_for(deadline("2026-08-01"), "2026-09-03"), "monthly")

    def test_boundary_thirty_days_is_weekly(self):
        self.assertEqual(frequency_for(deadline("2026-10-03"), "2026-09-03"), "weekly")


class TestIsDue(unittest.TestCase):
    def test_never_verified_is_due(self):
        program = {"deadline": deadline("2027-06-01"), "source": {"lastVerified": None}}
        self.assertTrue(is_due(program, "2026-09-03"))

    def test_verified_today_is_not_due(self):
        program = {"deadline": deadline("2026-09-20"), "source": {"lastVerified": "2026-09-03"}}
        self.assertFalse(is_due(program, "2026-09-03"))

    def test_daily_program_is_due_next_day(self):
        program = {"deadline": deadline("2026-09-20"), "source": {"lastVerified": "2026-09-02"}}
        self.assertTrue(is_due(program, "2026-09-03"))

    def test_monthly_program_is_not_due_after_a_week(self):
        program = {"deadline": deadline("2027-06-01"), "source": {"lastVerified": "2026-08-27"}}
        self.assertFalse(is_due(program, "2026-09-03"))


if __name__ == "__main__":
    unittest.main()


def page(url, text):
    return {"url": url, "contentHash": sha256_of_text(text)}


def serving(pages_by_url):
    """Поддельная качалка: отдаёт заранее заданный текст или падает."""
    def fetcher(url):
        value = pages_by_url[url]
        if isinstance(value, Exception):
            raise value
        return value.encode("utf-8")
    return fetcher


class TestComparePages(unittest.TestCase):
    def test_unchanged_source_reports_nothing(self):
        pages = [page("https://a.gov/1", "aaa"), page("https://a.gov/2", "bbb")]
        changed, gone = compare_pages(
            pages, [], serving({"https://a.gov/1": "aaa", "https://a.gov/2": "bbb"})
        )
        self.assertEqual((changed, gone), ([], []))

    def test_change_on_the_last_page_is_caught(self):
        # Ровно то, что раньше проходило молча: у Венгрии правила допуска
        # лежат в третьем источнике, в PDF, а следили за первым.
        pages = [
            page("https://a.gov/apply", "aaa"),
            page("https://a.gov/partners", "bbb"),
            page("https://a.gov/call.pdf", "порог возраста 25"),
        ]
        changed, gone = compare_pages(pages, [], serving({
            "https://a.gov/apply": "aaa",
            "https://a.gov/partners": "bbb",
            "https://a.gov/call.pdf": "порог возраста 23",
        }))
        self.assertEqual(changed, ["https://a.gov/call.pdf"])
        self.assertEqual(gone, [])

    def test_names_every_changed_page(self):
        pages = [page("https://a.gov/1", "aaa"), page("https://a.gov/2", "bbb")]
        changed, _ = compare_pages(
            pages, [], serving({"https://a.gov/1": "ccc", "https://a.gov/2": "ddd"})
        )
        self.assertEqual(changed, ["https://a.gov/1", "https://a.gov/2"])

    def test_missing_page_does_not_stop_the_rest(self):
        pages = [page("https://a.gov/1", "aaa"), page("https://a.gov/2", "bbb")]
        changed, gone = compare_pages(pages, [], serving({
            "https://a.gov/1": TimeoutError("нет связи"),
            "https://a.gov/2": "ccc",
        }))
        self.assertEqual(changed, ["https://a.gov/2"])
        self.assertEqual([url for url, _ in gone], ["https://a.gov/1"])

    def test_volatile_noise_is_not_a_change(self):
        # Счётчик просмотров на ntc.tj растёт при каждом заходе. Без этого
        # слежение вопило бы об изменении требований каждый день.
        volatile = ["Диданд: [0-9]+"]
        stored = sha256_of_text(
            strip_volatile(page_to_text("текст Диданд: 1".encode("utf-8")), volatile)
        )
        pages = [{"url": "https://a.gov/1", "contentHash": stored}]
        changed, gone = compare_pages(
            pages, volatile, serving({"https://a.gov/1": "текст Диданд: 48745"})
        )
        self.assertEqual((changed, gone), ([], []))
