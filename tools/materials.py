"""Проверка data/materials/<id>.json: что программа просит написать или собрать.

Схема — docs/MATERIALS-SCHEMA.md. Без сети и без модели: каждая цитата и
каждый вопрос эссе обязаны найтись в той самой странице снимка, на которую
ссылается source (url + contentHash + дата снимка). Числа count и limit.max —
только те, что стоят в цитате.

    python -m tools.materials --check          — все файлы
    python -m tools.materials --check kaist    — выбранные
"""

import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

from tools.snapshot import normalize

TYPES = ("essay", "recommendation", "activities", "cv", "awards", "portfolio",
         "studyPlan", "video", "interview", "certificates", "other")
NEEDS = ("required", "optional", "some")
UNITS = ("words", "chars", "pages", "minutes", "items")
WHO = ("teacher", "counselor", "principal", "any")
VIA = ("form", "upload", "platform", "mail", "email")
FILE_KEYS = {"id", "checkedAt", "items", "notStated", "note"}
ITEM_KEYS = {"type", "need", "count", "limit", "prompt", "who", "language",
             "via", "ru", "evidence", "source"}
SOURCE_KEYS = {"url", "lastVerified", "contentHash"}
WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
         "seven": 7, "eight": 8, "nine": 9, "ten": 10, "single": 1, "both": 2}
NUMBER = re.compile(r"\d{1,3}(?:[,\s]\d{3})+|\d+")


def _iso(value) -> bool:
    try:
        return isinstance(value, str) and date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def _text(value, limit, required=True) -> bool:
    if value is None:
        return not required
    return (isinstance(value, str) and len(value) <= limit and "�" not in value
            and (bool(value.strip()) or not required))


def numbers_in(text: str) -> set:
    found = {int(re.sub(r"[,\s]", "", raw)) for raw in NUMBER.findall(text or "")}
    lowered = (text or "").lower()
    found.update(n for word, n in WORDS.items() if re.search(rf"\b{word}\b", lowered))
    return found


def snapshot_pages(root, program_id: str) -> dict:
    """(url, contentHash, дата снимка) → нормализованный текст страницы.

    Берём все законченные снимки, а не только последний: запись могла быть
    сверена со страницей, которую позже скачали ещё раз.
    """
    pages = {}
    folder = Path(root) / "raw" / program_id
    if not folder.exists():
        return pages
    for snapshot in sorted(folder.iterdir()):
        meta_path = snapshot / "meta.json"
        if not snapshot.is_dir() or not meta_path.exists():
            continue
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        for page in meta.get("pages", []):
            text = (snapshot / page["file"]).read_text(encoding="utf-8")
            pages[(page["url"], page.get("contentHash"), meta.get("fetchedAt"))] = normalize(text)
    return pages


def _check_source(where, source, pages):
    if not isinstance(source, dict) or set(source) != SOURCE_KEYS:
        return [f"{where}.source: нужны url, lastVerified, contentHash без лишних полей"], None
    problems = []
    parsed = urlparse(str(source["url"]))
    if parsed.scheme != "https" or not parsed.netloc:
        problems.append(f"{where}.source.url: нужен HTTPS-адрес")
    if not _iso(source["lastVerified"]):
        problems.append(f"{where}.source.lastVerified: нужна настоящая дата")
    if not re.fullmatch(r"sha256:[0-9a-f]{64}", str(source["contentHash"])):
        problems.append(f"{where}.source.contentHash: нужен SHA-256 страницы")
    if problems:
        return problems, None
    haystack = pages.get((source["url"], source["contentHash"], source["lastVerified"]))
    if haystack is None:
        problems.append(f"{where}.source: в raw/ нет снимка от {source['lastVerified']} "
                        "с этой страницей и этим хешем")
    return problems, haystack


def _check_item(where, item, pages):
    if not isinstance(item, dict):
        return [f"{where}: нужен объект"]
    if set(item) != ITEM_KEYS:
        return [f"{where}: нужны поля {', '.join(sorted(ITEM_KEYS))} без лишних"]
    problems = []
    kind = item["type"]
    if kind not in TYPES:
        problems.append(f"{where}.type: неизвестный тип")
    if item["need"] not in NEEDS:
        problems.append(f"{where}.need: required, optional или some")
    count = item["count"]
    if count is not None and (not isinstance(count, int) or isinstance(count, bool) or not 1 <= count <= 20):
        problems.append(f"{where}.count: целое от 1 до 20 или null")
        count = None
    limit = item["limit"]
    if limit is not None:
        if (not isinstance(limit, dict) or set(limit) != {"unit", "max"} or limit["unit"] not in UNITS
                or not isinstance(limit["max"], int) or isinstance(limit["max"], bool)
                or not 1 <= limit["max"] <= 100000):
            problems.append(f"{where}.limit: {{unit: {'|'.join(UNITS)}, max: целое}} или null")
            limit = None
    if not _text(item["prompt"], 2000, required=False):
        problems.append(f"{where}.prompt: текст до 2000 знаков или null")
    if item["who"] is not None and (kind != "recommendation" or item["who"] not in WHO):
        problems.append(f"{where}.who: только у recommendation, одно из {', '.join(WHO)}")
    language = item["language"]
    if language is not None and not (isinstance(language, str) and re.fullmatch(r"[a-z]{2,3}", language)):
        problems.append(f"{where}.language: код языка вроде en или null")
    if item["via"] is not None and item["via"] not in VIA:
        problems.append(f"{where}.via: одно из {', '.join(VIA)} или null")
    if not _text(item["ru"], 300):
        problems.append(f"{where}.ru: текст до 300 знаков без U+FFFD")
    evidence = item["evidence"]
    if not _text(evidence, 1500):
        problems.append(f"{where}.evidence: цитата до 1500 знаков")
        evidence = None

    source_problems, haystack = _check_source(where, item["source"], pages)
    problems += source_problems
    if haystack is not None and evidence is not None and normalize(evidence) not in haystack:
        problems.append(f"{where}.evidence: цитата не найдена на странице источника")
    prompt = item["prompt"]
    if haystack is not None and isinstance(prompt, str) and prompt.strip() and normalize(prompt) not in haystack:
        problems.append(f"{where}.prompt: вопрос не найден на странице источника дословно")

    stated = numbers_in(evidence) | numbers_in(prompt if isinstance(prompt, str) else "")
    if count is not None and count not in stated:
        problems.append(f"{where}.count: числа {count} нет в цитате")
    if limit is not None and limit["max"] not in stated:
        problems.append(f"{where}.limit.max: числа {limit['max']} нет в цитате")
    return problems


def check_file(root, path: Path, today: str | None = None) -> list[str]:
    root = Path(root)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        return [f"не читается как JSON в UTF-8: {error}"]
    if not isinstance(data, dict) or set(data) != FILE_KEYS:
        return [f"нужны поля {', '.join(sorted(FILE_KEYS))} без лишних"]
    problems = []
    program_id = data["id"]
    if program_id != path.stem:
        problems.append(f"id {program_id!r} не совпадает с именем файла")
    if not (root / "data" / "programs" / f"{path.stem}.json").exists():
        problems.append("такой программы нет в data/programs")
    today = today or date.today().isoformat()
    if not _iso(data["checkedAt"]) or data["checkedAt"] > today:
        problems.append("checkedAt: настоящая дата не позже сегодняшней")
    if not _text(data["note"], 500, required=False):
        problems.append("note: текст до 500 знаков или null")

    items, absent = data["items"], data["notStated"]
    if not isinstance(items, list) or len(items) > 30:
        return problems + ["items: список до 30 пунктов"]
    if (not isinstance(absent, list) or any(kind not in TYPES for kind in absent)
            or len(set(absent)) != len(absent)):
        return problems + ["notStated: список типов без повторов"]
    if not items and not absent:
        problems.append("пустой файл: нет ни items, ни notStated — тогда файл не создавать")

    pages = snapshot_pages(root, path.stem)
    seen = set()
    for number, item in enumerate(items, 1):
        where = f"items[{number}]"
        problems += _check_item(where, item, pages)
        if isinstance(item, dict):
            identity = (item.get("type"), item.get("prompt"), item.get("evidence"))
            if identity in seen:
                problems.append(f"{where}: пункт повторяется")
            seen.add(identity)
            if item.get("type") in absent:
                problems.append(f"{where}: тип {item.get('type')} одновременно в items и notStated")
    return problems


def check_all(root, ids=(), today=None) -> dict:
    folder = Path(root) / "data" / "materials"
    if ids:
        paths = [folder / f"{program_id}.json" for program_id in ids]
    else:
        paths = sorted(folder.glob("*.json")) if folder.exists() else []
    result = {}
    for path in paths:
        result[path.stem] = check_file(root, path, today) if path.exists() else ["файла нет"]
    return result


def main(argv=None) -> int:
    args = list(argv if argv is not None else sys.argv[1:])
    if not args or args[0] != "--check":
        print(__doc__)
        return 1
    root = Path(__file__).resolve().parent.parent
    result = check_all(root, args[1:])
    bad = {program_id: problems for program_id, problems in result.items() if problems}
    for program_id, problems in bad.items():
        print(f"{program_id}:")
        for problem in problems:
            print(f"  {problem}")
    print(f"проверено {len(result)}, с ошибками {len(bad)}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
