"""Сборка индекса, который читает сайт.

Цитаты и источники в индекс не идут: они составляют основную массу
байтов и нужны только когда человек открыл карточку. Публикуется лишь
то, что утвердил человек, — это последний рубеж перед выдачей.
"""

import gzip
import json
import sys
from datetime import date
from pathlib import Path

from tools.schema import FIELDS, KINDS, SIGNERS, approved_by

# Предел ставится на то, за что человек платит, — на сжатый размер.
#
# Раньше он стоял на размере файла, и это была неверная величина: Pages
# отдаёт индекс сжатым, и при 13 программах человек получал 11 КБ вместо
# 50. Считая по файлу, сборка отказалась бы работать на 26-й программе,
# то есть до цели в 25-30, — и отказалась бы ради экономии, которой на
# самом деле нет.
#
# 40 КБ кончились на 37-й программе, а не на 45-й: текстовые условия
# росли быстрее, чем число карточек. 13 сентября 2026 человек поднял
# предел до 64 КБ — это примерно 60 программ, меньше одной фотографии за
# заход. Предел не снят: аудитория сидит на дорогом мобильном интернете,
# и следить за ростом всё равно надо.
MAX_INDEX_WIRE_BYTES = 64 * 1024

# Детали — тексты раскрытой карточки. Грузятся в фоне после индекса и
# ответ не задерживают, поэтому предел больше. 14 сентября 2026 всё в одном
# файле весило бы 66,6 КБ при пределе индекса 64.
MAX_DETAILS_WIRE_BYTES = 128 * 1024

# Уровень сжатия берём средний, а не максимальный: сервер жмёт примерно
# так же, и лучше ошибиться в сторону большего числа, чем меньшего.
GZIP_LEVEL = 6


def wire_size(text: str) -> int:
    """Сколько байт уедет к человеку, а не сколько лежит на диске."""
    return len(gzip.compress(text.encode("utf-8"), GZIP_LEVEL))


# Что не едет в индекс: только цитата. Она английская, длинная и нужна
# тому, кто проверяет запись, а не тому, кто её читает.
#
# Заметка человека под подписью «ограничения нет» раньше тоже вырезалась
# — и это была ошибка. В ней и лежит настоящая информация: «таджикский
# аттестат назван в таблице по странам», «японский заранее не нужен,
# первый год — языковая подготовка». Без неё карточка говорила «не
# ограничивает: страну школы, годы школы, возраст», и человек читал это
# как «данных нет» — хотя данные были собраны и подписаны.
STRIPPED_FROM_INDEX = ("evidence",)


def _rule_without_evidence(rule):
    if rule is None:
        return None
    clean = {key: value for key, value in rule.items() if key not in STRIPPED_FROM_INDEX}
    # У порогов экзаменов бывают свои цитаты — они тоже для проверяющего.
    if isinstance(clean.get("anyOf"), list):
        clean["anyOf"] = [
            {key: value for key, value in item.items() if key not in STRIPPED_FROM_INDEX}
            for item in clean["anyOf"]
        ]
    return clean


def workaround_fields(program: dict) -> list[str]:
    """Поля, у которых есть обходной путь. По ним свёрнутая карточка
    пишет «есть обходной путь», не загружая тексты условий."""
    found = {
        condition.get("field")
        for condition in program.get("textConditions") or []
        if condition.get("kind") == "workaround"
    }
    return [field for field in FIELDS if field in found]


def _condition_for_site(condition: dict) -> dict:
    entry = {"ru": condition.get("ru") or ""}
    for key in ("field", "kind"):
        if key in condition:
            entry[key] = condition[key]
    return entry


def index_entry(program: dict) -> dict:
    coverage = program.get("coverage") or {}
    return {
        "id": program["id"],
        "name": program.get("name"),
        "hostCountry": program.get("hostCountry"),
        "kind": program.get("kind"),
        "level": program.get("level"),
        "coverage": {
            "tuition": coverage.get("tuition"),
            "living": coverage.get("living"),
            "travel": coverage.get("travel"),
        },
        "eligibility": {
            field: _rule_without_evidence((program.get("eligibility") or {}).get(field))
            for field in FIELDS
        },
        "deadline": program.get("deadline"),
        # Тексты условий уехали в details.json. Здесь остаётся только то,
        # что нужно свёрнутой карточке и сводке.
        "workaroundFields": workaround_fields(program),
    }


def details_entry(program: dict) -> dict:
    coverage = program.get("coverage") or {}
    source = program.get("source") or {}
    return {
        "coverageNote": (coverage.get("note") or {}).get("ru") or None,
        "applyUrl": program.get("applyUrl"),
        "source": {
            "url": source.get("url"),
            "lastVerified": source.get("lastVerified"),
            "approvedBy": approved_by(program),
        },
        "textConditions": [
            _condition_for_site(condition)
            for condition in program.get("textConditions") or []
        ],
    }


def stale_deadlines(programs, today: str) -> list[str]:
    """Программы, у которых срок уже прошёл, а дата помечена подтверждённой.

    Так гниёт запись: цикл сменился, страница осталась прежней, слежение
    молчит — оно следит за текстом, а не за календарём. Карточка при этом
    говорит «приём закрыт», и человек решает, что программа для него
    кончилась, хотя приём просто идёт в следующем году.

    Дату следующего цикла берут по прошлому и помечают expected. Тогда
    карточка честно скажет «дата пока не подтверждена».
    """
    late = []
    for program in programs:
        deadline = program.get("deadline") or {}
        closes = deadline.get("closes")
        if not closes or closes >= today:
            continue
        if deadline.get("confidence") == "confirmed":
            late.append(f"{program['id']}: срок {closes} прошёл, а помечен подтверждённым")
    return late


def publishable(programs: list[dict]) -> list[dict]:
    # Запись без списка страниц публиковать нельзя: за таким источником
    # слежение не работает, и устаревшие требования выдавались бы
    # уверенно и бессрочно.
    chosen = [
        program
        for program in programs
        if program.get("status") == "published"
        and approved_by(program) in SIGNERS
        and (program.get("source") or {}).get("pages")
    ]
    return sorted(chosen, key=lambda program: program["id"])


def missing_kind(programs: list[dict]) -> list[str]:
    """Публикуемые программы без типа или с неизвестным типом.

    Тип ставит человек (см. KINDS в schema.py), поэтому сборка не выдумывает
    его сама, а отказывается собирать: карточка без типа не знает, в какую
    колонку встать, и молча выпала бы из фильтра по типу.
    """
    allowed = ", ".join(KINDS)
    problems = []
    for program in publishable(programs):
        kind = program.get("kind")
        if kind not in KINDS:
            problems.append(
                f"{program['id']}: тип {kind!r} не из списка ({allowed}) — "
                f"впиши \"kind\" в data/programs/{program['id']}.json"
            )
    return problems


def build_index(programs: list[dict], generated_at: str) -> dict:
    return {
        "generatedAt": generated_at,
        "programs": [index_entry(program) for program in publishable(programs)],
    }


def build_details(programs: list[dict], generated_at: str) -> dict:
    return {
        "generatedAt": generated_at,
        "programs": {program["id"]: details_entry(program) for program in publishable(programs)},
    }


def index_text(index: dict) -> str:
    """Индекс без отступов, но по программе на строку.

    Отступы съедали пять процентов сжатого размера. Совсем в одну строку
    нельзя: индекс лежит в git, и тогда любой diff показывал бы, что
    изменилось всё.
    """
    compact = {"separators": (",", ":"), "ensure_ascii": False}
    programs = ",\n".join(json.dumps(program, **compact) for program in index["programs"])
    head = json.dumps(index["generatedAt"], **compact)
    return f'{{"generatedAt":{head},"programs":[\n{programs}\n]}}\n'


def details_text(details: dict) -> str:
    """Как index_text: без отступов, по программе на строку."""
    compact = {"separators": (",", ":"), "ensure_ascii": False}
    programs = ",\n".join(
        f"{json.dumps(program_id, **compact)}:{json.dumps(entry, **compact)}"
        for program_id, entry in details["programs"].items()
    )
    head = json.dumps(details["generatedAt"], **compact)
    return f'{{"generatedAt":{head},"programs":{{\n{programs}\n}}}}\n'


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    programs_dir = root / "data" / "programs"
    programs = (
        [
            json.loads(path.read_text(encoding="utf-8"))
            for path in sorted(programs_dir.glob("*.json"))
        ]
        if programs_dir.exists()
        else []
    )

    kind_problems = missing_kind(programs)
    if kind_problems:
        for problem in kind_problems:
            print("ТИП:", problem)
        return 1

    index = build_index(programs, date.today().isoformat())
    details = build_details(programs, date.today().isoformat())

    # Молча выкинуть утверждённую программу из выдачи хуже, чем не собрать
    # индекс вовсе: человек считает, что она на сайте.
    for warning in stale_deadlines(programs, date.today().isoformat()):
        print("ВНИМАНИЕ:", warning)
        print("   Дату следующего цикла берут по прошлому и помечают expected.")

    published = {program["id"] for program in index["programs"]}
    for program in programs:
        if program.get("status") == "published" and program["id"] not in published:
            print(f"{program['id']}: утверждена, но в индекс не пошла — проверь source")

    text = index_text(index)
    extra = details_text(details)

    wire = wire_size(text)
    extra_wire = wire_size(extra)
    if wire > MAX_INDEX_WIRE_BYTES:
        print(f"Индекс вырос до {wire} байт по проводу при пределе {MAX_INDEX_WIRE_BYTES}.")
        print("Это не мелочь: аудитория сидит на дорогом мобильном интернете.")
        return 1
    if extra_wire > MAX_DETAILS_WIRE_BYTES:
        print(f"Детали выросли до {extra_wire} байт по проводу при пределе {MAX_DETAILS_WIRE_BYTES}.")
        return 1

    (root / "data" / "index.json").write_text(text, encoding="utf-8")
    (root / "data" / "details.json").write_text(extra, encoding="utf-8")
    print(
        f"Записано программ: {len(index['programs'])}; "
        f"индекс {wire} байт по проводу, детали {extra_wire}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
