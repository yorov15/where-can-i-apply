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

    def test_counter_change_does_not_change_hash(self):
        # Настоящий случай с ntc.tj: счётчик просмотров растёт при каждом
        # заходе. Без чистки слежение сообщало бы об изменении требований
        # после каждой проверки, и на него перестали бы смотреть.
        volatile = [r"Просмотров: \d+"]
        first = save_snapshots(
            self.root,
            "primer",
            ["https://a.gov/1"],
            "2026-09-03",
            lambda url: "<p>Правила Просмотров: 41 конец</p>",
            volatile,
        )
        second = save_snapshots(
            self.root,
            "primer",
            ["https://a.gov/1"],
            "2026-09-04",
            lambda url: "<p>Правила Просмотров: 42 конец</p>",
            volatile,
        )
        self.assertEqual(
            first["pages"][0]["contentHash"], second["pages"][0]["contentHash"]
        )

    def test_real_change_still_changes_hash(self):
        volatile = [r"Просмотров: \d+"]
        first = save_snapshots(
            self.root,
            "primer",
            ["https://a.gov/1"],
            "2026-09-03",
            lambda url: "<p>Возраст до 21 Просмотров: 41</p>",
            volatile,
        )
        second = save_snapshots(
            self.root,
            "primer",
            ["https://a.gov/1"],
            "2026-09-04",
            lambda url: "<p>Возраст до 22 Просмотров: 41</p>",
            volatile,
        )
        self.assertNotEqual(
            first["pages"][0]["contentHash"], second["pages"][0]["contentHash"]
        )

    def test_saved_text_keeps_the_volatile_part(self):
        # В файле текст сохраняется целиком: по нему проверяются цитаты,
        # и вырезать из него куски нельзя.
        save_snapshots(
            self.root,
            "primer",
            ["https://a.gov/1"],
            "2026-09-03",
            lambda url: "<p>Правила Просмотров: 41</p>",
            [r"Просмотров: \d+"],
        )
        text = (self.root / "raw" / "primer" / "2026-09-03" / "00.txt").read_text("utf-8")
        self.assertIn("Просмотров: 41", text)

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
