"""Слежение за источниками: не изменились ли требования.

Частота вычисляется из даты дедлайна самой программы. Ручной список
частот устаревает в тот же день, когда его написали.
"""

import json
import sys
from datetime import date, timedelta
from pathlib import Path

from tools.fetch import http_fetch
from tools.snapshot import html_to_text, sha256_of_text, strip_volatile
from tools.sources import load_sources

INTERVAL_DAYS = {"daily": 1, "weekly": 7, "monthly": 30}


def days_until(closes, today: str):
    if not closes:
        return None
    return (date.fromisoformat(closes) - date.fromisoformat(today)).days


def frequency_for(deadline: dict, today: str) -> str:
    left = days_until((deadline or {}).get("closes"), today)
    if left is None or left < 0:
        return "monthly"
    if left < 30:
        return "daily"
    if left <= 90:
        return "weekly"
    return "monthly"


def is_due(program: dict, today: str) -> bool:
    last = (program.get("source") or {}).get("lastVerified")
    if not last:
        return True
    frequency = frequency_for(program.get("deadline") or {}, today)
    due_on = date.fromisoformat(last) + timedelta(days=INTERVAL_DAYS[frequency])
    return date.fromisoformat(today) >= due_on


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    programs_dir = root / "data" / "programs"
    if not programs_dir.exists():
        print("Программ пока нет.")
        return 0

    today = date.today().isoformat()
    stale = []

    # Изменчивые куски описаны там же, где источники: их объявляет человек.
    sources = load_sources(root / "tools" / "sources.toml")

    paths = sorted(programs_dir.glob("*.json"))
    if not paths:
        print("Программ пока нет.")
        return 0

    checked = 0
    for path in paths:
        program = json.loads(path.read_text(encoding="utf-8"))
        if not is_due(program, today):
            continue

        url = (program.get("source") or {}).get("url")
        if not url:
            print(f"{program['id']}: нет адреса источника")
            continue

        checked += 1
        volatile = sources.get(program["id"], {}).get("volatile", [])
        fresh_hash = sha256_of_text(
            strip_volatile(html_to_text(http_fetch(url)), volatile)
        )
        if fresh_hash == program["source"].get("contentHash"):
            program["source"]["lastVerified"] = today
            path.write_text(
                json.dumps(program, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            print(f"{program['id']}: без изменений")
        else:
            stale.append(program["id"])
            print(f"{program['id']}: СТРАНИЦА ИЗМЕНИЛАСЬ — перепроверить требования")

    if stale:
        print("\nУстарели: " + ", ".join(stale))
        print("Дальше: python -m tools.fetch, потом extract, потом review.")
        return 1

    if checked == 0:
        print(f"Проверять нечего: у всех {len(paths)} программ срок проверки ещё не подошёл.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
