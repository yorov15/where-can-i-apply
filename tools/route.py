"""Маршрут до оффера: проверка подготовки и сборка data/route.json.

Маршрут строится на клиенте из уже проверенных данных программы и её
условий. Здесь только то, что должно быть проверено до публикации:

- `data/prep/<id>.json` — маршрут программы сверен и ей нужны такие-то
  экзамены;
- `data/prep/exams/<code>.json` — официальные факты об экзамене, с которых
  начинается подготовка.

Сайт грузит один маленький `data/route.json` и по нему понимает, для каких
программ маршрут полный. Всё, что не проходит проверку, останавливает
сборку: маршрут с выдуманной датой хуже, чем его отсутствие.
"""

import json
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
PREP_DIR = ROOT / "data" / "prep"
TRACKS_DIR = PREP_DIR / "exams"
ROUTE_PATH = ROOT / "data" / "route.json"

PREP_KEYS = frozenset({"id", "checked", "tests", "note", "perPart", "essays", "essayPolicy"})
TRACK_KEYS = frozenset({"code", "name", "format", "scoring", "register", "site", "freePrep", "note", "source"})
TRACK_KEYS |= frozenset({'parts', 'partsSource', 'resultDays', 'resultSource', 'reportDays', 'reportSource', 'retakeRule', 'sessions', 'sessionsSource', 'timingNote'})
TRACK_KEYS |= frozenset({'practice', 'practiceSource', 'weekTemplates', 'scheduleNote'})
TRACK_REQUIRED = frozenset({"code", "name", "format", "scoring", "site", "source"})
MAX_NOTE = 300
MAX_ROUTE_WIRE_BYTES = 24 * 1024


def _is_iso_day(value) -> bool:
    if not isinstance(value, str):
        return False
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        return False
    return parsed.isoformat() == value


def _is_http(value) -> bool:
    if not isinstance(value, str) or not value:
        return False
    parts = urlsplit(value)
    return parts.scheme in ("http", "https") and bool(parts.netloc)


def load_tracks(directory: Path = TRACKS_DIR) -> tuple[dict, list[str]]:
    """Читает треки экзаменов. Возвращает {code: трек} и список проблем."""
    tracks: dict = {}
    problems: list[str] = []
    if not directory.exists():
        return tracks, [f"нет каталога треков: {directory}"]
    for path in sorted(directory.glob("*.json")):
        name = path.name
        try:
            track = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            problems.append(f"{name}: не разобрался JSON ({error})")
            continue
        if not isinstance(track, dict):
            problems.append(f"{name}: ожидался объект")
            continue
        code = track.get("code")
        if code != path.stem:
            problems.append(f"{name}: code «{code}» не совпадает с именем файла")
            continue
        missing = TRACK_REQUIRED - set(track)
        if missing:
            problems.append(f"{name}: нет полей {', '.join(sorted(missing))}")
            continue
        extra = set(track) - TRACK_KEYS
        if extra:
            problems.append(f"{name}: лишние поля {', '.join(sorted(extra))}")
        for key in ("name", "format", "scoring"):
            if not isinstance(track.get(key), str) or not track[key].strip():
                problems.append(f"{name}: поле {key} пустое")
        if not _is_http(track.get("site")):
            problems.append(f"{name}: site не похож на адрес")
        register = track.get("register")
        if register is not None and not _is_http(register):
            problems.append(f"{name}: register не похож на адрес")
        source = track.get("source")
        if not isinstance(source, dict):
            problems.append(f"{name}: source должен быть объектом")
        else:
            if not _is_http(source.get("url")):
                problems.append(f"{name}: source.url не похож на адрес")
            if not _is_iso_day(source.get("lastVerified")):
                problems.append(f"{name}: source.lastVerified должен быть датой ГГГГ-ММ-ДД")
        free = track.get("freePrep")
        if free is not None:
            if not isinstance(free, list):
                problems.append(f"{name}: freePrep должен быть списком")
            else:
                for i, item in enumerate(free):
                    if not isinstance(item, dict) or not item.get("label") or not _is_http(item.get("url")):
                        problems.append(f"{name}: freePrep[{i}] должен быть {{label, url}}")
        note = track.get("note")
        if note is not None and (not isinstance(note, str) or len(note) > MAX_NOTE):
            problems.append(f"{name}: note длиннее {MAX_NOTE} знаков или не строка")
        tracks[code] = track
        from tools.exam_timing import validate_timing
        problems.extend(f'{name}: {problem}' for problem in validate_timing(track, directory.resolve().parents[2]))
        from tools.exam_timing import validate_practice
        problems.extend(f'{name}: {problem}' for problem in validate_practice(track, directory.resolve().parents[2]))
    return tracks, problems


def load_prep(programs: list[dict], directory: Path = PREP_DIR, tracks: dict | None = None) -> tuple[list[dict], list[str]]:
    """Читает data/prep/<id>.json и сверяет с программами и треками."""
    published = {p["id"]: p for p in programs if p.get("status") == "published"}
    entries: list[dict] = []
    problems: list[str] = []
    if not directory.exists():
        return entries, [f"нет каталога подготовки: {directory}"]
    seen: set[str] = set()
    for path in sorted(directory.glob("*.json")):
        name = path.name
        try:
            prep = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            problems.append(f"{name}: не разобрался JSON ({error})")
            continue
        if not isinstance(prep, dict):
            problems.append(f"{name}: ожидался объект")
            continue
        extra = set(prep) - PREP_KEYS
        if extra:
            problems.append(f"{name}: лишние поля {', '.join(sorted(extra))}")
        program_id = prep.get("id")
        if program_id != path.stem:
            problems.append(f"{name}: id «{program_id}» не совпадает с именем файла")
            continue
        if program_id not in published:
            problems.append(f"{name}: программа не опубликована или её нет в data/programs")
            continue
        if program_id in seen:
            problems.append(f"{name}: программа повторяется")
            continue
        seen.add(program_id)
        if not _is_iso_day(prep.get("checked")):
            problems.append(f"{name}: checked должен быть датой ГГГГ-ММ-ДД")
        tests = prep.get("tests")
        if not isinstance(tests, list) or any(not isinstance(code, str) for code in tests):
            problems.append(f"{name}: tests должен быть списком кодов")
            continue
        if tracks is not None:
            unknown = [code for code in tests if code not in tracks]
            if unknown:
                problems.append(f"{name}: нет треков {', '.join(unknown)}")
        note = prep.get("note")
        if note is not None and (not isinstance(note, str) or len(note) > MAX_NOTE):
            problems.append(f"{name}: note длиннее {MAX_NOTE} знаков или не строка")
        entry = {
            "id": program_id,
            "checked": prep.get("checked"),
            "tests": [code for code in tests],
        }
        if isinstance(note, str) and note:
            entry["note"] = note
        if 'essays' in prep or 'essayPolicy' in prep:
            from tools.essays import validate_essays
            problems.extend(f'{name}: {problem}' for problem in validate_essays(prep, published[program_id], directory.parent.parent))
            entry['hasEssays'] = True
        per_part = prep.get('perPart')
        if per_part is not None:
            from tools.exam_timing import validate_per_part
            problems.extend(f'{name}: {problem}' for problem in validate_per_part(per_part, published[program_id]))
            entry['perPart'] = per_part
        entries.append(entry)
    return entries, problems


def build_route(programs: list[dict], prep: list[dict], tracks: dict, today: str) -> dict:
    """То, что уезжает на сайт: какие программы полные и какие треки есть."""
    return {
        "version": 1,
        "generatedAt": today,
        "prepared": sorted(prep, key=lambda entry: entry["id"]),
        "tracks": sorted(tracks),
    }


def write_route(root: Path = ROOT, programs: list[dict] | None = None, today: str | None = None) -> int:
    """Проверяет подготовку и пишет data/route.json. Возвращает код выхода."""
    if programs is None:
        programs = []
        for path in sorted((root / "data" / "programs").glob("*.json")):
            programs.append(json.loads(path.read_text(encoding="utf-8")))
    today = today or date.today().isoformat()
    tracks, track_problems = load_tracks(root / "data" / "prep" / "exams")
    prep, prep_problems = load_prep(programs, root / "data" / "prep", tracks)
    problems = track_problems + prep_problems
    from tools.documents import load_documents, check_document_refs
    documents, doc_problems = load_documents(programs, root / 'data' / 'prep' / 'docs')
    problems += doc_problems + check_document_refs(programs, {p['id'] for p in prep}, documents)

    # Трек, на который никто не ссылается, — это забытый файл: он уедет
    # на сайт и будет грузиться по прямой ссылке, хотя он не нужен.
    used = {code for entry in prep for code in entry["tests"]}
    for code in sorted(set(tracks) - used):
        problems.append(f"data/prep/exams/{code}.json: трек ни одной программе не нужен")

    if problems:
        for problem in problems:
            print("МАРШРУТ:", problem)
        return 1

    route = build_route(programs, prep, tracks, today)
    if documents:
        route['documents'] = sorted(documents)
    text = json.dumps(route, ensure_ascii=False, separators=(",", ":")) + "\n"
    size = len(text.encode("utf-8"))
    if size > MAX_ROUTE_WIRE_BYTES:
        print(f"Маршрут вырос до {size} байт при пределе {MAX_ROUTE_WIRE_BYTES}.")
        return 1
    path = root / "data" / "route.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print(f"Маршрут: {len(route['prepared'])} программ, {len(route['tracks'])} треков, {size} байт")
    return 0
