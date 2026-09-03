"""Подготовка задания для модели.

Пишет только в proposed/. Пути записи в data/programs/ у этого шага нет
физически: правило «человек утверждает, робот собирает» держится на
структуре, а не на договорённости.
"""

import json
import sys
from pathlib import Path

from tools.schema import empty_program

RULES = """\
Ты заполняешь запись о программе обучения по тексту её официальной страницы.

Две защиты, обе обязательные:

1. Если поля нет в тексте явно — верни null. Не выводи, не догадывайся, не
   бери из общих знаний. Значение не из текста — это ошибка, а не помощь.
2. К каждому заполненному правилу дай evidence — дословную цитату из текста
   ниже. Цитата проверяется поиском подстроки по этому же тексту. Если ты
   пересказал своими словами, проверка не пройдёт.

Если в тексте прямо написано, что ограничения нет, — заполни правило пустыми
значениями и дай цитату, которая это подтверждает. Это не то же самое, что null:
null означает «в тексте про это ничего нет».
"""


def build_prompt(program_id: str, name: str, snapshot_text: str) -> str:
    shape = json.dumps(
        empty_program(program_id, name)["eligibility"], ensure_ascii=False, indent=2
    )
    return (
        f"# Задание: {name} ({program_id})\n\n"
        f"{RULES}\n"
        "## Форма ответа\n\n"
        "Верни JSON целиком в этой форме, заполнив что нашлось:\n\n"
        f"```json\n{shape}\n```\n\n"
        "## Текст страницы\n\n"
        f"{snapshot_text}\n"
    )


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    raw_root = root / "raw"
    proposed = root / "proposed"
    proposed.mkdir(exist_ok=True)

    if not raw_root.exists():
        print("Папки raw/ нет. Сначала запусти python -m tools.fetch")
        return 1

    for program_dir in sorted(raw_root.iterdir()):
        if not program_dir.is_dir():
            continue
        snapshots = sorted(p for p in program_dir.iterdir() if p.is_dir())
        if not snapshots:
            print(f"{program_dir.name}: снимков нет, пропускаю")
            continue
        latest = snapshots[-1]
        text = "\n\n".join(
            path.read_text(encoding="utf-8") for path in sorted(latest.glob("*.txt"))
        )
        program_id = program_dir.name
        prompt = build_prompt(program_id, program_id, text)
        (proposed / f"{program_id}.prompt.md").write_text(prompt, encoding="utf-8")
        print(f"{program_id}: задание готово в proposed/{program_id}.prompt.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
