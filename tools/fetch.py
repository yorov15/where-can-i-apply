"""Скачивание снимков утверждённых страниц.

Снимок кладётся текстом с датой в имени папки. Текст, а не HTML: он
нужен, чтобы проверка цитат работала не только в момент скачивания, но и
через полгода, когда кто-то спросит, откуда взялось число.

fetcher передаётся аргументом, а не берётся из urllib внутри: так шаг
проверяется тестом без сети, а сеть живёт ровно в одном месте.
"""

import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

from tools.snapshot import html_to_text, sha256_of_text
from tools.sources import check_sources, load_sources

# Только ASCII: значения заголовков HTTP кодируются в latin-1, и кириллица
# роняет запрос в http.client ещё до отправки, с UnicodeEncodeError.
USER_AGENT = "eligibility-tool/0.1 (educational project; collecting admission requirements)"
TIMEOUT_SECONDS = 30


def snapshot_paths(root, program_id: str, today: str) -> Path:
    return Path(root) / "raw" / program_id / today


def save_snapshots(root, program_id: str, urls, today: str, fetcher) -> dict:
    folder = snapshot_paths(root, program_id, today)
    folder.mkdir(parents=True, exist_ok=True)

    pages = []
    for number, url in enumerate(urls):
        text = html_to_text(fetcher(url))
        name = f"{number:02d}.txt"
        (folder / name).write_text(text, encoding="utf-8")
        pages.append({"url": url, "file": name, "contentHash": sha256_of_text(text)})

    meta = {"programId": program_id, "fetchedAt": today, "pages": pages}
    (folder / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return meta


def http_fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        raw = response.read()
    return raw.decode("utf-8", errors="replace")


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    raw = load_sources(root / "tools" / "sources.toml")

    problems = check_sources(raw)
    if problems:
        for problem in problems:
            print(problem)
        return 1

    if not raw:
        print("В tools/sources.toml нет ни одного источника. Вписывать их — работа человека.")
        return 1

    today = date.today().isoformat()
    for program_id, entry in raw.items():
        meta = save_snapshots(root, program_id, entry["urls"], today, http_fetch)
        print(f"{program_id}: снято страниц {len(meta['pages'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
