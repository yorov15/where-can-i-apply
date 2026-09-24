"""Перепроверка утверждённых записей по свежему снимку. Без сети.

Сеть живёт в tools.fetch: он кладёт свежий снимок в raw/<id>/<дата>/.
Этот модуль читает два последних снимка и саму запись и отвечает на три
вопроса, ради которых записи перепроверяют:

  1. Каждая цитата всё ещё стоит на странице дословно?
  2. Какие страницы изменились с прошлого снимка и что именно в них
     изменилось (построчная разница, а не одно слово «изменилось»)?
  3. Совпадает ли дата закрытия приёма из записи с текстом страницы?

Записывает он только с флагом --write, и только то, что доказано:
если все цитаты сходятся, в записи обновляются хеши страниц и дата
проверки. Цитату он не правит никогда: расхождение — это решение
человека (или ассистента, который прочитал разницу), а не машины.

    python -m tools.fetch mit hku
    python -m tools.reverify mit hku            — отчёт
    python -m tools.reverify mit hku --write    — обновить хеши и дату
"""

import difflib
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path

from tools.fetch import latest_snapshot
from tools.snapshot import normalize
from tools.validate import validate_program

MONTHS = (
    "january february march april may june july august "
    "september october november december"
).split()

DIFF_LIMIT = 25
SNIPPET = 220


def snapshot_texts(snapshot_dir: Path):
    """(meta, {file: text}) одного снимка."""
    meta = json.loads((snapshot_dir / "meta.json").read_text(encoding="utf-8"))
    texts = {
        page["file"]: (snapshot_dir / page["file"]).read_text(encoding="utf-8")
        for page in meta["pages"]
    }
    return meta, texts


def snapshots_of(root: Path, program_id: str) -> list[Path]:
    """Законченные снимки программы, от старого к новому."""
    folder = root / "raw" / program_id
    if not folder.exists():
        return []
    return [
        path
        for path in sorted(folder.iterdir())
        if path.is_dir() and (path / "meta.json").exists()
    ]


def joined(texts: dict) -> str:
    return "\n\n".join(texts[name] for name in sorted(texts))


def sentences(text: str) -> list[str]:
    """Текст страницы кусками, по которым удобно сравнивать."""
    parts = re.split(r"(?<=[.!?;:])\s+", text)
    return [part.strip() for part in parts if part.strip()]


def word_edits(old: str, new: str, context: int = 6) -> list[str]:
    """Что изменилось внутри одного длинного куска, слово за словом.

    Страницы вузов режутся на «предложения» по точкам, а меню сайта и
    таблицы точек не содержат: весь кусок в тысячи знаков меняется целиком
    из-за одной цифры. Показывать его весь бессмысленно, поэтому
    показываются только изменившиеся слова и шесть слов вокруг.
    """
    a, b = old.split(), new.split()
    matcher = difflib.SequenceMatcher(None, a, b, autojunk=False)
    edits = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        before = " ".join(a[max(0, i1 - context) : i1])
        after = " ".join(a[i2 : i2 + context])
        gone = " ".join(a[i1:i2])[:SNIPPET]
        came = " ".join(b[j1:j2])[:SNIPPET]
        edits.append(f"...{before} [{gone} => {came}] {after}...")
    return edits


def page_diff(old: str, new: str, limit: int = DIFF_LIMIT):
    """Что убрано со страницы и что на ней появилось. Кратко.

    Возвращает (убрано, добавлено, число убранного, число добавленного).
    Длинные куски, заменённые парой «был — стал», сводятся к словесной
    разнице: см. word_edits.
    """
    a, b = sentences(old), sentences(new)
    removed, added = [], []
    matcher = difflib.SequenceMatcher(None, a, b, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "replace" and (i2 - i1) == (j2 - j1):
            for x, y in zip(a[i1:i2], b[j1:j2]):
                if len(x) > SNIPPET or len(y) > SNIPPET:
                    edits = word_edits(x, y)
                    removed.extend("~ " + e for e in edits)
                else:
                    removed.append(x)
                    added.append(y)
            continue
        if tag in ("delete", "replace"):
            removed.extend(a[i1:i2])
        if tag in ("insert", "replace"):
            added.extend(b[j1:j2])
    clip = lambda items: [item[: SNIPPET * 2] for item in items[:limit]]
    return clip(removed), clip(added), len(removed), len(added)


def deadline_seen(closes, text: str):
    """Стоит ли день и месяц закрытия приёма на странице.

    Проверка эвристическая и годится только как сигнал «посмотри
    глазами»: даты пишут по-разному. Возвращает None, когда даты в
    записи нет; True/False иначе.
    """
    if not closes:
        return None
    year, month, day = (int(part) for part in closes.split("-"))
    low = normalize(text).lower()
    name = MONTHS[month - 1]
    short = name[:3]
    day_re = rf"\b0?{day}(?:st|nd|rd|th)?\b"
    pattern = (
        rf"{day_re}[\s,.-]*(?:of\s+)?(?:{name}|{short}\.?)\b"
        rf"|(?:{name}|{short}\.?)\s*{day_re}"
        rf"|{year}-{month:02d}-{day:02d}"
        rf"|{day:02d}[./]{month:02d}[./]{year}"
        rf"|{month:02d}/{day:02d}/{year}"
    )
    return re.search(pattern, low) is not None


def report_for(root: Path, program: dict) -> dict:
    """Всё, что можно сказать о записи по двум последним снимкам."""
    program_id = program["id"]
    shots = snapshots_of(root, program_id)
    result = {"id": program_id, "problems": [], "changed": [], "gone": []}
    if not shots:
        result["state"] = "NO_SNAPSHOT"
        return result

    meta, texts = snapshot_texts(shots[-1])
    result["fetchedAt"] = meta["fetchedAt"]
    result["problems"] = validate_program(program, joined(texts))

    recorded = {
        page["url"]: page.get("contentHash")
        for page in (program.get("source") or {}).get("pages") or []
    }
    previous = snapshot_texts(shots[-2])[1] if len(shots) > 1 else {}
    previous_meta = snapshot_texts(shots[-2])[0] if len(shots) > 1 else {"pages": []}
    old_by_url = {
        page["url"]: previous.get(page["file"]) for page in previous_meta["pages"]
    }

    for page in meta["pages"]:
        if recorded.get(page["url"]) == page["contentHash"]:
            continue
        entry = {"url": page["url"], "recorded": recorded.get(page["url"])}
        old = old_by_url.get(page["url"])
        if old is not None:
            entry["removed"], entry["added"], entry["nRemoved"], entry["nAdded"] = page_diff(
                old, texts[page["file"]]
            )
        result["changed"].append(entry)

    result["gone"] = sorted(set(recorded) - {page["url"] for page in meta["pages"]})
    result["deadlineSeen"] = deadline_seen(
        (program.get("deadline") or {}).get("closes"), joined(texts)
    )

    if result["problems"] or result["gone"]:
        result["state"] = "BROKEN"
    elif result["changed"]:
        result["state"] = "CHANGED"
    else:
        result["state"] = "OK"
    return result


def refreshed(program: dict, meta: dict) -> dict:
    """Запись с новыми хешами и датой проверки. Всё остальное как было.

    Кто утвердил запись и что ему было показано, не трогается: страница
    прочитана заново, а не запись переписана.
    """
    updated = json.loads(json.dumps(program))
    source = updated["source"]
    source["pages"] = [
        {"url": page["url"], "contentHash": page["contentHash"]} for page in meta["pages"]
    ]
    source["lastVerified"] = max(source.get("lastVerified") or "", meta["fetchedAt"])
    return updated


def prune_identical(root: Path, program_id: str) -> bool:
    """Убирает новый снимок, если он слово в слово повторяет прошлый.

    Хеши равны — текст тот же, хранить его дважды незачем.
    """
    shots = snapshots_of(root, program_id)
    if len(shots) < 2:
        return False
    new, old = snapshot_texts(shots[-1]), snapshot_texts(shots[-2])
    same = [p["contentHash"] for p in new[0]["pages"]] == [
        p["contentHash"] for p in old[0]["pages"]
    ]
    if same and [p["url"] for p in new[0]["pages"]] == [p["url"] for p in old[0]["pages"]]:
        shutil.rmtree(shots[-1])
        return True
    return False


def show(result: dict) -> None:
    print(f"\n{result['id']}: {result['state']}")
    for problem in result["problems"]:
        print("  ЦИТАТА:", problem)
    for url in result["gone"]:
        print("  ИСЧЕЗЛА страница источника:", url)
    for page in result["changed"]:
        print("  СТРАНИЦА ИЗМЕНИЛАСЬ:", page["url"])
        if "nRemoved" in page:
            print(f"    убрано {page['nRemoved']}, добавлено {page['nAdded']} кусков")
            for line in page["removed"]:
                print("    - " + line)
            for line in page["added"]:
                print("    + " + line)
    if result.get("deadlineSeen") is False:
        print("  СРОК: даты закрытия из записи на странице не видно — посмотреть глазами")


def main(argv=None) -> int:
    args = list(argv if argv is not None else sys.argv[1:])
    write = "--write" in args
    wanted = [a for a in args if not a.startswith("-")]

    root = Path(__file__).resolve().parent.parent
    paths = sorted((root / "data" / "programs").glob("*.json"))
    if wanted:
        paths = [p for p in paths if p.stem in wanted]

    worst = 0
    for path in paths:
        program = json.loads(path.read_text(encoding="utf-8"))
        result = report_for(root, program)
        show(result)
        if result["state"] in ("BROKEN", "NO_SNAPSHOT"):
            worst = 1
            continue
        if not write:
            continue

        shots = snapshots_of(root, program["id"])
        meta, _ = snapshot_texts(shots[-1])
        updated = refreshed(program, meta)
        if updated != program:
            path.write_text(
                json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            print("  записано: хеши и дата проверки обновлены")
        if result["state"] == "OK" and prune_identical(root, program["id"]):
            print("  снимок повторял прошлый, лишний убран")
    return worst


if __name__ == "__main__":
    sys.exit(main())
