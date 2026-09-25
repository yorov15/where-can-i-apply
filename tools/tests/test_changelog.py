import json
import tempfile
import unittest
from pathlib import Path
from xml.etree import ElementTree

from tools.changelog import BASE, feed_xml, record, summarize

ATOM = "{http://www.w3.org/2005/Atom}"


def program(**extra):
    base = {
        "id": "p",
        "name": {"ru": "Пример"},
        "eligibility": {"gpa": {"min": 4, "evidence": "x", "checkedAt": "2026-09-01", "checkedBy": "human"}},
        "deadline": {"closes": "2027-02-20", "confidence": "expected"},
        "coverage": {"tuition": "full"},
        "textConditions": [{"ru": "Условие", "evidence": "q1", "kind": "must", "field": None}],
        "source": {"lastVerified": "2026-09-01"},
    }
    base.update(extra)
    return base


class TestSummarize(unittest.TestCase):
    def test_new_program(self):
        self.assertEqual(summarize(None, program()), ["новая программа"])

    def test_nothing_changed(self):
        self.assertEqual(summarize(program(), program()), [])

    def test_reverification_only_is_not_a_change(self):
        after = program(source={"lastVerified": "2026-09-25", "contentHash": "sha256:1"})
        self.assertEqual(summarize(program(), after), [])

    def test_resigning_the_same_rule_is_not_a_change(self):
        after = program()
        after["eligibility"]["gpa"].update(checkedAt="2026-09-26", checkedBy="assistant")
        self.assertEqual(summarize(program(), after), [])

    def test_rule_change_names_the_field(self):
        after = program()
        after["eligibility"]["gpa"]["min"] = 5
        self.assertEqual(summarize(program(), after), ["правило: средний балл"])

    def test_new_rule_and_deadline(self):
        after = program(deadline={"closes": "2027-03-01", "confidence": "expected"})
        after["eligibility"]["exam"] = {"anyOf": [], "evidence": "y"}
        self.assertEqual(summarize(program(), after), ["правило: экзамен", "срок"])

    def test_quote_reworded_but_text_same_is_not_a_change(self):
        after = program(textConditions=[{"ru": "Условие", "evidence": "другая цитата", "kind": "must", "field": None}])
        self.assertEqual(summarize(program(), after), [])

    def test_condition_text_change(self):
        after = program(textConditions=[{"ru": "Новое условие", "evidence": "q1", "kind": "must", "field": None}])
        self.assertEqual(summarize(program(), after), ["условия текстом"])

    def test_fee_change_counts_as_conditions(self):
        with_fee = program(textConditions=[{"ru": "Условие", "evidence": "q1", "kind": "must", "field": None,
                                            "fee": {"amount": 5, "currency": "USD", "evidence": "$5"}}])
        self.assertEqual(summarize(program(), with_fee), ["условия текстом"])

    def test_coverage_and_link(self):
        after = program(coverage={"tuition": None}, applyUrl="https://example.org")
        self.assertEqual(summarize(program(), after), ["что покрывает", "ссылка для подачи"])


class TestRecord(unittest.TestCase):
    def test_appends_and_merges_same_day(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "changelog.json"
            record(path, "2026-09-26", "p", ["срок"])
            record(path, "2026-09-26", "p", ["срок", "условия текстом"])
            record(path, "2026-09-27", "q", ["новая программа"])
            entries = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(entries, [
            {"date": "2026-09-27", "id": "q", "changes": ["новая программа"]},
            {"date": "2026-09-26", "id": "p", "changes": ["срок", "условия текстом"]},
        ])

    def test_empty_changes_write_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "changelog.json"
            record(path, "2026-09-26", "p", [])
            self.assertFalse(path.exists())


class TestFeed(unittest.TestCase):
    ENTRIES = [
        {"date": "2026-09-27", "id": "q", "changes": ["новая программа"]},
        {"date": "2026-09-26", "id": "p", "changes": ["срок", "правило: экзамен"]},
    ]
    NAMES = {"p": "Пример & <Co>", "q": "Новая"}

    def parse(self, **kw):
        return ElementTree.fromstring(feed_xml(self.ENTRIES, self.NAMES, **kw).encode("utf-8"))

    def test_valid_atom_with_escaped_names(self):
        root = self.parse()
        titles = [e.find(ATOM + "title").text for e in root.findall(ATOM + "entry")]
        self.assertEqual(titles, ["Новая · новая программа", "Пример & <Co> · срок, правило: экзамен"])

    def test_feed_updated_is_the_newest_entry(self):
        self.assertEqual(self.parse().find(ATOM + "updated").text, "2026-09-27T00:00:00Z")

    def test_entry_ids_are_stable_and_unique(self):
        ids = [e.find(ATOM + "id").text for e in self.parse().findall(ATOM + "entry")]
        self.assertEqual(len(set(ids)), 2)
        self.assertEqual(ids, [e.find(ATOM + "id").text for e in self.parse().findall(ATOM + "entry")])

    def test_limit(self):
        self.assertEqual(len(self.parse(limit=1).findall(ATOM + "entry")), 1)

    def test_unknown_program_name_falls_back_to_id(self):
        xml = feed_xml([{"date": "2026-09-26", "id": "zzz", "changes": ["срок"]}], {})
        self.assertIn("zzz · срок", xml)

    def test_empty_feed_is_still_valid(self):
        root = ElementTree.fromstring(feed_xml([], {}).encode("utf-8"))
        self.assertEqual(root.findall(ATOM + "entry"), [])
        self.assertTrue(root.find(ATOM + "updated").text)

    def test_links_point_at_the_site(self):
        root = self.parse()
        hrefs = [l.get("href") for l in root.findall(ATOM + "link")]
        self.assertIn(BASE, hrefs)


if __name__ == "__main__":
    unittest.main()
