import json
import tempfile
import unittest
from pathlib import Path

from tools.fetch import (
    USER_AGENT,
    kind_of,
    latest_snapshot,
    page_to_text,
    save_snapshots,
    with_retries,
)
from tools.tests.test_pdf import make_pdf


class TestKindDetection(unittest.TestCase):
    def test_pdf_is_recognised_by_its_own_bytes(self):
        # Не по адресу и не по заголовку ответа: ссылка без .pdf в конце
        # вполне может отдавать PDF, и наоборот.
        self.assertEqual(kind_of(make_pdf([["hello"]])), "pdf")

    def test_html_is_the_default(self):
        self.assertEqual(kind_of(b"<html><p>hi</p></html>"), "html")

    def test_pdf_text_is_extracted(self):
        data = make_pdf([["Under 21 years of age"]])
        self.assertIn("Under 21 years of age", page_to_text(data))

    def test_html_text_is_extracted(self):
        self.assertEqual(page_to_text("<p>Текст</p>".encode("utf-8")), "Текст")


class TestUserAgent(unittest.TestCase):
    def test_is_encodable_as_latin1(self):
        # Значения заголовков HTTP кодируются в latin-1. Кириллица в
        # User-Agent роняет запрос ещё до отправки — так и случилось
        # на первом же настоящем скачивании.
        USER_AGENT.encode("latin-1")


class TestRetries(unittest.TestCase):
    def test_gives_up_only_after_all_attempts(self):
        calls = []

        def flaky(url):
            calls.append(url)
            if len(calls) < 3:
                raise TimeoutError("связь оборвалась")
            return b"<p>ok</p>"

        fetch = with_retries(flaky, attempts=3, sleep=lambda _: None)
        self.assertEqual(fetch("https://a.gov/1"), b"<p>ok</p>")
        self.assertEqual(len(calls), 3)

    def test_raises_the_last_error_when_all_attempts_fail(self):
        def broken(url):
            raise TimeoutError("связь оборвалась")

        fetch = with_retries(broken, attempts=2, sleep=lambda _: None)
        with self.assertRaises(TimeoutError):
            fetch("https://a.gov/1")

    def test_success_does_not_retry(self):
        calls = []
        fetch = with_retries(lambda url: calls.append(url) or b"x", sleep=lambda _: None)
        fetch("https://a.gov/1")
        self.assertEqual(len(calls), 1)


class TestLatestSnapshot(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def make(self, day: str, finished: bool):
        folder = self.root / "raw" / "primer" / day
        folder.mkdir(parents=True)
        (folder / "00.txt").write_text("текст", encoding="utf-8")
        if finished:
            (folder / "meta.json").write_text("{}", encoding="utf-8")
        return folder

    def test_no_snapshots_at_all(self):
        self.assertIsNone(latest_snapshot(self.root, "primer"))

    def test_unfinished_snapshot_is_ignored(self):
        # Папка без meta.json осталась от прерванного скачивания. Взять её
        # за снимок значит проверять цитаты по обрубку текста.
        self.make("2026-09-04", finished=False)
        self.assertIsNone(latest_snapshot(self.root, "primer"))

    def test_newer_unfinished_does_not_hide_older_finished(self):
        good = self.make("2026-09-03", finished=True)
        self.make("2026-09-04", finished=False)
        self.assertEqual(latest_snapshot(self.root, "primer"), good)

    def test_newest_finished_wins(self):
        self.make("2026-09-03", finished=True)
        newer = self.make("2026-09-04", finished=True)
        self.assertEqual(latest_snapshot(self.root, "primer"), newer)


class TestSaveSnapshots(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def fake_fetcher(self, url):
        return f"<html><body><p>Текст {url}</p></body></html>".encode("utf-8")

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
            lambda url: "<p>Правила Просмотров: 41 конец</p>".encode("utf-8"),
            volatile,
        )
        second = save_snapshots(
            self.root,
            "primer",
            ["https://a.gov/1"],
            "2026-09-04",
            lambda url: "<p>Правила Просмотров: 42 конец</p>".encode("utf-8"),
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
            lambda url: "<p>Возраст до 21 Просмотров: 41</p>".encode("utf-8"),
            volatile,
        )
        second = save_snapshots(
            self.root,
            "primer",
            ["https://a.gov/1"],
            "2026-09-04",
            lambda url: "<p>Возраст до 22 Просмотров: 41</p>".encode("utf-8"),
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
            lambda url: "<p>Правила Просмотров: 41</p>".encode("utf-8"),
            [r"Просмотров: \d+"],
        )
        text = (self.root / "raw" / "primer" / "2026-09-03" / "00.txt").read_text("utf-8")
        self.assertIn("Просмотров: 41", text)

    def test_pdf_goes_through_the_same_path(self):
        # После извлечения PDF перестаёт быть особенным: тот же .txt,
        # тот же хеш, та же проверка цитат.
        meta = save_snapshots(
            self.root,
            "primer",
            ["https://a.gov/rules.pdf"],
            "2026-09-04",
            lambda url: make_pdf([["Applicants must be under 25 years old"]]),
        )
        self.assertEqual(meta["pages"][0]["kind"], "pdf")
        text = (self.root / "raw" / "primer" / "2026-09-04" / "00.txt").read_text("utf-8")
        self.assertIn("Applicants must be under 25 years old", text)

    def test_meta_records_kind_for_pages_too(self):
        meta = save_snapshots(
            self.root, "primer", ["https://a.gov/1"], "2026-09-04", self.fake_fetcher
        )
        self.assertEqual(meta["pages"][0]["kind"], "html")

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
