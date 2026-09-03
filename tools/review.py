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

from tools.schema import FIELDS
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

        problems = validate_program(proposed, text)
        if problems:
            print(f"\n{program_id}: запись не прошла проверку, утверждать нечего:")
            for problem in problems:
                print("  -", problem)
            continue

        target = programs_dir / f"{program_id}.json"
        current = json.loads(target.read_text(encoding="utf-8")) if target.exists() else None

        changes = field_changes(current, proposed)
        if not changes:
            print(f"{program_id}: изменений нет")
            continue

        print(f"\n{program_id}: изменений {len(changes)}")
        for change in changes:
            _show(change)

        answer = input("\nУтвердить эту запись целиком? [да/нет] ").strip().lower()
        if answer not in ("да", "y", "yes"):
            print("пропущено")
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
