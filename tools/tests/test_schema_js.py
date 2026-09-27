"""Списки экзаменов живут дважды: в js/lib/limits.js (анкета и движок) и в
tools/schema.py (валидатор данных). Импортировать одно в другое нельзя —
разные языки, — поэтому расхождение возможно и молчаливо.

Оно уже случалось: в анкету добавили HSK, JLPT, TOPIK, TestDaF, DSH,
Goethe и PTE, а валидатор продолжал знать только четыре английских
экзамена. Записать программу с TOPIK стало нельзя, хотя спросить о нём
анкета уже умела. Тест читает обе стороны и падает на расхождении.
"""

import re
from pathlib import Path

from tools.schema import EXAM_TESTS, LANGUAGE_TESTS

ROOT = Path(__file__).resolve().parents[2]
LIMITS_JS = ROOT / "js" / "lib" / "limits.js"
FORM_JS = ROOT / "js" / "form.js"


def _limits_keys() -> set:
    """Ключи SCORE_LIMITS из js/lib/limits.js."""
    text = LIMITS_JS.read_text(encoding="utf-8")
    block = re.search(r"SCORE_LIMITS\s*=\s*\{(.*?)\n\};", text, re.S)
    assert block, "не нашёл SCORE_LIMITS в js/lib/limits.js"
    return set(re.findall(r"^\s{2}([A-Z_0-9]+):\s*\{", block.group(1), re.M))


def _form_list(name: str) -> set:
    """Элементы массива LANG_TESTS или EXAM_TESTS из js/form.js."""
    text = FORM_JS.read_text(encoding="utf-8")
    block = re.search(rf"{name}\s*=\s*\[(.*?)\];", text, re.S)
    assert block, f"не нашёл {name} в js/form.js"
    return set(re.findall(r"'([A-Z_0-9]+)'", block.group(1)))


def test_language_tests_python_and_js_agree():
    js = _form_list("LANG_TESTS")
    assert js == set(LANGUAGE_TESTS), (
        f"js/form.js: {sorted(js)}; tools/schema.py: {sorted(LANGUAGE_TESTS)}"
    )


def test_exam_tests_python_and_js_agree():
    js = _form_list("EXAM_TESTS")
    assert js == set(EXAM_TESTS)


def test_limits_js_knows_every_test_the_schema_allows():
    """Поле с баллом есть у каждого экзамена: applyLimits берёт границы
    из SCORE_LIMITS, и неизвестный там экзамен ломает анкету."""
    limits = _limits_keys()
    missing = (set(LANGUAGE_TESTS) | set(EXAM_TESTS)) - limits
    assert not missing, f"нет границ в js/lib/limits.js: {sorted(missing)}"


def test_every_form_question_has_a_score_field():
    """SCORE_LIMITS и списки анкеты должны сойтись: лишний ключ означает
    поле, которого анкета не читает, и наоборот."""
    limits = _limits_keys()
    asked = _form_list("LANG_TESTS") | _form_list("EXAM_TESTS")
    assert limits == asked, f"только в limits.js: {sorted(limits - asked)}"
