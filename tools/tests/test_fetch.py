import json
import tempfile
import unittest
from pathlib import Path

from tools.fetch import USER_AGENT, save_snapshots


class TestUserAgent(unittest.TestCase):
    def test_is_encodable_as_latin1(self):
        # Значения заголовков HTTP кодируются в latin-1. Кириллица в
        # User-Agent роняет запрос ещё до отправки — так и случилось
        # на первом же настоящем скачивании.
        USER_AGENT.encode("latin-1")


class TestSaveSnapshots(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def fake_fetcher(self, url):
        return f"<html><body><p>Текст {url}</p></body></html>"

    def test_writes_one_file_per_url(self):
        save_snapshots(
            self.root,
            "primer",
            ["https://a.gov/1", "https://a.gov/2"],
            "2026-09-03",
            self.fake_fetcher,
        )
        folder = self.root / "raw" / "primer" / "2026-09-03"
        self.assertTrue((folder / "00.txt").exists())
        self.assertTrue((folder / "01.txt").exists())

    def test_meta_records_url_and_hash(self):
        meta = save_snapshots(
            self.root, "primer", ["https://a.gov/1"], "2026-09-03", self.fake_fetcher
        )
        self.assertEqual(meta["pages"][0]["url"], "https://a.gov/1")
        self.assertTrue(meta["pages"][0]["contentHash"].startswith("sha256:"))
        self.assertEqual(meta["fetchedAt"], "2026-09-03")

    def test_meta_is_written_to_disk(self):
        save_snapshots(
            self.root, "primer", ["https://a.gov/1"], "2026-09-03", self.fake_fetcher
        )
        path = self.root / "raw" / "primer" / "2026-09-03" / "meta.json"
        self.assertEqual(json.loads(path.read_text("utf-8"))["programId"], "primer")

    def test_saved_text_is_plain_not_html(self):
        save_snapshots(
            self.root, "primer", ["https://a.gov/1"], "2026-09-03", self.fake_fetcher
        )
        text = (self.root / "raw" / "primer" / "2026-09-03" / "00.txt").read_text("utf-8")
        self.assertNotIn("<p>", text)
        self.assertIn("Текст", text)

    def test_same_content_gives_same_hash_on_rerun(self):
        first = save_snapshots(
            self.root, "primer", ["https://a.gov/1"], "2026-09-03", self.fake_fetcher
        )
        second = save_snapshots(
            self.root, "primer", ["https://a.gov/1"], "2026-09-04", self.fake_fetcher
        )
        self.assertEqual(
            first["pages"][0]["contentHash"], second["pages"][0]["contentHash"]
        )


if __name__ == "__main__":
    unittest.main()
