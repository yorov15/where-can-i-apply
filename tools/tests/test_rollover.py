import json
import tempfile
import unittest
from pathlib import Path

from tools.rollover import closed_programs, next_year, page_urls, report, scan, year_hits


class TestYearHits(unittest.TestCase):
    def test_finds_year_with_context(self):
        hits = year_hits("Applications for the 2027 intake open in March.", 2027)
        self.assertEqual(len(hits), 1)
        self.assertIn("2027 intake", hits[0])

    def test_ignores_year_inside_longer_number(self):
        self.assertEqual(year_hits("Order 120275 and 20271", 2027), [])

    def test_limits_hits(self):
        self.assertEqual(len(year_hits("2027 2027 2027 2027", 2027)), 2)


class TestNextYear(unittest.TestCase):
    def test_year_after_closing(self):
        self.assertEqual(next_year("2026-06-15"), 2027)


class TestPageUrls(unittest.TestCase):
    def test_merges_urls_and_files_without_duplicates(self):
        entry = {
            "urls": ["https://a/"],
            "files": [{"path": "x", "url": "https://a/"}, {"path": "y", "url": "https://b/"}],
        }
        self.assertEqual(page_urls(entry), ["https://a/", "https://b/"])


class TestClosedPrograms(unittest.TestCase):
    def test_only_closed_sorted_by_date(self):
        with tempfile.TemporaryDirectory() as tmp:
            for pid, closes in [("b", "2026-05-01"), ("a", "2026-03-01"), ("c", "2027-01-01"), ("d", None)]:
                (Path(tmp) / f"{pid}.json").write_text(
                    json.dumps({"id": pid, "deadline": {"closes": closes}}), encoding="utf-8"
                )
            found = closed_programs(Path(tmp), "2026-10-02")
        self.assertEqual([p["id"] for p in found], ["a", "b"])


class TestScan(unittest.TestCase):
    program = {"id": "p", "deadline": {"closes": "2026-03-01"}}

    def test_reports_page_with_next_year(self):
        sources = {"p": {"urls": ["https://x/"]}}
        hits = scan(
            self.program, sources, lambda url: b"<html><body>Apply by 15 March 2027 please</body></html>"
        )
        self.assertEqual(hits[0][0], "https://x/")

    def test_unreachable_page_is_skipped(self):
        def broken(url):
            raise OSError("down")

        self.assertEqual(scan(self.program, {"p": {"urls": ["https://x/"]}}, broken), [])


class TestReport(unittest.TestCase):
    def test_empty_report_when_nothing_found(self):
        self.assertEqual(report([], "2026-10-02"), "")

    def test_report_names_program_and_url(self):
        program = {"id": "p", "name": {"ru": "Вуз"}, "deadline": {"closes": "2026-03-01"}}
        text = report([(program, [("https://x/", "deadline 2027")])], "2026-10-02")
        self.assertIn("Вуз", text)
        self.assertIn("https://x/", text)


if __name__ == "__main__":
    unittest.main()
