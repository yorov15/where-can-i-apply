import tempfile
import unittest
from pathlib import Path
from unittest import mock

from tools import indexnow
from tools.seo import ORIGIN


class IndexNowTest(unittest.TestCase):
    def test_key_file_must_contain_its_own_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "requirements.txt").write_text("x", encoding="utf-8")
            (root / ("a" * 32 + ".txt")).write_text("other", encoding="utf-8")
            with self.assertRaises(SystemExit):
                indexnow.find_key(root)
            (root / ("b" * 32 + ".txt")).write_text("b" * 32 + "\n", encoding="utf-8")
            self.assertEqual(indexnow.find_key(root), "b" * 32)

    def test_select_by_date_prefix_and_origin(self):
        entries = [
            (ORIGIN + "/", None),
            (ORIGIN + "/programs/a.html", "2026-11-20"),
            (ORIGIN + "/programs/b.html", "2026-11-27"),
            (ORIGIN + "/countries/cn.html", "2026-09-03"),
            ("https://evil.example/x", "2026-12-01"),
        ]
        self.assertEqual(indexnow.select(entries, since="2026-11-27"), [ORIGIN + "/programs/b.html"])
        self.assertEqual(indexnow.select(entries, prefixes=("countries/",)), [ORIGIN + "/countries/cn.html"])
        self.assertEqual(len(indexnow.select(entries, everything=True)), 4)

    def test_payload_points_to_live_key(self):
        body = indexnow.payload([ORIGIN + "/"], "c" * 32)
        self.assertEqual(body["host"], "nerio-app.vercel.app")
        self.assertEqual(body["keyLocation"], ORIGIN + "/" + "c" * 32 + ".txt")

    def test_without_send_nothing_leaves_the_machine(self):
        with mock.patch.object(indexnow, "send") as sender, mock.patch("builtins.print"):
            self.assertEqual(indexnow.main(["--all"]), 0)
        sender.assert_not_called()

    def test_repository_has_a_valid_key_and_sitemap(self):
        self.assertRegex(indexnow.find_key(indexnow.ROOT), r"^[0-9a-f]{32}$")
        urls = indexnow.select(indexnow.sitemap_entries(indexnow.ROOT), everything=True)
        self.assertIn(ORIGIN + "/countries/", urls)


if __name__ == "__main__":
    unittest.main()
