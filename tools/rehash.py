"""Пересчёт хешей снимков без обращения к сети.

Хеш зависит от двух вещей: от текста страницы и от наших правил
нормализации. Когда меняются правила — а они менялись уже дважды, из-за
неразрывного пробела и неразрывного дефиса, — все сохранённые хеши
устаревают, хотя ни одна страница не изменилась.

Без пересчёта первый же запуск check.py объявил бы все страницы
изменившимися. Скачивать заново для этого не нужно и вредно: снимок на
диске и есть та страница, по которой человек проверял цитаты.
"""

import json
import sys
from pathlib import Path

from tools.snapshot import normalize, sha256_of_text, strip_volatile
from tools.sources import load_sources


def rehash_meta(meta: dict, texts: dict, volatile=()) -> dict:
    """Возвращает meta с пересчитанными хешами. Исходный meta не трогает."""
    updated = json.loads(json.dumps(meta))
    for page in updated["pages"]:
        text = texts[page["file"]]
        page["contentHash"] = sha256_of_text(strip_volatile(normalize(text), volatile))
    return updated


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    raw_root = root / "raw"
    if not raw_root.exists():
        print("Папки raw/ нет, пересчитывать нечего.")
        return 0

    sources = load_sources(root / "tools" / "sources.toml")
    changed = 0

    for program_dir in sorted(p for p in raw_root.iterdir() if p.is_dir()):
        volatile = sources.get(program_dir.name, {}).get("volatile", [])
        for snapshot_dir in sorted(p for p in program_dir.iterdir() if p.is_dir()):
            meta_path = snapshot_dir / "meta.json"
            if not meta_path.exists():
                continue
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            texts = {
                path.name: path.read_text(encoding="utf-8")
                for path in snapshot_dir.glob("*.txt")
            }
            updated = rehash_meta(meta, texts, volatile)
            if updated == meta:
                print(f"{program_dir.name}/{snapshot_dir.name}: хеши уже верные")
                continue
            meta_path.write_text(
                json.dumps(updated, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            changed += 1
            for old, new in zip(meta["pages"], updated["pages"]):
                print(f"{program_dir.name}/{snapshot_dir.name}/{old['file']}:")
                print(f"   было:  {old['contentHash']}")
                print(f"   стало: {new['contentHash']}")

    print(f"\nПересчитано снимков: {changed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
