"""Одноразовый перенос записей на список страниц источника.

Раньше запись помнила адрес и хеш только первой страницы. Хеши всех
остальных лежат в снимке, в meta.json, — брать их оттуда механически
безопасно: это те же числа, что посчитал fetch, а не пересказ.

Скрипт ничего не решает за человека. Если снимок разошёлся с записью, он
говорит об этом и не трогает файл: значит, страница успела измениться, и
это работа для review, а не для миграции.

Запускать повторно можно: уже перенесённые записи пропускаются.
"""

import json
import sys
from pathlib import Path

from tools.fetch import latest_snapshot
from tools.snapshot import source_fingerprint


def migrate(program: dict, meta: dict) -> tuple[dict, str]:
    """Возвращает перенесённую запись и строку с тем, что произошло."""
    source = program.get("source") or {}
    if source.get("pages"):
        return program, "уже перенесена"

    pages = meta["pages"]
    old_hash = source.get("contentHash")
    if old_hash is not None and old_hash != pages[0]["contentHash"]:
        return program, "снимок новее записи — сначала review, миграция пропущена"

    migrated = json.loads(json.dumps(program))
    migrated["source"]["pages"] = [
        {"url": page["url"], "contentHash": page["contentHash"]} for page in pages
    ]
    migrated["source"]["url"] = pages[0]["url"]
    migrated["source"].pop("contentHash", None)

    # Отказы человека перепривязываются к отпечатку всего источника. Это
    # не подделка подписи: review показывает объединённый текст всех
    # страниц, значит отвечал человек именно по этому набору.
    declined = migrated.get("leftEmpty")
    if declined:
        fingerprint = source_fingerprint(pages)
        migrated["leftEmpty"] = {field: fingerprint for field in declined}

    return migrated, f"страниц: {len(pages)}"


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    programs_dir = root / "data" / "programs"

    for path in sorted(programs_dir.glob("*.json")):
        program = json.loads(path.read_text(encoding="utf-8"))
        snapshot_dir = latest_snapshot(root, program["id"])
        if snapshot_dir is None:
            print(f"{program['id']}: снимка нет, пропускаю")
            continue

        meta = json.loads((snapshot_dir / "meta.json").read_text(encoding="utf-8"))
        migrated, note = migrate(program, meta)
        if migrated is not program:
            path.write_text(
                json.dumps(migrated, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        print(f"{program['id']}: {note}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
