"""Смена цикла: у закрытых программ появились даты следующего года?

Слежение за хешами (check.py) отвечает на вопрос «страница изменилась?»,
а человеку нужно другое: «можно ли уже обновить срок?». Пока программа
закрыта, её страница меняется по сотне причин, и красный прогон ни о чём
не говорит. Здесь вопрос уже: упоминает ли страница год следующего
цикла. Это подсказка, где искать, а не новая дата: срок в карточку
вносит человек, с цитатой.

Заходит и на ручные источники: слежение их пропускает, а сами адреса
у большинства открываются обычной загрузкой.
"""

import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

from tools.fetch import http_fetch, page_to_text, with_retries
from tools.sources import load_sources

MAX_PAGES = 10
SNIPPET = 90

# Год рядом с этими словами — про приём; рядом с этими — про паспорт, визу
# или семестр уже идущего года, и в отчёте он только шумит.
ADMISSION_WORDS = re.compile(
    r"apply|application|deadline|admission|intake|enrol|call for|приём|прием|подач|набор|접수|모집",
    re.IGNORECASE,
)
NOISE_WORDS = re.compile(
    r"passport|valid|expir|visa|residence|permit|fee for|tuition fee|护照|有效", re.IGNORECASE
)


def next_year(closes: str) -> int:
    return int(closes[:4]) + 1


def year_hits(text: str, year: int, limit: int = 2) -> list[str]:
    """Куски текста с годом как отдельным числом, где речь о приёме."""
    flat = re.sub(r"\s+", " ", text)
    # «2026/2027» — текущий учебный год, а не следующий цикл.
    pattern = re.compile(rf"(?<!\d)(?<!\d{{4}}/)(?<!\d{{4}}-)(?<!\d{{4}}–){year}(?!\d)")
    snippets = (
        flat[max(0, m.start() - SNIPPET) : m.end() + SNIPPET].strip()
        for m in pattern.finditer(flat)
    )
    return [s for s in snippets if ADMISSION_WORDS.search(s) and not NOISE_WORDS.search(s)][:limit]


def page_urls(entry: dict) -> list[str]:
    urls = list(entry.get("urls", [])) + [f["url"] for f in entry.get("files", [])]
    seen, out = set(), []
    for url in urls:
        if url not in seen:
            seen.add(url)
            out.append(url)
    return out[:MAX_PAGES]


def closed_programs(programs_dir: Path, today: str) -> list[dict]:
    found = []
    for path in sorted(programs_dir.glob("*.json")):
        program = json.loads(path.read_text(encoding="utf-8"))
        closes = (program.get("deadline") or {}).get("closes")
        if closes and closes < today:
            found.append(program)
    return sorted(found, key=lambda p: p["deadline"]["closes"])


def scan(program: dict, sources: dict, fetcher) -> list[tuple[str, str]]:
    year = next_year(program["deadline"]["closes"])
    hits = []
    for url in page_urls(sources.get(program["id"], {})):
        try:
            text = page_to_text(fetcher(url))
        except Exception:
            continue
        for snippet in year_hits(text, year):
            hits.append((url, snippet))
    return hits


def report(rows: list[tuple[dict, list[tuple[str, str]]]], today: str) -> str:
    if not rows:
        return ""
    lines = [
        f"Проверка на {today}. У этих программ срок прошёл, а страницы источников уже "
        "называют год следующего цикла. Это подсказка: открой страницу, найди даты "
        "и внеси их в карточку с цитатой.",
        "",
    ]
    for program, hits in rows:
        name = (program.get("name") or {}).get("ru") or program["id"]
        lines.append(f"### {name} (`{program['id']}`), срок был {program['deadline']['closes']}")
        for url, snippet in hits:
            lines.append(f"- {url}\n  > {snippet}")
        lines.append("")
    return "\n".join(lines)


def main(argv=None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    out = Path(args[args.index("--out") + 1]) if "--out" in args else None
    root = Path(__file__).resolve().parent.parent
    today = date.today().isoformat()
    sources = load_sources(root / "tools" / "sources.toml")
    programs = closed_programs(root / "data" / "programs", today)
    fetcher = with_retries(http_fetch)
    with ThreadPoolExecutor(8) as pool:
        scanned = list(pool.map(lambda p: scan(p, sources, fetcher), programs))
    rows = [(p, h) for p, h in zip(programs, scanned) if h]
    text = report(rows, today)
    print(f"Закрытых программ: {len(programs)}, с годом нового цикла на страницах: {len(rows)}")
    print(text)
    if out:
        out.write_text(text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
