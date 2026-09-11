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

from tools.schema import FIELDS

# Предел ставится на то, за что человек платит, — на сжатый размер.
#
# Раньше он стоял на размере файла, и это была неверная величина: Pages
# отдаёт индекс сжатым, и при 13 программах человек получал 11 КБ вместо
# 50. Считая по файлу, сборка отказалась бы работать на 26-й программе,
# то есть до цели в 25-30, — и отказалась бы ради экономии, которой на
# самом деле нет.
#
# 40 КБ по проводу — это примерно 45 программ. Предел не снят, он
# перенесён туда, где цена настоящая: аудитория сидит на дорогом
# мобильном интернете, и следить за ростом всё равно надо.
MAX_INDEX_WIRE_BYTES = 40 * 1024

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
    return {key: value for key, value in rule.items() if key not in STRIPPED_FROM_INDEX}


def index_entry(program: dict) -> dict:
    coverage = program.get("coverage") or {}
    return {
        "id": program["id"],
        "name": program.get("name"),
        "hostCountry": program.get("hostCountry"),
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
        # Текстовые условия едут на сайт: это то, что инструмент не умеет
        # посчитать, но человеку знать обязан. Цитаты из них снимаются —
        # они нужны при проверке записи, а не в карточке.
        "textConditions": [
            {"ru": (condition.get("ru") or "")}
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


def build_index(programs: list[dict], generated_at: str) -> dict:
    # Запись без списка страниц публиковать нельзя: за таким источником
    # слежение не работает, и устаревшие требования выдавались бы
    # уверенно и бессрочно.
    publishable = [
        program
        for program in programs
        if program.get("status") == "published"
        and (program.get("source") or {}).get("humanChecked") is True
        and (program.get("source") or {}).get("pages")
    ]
    publishable.sort(key=lambda program: program["id"])
    return {
        "generatedAt": generated_at,
        "programs": [index_entry(program) for program in publishable],
    }


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

    index = build_index(programs, date.today().isoformat())

    # Молча выкинуть утверждённую программу из выдачи хуже, чем не собрать
    # индекс вовсе: человек считает, что она на сайте.
    for warning in stale_deadlines(programs, date.today().isoformat()):
        print("ВНИМАНИЕ:", warning)
        print("   Дату следующего цикла берут по прошлому и помечают expected.")

    published = {program["id"] for program in index["programs"]}
    for program in programs:
        if program.get("status") == "published" and program["id"] not in published:
            print(f"{program['id']}: утверждена, но в индекс не пошла — проверь source")

    text = json.dumps(index, ensure_ascii=False, indent=2) + "\n"

    size = len(text.encode("utf-8"))
    wire = wire_size(text)
    if wire > MAX_INDEX_WIRE_BYTES:
        print(f"Индекс вырос до {wire} байт по проводу при пределе {MAX_INDEX_WIRE_BYTES}.")
        print("Это не мелочь: аудитория сидит на дорогом мобильном интернете.")
        return 1

    (root / "data" / "index.json").write_text(text, encoding="utf-8")
    print(
        f"Записано программ: {len(index['programs'])}, "
        f"{wire} байт по проводу ({size} на диске)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
