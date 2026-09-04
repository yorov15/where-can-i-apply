"""Слежение за источниками: не изменились ли требования.

Частота вычисляется из даты дедлайна самой программы. Ручной список
частот устаревает в тот же день, когда его написали.
"""

import json
import sys
from datetime import date, timedelta
from pathlib import Path

from tools.fetch import http_fetch, page_to_text, with_retries
from tools.snapshot import sha256_of_text, strip_volatile
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


def compare_pages(pages, volatile, fetcher):
    """Сверяет каждую страницу источника с записанным хешем.

    Отдельная функция, потому что это и есть всё содержание слежения:
    пока сравнение жило внутри main, проверить его можно было только
    руками, и оно полгода смотрело на одну первую страницу.

    Возвращает (изменившиеся адреса, недоступные с их ошибками).
    """
    changed, gone = [], []
    for page in pages:
        try:
            fresh = sha256_of_text(strip_volatile(page_to_text(fetcher(page["url"])), volatile))
        except Exception as error:
            gone.append((page["url"], error))
            continue
        if fresh != page.get("contentHash"):
            changed.append(page["url"])
    return changed, gone


def main(argv=None) -> int:
    # Без принудительного запуска слежение нельзя проверить иначе как
    # ожиданием: сразу после review все записи свежие, и check честно
    # отвечает «срок не подошёл». Проверять инструмент ожиданием — значит
    # не проверять его вовсе.
    force = "--now" in (argv if argv is not None else sys.argv[1:])

    root = Path(__file__).resolve().parent.parent
    programs_dir = root / "data" / "programs"
    if not programs_dir.exists():
        print("Программ пока нет.")
        return 0

    today = date.today().isoformat()
    stale = []
    missing = []
    manual = []

    # Изменчивые куски описаны там же, где источники: их объявляет человек.
    sources = load_sources(root / "tools" / "sources.toml")

    paths = sorted(programs_dir.glob("*.json"))
    if not paths:
        print("Программ пока нет.")
        return 0

    checked = 0
    for path in paths:
        program = json.loads(path.read_text(encoding="utf-8"))
        if not force and not is_due(program, today):
            continue

        source = program.get("source") or {}
        pages = source.get("pages") or []
        if not pages:
            print(f"{program['id']}: в записи нет страниц источника — перезапиши через review")
            continue
        url = source.get("url") or pages[0]["url"]

        # Ручной источник перекачать нельзя — его и брали руками потому,
        # что программе он недоступен. Слежение всё равно работает: срок
        # считается так же, а пересохранить файл человек должен сам.
        if sources.get(program["id"], {}).get("files"):
            manual.append(program["id"])
            print(f"{program['id']}: источник ручной — пересохрани файл и запусти fetch")
            print(f"   {url}")
            continue

        checked += 1
        volatile = sources.get(program["id"], {}).get("volatile", [])

        # Источник может исчезнуть, и для PDF это не исключение, а норма:
        # адрес «Call for Applications 2026/2027» через год отдаёт 404.
        # Падать на этом нельзя — остальные программы тоже надо проверить.
        # Каждая страница проверяется отдельно, и адрес изменившейся
        # называется вслух: «что-то изменилось» по программе из трёх
        # источников означает перечитывать все три заново.
        # С повторами, как в fetch: одна оборванная связь не повод
        # объявить источник исчезнувшим. Без этого слежение по расписанию
        # поднимало бы ложную тревогу почти каждый запуск.
        changed, gone = compare_pages(pages, volatile, with_retries(http_fetch))

        if gone:
            missing.append(program["id"])
            for page_url, error in gone:
                print(f"{program['id']}: ИСТОЧНИК НЕДОСТУПЕН — {error}")
                print(f"   {page_url}")

        if changed:
            stale.append(program["id"])
            print(f"{program['id']}: СТРАНИЦА ИЗМЕНИЛАСЬ — перепроверить требования")
            for page_url in changed:
                print(f"   {page_url}")

        if not gone and not changed:
            program["source"]["lastVerified"] = today
            path.write_text(
                json.dumps(program, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            print(f"{program['id']}: без изменений")

    if manual:
        print("\nЖдут ручного обновления: " + ", ".join(manual))
        print("Открой адрес сам, пересохрани файл в manual/, потом python -m tools.fetch")

    if missing:
        print("\nИсточник недоступен: " + ", ".join(missing))
        print("Если адрес изменился навсегда — впиши новый в tools/sources.toml.")

    if stale:
        print("\nУстарели: " + ", ".join(stale))
        print("Дальше: python -m tools.fetch, потом extract, потом review.")

    if stale or missing or manual:
        return 1

    if checked == 0:
        print(f"Проверять нечего: у всех {len(paths)} программ срок проверки ещё не подошёл.")
        print("Проверить всё равно: python -m tools.check --now")
    return 0


if __name__ == "__main__":
    sys.exit(main())
