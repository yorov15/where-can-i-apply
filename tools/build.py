"""Сборка индекса, который читает сайт.

Цитаты и источники в индекс не идут: они составляют основную массу
байтов и нужны только когда человек открыл карточку. Публикуется лишь
то, что утвердил человек, — это последний рубеж перед выдачей.
"""

import json
import sys
from datetime import date
from pathlib import Path

from tools.schema import FIELDS

MAX_INDEX_BYTES = 100 * 1024


# Что не едет в индекс: цитата и заметка человека. Обе нужны только когда
# кто-то проверяет запись, и обе — основная масса байтов. Флаг noLimit
# остаётся: без него движок не отличит «требования нет» от «не знаем».
STRIPPED_FROM_INDEX = ("evidence", "note")


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


def build_index(programs: list[dict], generated_at: str) -> dict:
    publishable = [
        program
        for program in programs
        if program.get("status") == "published"
        and (program.get("source") or {}).get("humanChecked") is True
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
    text = json.dumps(index, ensure_ascii=False, indent=2) + "\n"

    size = len(text.encode("utf-8"))
    if size > MAX_INDEX_BYTES:
        print(f"Индекс вырос до {size} байт при пределе {MAX_INDEX_BYTES}.")
        print("Это не мелочь: аудитория сидит на дорогом мобильном интернете.")
        return 1

    (root / "data" / "index.json").write_text(text, encoding="utf-8")
    print(f"Записано программ: {len(index['programs'])}, размер {size} байт")
    return 0


if __name__ == "__main__":
    sys.exit(main())
