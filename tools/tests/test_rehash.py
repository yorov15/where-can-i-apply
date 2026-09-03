import unittest

from tools.rehash import rehash_meta
from tools.snapshot import sha256_of_text


def meta_with(hash_value):
    return {
        "programId": "primer",
        "fetchedAt": "2026-09-03",
        "pages": [{"url": "https://a.gov/1", "file": "00.txt", "contentHash": hash_value}],
    }


class TestRehashMeta(unittest.TestCase):
    def test_stale_hash_is_replaced(self):
        texts = {"00.txt": "Правила приёма"}
        updated = rehash_meta(meta_with("sha256:устарел"), texts)
        self.assertEqual(
            updated["pages"][0]["contentHash"], sha256_of_text("Правила приёма")
        )

    def test_volatile_part_is_excluded(self):
        texts = {"00.txt": "Правила Диданд: 48745"}
        updated = rehash_meta(meta_with("sha256:x"), texts, [r"Диданд: \d+"])
        self.assertEqual(updated["pages"][0]["contentHash"], sha256_of_text("Правила"))

    def test_input_is_not_mutated(self):
        original = meta_with("sha256:старый")
        rehash_meta(original, {"00.txt": "текст"})
        self.assertEqual(original["pages"][0]["contentHash"], "sha256:старый")

    def test_url_and_file_survive(self):
        updated = rehash_meta(meta_with("sha256:x"), {"00.txt": "текст"})
        self.assertEqual(updated["pages"][0]["url"], "https://a.gov/1")
        self.assertEqual(updated["pages"][0]["file"], "00.txt")

    def test_new_normalization_rules_are_applied(self):
        # Текст со старой нормализацией мог сохранить неразрывный дефис;
        # пересчёт обязан привести его к обычному, как это делает нынешний
        # html_to_text при свежем скачивании.
        texts = {"00.txt": "синфи 11‑ум"}
        updated = rehash_meta(meta_with("sha256:x"), texts)
        self.assertEqual(updated["pages"][0]["contentHash"], sha256_of_text("синфи 11-ум"))


if __name__ == "__main__":
    unittest.main()
