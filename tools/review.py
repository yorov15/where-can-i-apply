"""Утверждение записи человеком.

Единственный файл, которому разрешено писать в data/programs/. У шага
извлечения такого права нет — поэтому непроверенное значение не может
попасть в выдачу, даже если кто-то забудет посмотреть.
"""

import copy
import json
import sys
from datetime import date
from pathlib import Path

from tools.schema import FIELDS, absence_rule
from tools.validate import validate_program


def field_changes(current, proposed) -> list[dict]:
    current_rules = (current or {}).get("eligibility", {})
    proposed_rules = proposed.get("eligibility", {})

    changes = []
    for field in FIELDS:
        before = current_rules.get(field)
        after = proposed_rules.get(field)
        if before == after:
            continue
        if before is None and after is None:
            continue
        changes.append({"field": field, "before": before, "after": after})
    return changes


def merge_proposed(current, proposed: dict) -> dict:
    """Накладывает предложение модели на утверждённую запись.

    null в предложении означает «модель ничего не нашла», а не «здесь
    ничего не должно быть»: extract.py прямо велит возвращать null, когда
    поля нет в тексте явно. Трактовать это как «убрать» — значит молча
    предлагать откат чужой работы, в том числе подписей человека, которых
    модель поставить не может в принципе.

    Убрать правило можно, отредактировав запись руками. Побочным эффектом
    того, что модель промолчала, — нельзя.
    """
    merged = copy.deepcopy(proposed)
    current_rules = (current or {}).get("eligibility") or {}
    merged.setdefault("eligibility", {})

    for field in FIELDS:
        if merged["eligibility"].get(field) is None and current_rules.get(field) is not None:
            merged["eligibility"][field] = copy.deepcopy(current_rules[field])

    return merged


def empty_fields(program: dict) -> list[str]:
    """Поля, про которые в записи ничего нет.

    Каждое такое поле красит карточку в жёлтый с текстом «программа не
    указывает». Иногда это правда — мы не смотрели. А иногда человек
    страницу читал и требования там действительно нет. Второе надо уметь
    сказать, иначе жёлтыми становятся почти все записи и цвет перестаёт
    что-либо значить.
    """
    rules = program.get("eligibility", {})
    return [field for field in FIELDS if rules.get(field) is None]


def sign_absence(program: dict, field: str, today: str, note: str) -> dict:
    """Ставит подпись человека под отсутствием требования. Вход не меняет."""
    signed = copy.deepcopy(program)
    signed.setdefault("eligibility", {})[field] = absence_rule(today, note)
    return signed


def approve(program: dict, today: str, source_url: str, content_hash: str) -> dict:
    approved = copy.deepcopy(program)
    approved["status"] = "published"
    approved.setdefault("source", {})
    approved["source"]["url"] = source_url
    approved["source"]["lastVerified"] = today
    approved["source"]["contentHash"] = content_hash
    approved["source"]["humanChecked"] = True
    return approved


def _show(change: dict) -> None:
    print(f"\n=== {change['field']} ===")
    print("было:  ", json.dumps(change["before"], ensure_ascii=False))
    print("станет:", json.dumps(change["after"], ensure_ascii=False))


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    proposed_dir = root / "proposed"
    programs_dir = root / "data" / "programs"
    programs_dir.mkdir(parents=True, exist_ok=True)

    candidates = sorted(proposed_dir.glob("*.json")) if proposed_dir.exists() else []
    if not candidates:
        print("В proposed/ нет ни одной записи. Сначала tools.fetch и tools.extract.")
        return 1

    for path in candidates:
        program_id = path.stem
        proposed = json.loads(path.read_text(encoding="utf-8"))

        snapshot_dir = sorted((root / "raw" / program_id).iterdir())[-1]
        meta = json.loads((snapshot_dir / "meta.json").read_text(encoding="utf-8"))
        text = "\n\n".join(
            p.read_text(encoding="utf-8") for p in sorted(snapshot_dir.glob("*.txt"))
        )

        # Обязательные поля здесь не требуем: их ещё можно заполнить
        # подписью ниже, а отвергнуть запись до этого — значит не дать
        # её заполнить вообще.
        problems = validate_program(proposed, text, check_required=False)
        if problems:
            print(f"\n{program_id}: запись не прошла проверку, утверждать нечего:")
            for problem in problems:
                print("  -", problem)
            continue

        target = programs_dir / f"{program_id}.json"
        current = json.loads(target.read_text(encoding="utf-8")) if target.exists() else None

        proposed = merge_proposed(current, proposed)
        changes = field_changes(current, proposed)
        empty = empty_fields(proposed)

        # Пустые поля — повод зайти, даже когда правила не менялись:
        # запись могла быть утверждена раньше, а подписи под отсутствием
        # требований ещё не поставлены.
        if not changes and not empty:
            print(f"{program_id}: изменений нет")
            continue

        if changes:
            print(f"\n{program_id}: изменений {len(changes)}")
            for change in changes:
                _show(change)

            answer = input("\nУтвердить эту запись целиком? [да/нет] ").strip().lower()
            if answer not in ("да", "y", "yes"):
                print("пропущено")
                continue
        else:
            print(f"\n{program_id}: правила не менялись, но есть пустые поля")

        if empty:
            print(f"\nОсталось {len(empty)} пустых полей.")
            print("Пустое поле красит карточку в жёлтый: «программа не указывает».")
            print("Если ты открывал страницу и требования там правда нет — скажи да,")
            print("и поле перестанет желтить выдачу. Подпись будет твоя, не модели.")
            today = date.today().isoformat()
            for field in empty:
                reply = input(f"  {field}: требования на странице нет? [да/нет] ")
                if reply.strip().lower() not in ("да", "y", "yes"):
                    continue
                note = input("     чем именно ручаешься (одной строкой): ").strip()
                if not note:
                    print("     без пояснения подпись не ставится, пропускаю")
                    continue
                proposed = sign_absence(proposed, field, today, note)

            if not changes and not field_changes(current, proposed):
                print(f"{program_id}: ничего не подписано, запись не тронута")
                continue

        # Проверяем то, что действительно запишется: после слияния с
        # утверждённой записью и после подписей. Перенесённое правило могло
        # опираться на цитату, которой в новом снимке уже нет.
        problems = validate_program(proposed, text)
        if problems:
            print(f"\n{program_id}: итоговая запись не проходит проверку:")
            for problem in problems:
                print("  -", problem)
            print("Ничего не записано.")
            continue

        approved = approve(
            proposed,
            date.today().isoformat(),
            meta["pages"][0]["url"],
            meta["pages"][0]["contentHash"],
        )
        target.write_text(
            json.dumps(approved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"{program_id}: записано в {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
