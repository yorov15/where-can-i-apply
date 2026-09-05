"""Поиск слова в сохранённом источнике программы.

Человека просят подписаться под тем, что требования на странице нет. Без
этого инструмента проверить такое можно было только глазами по всему
тексту — а у KAIST это сорок две тысячи символов, из них тридцать пять в
PDF. Подпись, которую нельзя проверить за разумное время, превращается в
формальность, и тогда она ничего не стоит.

Ничего не пишет и не качает: читает последний снимок, тот самый текст,
по которому проверяются цитаты.

    python -m tools.look kaist age
    python -m tools.look kaist GPA "grade point"
    python -m tools.look kaist            — что вообще есть в снимке
"""

import json
import sys
from pathlib import Path

from tools.fetch import latest_snapshot

WIDTH = 140


def mentions(text: str, query: str, width: int = WIDTH) -> list[str]:
    """Все вхождения query с текстом вокруг. Регистр не важен."""
    if not query:
        return []
    haystack, needle = text.lower(), query.lower()
    found = []
    at = haystack.find(needle)
    while at != -1:
        start = max(0, at - width)
        end = min(len(text), at + len(query) + width)
        found.append(" ".join(text[start:end].split()))
        at = haystack.find(needle, at + len(needle))
    return found


def main(argv=None) -> int:
    args = list(argv if argv is not None else sys.argv[1:])
    if not args:
        print("Укажи программу: python -m tools.look kaist age")
        return 1

    program_id, words = args[0], args[1:]
    root = Path(__file__).resolve().parent.parent
    snapshot = latest_snapshot(root, program_id)
    if snapshot is None:
        print(f"{program_id}: законченного снимка нет, сначала python -m tools.fetch {program_id}")
        return 1

    meta = json.loads((snapshot / "meta.json").read_text(encoding="utf-8"))
    pages = [
        (page["url"], (snapshot / page["file"]).read_text(encoding="utf-8"))
        for page in meta["pages"]
    ]

    if not words:
        print(f"{program_id}: снимок от {meta['fetchedAt']}, страниц {len(pages)}")
        for url, text in pages:
            print(f"  {len(text):>6} символов  {url}")
        return 0

    for word in words:
        print(f"\n=== {word} ===")
        total = 0
        for url, text in pages:
            for snippet in mentions(text, word):
                total += 1
                print(f"[{url}]")
                print(f"  ...{snippet}...")
        if total == 0:
            # Ради этой строки инструмент и написан: подписываются под
            # отсутствием требования, а не под его наличием.
            print(f"ни одного упоминания на всех {len(pages)} страницах источника")
    return 0


if __name__ == "__main__":
    sys.exit(main())
