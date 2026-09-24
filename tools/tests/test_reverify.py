import json
import tempfile
import unittest
from pathlib import Path

from tools.reverify import (
    deadline_seen,
    page_diff,
    prune_identical,
    refreshed,
    report_for,
)
from tools.snapshot import sha256_of_text

URL = "https://a.gov/apply"


def write_snapshot(root: Path, program_id: str, day: str, text: str) -> str:
    folder = root / "raw" / program_id / day
    folder.mkdir(parents=True)
    (folder / "00.txt").write_text(text, encoding="utf-8")
    digest = sha256_of_text(text)
    meta = {
        "programId": program_id,
        "fetchedAt": day,
        "pages": [{"url": URL, "file": "00.txt", "kind": "html", "origin": "web", "contentHash": digest}],
    }
    (folder / "meta.json").write_text(json.dumps(meta), encoding="utf-8")
    return digest


def program_with(quote: str, digest: str, closes="2027-01-04") -> dict:
    return {
        "id": "primer",
        "eligibility": {
            "citizenship": {"allow": "*", "evidence": quote},
            "graduationYear": {
                "noLimit": True,
                "evidence": None,
                "checkedBy": "assistant",
                "checkedAt": "2026-09-01",
                "note": "года выпуска нет",
            },
        },
        "textConditions": [],
        "deadline": {"opens": None, "closes": closes, "recurring": "annual", "confidence": "confirmed"},
        "source": {
            "url": URL,
            "lastVerified": "2026-09-01",
            "pages": [{"url": URL, "contentHash": digest}],
            "approvedBy": "assistant",
            "humanChecked": False,
        },
    }


class TestDeadlineSeen(unittest.TestCase):
    def test_none_when_record_has_no_date(self):
        self.assertIsNone(deadline_seen(None, "January 4"))

    def test_finds_month_day(self):
        self.assertTrue(deadline_seen("2027-01-04", "Regular Action: January 4, 2027"))

    def test_finds_day_month(self):
        self.assertTrue(deadline_seen("2027-01-04", "Deadline 4 January 2027"))

    def test_finds_ordinal_and_short_month(self):
        self.assertTrue(deadline_seen("2027-01-04", "due Jan. 4th"))

    def test_finds_iso_date(self):
        self.assertTrue(deadline_seen("2027-01-04", "closes 2027-01-04"))

    def test_other_day_is_not_a_match(self):
        self.assertFalse(deadline_seen("2027-01-04", "Regular Action: January 5, 2027"))

    def test_day_inside_bigger_number_is_not_a_match(self):
        self.assertFalse(deadline_seen("2027-01-04", "January 14, 2027"))


class TestPageDiff(unittest.TestCase):
    def test_reports_removed_and_added(self):
        removed, added, n_removed, n_added = page_diff(
            "Apply by January 4. Fee is 75 dollars.",
            "Apply by January 5. Fee is 75 dollars.",
        )
        self.assertEqual(removed, ["Apply by January 4."])
        self.assertEqual(added, ["Apply by January 5."])
        self.assertEqual((n_removed, n_added), (1, 1))

    def test_identical_text_has_no_diff(self):
        self.assertEqual(page_diff("One. Two.", "One. Two.")[2:], (0, 0))


class TestReportFor(unittest.TestCase):
    def test_ok_when_quote_and_hash_match(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            digest = write_snapshot(root, "primer", "2026-09-24", "Citizenship does not matter. Jan 4.")
            result = report_for(root, program_with("Citizenship does not matter", digest))
        self.assertEqual(result["state"], "OK")
        self.assertEqual(result["problems"], [])

    def test_broken_when_quote_is_gone(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            digest = write_snapshot(root, "primer", "2026-09-24", "Page was rewritten. Jan 4.")
            result = report_for(root, program_with("Citizenship does not matter", digest))
        self.assertEqual(result["state"], "BROKEN")
        self.assertEqual(len(result["problems"]), 1)

    def test_changed_when_hash_differs_but_quotes_hold(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_snapshot(root, "primer", "2026-09-19", "Citizenship does not matter. Deadline Jan 4.")
            write_snapshot(root, "primer", "2026-09-24", "Citizenship does not matter. Deadline Jan 5.")
            old_digest = sha256_of_text("Citizenship does not matter. Deadline Jan 4.")
            result = report_for(root, program_with("Citizenship does not matter", old_digest))
        self.assertEqual(result["state"], "CHANGED")
        self.assertEqual(result["changed"][0]["added"], ["Deadline Jan 5."])
        self.assertFalse(result["deadlineSeen"])

    def test_no_snapshot_is_reported_not_crashed(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = report_for(Path(tmp), program_with("x", "sha256:x"))
        self.assertEqual(result["state"], "NO_SNAPSHOT")


class TestRefreshed(unittest.TestCase):
    def test_hash_and_date_move_and_nothing_else(self):
        program = program_with("q", "sha256:old")
        meta = {"fetchedAt": "2026-09-24", "pages": [{"url": URL, "file": "00.txt", "contentHash": "sha256:new"}]}
        updated = refreshed(program, meta)
        self.assertEqual(updated["source"]["pages"], [{"url": URL, "contentHash": "sha256:new"}])
        self.assertEqual(updated["source"]["lastVerified"], "2026-09-24")
        self.assertEqual(updated["source"]["approvedBy"], "assistant")
        self.assertEqual(updated["eligibility"], program["eligibility"])
        self.assertEqual(program["source"]["lastVerified"], "2026-09-01")

    def test_date_never_moves_backwards(self):
        program = program_with("q", "sha256:old")
        program["source"]["lastVerified"] = "2026-09-30"
        meta = {"fetchedAt": "2026-09-24", "pages": [{"url": URL, "file": "00.txt", "contentHash": "sha256:n"}]}
        self.assertEqual(refreshed(program, meta)["source"]["lastVerified"], "2026-09-30")


class TestPruneIdentical(unittest.TestCase):
    def test_identical_new_snapshot_is_removed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_snapshot(root, "primer", "2026-09-19", "Same text.")
            write_snapshot(root, "primer", "2026-09-24", "Same text.")
            self.assertTrue(prune_identical(root, "primer"))
            self.assertFalse((root / "raw" / "primer" / "2026-09-24").exists())
            self.assertTrue((root / "raw" / "primer" / "2026-09-19").exists())

    def test_different_new_snapshot_is_kept(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_snapshot(root, "primer", "2026-09-19", "Old text.")
            write_snapshot(root, "primer", "2026-09-24", "New text.")
            self.assertFalse(prune_identical(root, "primer"))
            self.assertTrue((root / "raw" / "primer" / "2026-09-24").exists())


if __name__ == "__main__":
    unittest.main()
