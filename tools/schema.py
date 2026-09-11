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

# Экзамены, которые знает анкета. TOEFL iBT с 21 января 2026 года
# считается по новой шкале 1–6, и программы публикуют для старой и новой
# шкалы отдельные пороги (KAIST: «83 (Taken before Jan 21, 2026) / 4.5»).
# Для движка это два разных экзамена: сравнить 90 из 120 с порогом 4.5
# значило бы выдать ответ, которого программа не давала.
LANGUAGE_TESTS = frozenset({"IELTS", "TOEFL_IBT", "TOEFL_IBT_2026"})

# Форма, а не список: списка стран в стандартной библиотеке нет, а форма
# ловит реальные опечатки — TJK, tj, «Таджикистан».
_COUNTRY = re.compile(r"^[A-Z]{2}$")


def is_country_code(value) -> bool:
    return isinstance(value, str) and bool(_COUNTRY.match(value))


# Ключи, в которых живут значения требования. Правило с подписью
# человека («требования нет») не имеет права содержать ни одного из них:
# ручаться можно за отсутствие ограничения, но никогда за число.
VALUE_KEYS = frozenset(
    {"min", "max", "maxExclusive", "maxRelative", "allow", "deny", "anyOf", "scale", "asOf"}
)

# Границы, которые считаются из цикла приёма, а не записаны числом.
# «Окончи школу к году подачи» есть почти у каждой стипендии; записанное
# числом, оно устаревает через год и врёт молча.
RELATIVE_BOUNDS = frozenset({"applicationYear"})


# Кто может поставить подпись под отсутствием требования. Ассистент —
# с 11 сентября 2026: владелец проекта отдал ему ввод данных, потому что
# ручная подпись съедала больше времени, чем сбор. Подпись ассистента
# остаётся подписью ассистента — сайт так её и показывает, выдавать её за
# человеческую значило бы соврать тому, кто на карточку полагается.
SIGNERS = ("human", "assistant")


def absence_rule(today: str, note: str, by: str = "human") -> dict:
    """Правило, которым проверявший ручается: требования на странице нет.

    Цитаты здесь быть не может: отсутствие требования не подтверждается
    фразой — на страницах программ обычно нет абзаца «ограничений не
    установлено». Его подтверждает тот, кто прочитал страницу.
    """
    if by not in SIGNERS:
        raise ValueError(f"неизвестный подписант: {by}")
    return {
        "noLimit": True,
        "evidence": None,
        "checkedBy": by,
        "checkedAt": today,
        "note": note,
    }


def approved_by(program: dict):
    """Кто утвердил запись: human, assistant или никто (None).

    Записи до 11 сентября 2026 знают только humanChecked — их утверждал
    человек, так их и читаем.
    """
    source = program.get("source") or {}
    if source.get("approvedBy") in SIGNERS:
        return source["approvedBy"]
    return "human" if source.get("humanChecked") is True else None


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
            # Все страницы источника со своими хешами: следить надо за
            # каждой, требования часто лежат не на первой.
            "pages": [],
            "lastVerified": None,
            "humanChecked": False,
        },
    }
