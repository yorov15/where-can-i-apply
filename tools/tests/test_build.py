import json
import unittest

from tools.build import (
    MAX_DETAILS_WIRE_BYTES,
    MAX_INDEX_WIRE_BYTES,
    build_details,
    build_index,
    details_entry,
    details_text,
    index_entry,
    index_text,
    missing_kind,
    stale_deadlines,
    wire_size,
    workaround_fields,
)

PROGRAM = {
    "id": "primer",
    "status": "published",
    "name": {"ru": "Пример", "orig": "Example"},
    "hostCountry": "TR",
    "kind": "government",
    "level": "bachelor",
    "coverage": {"tuition": True, "living": True, "travel": False, "note": {"ru": "нечто"}},
    "eligibility": {
        "citizenship": {"allow": "*", "deny": [], "evidence": "длинная цитата"},
        "schoolCountry": None,
        "schoolYears": None,
        "graduationYear": {"min": 2025, "max": None, "evidence": "другая цитата"},
        "age": None,
        "gpa": None,
        "language": None,
    },
    "textConditions": [{"ru": "условие", "evidence": "цитата"}],
    "deadline": {
        "opens": "2027-01-10",
        "closes": "2027-02-20",
        "recurring": "annual",
        "confidence": "expected",
    },
    "applyUrl": "https://example.gov/apply",
    "coversInstitutions": {"kind": "list", "approxCount": 1, "note": {"ru": ""}},
    "source": {
        "url": "https://example.gov/rules",
        "pages": [{"url": "https://example.gov/rules", "contentHash": "sha256:0"}],
        "lastVerified": "2026-09-03",
        "humanChecked": True,
    },
}


class TestIndexEntry(unittest.TestCase):
    def test_evidence_is_stripped(self):
        entry = index_entry(PROGRAM)
        self.assertNotIn("evidence", json.dumps(entry, ensure_ascii=False))

    def test_threshold_quotes_are_stripped_too(self):
        # У порогов экзаменов свои цитаты; на сайт они не едут, а сами
        # пороги едут.
        program = json.loads(json.dumps(PROGRAM))
        program["eligibility"]["language"] = {
            "anyOf": [
                {"test": "IELTS", "min": 6.5},
                {"test": "TOEFL_IBT", "min": 90, "evidence": "TOEFL iBT - 90 in total"},
            ],
            "evidence": "IELTS - 6.5 overall",
        }
        entry = index_entry(program)
        self.assertNotIn("evidence", json.dumps(entry, ensure_ascii=False))
        self.assertEqual(
            entry["eligibility"]["language"]["anyOf"],
            [{"test": "IELTS", "min": 6.5}, {"test": "TOEFL_IBT", "min": 90}],
        )

    def test_rules_survive_without_quotes(self):
        entry = index_entry(PROGRAM)
        self.assertEqual(entry["eligibility"]["graduationYear"]["min"], 2025)
        self.assertIsNone(entry["eligibility"]["age"])

    def test_deadline_and_name_survive(self):
        entry = index_entry(PROGRAM)
        self.assertEqual(entry["deadline"]["closes"], "2027-02-20")
        self.assertEqual(entry["name"]["ru"], "Пример")

    def test_source_is_not_in_index(self):
        self.assertNotIn("source", index_entry(PROGRAM))

    def test_condition_texts_are_not_in_index(self):
        # Тексты условий едут отдельным файлом: в индексе они не нужны для
        # ответа, а весят больше всего остального.
        self.assertNotIn("textConditions", index_entry(PROGRAM))

    def test_workaround_fields_reach_the_index(self):
        program = json.loads(json.dumps(PROGRAM))
        program["textConditions"] = [
            {"ru": "a", "evidence": "x", "field": "schoolYears", "kind": "workaround"},
            {"ru": "b", "evidence": "x", "field": "language", "kind": "note"},
            {"ru": "c", "evidence": "x", "field": "citizenship", "kind": "workaround"},
        ]
        self.assertEqual(index_entry(program)["workaroundFields"], ["citizenship", "schoolYears"])

    def test_program_without_conditions_has_no_workarounds(self):
        program = json.loads(json.dumps(PROGRAM))
        del program["textConditions"]
        self.assertEqual(index_entry(program)["workaroundFields"], [])

    def test_no_limit_flag_and_note_both_reach_the_site(self):
        # Без флага движок не отличит «человек проверил, требования нет»
        # от «не знаем» — и карточка снова станет жёлтой.
        program = json.loads(json.dumps(PROGRAM))
        program["eligibility"]["age"] = {
            "noLimit": True,
            "evidence": None,
            "checkedBy": "human",
            "checkedAt": "2026-09-03",
            "note": "длинная заметка человека",
        }
        entry = index_entry(program)
        self.assertIs(entry["eligibility"]["age"]["noLimit"], True)
        self.assertEqual(entry["eligibility"]["age"]["checkedAt"], "2026-09-03")
        # Заметка — это и есть информация: без неё карточка говорила
        # «не ограничивает: возраст», и человек читал это как «данных нет».
        self.assertEqual(entry["eligibility"]["age"]["note"], "длинная заметка человека")


class TestBuildIndex(unittest.TestCase):
    def test_drafts_are_not_published(self):
        draft = dict(PROGRAM, id="draft", status="draft")
        index = build_index([PROGRAM, draft], "2026-09-03")
        self.assertEqual([p["id"] for p in index["programs"]], ["primer"])

    def test_unchecked_programs_are_not_published(self):
        sneaky = dict(PROGRAM, id="sneaky")
        sneaky["source"] = dict(PROGRAM["source"], humanChecked=False)
        index = build_index([PROGRAM, sneaky], "2026-09-03")
        self.assertEqual([p["id"] for p in index["programs"]], ["primer"])

    def test_assistant_approved_programs_are_published(self):
        by_assistant = dict(PROGRAM, id="by-assistant")
        by_assistant["source"] = dict(
            PROGRAM["source"], humanChecked=False, approvedBy="assistant"
        )
        index = build_index([by_assistant], "2026-09-11")
        self.assertEqual([p["id"] for p in index["programs"]], ["by-assistant"])

    def test_unknown_approver_is_not_published(self):
        sneaky = dict(PROGRAM, id="sneaky")
        sneaky["source"] = dict(PROGRAM["source"], humanChecked=False, approvedBy="model")
        self.assertEqual(build_index([sneaky], "2026-09-11")["programs"], [])

    def test_generated_at_is_recorded(self):
        index = build_index([PROGRAM], "2026-09-03")
        self.assertEqual(index["generatedAt"], "2026-09-03")

    def test_programs_are_sorted_by_id(self):
        second = dict(PROGRAM, id="alpha")
        index = build_index([PROGRAM, second], "2026-09-03")
        self.assertEqual([p["id"] for p in index["programs"]], ["alpha", "primer"])


class TestKind(unittest.TestCase):
    """Тип программы — редакторская разметка, без неё карточка не знает,
    в какую колонку встать; поэтому сборка не пропускает запись без типа."""

    def test_index_carries_the_kind(self):
        self.assertEqual(index_entry(PROGRAM)["kind"], "government")

    def test_published_programs_with_a_valid_kind_are_fine(self):
        self.assertEqual(missing_kind([PROGRAM]), [])

    def test_published_program_without_kind_is_reported(self):
        bare = {key: value for key, value in PROGRAM.items() if key != "kind"}
        self.assertEqual(len(missing_kind([bare])), 1)
        self.assertIn("primer", missing_kind([bare])[0])

    def test_unknown_kind_is_reported_with_the_allowed_ones(self):
        odd = dict(PROGRAM, kind="grant")
        problem = missing_kind([odd])[0]
        self.assertIn("grant", problem)
        self.assertIn("need-aid", problem)

    def test_drafts_are_not_asked_for_a_kind(self):
        draft = {key: value for key, value in PROGRAM.items() if key != "kind"}
        draft["status"] = "draft"
        self.assertEqual(missing_kind([draft]), [])


class TestSourceWithoutPages(unittest.TestCase):
    """Запись, за источником которой никто не следит, публиковать нельзя."""

    def program(self, **source):
        copy = json.loads(json.dumps(PROGRAM))
        copy["source"] = source
        return copy

    def test_record_without_pages_is_not_published(self):
        # Иначе устаревшие требования выдавались бы уверенно и бессрочно:
        # check.py такую запись пропускает, а сайт её показывает.
        index = build_index(
            [self.program(url="https://example.gov/rules", humanChecked=True)],
            "2026-09-04",
        )
        self.assertEqual(index["programs"], [])

    def test_empty_page_list_counts_as_none(self):
        index = build_index(
            [self.program(url="https://example.gov/rules", pages=[], humanChecked=True)],
            "2026-09-04",
        )
        self.assertEqual(index["programs"], [])

    def test_record_with_pages_is_published(self):
        index = build_index([json.loads(json.dumps(PROGRAM))], "2026-09-04")
        self.assertEqual([p["id"] for p in index["programs"]], [PROGRAM["id"]])


class TestStaleDeadlines(unittest.TestCase):
    """Запись гниёт молча: цикл сменился, а страница осталась прежней."""

    def program(self, closes, confidence):
        return {"id": "primer", "deadline": {"closes": closes, "confidence": confidence}}

    def test_past_confirmed_date_is_reported(self):
        got = stale_deadlines([self.program("2026-01-15", "confirmed")], "2026-09-08")
        self.assertEqual(len(got), 1)
        self.assertIn("2026-01-15", got[0])

    def test_expected_date_is_not_reported(self):
        # По прошлому году — это и есть предусмотренный способ жить до
        # объявления нового цикла, а не ошибка.
        self.assertEqual(stale_deadlines([self.program("2026-01-15", "expected")], "2026-09-08"), [])

    def test_future_date_is_not_reported(self):
        self.assertEqual(stale_deadlines([self.program("2027-01-15", "confirmed")], "2026-09-08"), [])

    def test_today_itself_is_still_open(self):
        self.assertEqual(stale_deadlines([self.program("2026-09-08", "confirmed")], "2026-09-08"), [])

    def test_missing_date_is_not_reported(self):
        self.assertEqual(stale_deadlines([self.program(None, "expected")], "2026-09-08"), [])


class TestWireSize(unittest.TestCase):
    """Предел стоит на том, за что человек платит."""

    def test_compressed_is_smaller_than_the_file(self):
        # Ради этого предел и переносили: считая по файлу, сборка
        # отказалась бы работать до цели в 25-30 программ — ради
        # экономии, которой нет.
        text = json.dumps([PROGRAM] * 20, ensure_ascii=False, indent=2)
        self.assertLess(wire_size(text), len(text.encode("utf-8")))

    def test_repetition_compresses_hard(self):
        one = wire_size(json.dumps(PROGRAM, ensure_ascii=False))
        ten = wire_size(json.dumps([PROGRAM] * 10, ensure_ascii=False))
        self.assertLess(ten, one * 10)

    def test_empty_index_is_tiny(self):
        self.assertLess(wire_size('{"programs": []}'), 100)

    def test_limit_leaves_room_for_the_target(self):
        # 25-30 программ — цель первой версии. Предел обязан их вмещать
        # с запасом, иначе он снова окажется не там.
        self.assertGreater(MAX_INDEX_WIRE_BYTES, 30 * 1024)

    def test_russian_text_counts_in_bytes_not_letters(self):
        text = "условие " * 500
        self.assertGreater(len(text.encode("utf-8")), len(text))
        self.assertLess(wire_size(text), len(text.encode("utf-8")))


class TestIndexText(unittest.TestCase):
    def index(self, count=3):
        programs = [dict(index_entry(PROGRAM), id=f"p{n}") for n in range(count)]
        return {"generatedAt": "2026-09-13", "programs": programs}

    def test_reads_back_as_the_same_index(self):
        index = self.index()
        self.assertEqual(json.loads(index_text(index)), index)

    def test_one_program_per_line(self):
        # Индекс лежит в git: правка одной карточки должна менять одну строку.
        lines = index_text(self.index(3)).splitlines()
        self.assertEqual(sum(1 for line in lines if '"id":"p' in line), 3)
        self.assertTrue(all(line.count('"id":"p') <= 1 for line in lines))

    def test_smaller_on_the_wire_than_indented(self):
        index = self.index(20)
        indented = json.dumps(index, ensure_ascii=False, indent=2) + "\n"
        self.assertLess(wire_size(index_text(index)), wire_size(indented))

    def test_empty_index_is_valid(self):
        empty = {"generatedAt": "2026-09-13", "programs": []}
        self.assertEqual(json.loads(index_text(empty)), empty)


class TestDetails(unittest.TestCase):
    def tagged(self):
        program = json.loads(json.dumps(PROGRAM))
        program["applyUrl"] = "https://example.gov/apply"
        program["source"] = {
            "url": "https://example.gov",
            "lastVerified": "2026-09-13",
            "approvedBy": "assistant",
            "humanChecked": False,
            "pages": [{"url": "https://example.gov", "contentHash": "sha256:x"}],
        }
        program["textConditions"] = [
            {"ru": "условие", "evidence": "цитата", "field": "age", "kind": "must"},
            {"ru": "без тегов", "evidence": "цитата"},
        ]
        return program

    def test_conditions_keep_text_and_tags_but_not_quotes(self):
        entry = details_entry(self.tagged())
        self.assertEqual(
            entry["textConditions"],
            [{"ru": "условие", "field": "age", "kind": "must"}, {"ru": "без тегов"}],
        )
        self.assertNotIn("цитата", json.dumps(entry, ensure_ascii=False))

    def test_fee_reaches_the_site_without_its_quote(self):
        program = self.tagged()
        program["textConditions"] = [
            {
                "ru": "Плата 75 долларов",
                "evidence": "цитата",
                "kind": "money",
                "fee": {"amount": 75, "currency": "USD", "evidence": "Application fee of $75"},
            },
        ]
        entry = details_entry(program)
        self.assertEqual(
            entry["textConditions"],
            [{"ru": "Плата 75 долларов", "kind": "money", "fee": {"amount": 75, "currency": "USD"}}],
        )
        self.assertNotIn("Application fee", json.dumps(entry, ensure_ascii=False))

    def test_coverage_note_apply_url_and_source(self):
        entry = details_entry(self.tagged())
        self.assertEqual(entry["coverageNote"], "нечто")
        self.assertEqual(entry["applyUrl"], "https://example.gov/apply")
        self.assertEqual(
            entry["source"],
            {"url": "https://example.gov", "lastVerified": "2026-09-13", "approvedBy": "assistant"},
        )

    def test_details_cover_the_same_programs_as_index(self):
        program = self.tagged()
        draft = dict(self.tagged(), id="draft", status="draft")
        details = build_details([program, draft], "2026-09-14")
        index = build_index([program, draft], "2026-09-14")
        self.assertEqual(list(details["programs"]), [p["id"] for p in index["programs"]])

    def test_details_text_reads_back_and_is_one_program_per_line(self):
        details = build_details([self.tagged()], "2026-09-14")
        text = details_text(details)
        self.assertEqual(json.loads(text), details)
        self.assertEqual(len(text.strip().splitlines()), 3)

    def test_details_limit_is_larger_than_index_limit(self):
        self.assertGreater(MAX_DETAILS_WIRE_BYTES, MAX_INDEX_WIRE_BYTES)


class TestWorkaroundFields(unittest.TestCase):
    def test_order_follows_the_form(self):
        program = {"textConditions": [
            {"field": "language", "kind": "workaround"},
            {"field": "age", "kind": "workaround"},
            {"field": "age", "kind": "workaround"},
        ]}
        self.assertEqual(workaround_fields(program), ["age", "language"])


if __name__ == "__main__":
    unittest.main()
