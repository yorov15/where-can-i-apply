"""Механические проверки записи. Без модели, без сети.

Главная из них — проверка цитат. Каждое evidence обязано найтись в
скачанном тексте обычным поиском подстроки. Модель, придумавшая
требование, не может придумать к нему цитату, которая там найдётся.
"""

from tools.schema import FIELDS, REQUIRED_FIELDS, SCALES, is_country_code
from tools.snapshot import normalize

MIN_AGE = 15
MAX_AGE = 60


def validate_program(program: dict, snapshot_text: str) -> list[str]:
    problems = []
    haystack = normalize(snapshot_text)
    eligibility = program.get("eligibility") or {}

    for extra in sorted(set(eligibility) - set(FIELDS)):
        problems.append(f"лишнее поле в eligibility: {extra}")

    for field in FIELDS:
        rule = eligibility.get(field)
        if rule is None:
            if field in REQUIRED_FIELDS:
                problems.append(
                    f"{field}: обязательное поле, null запрещён — "
                    "нужно правило или явное «ограничения нет» с цитатой"
                )
            continue

        evidence = rule.get("evidence")
        if not evidence:
            problems.append(f"{field}: нет цитаты из источника")
        elif normalize(evidence) not in haystack:
            problems.append(f"{field}: цитата не найдена в тексте источника — {evidence!r}")

        problems.extend(_check_rule_shape(field, rule))

    problems.extend(_check_deadline(program.get("deadline") or {}))
    return problems


def _check_rule_shape(field: str, rule: dict) -> list[str]:
    problems = []

    if field in ("citizenship", "schoolCountry"):
        allow = rule.get("allow")
        if allow != "*" and not isinstance(allow, list):
            problems.append(f"{field}: allow должно быть '*' или списком")
        codes = list(rule.get("deny") or [])
        if isinstance(allow, list):
            codes += allow
        for code in codes:
            if not is_country_code(code):
                problems.append(f"{field}: неверный код страны — {code!r}")

    if field == "age":
        for bound in ("min", "max"):
            value = rule.get(bound)
            if value is not None and not (MIN_AGE <= value <= MAX_AGE):
                problems.append(
                    f"age: возраст {value} вне разумных границ {MIN_AGE}-{MAX_AGE}"
                )
        as_of = rule.get("asOf")
        if as_of != "deadline" and not _is_iso_date(as_of):
            problems.append("age: asOf должно быть 'deadline' или датой ГГГГ-ММ-ДД")

    if field == "gpa":
        scale = rule.get("scale")
        if scale not in SCALES:
            problems.append(f"gpa: неизвестная шкала — {scale!r}")

    if field == "language":
        for requirement in rule.get("anyOf") or []:
            if "test" not in requirement or "min" not in requirement:
                problems.append("language: в требовании нет test или min")

    return problems


def _check_deadline(deadline: dict) -> list[str]:
    problems = []
    opens, closes = deadline.get("opens"), deadline.get("closes")
    for name, value in (("opens", opens), ("closes", closes)):
        if value is not None and not _is_iso_date(value):
            problems.append(f"deadline.{name}: не дата в формате ГГГГ-ММ-ДД")
    if opens and closes and closes < opens:
        problems.append("deadline: дата закрытия раньше даты открытия")
    if deadline.get("confidence") not in ("confirmed", "expected"):
        problems.append("deadline.confidence: должно быть confirmed или expected")
    return problems


def _is_iso_date(value) -> bool:
    if not isinstance(value, str) or len(value) != 10:
        return False
    parts = value.split("-")
    return len(parts) == 3 and all(part.isdigit() for part in parts)
