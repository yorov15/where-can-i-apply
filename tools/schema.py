"""Форма записи программы — та же, что читает js/verdict.js.

Порядок полей совпадает с порядком в движке: семь полей профиля, семь
правил, семь функций. Расхождение схемы и движка — это ошибка, а не
вариант, поэтому список один и лежит здесь.
"""

import re

FIELDS = (
    "citizenship",
    "schoolCountry",
    "schoolYears",
    "graduationYear",
    "age",
    "gpa",
    "language",
)

# null в этих двух запрещён. Запрещено именно «мы не знаем»; явное
# «ограничения нет» пишется объектом с пустыми значениями и цитатой.
REQUIRED_FIELDS = frozenset({"citizenship", "graduationYear"})

SCALES = frozenset({"PERCENT", "TJ_5", "GPA_4", "GPA_4_5"})

# Форма, а не список: списка стран в стандартной библиотеке нет, а форма
# ловит реальные опечатки — TJK, tj, «Таджикистан».
_COUNTRY = re.compile(r"^[A-Z]{2}$")


def is_country_code(value) -> bool:
    return isinstance(value, str) and bool(_COUNTRY.match(value))


# Ключи, в которых живут значения требования. Правило с подписью
# человека («требования нет») не имеет права содержать ни одного из них:
# ручаться можно за отсутствие ограничения, но никогда за число.
VALUE_KEYS = frozenset({"min", "max", "allow", "deny", "anyOf", "scale", "asOf"})


def absence_rule(today: str, note: str) -> dict:
    """Правило, которым человек ручается: требования на странице нет.

    Цитаты здесь быть не может: отсутствие требования не подтверждается
    фразой — на страницах программ обычно нет абзаца «ограничений не
    установлено». Его подтверждает человек, прочитавший страницу.
    """
    return {
        "noLimit": True,
        "evidence": None,
        "checkedBy": "human",
        "checkedAt": today,
        "note": note,
    }


def empty_program(program_id: str, name: str) -> dict:
    return {
        "id": program_id,
        "status": "draft",
        "name": {"ru": name, "orig": name},
        "hostCountry": None,
        "level": "bachelor",
        "coverage": {"tuition": None, "living": None, "travel": None, "note": {"ru": ""}},
        "eligibility": {field: None for field in FIELDS},
        "textConditions": [],
        "deadline": {
            "opens": None,
            "closes": None,
            "recurring": "annual",
            "confidence": "expected",
        },
        "applyUrl": None,
        "coversInstitutions": {"kind": "list", "approxCount": None, "note": {"ru": ""}},
        "source": {
            "url": None,
            "lastVerified": None,
            "contentHash": None,
            "humanChecked": False,
        },
    }
