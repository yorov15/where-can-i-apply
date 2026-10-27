import json
import tempfile
import unittest
from pathlib import Path

from tools.route import build_route, load_prep, load_tracks, write_route

PROGRAM = {
    "id": "kaist",
    "status": "published",
    "name": {"ru": "KAIST", "orig": "KAIST"},
    "hostCountry": "KR",
    "kind": "university",
    "majors": ["any"],
    "level": "bachelor",
    "coverage": {"tuition": True, "living": True, "travel": None},
    "eligibility": {},
    "deadline": {"opens": None, "closes": "2027-01-14", "recurring": None, "confidence": "confirmed"},
}

TRACK = {
    "code": "ielts",
    "name": "IELTS Academic",
    "format": "Четыре части: Listening, Reading, Writing, Speaking.",
    "scoring": "Шкала 1–9, шаг 0,5.",
    "register": "https://www.ielts.org/",
    "site": "https://www.ielts.org/",
    "freePrep": [{"label": "Пробные тесты", "url": "https://www.ielts.org/"}],
    "note": "Даты и цена зависят от страны.",
    "source": {"url": "https://www.ielts.org/", "lastVerified": "2026-10-27"},
}


def _write(directory: Path, name: str, payload) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    text = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False)
    (directory / name).write_text(text, encoding="utf-8")


class FilesCase(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.tracks = self.root / "exams"
        self.prep = self.root / "prep"

    def tearDown(self):
        self.temp.cleanup()


class Tracks(FilesCase):
    def test_валидный_трек(self):
        _write(self.tracks, "ielts.json", TRACK)
        loaded, problems = load_tracks(self.tracks)
        self.assertEqual(problems, [])
        self.assertEqual(loaded["ielts"]["name"], "IELTS Academic")

    def test_нет_каталога(self):
        _, problems = load_tracks(self.root / "нет")
        self.assertTrue(problems)

    def test_code_не_совпадает_с_файлом(self):
        track = dict(TRACK, code="toefl")
        _write(self.tracks, "ielts.json", track)
        _, problems = load_tracks(self.tracks)
        self.assertTrue(any("не совпадает" in problem for problem in problems))

    def test_нет_обязательного_поля(self):
        track = {key: value for key, value in TRACK.items() if key != "source"}
        _write(self.tracks, "ielts.json", track)
        _, problems = load_tracks(self.tracks)
        self.assertTrue(any("нет полей" in problem for problem in problems))

    def test_битый_источник(self):
        track = dict(TRACK, source={"url": "нет", "lastVerified": "2026-10-27"})
        _write(self.tracks, "ielts.json", track)
        _, problems = load_tracks(self.tracks)
        self.assertTrue(any("source.url" in problem for problem in problems))

    def test_битая_дата_проверки(self):
        track = dict(TRACK, source={"url": "https://www.ielts.org/", "lastVerified": "27.10.2026"})
        _write(self.tracks, "ielts.json", track)
        _, problems = load_tracks(self.tracks)
        self.assertTrue(any("lastVerified" in problem for problem in problems))

    def test_лишние_поля_трека(self):
        track = dict(TRACK, цена="100")
        _write(self.tracks, "ielts.json", track)
        _, problems = load_tracks(self.tracks)
        self.assertTrue(any("лишние поля" in problem for problem in problems))

    def test_битый_json(self):
        _write(self.tracks, "ielts.json", "{не json")
        _, problems = load_tracks(self.tracks)
        self.assertTrue(any("не разобрался" in problem for problem in problems))


class Prep(FilesCase):
    def setUp(self):
        super().setUp()
        _write(self.tracks, "ielts.json", TRACK)
        self.track_map, _ = load_tracks(self.tracks)

    def test_валидная_подготовка(self):
        _write(self.prep, "kaist.json", {"id": "kaist", "checked": "2026-10-27", "tests": ["ielts"]})
        entries, problems = load_prep([PROGRAM], self.prep, self.track_map)
        self.assertEqual(problems, [])
        self.assertEqual(entries[0]["tests"], ["ielts"])

    def test_неизвестный_экзамен(self):
        _write(self.prep, "kaist.json", {"id": "kaist", "checked": "2026-10-27", "tests": ["nope"]})
        _, problems = load_prep([PROGRAM], self.prep, self.track_map)
        self.assertTrue(any("нет треков" in problem for problem in problems))

    def test_чужая_программа(self):
        _write(self.prep, "kaist.json", {"id": "gist-korea", "checked": "2026-10-27", "tests": []})
        _, problems = load_prep([PROGRAM], self.prep, self.track_map)
        self.assertTrue(problems)

    def test_неопубликованная_программа(self):
        draft = dict(PROGRAM, status="draft")
        _write(self.prep, "kaist.json", {"id": "kaist", "checked": "2026-10-27", "tests": []})
        _, problems = load_prep([draft], self.prep, self.track_map)
        self.assertTrue(any("не опубликована" in problem for problem in problems))

    def test_плохая_дата(self):
        _write(self.prep, "kaist.json", {"id": "kaist", "checked": "вчера", "tests": []})
        _, problems = load_prep([PROGRAM], self.prep, self.track_map)
        self.assertTrue(any("checked" in problem for problem in problems))

    def test_длинная_заметка(self):
        _write(self.prep, "kaist.json", {"id": "kaist", "checked": "2026-10-27", "tests": [], "note": "я" * 400})
        _, problems = load_prep([PROGRAM], self.prep, self.track_map)
        self.assertTrue(any("note" in problem for problem in problems))

    def test_лишние_поля(self):
        _write(self.prep, "kaist.json", {"id": "kaist", "checked": "2026-10-27", "tests": [], "дата": "2027"})
        _, problems = load_prep([PROGRAM], self.prep, self.track_map)
        self.assertTrue(any("лишние поля" in problem for problem in problems))


class WriteRoute(FilesCase):
    def _root(self):
        programs = self.root / "data" / "programs"
        programs.mkdir(parents=True)
        _write(programs, "kaist.json", PROGRAM)
        _write(self.root / "data" / "prep" / "exams", "ielts.json", TRACK)
        _write(self.root / "data" / "prep", "kaist.json", {"id": "kaist", "checked": "2026-10-27", "tests": ["ielts"]})
        return self.root

    def test_пишет_route_json(self):
        root = self._root()
        code = write_route(root, [PROGRAM], "2026-10-27")
        self.assertEqual(code, 0)
        route = json.loads((root / "data" / "route.json").read_text(encoding="utf-8"))
        self.assertEqual(route["version"], 1)
        self.assertEqual(route["prepared"][0]["id"], "kaist")
        self.assertEqual(route["tracks"], ["ielts"])

    def test_останавливается_на_битой_подготовке(self):
        root = self._root()
        _write(self.root / "data" / "prep", "kaist.json", {"id": "kaist", "checked": "2026-10-27", "tests": ["nope"]})
        code = write_route(root, [PROGRAM], "2026-10-27")
        self.assertEqual(code, 1)
        self.assertFalse((root / "data" / "route.json").exists())

    def test_лишний_трек_останавливает_сборку(self):
        root = self._root()
        _write(self.root / "data" / "prep" / "exams", "sat.json",
               dict(TRACK, code="sat", name="SAT", site="https://www.collegeboard.org/",
                    source={"url": "https://www.collegeboard.org/", "lastVerified": "2026-10-27"}))
        code = write_route(root, [PROGRAM], "2026-10-27")
        self.assertEqual(code, 1)

    def test_build_route_сортирует(self):
        route = build_route([PROGRAM], [{"id": "b", "checked": "2026-10-27", "tests": []},
                                        {"id": "a", "checked": "2026-10-27", "tests": []}],
                            {"ielts": TRACK, "sat": TRACK}, "2026-10-27")
        self.assertEqual([entry["id"] for entry in route["prepared"]], ["a", "b"])
        self.assertEqual(route["tracks"], ["ielts", "sat"])


class RealData(unittest.TestCase):
    """Защита от ошибки в самих данных: они должны проходить проверку."""

    def test_подготовка_и_треки_проекта_проходят(self):
        from tools import route as route_module

        root = Path(__file__).resolve().parents[2]
        programs = [json.loads(path.read_text(encoding="utf-8"))
                    for path in sorted((root / "data" / "programs").glob("*.json"))]
        tracks, problems = load_tracks(root / "data" / "prep" / "exams")
        prep, prep_problems = load_prep(programs, root / "data" / "prep", tracks)
        self.assertEqual(problems + prep_problems, [])
        self.assertGreaterEqual(len(prep), 20)
        self.assertGreaterEqual(len(tracks), 10)

    def test_route_json_совпадает_с_подготовкой(self):
        root = Path(__file__).resolve().parents[2]
        path = root / "data" / "route.json"
        if not path.exists():
            self.skipTest("data/route.json ещё не собран")
        route = json.loads(path.read_text(encoding="utf-8"))
        prep = sorted(item.stem for item in (root / "data" / "prep").glob("*.json"))
        self.assertEqual([entry["id"] for entry in route["prepared"]], prep)
        self.assertEqual(route["version"], 1)


if __name__ == "__main__":
    unittest.main()
