"""Собеседование: у каких программ оно есть и чем это подтверждено.

Правило читает только условия программы (`textConditions`). Условие
считается основанием, если в его дословной цитате (`evidence`) названо
собеседование, ни цитата, ни русский текст не говорят, что его нет, и
цитата не про стороннее интервью (InitialView, Vericant, Duolingo).

Русский текст сам по себе основанием не служит: он пересказ, а сайт
показывает человеку цитату. Программы, где собеседование есть только в
пересказе, сюда не попадают — им сначала нужна цитата в данных.

Сайт грузит `data/interview.json` только на экране программы, у целей в
«Моём пути» и в репетиции собеседования.
"""

import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INTERVIEW_PATH = ROOT / "data" / "interview.json"
MAX_INTERVIEW_WIRE_BYTES = 32 * 1024
MAX_QUOTES = 3

# Слово «собеседование» на языках, на которых в данных лежат цитаты.
# «Intewiew» — опечатка на странице Inha; цитата дословная, поэтому и она.
MARK = re.compile(
    r"interview|intewiew|面接|면접|面试|面試|собеседовани|интервью",
    re.I,
)
# «Oral examination» сюда не входит: в данных так названы устная часть
# языкового теста (Копенгаген) и экзамен по Корану (Медина), а не беседа.

# Цитата или пересказ говорят, что собеседования нет или оно не для нас.
NEGATIVE = re.compile(
    r"\bnot\s+(?:a\s+)?(?:required\s+)?part\s+of"  # «not a part of the application process»
    r"|\bdoes\s+not\s+(?:offer|require|conduct)"
    r"|\bdo\s+not\s+(?:offer|require|conduct)\s+(?:\w+\s+)?interviews?"
    r"|\bno\s+separate\b[^.]*interview"
    r"|\breserved\s+for\s+(?:U\.?S\.?|United\s+States)\s+citizens"
    r"|\binterview\s+sessions?\b"  # день открытых дверей, а не отбор
    r"|без\s+собеседовани"
    r"|(?:собеседовани|интервью)\w*\s+(?:в\s+отборе\s+)?(?:нет|не\s+требуется|не\s+проводи)"
    r"|面接(?:は)?(?:なし|を行いません|は行いません)|면접\s*없",
    re.I,
)

# «Not required» — тоже нет, если рядом не сказано, что собеседование
# всё же предлагают по желанию («recommended but not required»).
NOT_REQUIRED = re.compile(r"\bnot\s+required\b", re.I)
OPTIONAL = re.compile(r"\boptional\b|\brecommended\b|\bencouraged\b|\bmajority\b", re.I)

# Стороннее интервью для проверки английского — не собеседование программы.
THIRD_PARTY = re.compile(
    r"InitialView|Vericant|third-party|independent\s+interview|interview\s+tools|Duolingo",
    re.I,
)
# …если только в той же цитате не названо собственное собеседование вуза.
OWN = re.compile(r"\b(?:register|sign\s+up|request)\s+(?:for\s+)?an?\s+(?:\w+\s+)?interview", re.I)

# Что программа сама говорит о содержании или языке собеседования. Такие
# условия идут в репетиции первыми, с пометкой «от программы».
TOPIC = re.compile(
    r"interview\s+will\s+(?:include|assess|cover|last)"
    r"|during\s+the\s+interview"
    r"|randomly\s+generated\s+question"
    r"|conducted\s+entirely\s+in"
    r"|\bEnglish\s+interview|interview\s+in\s+English"
    r"|interview\s+\(in\s+[A-Za-z/ ]+\)"
    r"|to\s+assess\s+the\s+students?'?\s"
    r"|日本語で行い",
    re.I,
)

# Порядок, в котором берётся основная цитата: сначала требования и шаги,
# потом документы и заметки.
KIND_ORDER = {"must": 0, "steps": 1, "documents": 2, "note": 3, "workaround": 4, "money": 5}


def is_interview_condition(condition: dict) -> bool:
    """Подтверждает ли это условие, что собеседование есть."""
    evidence = condition.get("evidence")
    if not isinstance(evidence, str) or not MARK.search(evidence):
        return False
    text = f"{evidence}\n{condition.get('ru') or ''}"
    if NEGATIVE.search(text):
        return False
    if NOT_REQUIRED.search(evidence) and not OPTIONAL.search(evidence):
        return False
    if THIRD_PARTY.search(evidence) and not OWN.search(evidence):
        return False
    return True


def is_topic_condition(condition: dict) -> bool:
    return is_interview_condition(condition) and bool(TOPIC.search(condition["evidence"]))


def detect(program: dict) -> dict | None:
    """Собеседование программы: цитаты-основания и темы от программы.

    None — в условиях нет цитаты про собеседование (или сказано, что его нет).
    """
    found = [
        (KIND_ORDER.get(condition.get("kind"), 9), index, condition)
        for index, condition in enumerate(program.get("textConditions") or [])
        if is_interview_condition(condition)
    ]
    if not found:
        return None
    found.sort(key=lambda item: item[:2])
    seen = set()
    found = [item for item in found
             if not (item[2]["evidence"].strip() in seen or seen.add(item[2]["evidence"].strip()))]
    source = program.get("source") or {}
    pick = lambda condition: {"evidence": condition["evidence"].strip(), "ru": condition.get("ru") or ""}
    return {
        "quotes": [pick(condition) for _, _, condition in found[:MAX_QUOTES]],
        "topics": [pick(condition) for _, _, condition in sorted(found, key=lambda item: item[1])
                   if TOPIC.search(condition["evidence"])],
        "url": source.get("url"),
        "lastVerified": source.get("lastVerified"),
    }


def build_interview(programs: list[dict]) -> dict:
    entries = {}
    for program in sorted(programs, key=lambda item: item["id"]):
        entry = detect(program)
        if entry:
            entries[program["id"]] = entry
    return {"programs": entries}


def interview_text(data: dict) -> str:
    """По программе на строку: diff в git показывает, что изменилось."""
    compact = {"separators": (",", ":"), "ensure_ascii": False}
    rows = ",\n".join(f"{json.dumps(key, **compact)}:{json.dumps(value, **compact)}"
                      for key, value in data["programs"].items())
    return f'{{"programs":{{\n{rows}\n}}}}\n'


def write_interview(root: Path, programs: list[dict]) -> int:
    """Пишет data/interview.json. Возвращает код выхода."""
    data = build_interview(programs)
    text = interview_text(data)
    size = len(gzip.compress(text.encode("utf-8"), 6))
    if size > MAX_INTERVIEW_WIRE_BYTES:
        print(f"Собеседования выросли до {size} байт по проводу при пределе {MAX_INTERVIEW_WIRE_BYTES}.")
        return 1
    (root / "data" / "interview.json").write_text(text, encoding="utf-8")
    print(f"Собеседование: {len(data['programs'])} программ, {size} байт по проводу")
    return 0
