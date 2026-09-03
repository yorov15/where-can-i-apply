# Сборщик данных — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Конвейер, который превращает утверждённый человеком адрес официальной страницы в запись программы с цитатой на каждое поле, и не даёт ни одному непроверенному числу попасть в выдачу.

**Architecture:** Шесть отдельных скриптов, каждый читает с диска и пишет на диск. Извлечение моделью — единственный ненадёжный шаг, и он физически не может писать в опубликованные данные: между ним и `data/programs/` стоит механический валидатор и подтверждение человеком.

**Tech Stack:** Python 3.12, только стандартная библиотека. Тесты — `unittest`.

**Spec:** `docs/superpowers/specs/2026-09-03-eligibility-tool-design.md`

**Предыдущий план:** `docs/superpowers/plans/2026-09-03-site-and-rules-engine.md` (выполнен)

## Global Constraints

- Python 3.12, **только стандартная библиотека**. Ни одной установки через pip. Это не аскеза: проект должен запускаться на чужой машине командой `python`, а каждая зависимость — ещё одна вещь, которая ломается через год и которую автор обязан уметь объяснить.
- Тесты: `python -m unittest discover -s tools/tests -t .` из корня репозитория.
- Формат списка источников — **TOML**, читается стандартным `tomllib`. YAML из спеки заменён по этой причине: PyYAML — это зависимость, `tomllib` встроен.
- **Ни одно значение не берётся из памяти модели.** У каждого правила обязательна цитата `evidence`, и валидатор проверяет её поиском по скачанному тексту.
- Писать в `data/programs/` имеет право только `review.py`. Извлечение пишет в `proposed/`, и `proposed/` не коммитится.
- Обязательные поля: `eligibility.citizenship` и `eligibility.graduationYear`. `null` в них запрещён; явное «ограничения нет» с цитатой разрешено.
- Формат записи программы — тот же, что читает `js/verdict.js`. Расхождение схемы и движка — ошибка, а не вариант.
- Отступление от спеки: вместо `tools/schema/program.schema.json` схема живёт кодом в `tools/schema.py`, а проверки — в `tools/validate.py`. Причина: формальная JSON Schema без библиотеки проверки бесполезна, а библиотека — это зависимость. Главная проверка конвейера (поиск цитаты в тексте) в JSON Schema всё равно не выражается.
- **v1 работает только с HTML.** PDF скачивается и хешируется, но текст из него не извлекается. Ограничение настоящее: гайдлайны MEXT — это PDF, и до них дело дойдёт только с библиотекой разбора PDF. Программа, факты которой живут лишь в PDF, помечается на ручной ввод.
- Автоматический поиск источников поисковиком запрещён. Адрес вписывает человек.
- Wikidata P856 в этом плане не используется: она нужна для доменов университетов, а v1 состоит из программ.

---

### Task 1: Снимок страницы — текст, нормализация, хеш

**Files:**
- Create: `tools/__init__.py`
- Create: `tools/snapshot.py`
- Create: `tools/tests/__init__.py`
- Test: `tools/tests/test_snapshot.py`

**Interfaces:**
- Consumes: ничего
- Produces:
  - `html_to_text(html: str) -> str`
  - `normalize(text: str) -> str`
  - `sha256_of_text(text: str) -> str` — возвращает строку вида `sha256:<hex>`

Нормализация — не косметика, а условие работы всей защиты от выдумок. Цитата, скопированная моделью из страницы, содержит неразрывные пробелы, типографские кавычки и длинные тире; тот же текст в другом месте страницы — обычные. Без приведения к одному виду поиск цитаты не находит её, и валидатор ругается на честные записи.

- [ ] **Step 1: Написать падающий тест**

Создать `tools/tests/test_snapshot.py`:

```python
import unittest

from tools.snapshot import html_to_text, normalize, sha256_of_text


class TestHtmlToText(unittest.TestCase):
    def test_tags_removed(self):
        self.assertEqual(html_to_text("<p>Привет <b>мир</b></p>"), "Привет мир")

    def test_script_and_style_dropped(self):
        html = "<style>p{color:red}</style><p>Текст</p><script>alert(1)</script>"
        self.assertEqual(html_to_text(html), "Текст")

    def test_entities_decoded(self):
        self.assertEqual(html_to_text("<p>18&nbsp;&mdash;&nbsp;25</p>"), "18 - 25")


class TestNormalize(unittest.TestCase):
    def test_whitespace_collapsed(self):
        self.assertEqual(normalize("  a\n\n  b\t c  "), "a b c")

    def test_typographic_quotes_flattened(self):
        self.assertEqual(normalize("“age” ‘limit’"), '"age" \'limit\'')

    def test_dashes_flattened(self):
        self.assertEqual(normalize("18–25"), "18-25")

    def test_nbsp_becomes_space(self):
        # Экранированный код, а не сам символ: неразрывный пробел
        # в исходнике неотличим от обычного, и тест молча стал бы пустым.
        self.assertEqual(normalize("18\u00a0лет"), "18 лет")


class TestHash(unittest.TestCase):
    def test_prefix_and_stability(self):
        got = sha256_of_text("abc")
        self.assertTrue(got.startswith("sha256:"))
        self.assertEqual(got, sha256_of_text("abc"))

    def test_different_text_different_hash(self):
        self.assertNotEqual(sha256_of_text("abc"), sha256_of_text("abd"))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: FAIL — `ModuleNotFoundError: No module named 'tools'`.

- [ ] **Step 3: Написать минимальную реализацию**

Создать пустые `tools/__init__.py` и `tools/tests/__init__.py`.

Создать `tools/snapshot.py`:

```python
"""Снимок страницы: HTML в текст, нормализация, хеш.

Нормализация нужна не для красоты. Проверка цитат ищет фразу из записи
в тексте страницы обычным поиском подстроки. Модель копирует цитату с
неразрывными пробелами и типографскими кавычками, а в другом месте той
же страницы стоят обычные — без приведения к одному виду честная цитата
не находится, и валидатор ругается на верную запись.
"""

import hashlib
import re
from html.parser import HTMLParser

SKIP_TAGS = {"script", "style", "noscript", "svg", "head"}


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data):
        if self._skip_depth == 0:
            self.parts.append(data)


def html_to_text(html: str) -> str:
    parser = _TextExtractor()
    parser.feed(html)
    return normalize(" ".join(parser.parts))


def normalize(text: str) -> str:
    # Коды, а не сами символы: неразрывный пробел в исходнике неотличим
    # от обычного, и правило молча перестало бы работать при копировании.
    replacements = {
        "\u00a0": " ",  # неразрывный пробел
        "\u2019": "'",  # правая одиночная кавычка
        "\u2018": "'",  # левая одиночная кавычка
        "\u201c": '"',  # левая двойная кавычка
        "\u201d": '"',  # правая двойная кавычка
        "\u2013": "-",  # короткое тире
        "\u2014": "-",  # длинное тире
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return re.sub(r"\s+", " ", text).strip()


def sha256_of_text(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: OK, 9 тестов.

- [ ] **Step 5: Коммит**

```bash
git add tools/__init__.py tools/snapshot.py tools/tests/
git commit -m "Превращать HTML в нормализованный текст и считать его хеш"
```

---

### Task 2: Список утверждённых источников

**Files:**
- Create: `tools/sources.py`
- Create: `tools/sources.toml`
- Test: `tools/tests/test_sources.py`

**Interfaces:**
- Consumes: ничего
- Produces:
  - `load_sources(path) -> dict[str, dict]` — читает TOML, возвращает записи по id
  - `check_sources(raw: dict) -> list[str]` — список претензий, пустой значит всё в порядке

Файл заполняет человек. Автоматический поиск источников отвергнут: по запросу «Türkiye Bursları требования» поисковик первыми выдаёт агентские сайты, которые зарабатывают на подаче документов и врут в мелочах — а мелочь здесь стоит человеку года.

- [ ] **Step 1: Написать падающий тест**

Создать `tools/tests/test_sources.py`:

```python
import unittest

from tools.sources import check_sources


def entry(**over):
    base = {
        "name": "Пример",
        "urls": ["https://example.gov/rules"],
        "approvedBy": "human",
        "approvedAt": "2026-09-03",
    }
    base.update(over)
    return base


class TestCheckSources(unittest.TestCase):
    def test_valid_entry_has_no_complaints(self):
        self.assertEqual(check_sources({"turkiye-burslari": entry()}), [])

    def test_id_must_be_slug(self):
        problems = check_sources({"Turkiye Burslari": entry()})
        self.assertTrue(any("идентификатор" in p for p in problems))

    def test_urls_must_not_be_empty(self):
        problems = check_sources({"a-b": entry(urls=[])})
        self.assertTrue(any("нет ни одного адреса" in p for p in problems))

    def test_url_must_be_https(self):
        problems = check_sources({"a-b": entry(urls=["http://example.gov/"])})
        self.assertTrue(any("https" in p for p in problems))

    def test_approval_date_must_be_iso(self):
        problems = check_sources({"a-b": entry(approvedAt="03.09.2026")})
        self.assertTrue(any("дата утверждения" in p for p in problems))

    def test_missing_field_is_reported(self):
        broken = entry()
        del broken["approvedBy"]
        problems = check_sources({"a-b": broken})
        self.assertTrue(any("approvedBy" in p for p in problems))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: FAIL — нет модуля `tools.sources`.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `tools/sources.py`:

```python
"""Список источников, которые утвердил человек.

Робот собирает, человек утверждает. Автоматический поиск источников
поисковиком запрещён: SEO-мусор и агентские сайты ранжируются выше
первоисточников и содержат неверные факты.
"""

import re
import tomllib
from pathlib import Path

SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
REQUIRED_KEYS = ("name", "urls", "approvedBy", "approvedAt")


def load_sources(path) -> dict:
    with Path(path).open("rb") as handle:
        return tomllib.load(handle)


def check_sources(raw: dict) -> list[str]:
    problems = []
    for program_id, entry in raw.items():
        if not SLUG.match(program_id):
            problems.append(
                f"{program_id}: идентификатор должен быть в нижнем регистре через дефис"
            )
        for key in REQUIRED_KEYS:
            if key not in entry:
                problems.append(f"{program_id}: нет поля {key}")
        urls = entry.get("urls", [])
        if not urls:
            problems.append(f"{program_id}: нет ни одного адреса")
        for url in urls:
            if not url.startswith("https://"):
                problems.append(f"{program_id}: адрес не по https — {url}")
        approved_at = entry.get("approvedAt", "")
        if approved_at and not ISO_DATE.match(approved_at):
            problems.append(f"{program_id}: дата утверждения не в формате ГГГГ-ММ-ДД")
    return problems
```

- [ ] **Step 4: Создать пустой файл источников**

Создать `tools/sources.toml`:

```toml
# Адреса вписывает человек, руками, с официального сайта программы.
# Поисковиком пользоваться нельзя: агентские сайты ранжируются выше
# первоисточников и врут в требованиях.
#
# Формат записи:
#
# [program-id]
# name = "Название программы"
# urls = ["https://официальный-сайт/страница-с-требованиями"]
# approvedBy = "human"
# approvedAt = "2026-09-03"
```

- [ ] **Step 5: Запустить тест и убедиться, что он проходит**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: OK, 15 тестов.

- [ ] **Step 6: Коммит**

```bash
git add tools/sources.py tools/sources.toml tools/tests/test_sources.py
git commit -m "Читать и проверять список утверждённых человеком источников"
```

---

### Task 3: Схема записи программы

**Files:**
- Create: `tools/schema.py`
- Test: `tools/tests/test_schema.py`

**Interfaces:**
- Consumes: ничего
- Produces:
  - `FIELDS: tuple[str, ...]` — семь полей правомочности в порядке движка
  - `REQUIRED_FIELDS: frozenset[str]` — `citizenship` и `graduationYear`
  - `SCALES: frozenset[str]`
  - `is_country_code(value) -> bool`
  - `empty_program(program_id: str, name: str) -> dict` — заготовка записи со всеми ключами и `null` в правилах

Коды стран проверяются формой, а не списком: ровно две заглавные латинские буквы. Списка всех стран в стандартной библиотеке нет, тащить его файлом ради v1 незачем, а форма ловит реальные опечатки — `TJK`, `tj`, `Таджикистан`.

- [ ] **Step 1: Написать падающий тест**

Создать `tools/tests/test_schema.py`:

```python
import unittest

from tools.schema import FIELDS, REQUIRED_FIELDS, SCALES, empty_program, is_country_code


class TestSchema(unittest.TestCase):
    def test_seven_fields_in_engine_order(self):
        self.assertEqual(
            FIELDS,
            (
                "citizenship",
                "schoolCountry",
                "schoolYears",
                "graduationYear",
                "age",
                "gpa",
                "language",
            ),
        )

    def test_required_fields(self):
        self.assertEqual(REQUIRED_FIELDS, frozenset({"citizenship", "graduationYear"}))

    def test_known_scales(self):
        self.assertIn("TJ_5", SCALES)
        self.assertIn("PERCENT", SCALES)

    def test_country_code_shape(self):
        self.assertTrue(is_country_code("TJ"))
        self.assertFalse(is_country_code("tj"))
        self.assertFalse(is_country_code("TJK"))
        self.assertFalse(is_country_code("Таджикистан"))
        self.assertFalse(is_country_code(None))


class TestEmptyProgram(unittest.TestCase):
    def test_has_all_seven_rules_as_null(self):
        program = empty_program("primer", "Пример")
        self.assertEqual(set(program["eligibility"]), set(FIELDS))
        self.assertTrue(all(program["eligibility"][f] is None for f in FIELDS))

    def test_is_draft_and_unchecked(self):
        program = empty_program("primer", "Пример")
        self.assertEqual(program["status"], "draft")
        self.assertFalse(program["source"]["humanChecked"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: FAIL — нет модуля `tools.schema`.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `tools/schema.py`:

```python
"""Форма записи программы — та же, что читает js/verdict.js.

Порядок полей совпадает с порядком в движке: семь полей профиля, семь
правил, семь функций. Расхождение схемы и движка — это ошибка, а не
вариант, поэтому список один и лежит здесь.
"""

import re

FIELDS = (
    "citizenship",
    "schoolCountry",
    "schoolYears",
    "graduationYear",
    "age",
    "gpa",
    "language",
)

# null в этих двух запрещён. Запрещено именно «мы не знаем»; явное
# «ограничения нет» пишется объектом с пустыми значениями и цитатой.
REQUIRED_FIELDS = frozenset({"citizenship", "graduationYear"})

SCALES = frozenset({"PERCENT", "TJ_5", "GPA_4", "GPA_4_5"})

# Форма, а не список: списка стран в стандартной библиотеке нет, а форма
# ловит реальные опечатки — TJK, tj, «Таджикистан».
_COUNTRY = re.compile(r"^[A-Z]{2}$")


def is_country_code(value) -> bool:
    return isinstance(value, str) and bool(_COUNTRY.match(value))


def empty_program(program_id: str, name: str) -> dict:
    return {
        "id": program_id,
        "status": "draft",
        "name": {"ru": name, "orig": name},
        "hostCountry": None,
        "level": "bachelor",
        "coverage": {"tuition": None, "living": None, "travel": None, "note": {"ru": ""}},
        "eligibility": {field: None for field in FIELDS},
        "textConditions": [],
        "deadline": {
            "opens": None,
            "closes": None,
            "recurring": "annual",
            "confidence": "expected",
        },
        "applyUrl": None,
        "coversInstitutions": {"kind": "list", "approxCount": None, "note": {"ru": ""}},
        "source": {
            "url": None,
            "lastVerified": None,
            "contentHash": None,
            "humanChecked": False,
        },
    }
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: OK, 21 тест.

- [ ] **Step 5: Коммит**

```bash
git add tools/schema.py tools/tests/test_schema.py
git commit -m "Описать форму записи программы одним местом"
```

---

### Task 4: Валидатор — проверка цитат и связности

**Files:**
- Create: `tools/validate.py`
- Test: `tools/tests/test_validate.py`

**Interfaces:**
- Consumes: `normalize` из `tools/snapshot.py`, всё из `tools/schema.py`
- Produces: `validate_program(program: dict, snapshot_text: str) -> list[str]` — список претензий, пустой значит запись годна к утверждению

Это главный шаг всего конвейера. Проверка цитат — механический детектор выдумок: модель, придумавшая требование к возрасту, не может придумать к нему цитату, которая найдётся поиском по скачанному тексту. Десять строк кода отсекают основной класс ошибок, ради которого затеяна вся строгость с источниками.

- [ ] **Step 1: Написать падающий тест**

Создать `tools/tests/test_validate.py`:

```python
import unittest

from tools.schema import empty_program
from tools.validate import validate_program

SNAPSHOT = (
    "Applicants must be citizens of eligible countries. "
    "Applicants who graduated before 2025 are not eligible. "
    "Applicants must be under 21 years old at the time of application."
)


def good_program():
    program = empty_program("primer", "Пример")
    program["hostCountry"] = "TR"
    program["applyUrl"] = "https://example.gov/apply"
    program["eligibility"]["citizenship"] = {
        "allow": "*",
        "deny": [],
        "evidence": "citizens of eligible countries",
    }
    program["eligibility"]["graduationYear"] = {
        "min": 2025,
        "max": None,
        "evidence": "graduated before 2025 are not eligible",
    }
    program["deadline"] = {
        "opens": "2027-01-10",
        "closes": "2027-02-20",
        "recurring": "annual",
        "confidence": "expected",
    }
    program["source"] = {
        "url": "https://example.gov/rules",
        "lastVerified": "2026-09-03",
        "contentHash": "sha256:0",
        "humanChecked": False,
    }
    return program


class TestEvidence(unittest.TestCase):
    def test_clean_program_passes(self):
        self.assertEqual(validate_program(good_program(), SNAPSHOT), [])

    def test_invented_quote_is_caught(self):
        program = good_program()
        program["eligibility"]["age"] = {
            "min": None,
            "max": 21,
            "asOf": "deadline",
            "evidence": "must be under 30 years old",
        }
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("цитата не найдена" in p for p in problems))

    def test_real_quote_with_typographic_characters_passes(self):
        program = good_program()
        program["eligibility"]["age"] = {
            "min": None,
            "max": 21,
            "asOf": "deadline",
            "evidence": "under\u00a021 years\u00a0old",
        }
        self.assertEqual(validate_program(program, SNAPSHOT), [])

    def test_rule_without_evidence_is_caught(self):
        program = good_program()
        program["eligibility"]["schoolYears"] = {"min": 12}
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("нет цитаты" in p for p in problems))


class TestRequired(unittest.TestCase):
    def test_null_in_required_field_is_caught(self):
        program = good_program()
        program["eligibility"]["citizenship"] = None
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("обязательное поле" in p for p in problems))

    def test_explicit_no_limit_is_allowed(self):
        program = good_program()
        program["eligibility"]["graduationYear"] = {
            "min": None,
            "max": None,
            "evidence": "graduated before 2025 are not eligible",
        }
        self.assertEqual(validate_program(program, SNAPSHOT), [])


class TestCoherence(unittest.TestCase):
    def test_closes_before_opens_is_caught(self):
        program = good_program()
        program["deadline"]["closes"] = "2026-12-01"
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("раньше даты открытия" in p for p in problems))

    def test_absurd_age_is_caught(self):
        program = good_program()
        program["eligibility"]["age"] = {
            "min": None,
            "max": 200,
            "asOf": "deadline",
            "evidence": "under 21 years old",
        }
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("возраст" in p for p in problems))

    def test_unknown_scale_is_caught(self):
        program = good_program()
        program["eligibility"]["gpa"] = {
            "min": 70,
            "scale": "TJ_TEN",
            "evidence": "citizens of eligible countries",
        }
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("шкала" in p for p in problems))

    def test_bad_country_code_is_caught(self):
        program = good_program()
        program["eligibility"]["citizenship"]["deny"] = ["TJK"]
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("код страны" in p for p in problems))

    def test_unknown_field_in_eligibility_is_caught(self):
        program = good_program()
        program["eligibility"]["religion"] = {"evidence": "citizens of eligible countries"}
        problems = validate_program(program, SNAPSHOT)
        self.assertTrue(any("лишнее поле" in p for p in problems))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: FAIL — нет модуля `tools.validate`.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `tools/validate.py`:

```python
"""Механические проверки записи. Без модели, без сети.

Главная из них — проверка цитат. Каждое evidence обязано найтись в
скачанном тексте обычным поиском подстроки. Модель, придумавшая
требование, не может придумать к нему цитату, которая там найдётся.
"""

from tools.schema import FIELDS, REQUIRED_FIELDS, SCALES, is_country_code
from tools.snapshot import normalize

MIN_AGE = 15
MAX_AGE = 60


def validate_program(program: dict, snapshot_text: str) -> list[str]:
    problems = []
    haystack = normalize(snapshot_text)
    eligibility = program.get("eligibility") or {}

    for extra in set(eligibility) - set(FIELDS):
        problems.append(f"лишнее поле в eligibility: {extra}")

    for field in FIELDS:
        rule = eligibility.get(field)
        if rule is None:
            if field in REQUIRED_FIELDS:
                problems.append(
                    f"{field}: обязательное поле, null запрещён — "
                    "нужно правило или явное «ограничения нет» с цитатой"
                )
            continue

        evidence = rule.get("evidence")
        if not evidence:
            problems.append(f"{field}: нет цитаты из источника")
        elif normalize(evidence) not in haystack:
            problems.append(f"{field}: цитата не найдена в тексте источника — {evidence!r}")

        problems.extend(_check_rule_shape(field, rule))

    problems.extend(_check_deadline(program.get("deadline") or {}))
    return problems


def _check_rule_shape(field: str, rule: dict) -> list[str]:
    problems = []

    if field in ("citizenship", "schoolCountry"):
        allow = rule.get("allow")
        if allow != "*" and not isinstance(allow, list):
            problems.append(f"{field}: allow должно быть '*' или списком")
        codes = list(rule.get("deny") or [])
        if isinstance(allow, list):
            codes += allow
        for code in codes:
            if not is_country_code(code):
                problems.append(f"{field}: неверный код страны — {code!r}")

    if field == "age":
        for bound in ("min", "max"):
            value = rule.get(bound)
            if value is not None and not (MIN_AGE <= value <= MAX_AGE):
                problems.append(
                    f"age: возраст {value} вне разумных границ {MIN_AGE}-{MAX_AGE}"
                )
        as_of = rule.get("asOf")
        if as_of != "deadline" and not _is_iso_date(as_of):
            problems.append("age: asOf должно быть 'deadline' или датой ГГГГ-ММ-ДД")

    if field == "gpa":
        scale = rule.get("scale")
        if scale not in SCALES:
            problems.append(f"gpa: неизвестная шкала — {scale!r}")

    if field == "language":
        for requirement in rule.get("anyOf") or []:
            if "test" not in requirement or "min" not in requirement:
                problems.append("language: в требовании нет test или min")

    return problems


def _check_deadline(deadline: dict) -> list[str]:
    problems = []
    opens, closes = deadline.get("opens"), deadline.get("closes")
    for name, value in (("opens", opens), ("closes", closes)):
        if value is not None and not _is_iso_date(value):
            problems.append(f"deadline.{name}: не дата в формате ГГГГ-ММ-ДД")
    if opens and closes and closes < opens:
        problems.append("deadline: дата закрытия раньше даты открытия")
    if deadline.get("confidence") not in ("confirmed", "expected"):
        problems.append("deadline.confidence: должно быть confirmed или expected")
    return problems


def _is_iso_date(value) -> bool:
    if not isinstance(value, str) or len(value) != 10:
        return False
    parts = value.split("-")
    return len(parts) == 3 and all(part.isdigit() for part in parts)
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: OK, 32 теста.

- [ ] **Step 5: Коммит**

```bash
git add tools/validate.py tools/tests/test_validate.py
git commit -m "Валидатор записи: проверка цитат, обязательных полей и связности"
```

---

### Task 5: Скачивание снимков

**Files:**
- Create: `tools/fetch.py`
- Test: `tools/tests/test_fetch.py`

**Interfaces:**
- Consumes: `html_to_text`, `sha256_of_text` из `tools/snapshot.py`
- Produces:
  - `snapshot_paths(root, program_id, today) -> Path` — папка снимка
  - `save_snapshots(root, program_id, urls, today, fetcher) -> dict` — пишет `NN.txt` и `meta.json`, возвращает содержимое `meta.json`
  - `http_fetch(url: str) -> str` — настоящее скачивание через `urllib`
  - `main()` — читает `tools/sources.toml`, скачивает всё

`fetcher` передаётся аргументом, а не берётся из `urllib` внутри: так шаг проверяется тестом без сети, а сеть остаётся ровно в одном месте.

- [ ] **Step 1: Написать падающий тест**

Создать `tools/tests/test_fetch.py`:

```python
import json
import tempfile
import unittest
from pathlib import Path

from tools.fetch import save_snapshots


class TestSaveSnapshots(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def fake_fetcher(self, url):
        return f"<html><body><p>Текст {url}</p></body></html>"

    def test_writes_one_file_per_url(self):
        save_snapshots(
            self.root,
            "primer",
            ["https://a.gov/1", "https://a.gov/2"],
            "2026-09-03",
            self.fake_fetcher,
        )
        folder = self.root / "raw" / "primer" / "2026-09-03"
        self.assertTrue((folder / "00.txt").exists())
        self.assertTrue((folder / "01.txt").exists())

    def test_meta_records_url_and_hash(self):
        meta = save_snapshots(
            self.root, "primer", ["https://a.gov/1"], "2026-09-03", self.fake_fetcher
        )
        self.assertEqual(meta["pages"][0]["url"], "https://a.gov/1")
        self.assertTrue(meta["pages"][0]["contentHash"].startswith("sha256:"))
        self.assertEqual(meta["fetchedAt"], "2026-09-03")

    def test_meta_is_written_to_disk(self):
        save_snapshots(
            self.root, "primer", ["https://a.gov/1"], "2026-09-03", self.fake_fetcher
        )
        path = self.root / "raw" / "primer" / "2026-09-03" / "meta.json"
        self.assertEqual(json.loads(path.read_text("utf-8"))["programId"], "primer")

    def test_saved_text_is_plain_not_html(self):
        save_snapshots(
            self.root, "primer", ["https://a.gov/1"], "2026-09-03", self.fake_fetcher
        )
        text = (self.root / "raw" / "primer" / "2026-09-03" / "00.txt").read_text("utf-8")
        self.assertNotIn("<p>", text)
        self.assertIn("Текст", text)

    def test_same_content_gives_same_hash_on_rerun(self):
        first = save_snapshots(
            self.root, "primer", ["https://a.gov/1"], "2026-09-03", self.fake_fetcher
        )
        second = save_snapshots(
            self.root, "primer", ["https://a.gov/1"], "2026-09-04", self.fake_fetcher
        )
        self.assertEqual(
            first["pages"][0]["contentHash"], second["pages"][0]["contentHash"]
        )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: FAIL — нет модуля `tools.fetch`.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `tools/fetch.py`:

```python
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

USER_AGENT = "eligibility-tool/0.1 (учебный проект; сбор требований программ)"
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
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: OK, 37 тестов.

- [ ] **Step 5: Проверить, что скрипт честно отказывается работать без источников**

Run: `python -m tools.fetch`
Expected: печатает «В tools/sources.toml нет ни одного источника» и код возврата 1.

- [ ] **Step 6: Коммит**

```bash
git add tools/fetch.py tools/tests/test_fetch.py
git commit -m "Скачивать и сохранять снимки утверждённых страниц"
```

---

### Task 6: Подготовка задания для модели

**Files:**
- Create: `tools/extract.py`
- Test: `tools/tests/test_extract.py`

**Interfaces:**
- Consumes: `empty_program`, `FIELDS` из `tools/schema.py`
- Produces:
  - `build_prompt(program_id: str, name: str, snapshot_text: str) -> str`
  - `main()` — на каждую программу пишет `proposed/<id>.prompt.md` и заготовку `proposed/<id>.json`

Модели тут нет и ключа к ней не нужно. `extract.py` готовит задание: текст снимка плюс две жёсткие защиты в формулировке. Ответ модели кладётся в `proposed/<id>.json` руками, и дальше его встречает валидатор.

Почему так, а не вызовом по сети: обращение к платному API — это ключ, счёт и зависимость, а выигрыш на десяти программах близок к нулю. Защита от выдумок в этом конвейере держится не на том, кто именно позвал модель, а на проверке цитат подстрокой, которая работает одинаково в обоих случаях. Когда программ станет сотня, вызов по сети добавится сюда же одной функцией.

- [ ] **Step 1: Написать падающий тест**

Создать `tools/tests/test_extract.py`:

```python
import unittest

from tools.extract import build_prompt

SNAPSHOT = "Applicants must be under 21 years old at the time of application."


class TestBuildPrompt(unittest.TestCase):
    def test_contains_snapshot_text(self):
        self.assertIn(SNAPSHOT, build_prompt("primer", "Пример", SNAPSHOT))

    def test_demands_null_when_absent(self):
        prompt = build_prompt("primer", "Пример", SNAPSHOT)
        self.assertIn("null", prompt)
        self.assertIn("явно", prompt)

    def test_demands_verbatim_quote(self):
        prompt = build_prompt("primer", "Пример", SNAPSHOT)
        self.assertIn("дословн", prompt)
        self.assertIn("evidence", prompt)

    def test_forbids_outside_knowledge(self):
        prompt = build_prompt("primer", "Пример", SNAPSHOT)
        self.assertIn("не из текста", prompt)

    def test_shows_the_target_shape(self):
        prompt = build_prompt("primer", "Пример", SNAPSHOT)
        for field in ("citizenship", "graduationYear", "age", "gpa", "language"):
            self.assertIn(field, prompt)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: FAIL — нет модуля `tools.extract`.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `tools/extract.py`:

```python
"""Подготовка задания для модели.

Пишет только в proposed/. Пути записи в data/programs/ у этого шага нет
физически: правило «человек утверждает, робот собирает» держится на
структуре, а не на договорённости.
"""

import json
import sys
from pathlib import Path

from tools.schema import empty_program

RULES = """\
Ты заполняешь запись о программе обучения по тексту её официальной страницы.

Две защиты, обе обязательные:

1. Если поля нет в тексте явно — верни null. Не выводи, не догадывайся, не
   бери из общих знаний. Значение не из текста — это ошибка, а не помощь.
2. К каждому заполненному правилу дай evidence — дословную цитату из текста
   ниже. Цитата проверяется поиском подстроки по этому же тексту. Если ты
   пересказал своими словами, проверка не пройдёт.

Если в тексте прямо написано, что ограничения нет, — заполни правило пустыми
значениями и дай цитату, которая это подтверждает. Это не то же самое, что null:
null означает «в тексте про это ничего нет».
"""


def build_prompt(program_id: str, name: str, snapshot_text: str) -> str:
    shape = json.dumps(
        empty_program(program_id, name)["eligibility"], ensure_ascii=False, indent=2
    )
    return (
        f"# Задание: {name} ({program_id})\n\n"
        f"{RULES}\n"
        "## Форма ответа\n\n"
        "Верни JSON целиком в этой форме, заполнив что нашлось:\n\n"
        f"```json\n{shape}\n```\n\n"
        "## Текст страницы\n\n"
        f"{snapshot_text}\n"
    )


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    raw_root = root / "raw"
    proposed = root / "proposed"
    proposed.mkdir(exist_ok=True)

    if not raw_root.exists():
        print("Папки raw/ нет. Сначала запусти python -m tools.fetch")
        return 1

    for program_dir in sorted(raw_root.iterdir()):
        if not program_dir.is_dir():
            continue
        snapshots = sorted(p for p in program_dir.iterdir() if p.is_dir())
        if not snapshots:
            print(f"{program_dir.name}: снимков нет, пропускаю")
            continue
        latest = snapshots[-1]
        text = "\n\n".join(
            path.read_text(encoding="utf-8") for path in sorted(latest.glob("*.txt"))
        )
        program_id = program_dir.name
        prompt = build_prompt(program_id, program_id, text)
        (proposed / f"{program_id}.prompt.md").write_text(prompt, encoding="utf-8")
        print(f"{program_id}: задание готово в proposed/{program_id}.prompt.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: OK, 42 теста.

- [ ] **Step 5: Коммит**

```bash
git add tools/extract.py tools/tests/test_extract.py
git commit -m "Готовить задание для модели с двумя защитами от выдумок"
```

---

### Task 7: Утверждение записи человеком

**Files:**
- Create: `tools/review.py`
- Test: `tools/tests/test_review.py`

**Interfaces:**
- Consumes: `FIELDS` из `tools/schema.py`, `validate_program` из `tools/validate.py`
- Produces:
  - `field_changes(current: dict | None, proposed: dict) -> list[dict]` — что именно меняется, по полям
  - `approve(program: dict, today: str, source_url: str, content_hash: str) -> dict` — ставит `humanChecked`, `status`, данные источника
  - `main()` — показывает изменения поле за полем и спрашивает подтверждение

Единственный файл во всём конвейере, который пишет в `data/programs/`. Диалог не тестируется, тестируются две чистые функции под ним.

- [ ] **Step 1: Написать падающий тест**

Создать `tools/tests/test_review.py`:

```python
import unittest

from tools.review import approve, field_changes


class TestFieldChanges(unittest.TestCase):
    def test_new_program_lists_every_filled_field(self):
        proposed = {"eligibility": {"citizenship": {"allow": "*"}, "age": None}}
        changes = field_changes(None, proposed)
        self.assertEqual([c["field"] for c in changes], ["citizenship"])
        self.assertIsNone(changes[0]["before"])

    def test_unchanged_field_is_not_listed(self):
        rule = {"allow": "*", "evidence": "x"}
        current = {"eligibility": {"citizenship": rule}}
        proposed = {"eligibility": {"citizenship": dict(rule)}}
        self.assertEqual(field_changes(current, proposed), [])

    def test_changed_field_shows_before_and_after(self):
        current = {"eligibility": {"age": {"max": 21, "evidence": "x"}}}
        proposed = {"eligibility": {"age": {"max": 22, "evidence": "y"}}}
        changes = field_changes(current, proposed)
        self.assertEqual(changes[0]["before"]["max"], 21)
        self.assertEqual(changes[0]["after"]["max"], 22)

    def test_field_becoming_null_is_reported(self):
        current = {"eligibility": {"age": {"max": 21, "evidence": "x"}}}
        proposed = {"eligibility": {"age": None}}
        changes = field_changes(current, proposed)
        self.assertEqual(changes[0]["field"], "age")
        self.assertIsNone(changes[0]["after"])


class TestApprove(unittest.TestCase):
    def test_marks_human_checked_and_published(self):
        program = {"status": "draft", "source": {"humanChecked": False}}
        got = approve(program, "2026-09-03", "https://a.gov/x", "sha256:1")
        self.assertTrue(got["source"]["humanChecked"])
        self.assertEqual(got["status"], "published")

    def test_records_source_and_date(self):
        program = {"status": "draft", "source": {"humanChecked": False}}
        got = approve(program, "2026-09-03", "https://a.gov/x", "sha256:1")
        self.assertEqual(got["source"]["url"], "https://a.gov/x")
        self.assertEqual(got["source"]["lastVerified"], "2026-09-03")
        self.assertEqual(got["source"]["contentHash"], "sha256:1")

    def test_does_not_mutate_input(self):
        program = {"status": "draft", "source": {"humanChecked": False}}
        approve(program, "2026-09-03", "https://a.gov/x", "sha256:1")
        self.assertEqual(program["status"], "draft")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: FAIL — нет модуля `tools.review`.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `tools/review.py`:

```python
"""Утверждение записи человеком.

Единственный файл, которому разрешено писать в data/programs/. У шага
извлечения такого права нет — поэтому непроверенное значение не может
попасть в выдачу, даже если кто-то забудет посмотреть.
"""

import copy
import json
import sys
from datetime import date
from pathlib import Path

from tools.schema import FIELDS
from tools.validate import validate_program


def field_changes(current, proposed) -> list[dict]:
    current_rules = (current or {}).get("eligibility", {})
    proposed_rules = proposed.get("eligibility", {})

    changes = []
    for field in FIELDS:
        before = current_rules.get(field)
        after = proposed_rules.get(field)
        if before == after:
            continue
        if before is None and after is None:
            continue
        changes.append({"field": field, "before": before, "after": after})
    return changes


def approve(program: dict, today: str, source_url: str, content_hash: str) -> dict:
    approved = copy.deepcopy(program)
    approved["status"] = "published"
    approved.setdefault("source", {})
    approved["source"]["url"] = source_url
    approved["source"]["lastVerified"] = today
    approved["source"]["contentHash"] = content_hash
    approved["source"]["humanChecked"] = True
    return approved


def _show(change: dict) -> None:
    print(f"\n=== {change['field']} ===")
    print("было:  ", json.dumps(change["before"], ensure_ascii=False))
    print("станет:", json.dumps(change["after"], ensure_ascii=False))


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    proposed_dir = root / "proposed"
    programs_dir = root / "data" / "programs"
    programs_dir.mkdir(parents=True, exist_ok=True)

    candidates = sorted(proposed_dir.glob("*.json")) if proposed_dir.exists() else []
    if not candidates:
        print("В proposed/ нет ни одной записи. Сначала tools.fetch и tools.extract.")
        return 1

    for path in candidates:
        program_id = path.stem
        proposed = json.loads(path.read_text(encoding="utf-8"))

        snapshot_dir = sorted((root / "raw" / program_id).iterdir())[-1]
        meta = json.loads((snapshot_dir / "meta.json").read_text(encoding="utf-8"))
        text = "\n\n".join(
            p.read_text(encoding="utf-8") for p in sorted(snapshot_dir.glob("*.txt"))
        )

        problems = validate_program(proposed, text)
        if problems:
            print(f"\n{program_id}: запись не прошла проверку, утверждать нечего:")
            for problem in problems:
                print("  -", problem)
            continue

        target = programs_dir / f"{program_id}.json"
        current = json.loads(target.read_text(encoding="utf-8")) if target.exists() else None

        changes = field_changes(current, proposed)
        if not changes:
            print(f"{program_id}: изменений нет")
            continue

        print(f"\n{program_id}: изменений {len(changes)}")
        for change in changes:
            _show(change)

        answer = input("\nУтвердить эту запись целиком? [да/нет] ").strip().lower()
        if answer not in ("да", "y", "yes"):
            print("пропущено")
            continue

        approved = approve(
            proposed,
            date.today().isoformat(),
            meta["pages"][0]["url"],
            meta["pages"][0]["contentHash"],
        )
        target.write_text(
            json.dumps(approved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"{program_id}: записано в {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: OK, 49 тестов.

- [ ] **Step 5: Коммит**

```bash
git add tools/review.py tools/tests/test_review.py
git commit -m "Утверждение записи человеком поле за полем"
```

---

### Task 8: Сборка индекса для сайта

**Files:**
- Create: `tools/build.py`
- Test: `tools/tests/test_build.py`

**Interfaces:**
- Consumes: `FIELDS` из `tools/schema.py`
- Produces:
  - `index_entry(program: dict) -> dict` — запись без цитат и источников
  - `build_index(programs: list[dict], generated_at: str) -> dict`
  - `main()` — читает `data/programs/*.json`, пишет `data/index.json`

Цитаты в индекс не идут: они составляют основную массу байтов и нужны только когда человек открыл карточку. Ограничение спеки — индекс не больше 100 КБ, и оно проверяется здесь, а не надеждой.

- [ ] **Step 1: Написать падающий тест**

Создать `tools/tests/test_build.py`:

```python
import json
import unittest

from tools.build import build_index, index_entry

PROGRAM = {
    "id": "primer",
    "status": "published",
    "name": {"ru": "Пример", "orig": "Example"},
    "hostCountry": "TR",
    "level": "bachelor",
    "coverage": {"tuition": True, "living": True, "travel": False, "note": {"ru": "нечто"}},
    "eligibility": {
        "citizenship": {"allow": "*", "deny": [], "evidence": "длинная цитата"},
        "schoolCountry": None,
        "schoolYears": None,
        "graduationYear": {"min": 2025, "max": None, "evidence": "другая цитата"},
        "age": None,
        "gpa": None,
        "language": None,
    },
    "textConditions": [{"ru": "условие", "evidence": "цитата"}],
    "deadline": {
        "opens": "2027-01-10",
        "closes": "2027-02-20",
        "recurring": "annual",
        "confidence": "expected",
    },
    "applyUrl": "https://example.gov/apply",
    "coversInstitutions": {"kind": "list", "approxCount": 1, "note": {"ru": ""}},
    "source": {
        "url": "https://example.gov/rules",
        "lastVerified": "2026-09-03",
        "contentHash": "sha256:0",
        "humanChecked": True,
    },
}


class TestIndexEntry(unittest.TestCase):
    def test_evidence_is_stripped(self):
        entry = index_entry(PROGRAM)
        self.assertNotIn("evidence", json.dumps(entry, ensure_ascii=False))

    def test_rules_survive_without_quotes(self):
        entry = index_entry(PROGRAM)
        self.assertEqual(entry["eligibility"]["graduationYear"]["min"], 2025)
        self.assertIsNone(entry["eligibility"]["age"])

    def test_deadline_and_name_survive(self):
        entry = index_entry(PROGRAM)
        self.assertEqual(entry["deadline"]["closes"], "2027-02-20")
        self.assertEqual(entry["name"]["ru"], "Пример")

    def test_source_is_not_in_index(self):
        self.assertNotIn("source", index_entry(PROGRAM))


class TestBuildIndex(unittest.TestCase):
    def test_drafts_are_not_published(self):
        draft = dict(PROGRAM, id="draft", status="draft")
        index = build_index([PROGRAM, draft], "2026-09-03")
        self.assertEqual([p["id"] for p in index["programs"]], ["primer"])

    def test_unchecked_programs_are_not_published(self):
        sneaky = dict(PROGRAM, id="sneaky")
        sneaky["source"] = dict(PROGRAM["source"], humanChecked=False)
        index = build_index([PROGRAM, sneaky], "2026-09-03")
        self.assertEqual([p["id"] for p in index["programs"]], ["primer"])

    def test_generated_at_is_recorded(self):
        index = build_index([PROGRAM], "2026-09-03")
        self.assertEqual(index["generatedAt"], "2026-09-03")

    def test_programs_are_sorted_by_id(self):
        second = dict(PROGRAM, id="alpha")
        index = build_index([PROGRAM, second], "2026-09-03")
        self.assertEqual([p["id"] for p in index["programs"]], ["alpha", "primer"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: FAIL — нет модуля `tools.build`.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `tools/build.py`:

```python
"""Сборка индекса, который читает сайт.

Цитаты и источники в индекс не идут: они составляют основную массу
байтов и нужны только когда человек открыл карточку. Публикуется лишь
то, что утвердил человек, — это последний рубеж перед выдачей.
"""

import json
import sys
from datetime import date
from pathlib import Path

from tools.schema import FIELDS

MAX_INDEX_BYTES = 100 * 1024


def _rule_without_evidence(rule):
    if rule is None:
        return None
    return {key: value for key, value in rule.items() if key != "evidence"}


def index_entry(program: dict) -> dict:
    coverage = program.get("coverage") or {}
    return {
        "id": program["id"],
        "name": program.get("name"),
        "hostCountry": program.get("hostCountry"),
        "level": program.get("level"),
        "coverage": {
            "tuition": coverage.get("tuition"),
            "living": coverage.get("living"),
            "travel": coverage.get("travel"),
        },
        "eligibility": {
            field: _rule_without_evidence((program.get("eligibility") or {}).get(field))
            for field in FIELDS
        },
        "deadline": program.get("deadline"),
    }


def build_index(programs: list[dict], generated_at: str) -> dict:
    publishable = [
        program
        for program in programs
        if program.get("status") == "published"
        and (program.get("source") or {}).get("humanChecked") is True
    ]
    publishable.sort(key=lambda program: program["id"])
    return {
        "generatedAt": generated_at,
        "programs": [index_entry(program) for program in publishable],
    }


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    programs_dir = root / "data" / "programs"
    programs = [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(programs_dir.glob("*.json"))
    ] if programs_dir.exists() else []

    index = build_index(programs, date.today().isoformat())
    text = json.dumps(index, ensure_ascii=False, indent=2) + "\n"

    size = len(text.encode("utf-8"))
    if size > MAX_INDEX_BYTES:
        print(f"Индекс вырос до {size} байт при пределе {MAX_INDEX_BYTES}.")
        print("Это не мелочь: аудитория сидит на дорогом мобильном интернете.")
        return 1

    (root / "data" / "index.json").write_text(text, encoding="utf-8")
    print(f"Записано программ: {len(index['programs'])}, размер {size} байт")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: OK, 57 тестов.

- [ ] **Step 5: Проверить, что пустой набор даёт пустой индекс**

Run: `python -m tools.build`
Expected: печатает «Записано программ: 0», `data/index.json` остаётся с пустым списком.

- [ ] **Step 6: Коммит**

```bash
git add tools/build.py tools/tests/test_build.py data/index.json
git commit -m "Собирать индекс для сайта без цитат и с проверкой размера"
```

---

### Task 9: Слежение за источниками

**Files:**
- Create: `tools/check.py`
- Test: `tools/tests/test_check.py`

**Interfaces:**
- Consumes: `html_to_text`, `sha256_of_text` из `tools/snapshot.py`, `http_fetch` из `tools/fetch.py`
- Produces:
  - `days_until(closes: str | None, today: str) -> int | None`
  - `frequency_for(deadline: dict, today: str) -> str` — `daily`, `weekly` или `monthly`
  - `is_due(program: dict, today: str) -> bool`
  - `main()` — перекачивает просроченные, сравнивает хеши, печатает список устаревших

Частота считается из даты дедлайна самой программы, а не задаётся вручную: ручной список частот устаревает в тот же день, когда его написали.

- [ ] **Step 1: Написать падающий тест**

Создать `tools/tests/test_check.py`:

```python
import unittest

from tools.check import days_until, frequency_for, is_due


def deadline(closes):
    return {"opens": None, "closes": closes, "recurring": "annual", "confidence": "confirmed"}


class TestDaysUntil(unittest.TestCase):
    def test_counts_days(self):
        self.assertEqual(days_until("2026-09-13", "2026-09-03"), 10)

    def test_past_deadline_is_negative(self):
        self.assertEqual(days_until("2026-09-01", "2026-09-03"), -2)

    def test_missing_date_is_none(self):
        self.assertIsNone(days_until(None, "2026-09-03"))


class TestFrequency(unittest.TestCase):
    def test_close_deadline_checked_daily(self):
        self.assertEqual(frequency_for(deadline("2026-09-20"), "2026-09-03"), "daily")

    def test_medium_deadline_checked_weekly(self):
        self.assertEqual(frequency_for(deadline("2026-10-20"), "2026-09-03"), "weekly")

    def test_far_deadline_checked_monthly(self):
        self.assertEqual(frequency_for(deadline("2027-06-01"), "2026-09-03"), "monthly")

    def test_unknown_deadline_checked_monthly(self):
        self.assertEqual(frequency_for(deadline(None), "2026-09-03"), "monthly")

    def test_passed_deadline_checked_monthly(self):
        self.assertEqual(frequency_for(deadline("2026-08-01"), "2026-09-03"), "monthly")

    def test_boundary_thirty_days_is_weekly(self):
        self.assertEqual(frequency_for(deadline("2026-10-03"), "2026-09-03"), "weekly")


class TestIsDue(unittest.TestCase):
    def test_never_verified_is_due(self):
        program = {"deadline": deadline("2027-06-01"), "source": {"lastVerified": None}}
        self.assertTrue(is_due(program, "2026-09-03"))

    def test_verified_today_is_not_due(self):
        program = {"deadline": deadline("2026-09-20"), "source": {"lastVerified": "2026-09-03"}}
        self.assertFalse(is_due(program, "2026-09-03"))

    def test_daily_program_is_due_next_day(self):
        program = {"deadline": deadline("2026-09-20"), "source": {"lastVerified": "2026-09-02"}}
        self.assertTrue(is_due(program, "2026-09-03"))

    def test_monthly_program_is_not_due_after_a_week(self):
        program = {"deadline": deadline("2027-06-01"), "source": {"lastVerified": "2026-08-27"}}
        self.assertFalse(is_due(program, "2026-09-03"))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: FAIL — нет модуля `tools.check`.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `tools/check.py`:

```python
"""Слежение за источниками: не изменились ли требования.

Частота вычисляется из даты дедлайна самой программы. Ручной список
частот устаревает в тот же день, когда его написали.
"""

import json
import sys
from datetime import date, timedelta
from pathlib import Path

from tools.fetch import http_fetch
from tools.snapshot import html_to_text, sha256_of_text

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


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    programs_dir = root / "data" / "programs"
    if not programs_dir.exists():
        print("Программ пока нет.")
        return 0

    today = date.today().isoformat()
    stale = []

    for path in sorted(programs_dir.glob("*.json")):
        program = json.loads(path.read_text(encoding="utf-8"))
        if not is_due(program, today):
            continue

        url = (program.get("source") or {}).get("url")
        if not url:
            print(f"{program['id']}: нет адреса источника")
            continue

        fresh_hash = sha256_of_text(html_to_text(http_fetch(url)))
        if fresh_hash == program["source"].get("contentHash"):
            program["source"]["lastVerified"] = today
            path.write_text(
                json.dumps(program, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            print(f"{program['id']}: без изменений")
        else:
            stale.append(program["id"])
            print(f"{program['id']}: СТРАНИЦА ИЗМЕНИЛАСЬ — перепроверить требования")

    if stale:
        print("\nУстарели: " + ", ".join(stale))
        print("Дальше: python -m tools.fetch, потом extract, потом review.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `python -m unittest discover -s tools/tests -t .`
Expected: OK, 70 тестов.

- [ ] **Step 5: Коммит**

```bash
git add tools/check.py tools/tests/test_check.py
git commit -m "Следить за изменениями источников с частотой по дедлайну"
```

---

### Task 10: Первая настоящая программа через весь конвейер

**Files:**
- Modify: `tools/sources.toml`
- Create: `raw/<id>/<дата>/` (скачивается)
- Create: `data/programs/<id>.json` (утверждается человеком)
- Modify: `data/index.json` (собирается)
- Modify: `README.md`

**Interfaces:**
- Consumes: весь конвейер из задач 1–9
- Produces: одну проверенную запись программы и непустой индекс

Это не задача про код. Это проверка, что конвейер работает на настоящей странице, а не только на выдуманной. **Ни одно значение в этой задаче не берётся из головы — ни моей, ни чьей-либо.** Всё приезжает из скачанного текста и подтверждается цитатой.

- [ ] **Step 1: Человек выбирает и вписывает источник**

Открыть официальный сайт программы, найти страницу с требованиями к кандидатам, скопировать её адрес.

Предложение для первой записи — **ЦВЭ Таджикистана (`ntc.tj`)**: она покрывает все государственные вузы страны сразу, ей воспользуется больше людей, чем любой мировой программой, и сайт на русском, что упрощает первую проверку цитат. Но выбирает человек.

Вписать в `tools/sources.toml`:

```toml
[program-id]
name = "Название как на официальном сайте"
urls = ["https://официальный-сайт/страница-требований"]
approvedBy = "human"
approvedAt = "ГГГГ-ММ-ДД"
```

- [ ] **Step 2: Скачать снимок**

```bash
python -m tools.fetch
```

Проверить глазами, что в `raw/<id>/<дата>/00.txt` лежит осмысленный текст, а не «включите JavaScript» и не страница ошибки. Если текста нет — источник не годится в таком виде, и это надо признать сразу, а не изобретать обход.

- [ ] **Step 3: Подготовить задание**

```bash
python -m tools.extract
```

- [ ] **Step 4: Заполнить запись**

Прогнать `proposed/<id>.prompt.md` через модель. Ответ сохранить в `proposed/<id>.json`, дополнив его остальными полями записи: `id`, `name`, `hostCountry`, `deadline`, `applyUrl`, `coverage`, `coversInstitutions`, `textConditions`, `source`.

- [ ] **Step 5: Прогнать валидатор через утверждение**

```bash
python -m tools.review
```

Если валидатор ругается на ненайденную цитату — **это работает как задумано**. Правильная реакция: найти фразу на странице своими глазами. Не нашлась — значит модель её выдумала, поле обнуляется. Нашлась, но не совпала посимвольно — цитата правится по тексту снимка.

Утверждать только те поля, которые человек проверил сам.

- [ ] **Step 6: Собрать индекс**

```bash
python -m tools.build
```

Ожидание: «Записано программ: 1».

- [ ] **Step 7: Посмотреть в браузере**

```bash
python -m http.server 8000
```

Заполнить анкету и убедиться, что вердикт по настоящей программе осмысленный, а причины читаются как человеческий текст.

- [ ] **Step 8: Дописать README**

Добавить раздел «Как добавить программу» с шестью командами конвейера в порядке запуска.

- [ ] **Step 9: Прогнать все тесты**

Run: `python -m unittest discover -s tools/tests -t .`
Run: `node --test`
Expected: обе команды зелёные.

- [ ] **Step 10: Коммит**

```bash
git add tools/sources.toml raw data/programs data/index.json README.md
git commit -m "Провести первую настоящую программу через весь конвейер"
```

---

## Что этот план не делает

- Не собирает оставшиеся девять программ. Это ручная работа по одному и тому же конвейеру, и она идёт после того, как конвейер доказал себя на первой.
- Не извлекает текст из PDF. Гайдлайны MEXT — PDF, и до них дело дойдёт с отдельной библиотекой разбора.
- Не вызывает модель по сети. Задание готовится файлом, ответ кладётся руками. Автоматический вызов добавляется сюда же одной функцией, когда программ станет много.
- Не запускает слежение по расписанию. GitHub Actions ставится после того, как данные появятся.
- Не публикует сайт на GitHub Pages: для этого репозиторий нужно сделать публичным, и это решение человека.
