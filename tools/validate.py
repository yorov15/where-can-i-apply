"""Механические проверки записи. Без модели, без сети.

Главная из них — проверка цитат. Каждое evidence обязано найтись в
скачанном тексте обычным поиском подстроки. Модель, придумавшая
требование, не может придумать к нему цитату, которая там найдётся.
"""

import re

from tools.schema import (
    FIELDS,
    RELATIVE_BOUNDS,
    REQUIRED_FIELDS,
    SCALES,
    VALUE_KEYS,
    is_country_code,
)
from tools.snapshot import normalize

MIN_AGE = 15
MAX_AGE = 60

MONTH_DAY = re.compile(r"^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")


def validate_program(program: dict, snapshot_text: str, check_required: bool = True) -> list[str]:
    """Проверяет запись. С check_required=False не требует обязательных полей.

    Так проверяют предложение модели до того, как человек поставил подписи:
    пустое обязательное поле на этом шаге ещё можно заполнить, и отвергать
    из-за него всю запись — значит не дать её заполнить вообще. Перед
    записью на диск проверка идёт полная.
    """
    problems = []
    haystack = normalize(snapshot_text)
    eligibility = program.get("eligibility") or {}

    for extra in sorted(set(eligibility) - set(FIELDS)):
        problems.append(f"лишнее поле в eligibility: {extra}")

    for field in FIELDS:
        rule = eligibility.get(field)
        if rule is None:
            if field in REQUIRED_FIELDS and check_required:
                problems.append(
                    f"{field}: обязательное поле, null запрещён — "
                    "нужно правило или явное «ограничения нет» с цитатой"
                )
            continue

        if rule.get("noLimit") is True:
            problems.extend(_check_absence(field, rule))
            continue

        evidence = rule.get("evidence")
        if not evidence:
            problems.append(f"{field}: нет цитаты из источника")
        elif normalize(evidence) not in haystack:
            problems.append(f"{field}: цитата не найдена в тексте источника — {evidence!r}")

        if rule.get("definedBy") is not None:
            problems.extend(_check_delegated(field, rule))
            continue

        problems.extend(_check_rule_shape(field, rule))

    problems.extend(_check_deadline(program.get("deadline") or {}))
    return problems


def _check_absence(field: str, rule: dict) -> list[str]:
    """Проверяет правило, которым человек ручается за отсутствие требования.

    Цитаты тут нет и быть не может, поэтому вместо неё требуется подпись:
    кто и когда смотрел. И ни одного значения — ручаться можно только за
    отсутствие ограничения. Как только появляется число, работает обычный
    путь с обязательной цитатой, и соврать «возраст до 25, я проверил»
    этим способом нельзя.
    """
    problems = []

    present = sorted(VALUE_KEYS & set(rule))
    if present:
        problems.append(
            f"{field}: noLimit не может стоять вместе со значениями "
            f"({', '.join(present)}) — за число нужна цитата"
        )
    if rule.get("evidence") is not None:
        problems.append(f"{field}: при noLimit цитата должна быть null")
    if rule.get("checkedBy") != "human":
        problems.append(f"{field}: noLimit требует checkedBy = human")
    if not _is_iso_date(rule.get("checkedAt")):
        problems.append(f"{field}: noLimit требует checkedAt в формате ГГГГ-ММ-ДД")
    if not rule.get("note"):
        problems.append(f"{field}: noLimit требует note — что именно смотрели")
    if rule.get("definedBy") is not None:
        problems.append(f"{field}: noLimit и definedBy вместе — это разные утверждения")

    return problems


def _check_delegated(field: str, rule: dict) -> list[str]:
    """Правило, которое отсылает к принимающему вузу.

    Цитата здесь обязательна, в отличие от подписи человека: это не
    утверждение об отсутствии требования, а пересказ того, что написано
    в источнике. И значений быть не может — если бы порог был известен,
    он бы и записывался, а не отсылка.
    """
    problems = []

    if rule.get("definedBy") != "institution":
        problems.append(
            f"{field}: definedBy знает только значение 'institution', "
            f"а не {rule.get('definedBy')!r}"
        )
    present = sorted(VALUE_KEYS & set(rule))
    if present:
        problems.append(
            f"{field}: definedBy не может стоять вместе со значениями "
            f"({', '.join(present)}) — либо порог известен, либо его задаёт вуз"
        )
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
        for bound in ("min", "max", "maxExclusive"):
            value = rule.get(bound)
            if value is not None and not (MIN_AGE <= value <= MAX_AGE):
                problems.append(
                    f"age: возраст {value} вне разумных границ {MIN_AGE}-{MAX_AGE}"
                )
        if rule.get("max") is not None and rule.get("maxExclusive") is not None:
            problems.append(
                "age: max и maxExclusive вместе — верхняя граница должна быть одна"
            )
        # asOf разрешено не указывать: источник часто не говорит, на какой
        # момент считается возраст, а придумывать дату нельзя. Движок тогда
        # считает на дату закрытия приёма и честно отмечает пограничные случаи.
        problems.extend(_check_as_of(rule.get("asOf")))

    if field == "graduationYear":
        relative = rule.get("maxRelative")
        if relative is not None:
            if relative not in RELATIVE_BOUNDS:
                problems.append(
                    f"graduationYear: неизвестная относительная граница — {relative!r}"
                )
            if rule.get("max") is not None:
                problems.append(
                    "graduationYear: max и maxRelative вместе — граница должна быть одна"
                )

    if field == "gpa":
        scale = rule.get("scale")
        if scale not in SCALES:
            problems.append(f"gpa: неизвестная шкала — {scale!r}")

    if field == "language":
        for requirement in rule.get("anyOf") or []:
            if "test" not in requirement or "min" not in requirement:
                problems.append("language: в требовании нет test или min")

    return problems


def _check_as_of(as_of) -> list[str]:
    """На какой момент считается возраст.

    Кроме отсутствия, 'deadline' и явной даты есть четвёртая форма:
    дата, считаемая из года приёма. Венгрия меряет возраст на 31 августа
    года заезда, MEXT — на 1 апреля; записанные числом, такие даты
    устаревают через цикл и молча ошибаются на пограничных людях.
    """
    if as_of is None or as_of == "deadline" or _is_iso_date(as_of):
        return []

    if isinstance(as_of, dict):
        problems = []
        if as_of.get("relativeTo") != "applicationYear":
            problems.append(
                "age: asOf.relativeTo знает только 'applicationYear', "
                f"а не {as_of.get('relativeTo')!r}"
            )
        month_day = as_of.get("monthDay")
        if not isinstance(month_day, str) or not MONTH_DAY.match(month_day):
            problems.append(f"age: asOf.monthDay должно быть ММ-ДД, а не {month_day!r}")
        return problems

    return [
        "age: asOf должно быть 'deadline', датой ГГГГ-ММ-ДД, "
        "объектом с relativeTo и monthDay или отсутствовать"
    ]


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
