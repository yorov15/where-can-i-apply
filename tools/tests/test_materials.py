import copy
import json
import tempfile
import unittest
from pathlib import Path

from tools import materials
from tools.snapshot import sha256_of_text

PAGE = (
    "Application documents. Applicants must submit two letters of recommendation "
    "from teachers. Essay 1: Describe your motivation to study at our university. "
    "(maximum 1,500 characters). An interview is optional."
)
URL = "https://example.ac.kr/apply"
HASH = sha256_of_text(PAGE)


def item(**changes):
    base = {
        "type": "recommendation",
        "need": "required",
        "count": 2,
        "limit": None,
        "prompt": None,
        "who": "teacher",
        "language": "en",
        "via": "upload",
        "ru": "Два письма от учителей.",
        "evidence": "Applicants must submit two letters of recommendation from teachers.",
        "source": {"url": URL, "lastVerified": "2026-11-20", "contentHash": HASH},
    }
    base.update(changes)
    return base


ESSAY = item(
    type="essay", count=None, who=None, limit={"unit": "chars", "max": 1500},
    prompt="Describe your motivation to study at our university.",
    ru="Эссе о мотивации до 1500 знаков.",
    evidence="Essay 1: Describe your motivation to study at our university. (maximum 1,500 characters)",
)


class MaterialsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "data" / "programs").mkdir(parents=True)
        (self.root / "data" / "programs" / "demo.json").write_text("{}", encoding="utf-8")
        (self.root / "data" / "materials").mkdir()
        snap = self.root / "raw" / "demo" / "2026-11-20"
        snap.mkdir(parents=True)
        (snap / "00.txt").write_text(PAGE, encoding="utf-8")
        (snap / "meta.json").write_text(json.dumps({
            "programId": "demo", "fetchedAt": "2026-11-20",
            "pages": [{"url": URL, "file": "00.txt", "contentHash": HASH}],
        }), encoding="utf-8")
        self.file = {"id": "demo", "checkedAt": "2026-11-20", "items": [item(), copy.deepcopy(ESSAY)],
                     "notStated": ["video"], "note": None}

    def tearDown(self):
        self.tmp.cleanup()

    def problems(self, data=None):
        path = self.root / "data" / "materials" / "demo.json"
        path.write_text(json.dumps(data or self.file, ensure_ascii=False), encoding="utf-8")
        return materials.check_file(self.root, path, today="2026-11-25")

    def test_valid_file(self):
        self.assertEqual(self.problems(), [])

    def test_quote_must_be_on_page(self):
        self.file["items"][0]["evidence"] = "Applicants must submit three letters."
        self.assertTrue(any("цитата не найдена" in p for p in self.problems()))

    def test_prompt_must_be_verbatim(self):
        self.file["items"][1]["prompt"] = "Why do you want to study here?"
        self.assertTrue(any("вопрос не найден" in p for p in self.problems()))

    def test_source_must_match_snapshot_hash_and_date(self):
        self.file["items"][0]["source"]["contentHash"] = "sha256:" + "0" * 64
        self.assertTrue(any("нет снимка" in p for p in self.problems()))
        self.file["items"][0]["source"]["contentHash"] = HASH
        self.file["items"][0]["source"]["lastVerified"] = "2026-11-21"
        self.assertTrue(any("нет снимка" in p for p in self.problems()))

    def test_count_and_limit_need_number_in_quote(self):
        self.file["items"][0]["count"] = 3
        self.assertTrue(any("count" in p for p in self.problems()))
        self.file["items"][0]["count"] = 2
        self.file["items"][1]["limit"]["max"] = 2000
        self.assertTrue(any("limit.max" in p for p in self.problems()))

    def test_thousands_separator_counts(self):
        self.assertIn(1500, materials.numbers_in("maximum 1,500 characters"))
        self.assertIn(2, materials.numbers_in("two letters"))

    def test_who_only_for_recommendation(self):
        self.file["items"][1]["who"] = "teacher"
        self.assertTrue(any(".who" in p for p in self.problems()))

    def test_type_cannot_be_both_present_and_not_stated(self):
        self.file["notStated"] = ["essay"]
        self.assertTrue(any("notStated" in p for p in self.problems()))

    def test_extra_or_missing_keys_rejected(self):
        self.file["items"][0]["extra"] = 1
        self.assertTrue(self.problems())
        del self.file["items"][0]["extra"]
        del self.file["note"]
        self.assertTrue(self.problems())

    def test_empty_file_rejected(self):
        self.file["items"], self.file["notStated"] = [], []
        self.assertTrue(any("пустой файл" in p for p in self.problems()))

    def test_id_matches_known_program(self):
        self.file["id"] = "other"
        self.assertTrue(any("не совпадает" in p for p in self.problems()))

    def test_future_check_date_rejected(self):
        self.file["checkedAt"] = "2026-12-01"
        self.assertTrue(any("checkedAt" in p for p in self.problems()))

    def test_duplicate_item_rejected(self):
        self.file["items"].append(item())
        self.assertTrue(any("повторяется" in p for p in self.problems()))


class RepositoryMaterialsTest(unittest.TestCase):
    """Всё, что лежит в data/materials, проходит проверку — иначе CI красный."""

    def test_repository_files_are_valid(self):
        root = Path(__file__).resolve().parents[2]
        bad = {pid: p for pid, p in materials.check_all(root).items() if p}
        self.assertEqual(bad, {})


if __name__ == "__main__":
    unittest.main()
