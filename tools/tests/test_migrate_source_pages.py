import json
import unittest

from tools.migrate_source_pages import migrate
from tools.snapshot import source_fingerprint

META = {
    "programId": "primer",
    "pages": [
        {"url": "https://a.gov/apply", "file": "00.txt", "contentHash": "sha256:1"},
        {"url": "https://a.gov/partners", "file": "01.txt", "contentHash": "sha256:2"},
        {"url": "https://a.gov/call.pdf", "file": "02.txt", "contentHash": "sha256:3"},
    ],
}


def record(**source):
    return {"id": "primer", "eligibility": {}, "source": source}


class TestMigrate(unittest.TestCase):
    def test_writes_every_page(self):
        migrated, _ = migrate(
            record(url="https://a.gov/apply", contentHash="sha256:1"), META
        )
        self.assertEqual(
            [page["url"] for page in migrated["source"]["pages"]],
            ["https://a.gov/apply", "https://a.gov/partners", "https://a.gov/call.pdf"],
        )

    def test_drops_the_single_hash(self):
        migrated, _ = migrate(
            record(url="https://a.gov/apply", contentHash="sha256:1"), META
        )
        self.assertNotIn("contentHash", migrated["source"])

    def test_stale_record_is_left_alone(self):
        # Снимок успел обновиться, а запись — нет. Переписать хеши значило
        # бы объявить проверенным то, чего человек не видел.
        program = record(url="https://a.gov/apply", contentHash="sha256:старое")
        migrated, note = migrate(program, META)
        self.assertIs(migrated, program)
        self.assertIn("снимок новее", note)

    def test_already_migrated_record_is_untouched(self):
        program = record(
            url="https://a.gov/apply",
            pages=[{"url": "https://a.gov/apply", "contentHash": "sha256:1"}],
        )
        migrated, note = migrate(program, META)
        self.assertIs(migrated, program)
        self.assertEqual(note, "уже перенесена")

    def test_refusals_move_to_the_new_fingerprint(self):
        # Человек отвечал, глядя на объединённый текст всех страниц —
        # значит отказ относится ко всему набору, а не к первой странице.
        program = record(url="https://a.gov/apply", contentHash="sha256:1")
        program["leftEmpty"] = {"schoolYears": "sha256:1"}
        migrated, _ = migrate(program, META)
        self.assertEqual(
            migrated["leftEmpty"], {"schoolYears": source_fingerprint(META["pages"])}
        )

    def test_record_without_refusals_gains_none(self):
        migrated, _ = migrate(
            record(url="https://a.gov/apply", contentHash="sha256:1"), META
        )
        self.assertNotIn("leftEmpty", migrated)

    def test_does_not_mutate_input(self):
        program = record(url="https://a.gov/apply", contentHash="sha256:1")
        before = json.dumps(program, sort_keys=True)
        migrate(program, META)
        self.assertEqual(json.dumps(program, sort_keys=True), before)


if __name__ == "__main__":
    unittest.main()
