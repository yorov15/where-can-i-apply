import unittest

from tools.review import (
    _brief,
    approve,
    empty_fields,
    field_changes,
    merge_proposed,
    other_changes,
    prune_declined,
    remember_declined,
    sign_absence,
    unasked_fields,
)


class TestDeclinedMemory(unittest.TestCase):
    def program(self, **rules):
        base = {f: None for f in (
            "citizenship", "schoolCountry", "schoolYears",
            "graduationYear", "age", "gpa", "language")}
        base.update(rules)
        return {"eligibility": base}

    def test_first_time_asks_about_everything(self):
        got = unasked_fields(self.program(), None, "sha256:1")
        self.assertIn("schoolYears", got)

    def test_declined_field_is_not_asked_again(self):
        # Переспрашивать отказ каждый прогон вредно: на шестой раз человек
        # начинает жать вслепую, и тогда подпишет непроверенное.
        current = {"leftEmpty": {"schoolYears": "sha256:1"}}
        got = unasked_fields(self.program(), current, "sha256:1")
        self.assertNotIn("schoolYears", got)

    def test_new_snapshot_asks_again(self):
        # На изменившемся тексте ответ может быть другим.
        current = {"leftEmpty": {"schoolYears": "sha256:1"}}
        got = unasked_fields(self.program(), current, "sha256:2")
        self.assertIn("schoolYears", got)

    def test_other_empty_fields_are_still_asked(self):
        current = {"leftEmpty": {"schoolYears": "sha256:1"}}
        got = unasked_fields(self.program(), current, "sha256:1")
        self.assertIn("gpa", got)

    def test_filled_field_is_never_asked(self):
        program = self.program(schoolYears={"min": 12, "evidence": "x"})
        self.assertNotIn("schoolYears", unasked_fields(program, None, "sha256:1"))

    def test_remembering_keeps_the_snapshot_hash(self):
        got = remember_declined({"eligibility": {}}, ["schoolYears"], "sha256:9")
        self.assertEqual(got["leftEmpty"], {"schoolYears": "sha256:9"})

    def test_remembering_does_not_mutate_input(self):
        program = {"eligibility": {}}
        remember_declined(program, ["gpa"], "sha256:9")
        self.assertNotIn("leftEmpty", program)

    def test_remembering_adds_to_what_was_there(self):
        program = {"eligibility": {}, "leftEmpty": {"gpa": "sha256:1"}}
        got = remember_declined(program, ["schoolYears"], "sha256:2")
        self.assertEqual(got["leftEmpty"], {"gpa": "sha256:1", "schoolYears": "sha256:2"})

    def test_memory_is_not_shown_as_a_change(self):
        # Его ставит сам review — показывать как изменение незачем.
        before = {"leftEmpty": {}}
        after = {"leftEmpty": {"schoolYears": "sha256:1"}}
        self.assertEqual(other_changes(before, after), [])


class TestShowList(unittest.TestCase):
    def diff(self, before, after):
        removed = [item for item in before if item not in after]
        added = [item for item in after if item not in before]
        return removed, added

    def test_only_the_new_item_is_singled_out(self):
        # Настоящий случай: пять текстовых условий стало шесть. Печатать
        # оба списка целиком — значит не показать ничего.
        before = [{"ru": f"условие {n}"} for n in range(5)]
        after = before + [{"ru": "новое условие"}]
        removed, added = self.diff(before, after)
        self.assertEqual(removed, [])
        self.assertEqual(added, [{"ru": "новое условие"}])

    def test_removal_is_visible_too(self):
        before = [{"ru": "первое"}, {"ru": "второе"}]
        after = [{"ru": "первое"}]
        removed, added = self.diff(before, after)
        self.assertEqual(removed, [{"ru": "второе"}])
        self.assertEqual(added, [])

    def test_replacement_shows_both_sides(self):
        removed, added = self.diff([{"ru": "старое"}], [{"ru": "новое"}])
        self.assertEqual(removed, [{"ru": "старое"}])
        self.assertEqual(added, [{"ru": "новое"}])


class TestBrief(unittest.TestCase):
    def test_short_value_is_untouched(self):
        self.assertEqual(_brief({"ru": "коротко"}), '{"ru": "коротко"}')

    def test_long_value_is_cut_with_a_mark(self):
        long = {"ru": "я" * 1000}
        got = _brief(long)
        self.assertTrue(got.endswith("…"))
        self.assertLess(len(got), 500)


class TestOtherChanges(unittest.TestCase):
    def test_text_conditions_are_shown(self):
        # Раньше они записывались молча: человек утверждал «запись
        # целиком», а видел только семь правил допуска.
        current = {"textConditions": []}
        proposed = {"textConditions": [{"ru": "новое условие", "evidence": "x"}]}
        changes = other_changes(current, proposed)
        self.assertEqual([c["field"] for c in changes], ["textConditions"])

    def test_deadline_change_is_shown(self):
        current = {"deadline": {"closes": "2026-01-15"}}
        proposed = {"deadline": {"closes": "2027-01-15"}}
        self.assertEqual([c["field"] for c in other_changes(current, proposed)], ["deadline"])

    def test_eligibility_is_left_to_the_other_function(self):
        current = {"eligibility": {"age": None}}
        proposed = {"eligibility": {"age": {"max": 21}}}
        self.assertEqual(other_changes(current, proposed), [])

    def test_fields_review_sets_itself_are_not_noise(self):
        current = {"status": "published", "source": {"humanChecked": True}}
        proposed = {"status": "draft", "source": {"humanChecked": False}}
        self.assertEqual(other_changes(current, proposed), [])

    def test_nothing_changed_means_nothing_shown(self):
        record = {"name": {"ru": "Пример"}, "deadline": {"closes": None}}
        self.assertEqual(other_changes(record, dict(record)), [])

    def test_first_time_record_lists_its_fields(self):
        proposed = {"name": {"ru": "Пример"}, "hostCountry": "TR"}
        self.assertEqual(
            sorted(c["field"] for c in other_changes(None, proposed)),
            ["hostCountry", "name"],
        )

SIGNED = {
    "noLimit": True,
    "evidence": None,
    "checkedBy": "human",
    "checkedAt": "2026-09-03",
    "note": "смотрел страницу",
}


class TestMergeProposed(unittest.TestCase):
    def test_model_silence_does_not_erase_a_human_signature(self):
        # Ровно тот случай, который review предложил сделать 3 сентября:
        # стереть три подписи, потому что модель вернула null.
        current = {"eligibility": {"age": SIGNED}}
        proposed = {"eligibility": {"age": None}}
        merged = merge_proposed(current, proposed)
        self.assertEqual(merged["eligibility"]["age"], SIGNED)

    def test_model_silence_does_not_erase_a_quoted_rule(self):
        rule = {"min": 11, "evidence": "x"}
        current = {"eligibility": {"schoolYears": rule}}
        merged = merge_proposed(current, {"eligibility": {"schoolYears": None}})
        self.assertEqual(merged["eligibility"]["schoolYears"], rule)

    def test_new_rule_still_replaces_the_old_one(self):
        current = {"eligibility": {"age": {"max": 21, "evidence": "старая"}}}
        proposed = {"eligibility": {"age": {"max": 22, "evidence": "новая"}}}
        merged = merge_proposed(current, proposed)
        self.assertEqual(merged["eligibility"]["age"]["max"], 22)

    def test_first_time_record_survives_the_merge(self):
        proposed = {"eligibility": {"age": {"max": 21, "evidence": "x"}}}
        merged = merge_proposed(None, proposed)
        self.assertEqual(merged["eligibility"]["age"]["max"], 21)

    def test_nothing_is_invented_where_both_are_empty(self):
        merged = merge_proposed({"eligibility": {}}, {"eligibility": {"age": None}})
        self.assertIsNone(merged["eligibility"]["age"])

    def test_inputs_are_not_mutated(self):
        current = {"eligibility": {"age": SIGNED}}
        proposed = {"eligibility": {"age": None}}
        merge_proposed(current, proposed)
        self.assertIsNone(proposed["eligibility"]["age"])
        self.assertEqual(current["eligibility"]["age"], SIGNED)

    def test_merged_record_reports_no_changes(self):
        # Следствие, ради которого всё делалось: повторный прогон на той же
        # записи больше ничего не предлагает.
        current = {"eligibility": {f: None for f in (
            "citizenship", "schoolCountry", "schoolYears",
            "graduationYear", "age", "gpa", "language")}}
        current["eligibility"]["age"] = SIGNED
        proposed = {"eligibility": {"age": None}}
        self.assertEqual(field_changes(current, merge_proposed(current, proposed)), [])


class TestEmptyFields(unittest.TestCase):
    def test_lists_only_null_rules(self):
        program = {
            "eligibility": {
                "citizenship": {"allow": "*", "evidence": "x"},
                "age": None,
                "gpa": None,
            }
        }
        self.assertEqual(empty_fields(program), ["schoolCountry", "schoolYears",
                                                 "graduationYear", "age", "gpa", "language"])

    def test_nothing_empty_when_all_filled(self):
        rules = {f: {"evidence": "x"} for f in (
            "citizenship", "schoolCountry", "schoolYears",
            "graduationYear", "age", "gpa", "language")}
        self.assertEqual(empty_fields({"eligibility": rules}), [])


class TestSignAbsence(unittest.TestCase):
    def test_writes_the_signature(self):
        got = sign_absence({"eligibility": {"age": None}}, "age", "2026-09-03", "смотрел")
        rule = got["eligibility"]["age"]
        self.assertIs(rule["noLimit"], True)
        self.assertEqual(rule["checkedBy"], "human")
        self.assertEqual(rule["checkedAt"], "2026-09-03")
        self.assertEqual(rule["note"], "смотрел")
        self.assertIsNone(rule["evidence"])

    def test_carries_no_values(self):
        # Ручаться можно за отсутствие ограничения, но никогда за число.
        rule = sign_absence({"eligibility": {}}, "age", "2026-09-03", "x")["eligibility"]["age"]
        for key in ("min", "max", "allow", "deny", "anyOf", "scale", "asOf"):
            self.assertNotIn(key, rule)

    def test_does_not_mutate_input(self):
        program = {"eligibility": {"age": None}}
        sign_absence(program, "age", "2026-09-03", "x")
        self.assertIsNone(program["eligibility"]["age"])


class TestFieldChanges(unittest.TestCase):
    def test_new_program_lists_every_filled_field(self):
        proposed = {"eligibility": {"citizenship": {"allow": "*"}, "age": None}}
        changes = field_changes(None, proposed)
        self.assertEqual([c["field"] for c in changes], ["citizenship"])
        self.assertIsNone(changes[0]["before"])

    def test_unchanged_field_is_not_listed(self):
        rule = {"allow": "*", "evidence": "x"}
        current = {"eligibility": {"citizenship": rule}}
        proposed = {"eligibility": {"citizenship": dict(rule)}}
        self.assertEqual(field_changes(current, proposed), [])

    def test_changed_field_shows_before_and_after(self):
        current = {"eligibility": {"age": {"max": 21, "evidence": "x"}}}
        proposed = {"eligibility": {"age": {"max": 22, "evidence": "y"}}}
        changes = field_changes(current, proposed)
        self.assertEqual(changes[0]["before"]["max"], 21)
        self.assertEqual(changes[0]["after"]["max"], 22)

    def test_field_becoming_null_is_reported(self):
        current = {"eligibility": {"age": {"max": 21, "evidence": "x"}}}
        proposed = {"eligibility": {"age": None}}
        changes = field_changes(current, proposed)
        self.assertEqual(changes[0]["field"], "age")
        self.assertIsNone(changes[0]["after"])


PAGES = [
    {"url": "https://a.gov/x", "contentHash": "sha256:1", "file": "00.txt"},
    {"url": "https://a.gov/rules.pdf", "contentHash": "sha256:2", "file": "01.txt"},
]


class TestApprove(unittest.TestCase):
    def test_marks_human_checked_and_published(self):
        program = {"status": "draft", "source": {"humanChecked": False}}
        got = approve(program, "2026-09-03", PAGES)
        self.assertTrue(got["source"]["humanChecked"])
        self.assertEqual(got["status"], "published")

    def test_records_source_and_date(self):
        program = {"status": "draft", "source": {"humanChecked": False}}
        got = approve(program, "2026-09-03", PAGES)
        self.assertEqual(got["source"]["url"], "https://a.gov/x")
        self.assertEqual(got["source"]["lastVerified"], "2026-09-03")

    def test_records_every_page_not_just_the_first(self):
        # Пока запись помнила одну первую страницу, изменение правил в
        # PDF Венгрии проходило незаметно.
        got = approve({"status": "draft", "source": {}}, "2026-09-03", PAGES)
        self.assertEqual(
            got["source"]["pages"],
            [
                {"url": "https://a.gov/x", "contentHash": "sha256:1"},
                {"url": "https://a.gov/rules.pdf", "contentHash": "sha256:2"},
            ],
        )

    def test_page_list_carries_nothing_but_url_and_hash(self):
        got = approve({"status": "draft", "source": {}}, "2026-09-03", PAGES)
        self.assertNotIn("file", got["source"]["pages"][0])

    def test_old_single_hash_field_is_dropped(self):
        program = {"status": "draft", "source": {"contentHash": "sha256:старое"}}
        got = approve(program, "2026-09-03", PAGES)
        self.assertNotIn("contentHash", got["source"])

    def test_does_not_mutate_input(self):
        program = {"status": "draft", "source": {"humanChecked": False}}
        approve(program, "2026-09-03", PAGES)
        self.assertEqual(program["status"], "draft")
        self.assertNotIn("pages", program["source"])



class TestDeclinedSurvives(unittest.TestCase):
    """Отказ должен пережить следующую запись, иначе память бесполезна."""

    def blank(self):
        return {f: None for f in (
            "citizenship", "schoolCountry", "schoolYears",
            "graduationYear", "age", "gpa", "language")}

    def test_merge_carries_declined_forward(self):
        current = {"eligibility": self.blank(), "leftEmpty": {"schoolYears": "sha256:1"}}
        proposed = {"eligibility": self.blank()}
        merged = merge_proposed(current, proposed)
        self.assertEqual(merged["leftEmpty"], {"schoolYears": "sha256:1"})

    def test_carried_declined_still_silences_the_question(self):
        current = {"eligibility": self.blank(), "leftEmpty": {"schoolYears": "sha256:1"}}
        merged = merge_proposed(current, {"eligibility": self.blank()})
        self.assertNotIn("schoolYears", unasked_fields(merged, current, "sha256:1"))

    def test_second_refusal_does_not_erase_the_first(self):
        current = {"eligibility": self.blank(), "leftEmpty": {"schoolYears": "sha256:1"}}
        merged = merge_proposed(current, {"eligibility": self.blank()})
        remembered = remember_declined(merged, ["gpa"], "sha256:1")
        self.assertEqual(
            remembered["leftEmpty"], {"schoolYears": "sha256:1", "gpa": "sha256:1"}
        )

    def test_approve_keeps_the_refusal(self):
        program = {"id": "x", "eligibility": self.blank(), "leftEmpty": {"gpa": "sha256:1"}}
        approved = approve(
            program,
            "2026-09-04",
            [{"url": "https://example.org", "contentHash": "sha256:1"}],
        )
        self.assertEqual(approved["leftEmpty"], {"gpa": "sha256:1"})

    def test_merge_does_not_invent_the_field(self):
        merged = merge_proposed({"eligibility": self.blank()}, {"eligibility": self.blank()})
        self.assertNotIn("leftEmpty", merged)

    def test_merge_does_not_mutate_current(self):
        current = {"eligibility": self.blank(), "leftEmpty": {"gpa": "sha256:1"}}
        merged = merge_proposed(current, {"eligibility": self.blank()})
        merged["leftEmpty"]["gpa"] = "sha256:2"
        self.assertEqual(current["leftEmpty"]["gpa"], "sha256:1")


class TestPruneDeclined(unittest.TestCase):
    def blank(self):
        return {f: None for f in (
            "citizenship", "schoolCountry", "schoolYears",
            "graduationYear", "age", "gpa", "language")}

    def test_filled_field_loses_its_mark(self):
        rules = self.blank()
        rules["gpa"] = {"min": 70, "scale": "percent", "evidence": "70%"}
        program = {"eligibility": rules, "leftEmpty": {"gpa": "sha256:1"}}
        self.assertNotIn("leftEmpty", prune_declined(program))

    def test_still_empty_field_keeps_its_mark(self):
        program = {"eligibility": self.blank(), "leftEmpty": {"gpa": "sha256:1"}}
        self.assertEqual(prune_declined(program)["leftEmpty"], {"gpa": "sha256:1"})

    def test_signed_absence_counts_as_filled(self):
        program = {"eligibility": self.blank(), "leftEmpty": {"gpa": "sha256:1"}}
        signed = sign_absence(program, "gpa", "2026-09-04", "смотрел раздел требований")
        self.assertNotIn("leftEmpty", prune_declined(signed))

    def test_empty_dict_is_removed(self):
        program = {"eligibility": self.blank(), "leftEmpty": {}}
        self.assertNotIn("leftEmpty", prune_declined(program))

    def test_does_not_mutate_input(self):
        program = {"eligibility": self.blank(), "leftEmpty": {"gpa": "sha256:1"}}
        prune_declined(program)
        self.assertEqual(program["leftEmpty"], {"gpa": "sha256:1"})


if __name__ == "__main__":
    unittest.main()
