import json
import tempfile
import unittest
from pathlib import Path

from tools.links import classify, collect, urls_in_text


class TestUrlsInText(unittest.TestCase):
    def test_strips_trailing_punctuation(self):
        self.assertEqual(urls_in_text("см. https://a.gov/x, и https://b.gov/y."), {"https://a.gov/x", "https://b.gov/y"})

    def test_stops_at_quote_and_bracket(self):
        self.assertEqual(urls_in_text('<a href="https://a.gov/x">(https://b.gov/y)'), {"https://a.gov/x", "https://b.gov/y"})


class TestClassify(unittest.TestCase):
    def base(self, **changes):
        result = {"url": "https://a.gov/x", "status": 200, "final": "https://a.gov/x", "hops": [], "error": None}
        result.update(changes)
        return result

    def test_ok(self):
        self.assertEqual(classify(self.base()), "OK")

    def test_404_is_dead(self):
        self.assertEqual(classify(self.base(status=404)), "DEAD")

    def test_network_error_is_dead(self):
        self.assertEqual(classify(self.base(status=None, error="URLError")), "DEAD")

    def test_redirect_to_other_address_is_moved(self):
        result = self.base(final="https://a.gov/new", hops=[{"code": 301, "to": "https://a.gov/new"}])
        self.assertEqual(classify(result), "MOVED")

    def test_trailing_slash_redirect_is_not_moved(self):
        result = self.base(final="https://a.gov/x/", hops=[{"code": 301, "to": "https://a.gov/x/"}])
        self.assertEqual(classify(result), "OK")


class TestCollect(unittest.TestCase):
    def test_gathers_apply_source_and_pages(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "data" / "programs").mkdir(parents=True)
            (root / "data" / "programs" / "p.json").write_text(
                json.dumps(
                    {
                        "applyUrl": "https://a.gov/apply",
                        "source": {"url": "https://a.gov/s", "pages": [{"url": "https://a.gov/s"}, {"url": "https://a.gov/t"}]},
                    }
                ),
                encoding="utf-8",
            )
            (root / "faq.html").write_text('<a href="https://x.org/z">', encoding="utf-8")
            found = collect(root)
            self.assertEqual(set(found), {"https://a.gov/apply", "https://a.gov/s", "https://a.gov/t", "https://x.org/z"})
            self.assertEqual(set(collect(root, only_apply=True)), {"https://a.gov/apply"})


if __name__ == "__main__":
    unittest.main()
