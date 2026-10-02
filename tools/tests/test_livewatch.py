import tempfile
import unittest
from pathlib import Path

from tools.livewatch import UNSTABLE, load_state, save_state, watch_pages
from tools.snapshot import sha256_of_text, strip_volatile
from tools.fetch import page_to_text


def page(body):
    return f"<html><body>{body}</body></html>".encode("utf-8")


def digest(body):
    return sha256_of_text(strip_volatile(page_to_text(page(body)), []))


class TestWatchPages(unittest.TestCase):
    def test_first_load_sets_baseline_without_alarm(self):
        hashes, changed, gone = watch_pages(["https://a/"], [], {}, lambda url: page("one"))
        self.assertEqual(changed, [])
        self.assertEqual(gone, [])
        self.assertEqual(hashes["https://a/"], digest("one"))

    def test_same_page_later_is_quiet(self):
        previous = {"https://a/": digest("one")}
        _, changed, _ = watch_pages(["https://a/"], [], previous, lambda url: page("one"))
        self.assertEqual(changed, [])

    def test_changed_page_is_reported_once_and_baseline_moves(self):
        previous = {"https://a/": digest("one")}
        hashes, changed, _ = watch_pages(["https://a/"], [], previous, lambda url: page("two"))
        self.assertEqual(changed, ["https://a/"])
        _, again, _ = watch_pages(["https://a/"], [], hashes, lambda url: page("two"))
        self.assertEqual(again, [])

    def test_page_that_differs_between_two_loads_is_unstable(self):
        bodies = iter(["x1", "x2"])
        hashes, changed, _ = watch_pages(["https://a/"], [], {}, lambda url: page(next(bodies)))
        self.assertEqual(hashes["https://a/"], UNSTABLE)
        self.assertEqual(changed, [])

    def test_unstable_page_is_not_watched(self):
        _, changed, _ = watch_pages(["https://a/"], [], {"https://a/": UNSTABLE}, lambda url: page("any"))
        self.assertEqual(changed, [])

    def test_unreachable_page_keeps_old_hash(self):
        def broken(url):
            raise OSError("down")

        previous = {"https://a/": digest("one")}
        hashes, changed, gone = watch_pages(["https://a/"], [], previous, broken)
        self.assertEqual(gone, ["https://a/"])
        self.assertEqual(changed, [])
        self.assertEqual(hashes, previous)

    def test_volatile_part_is_ignored(self):
        previous = {"https://a/": sha256_of_text(strip_volatile(page_to_text(page("text views: 1")), [r"views: \d+"]))}
        _, changed, _ = watch_pages(["https://a/"], [r"views: \d+"], previous, lambda url: page("text views: 99"))
        self.assertEqual(changed, [])


class TestState(unittest.TestCase):
    def test_roundtrip_and_missing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "watch" / "live-hashes.json"
            self.assertEqual(load_state(path), {})
            save_state(path, {"p": {"checked": "2026-10-02", "pages": {"u": "h"}}})
            self.assertEqual(load_state(path)["p"]["pages"]["u"], "h")


if __name__ == "__main__":
    unittest.main()
