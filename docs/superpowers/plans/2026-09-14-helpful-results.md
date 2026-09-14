# Понятная выдача — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Выдача, которая объясняет «пока нельзя, потому что… обойти можно так…», с короткой сводкой сверху и свёрнутыми карточками.

**Architecture:** Правила возвращают код причины с числами вместо текста; тексты собирает `js/wording.js`. Условия карточек размечаются полями `field`/`kind`, чтобы обходной путь показывался рядом с отказом. Данные для сайта делятся на лёгкий `index.json` (ответ, сводка, свёрнутая карточка) и `details.json` (тексты раскрытой карточки, грузится в фоне).

**Tech Stack:** статичный сайт, ES-модули без сборки, `node --test`; Python 3.12 + `unittest` для инструментов данных.

**Spec:** `docs/superpowers/specs/2026-09-14-helpful-results-design.md` — прочитай целиком до первой задачи.

## Global Constraints

- Рабочая папка: `C:\Users\ORYX\dev\eligibility-tool` (не OneDrive).
- Без фреймворков, без сборщика, без новых npm-зависимостей. Шрифты системные.
- DOM трогают только `js/render.js` и `js/form.js`.
- Логика правил (кому pass/fail/unknown) не меняется. Любой тест, проверяющий `status`, должен пройти без правки ожидания.
- `data/programs/*.json` пишет только `python -m tools.review --by-assistant <id>`. Руками эти файлы не редактировать.
- Интерфейс не выдумывает обходных путей: «Как обойти» — только из условий `kind: "workaround"`.
- Тексты: без слов «инструмент», «не считает», «правило», имён полей из кода и дат вида `2026-01-01`.
- Предел индекса `MAX_INDEX_WIRE_BYTES = 64 * 1024` не повышать. Предел деталей `MAX_DETAILS_WIRE_BYTES = 128 * 1024`.
- На Windows Python-команды запускать с `PYTHONUTF8=1`, иначе печать кириллицы падает.
- Все тесты: `node --test` и `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .`. Перед каждым коммитом оба зелёные.
- Коммиты в конце каждой задачи; сообщения по-русски, последняя строка `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Не пушить до конца задачи 11. Задачи 8 и 9 коммитятся подряд: между ними сайт без текстов условий.
- Не трогать незакоммиченные `tools/sources.toml` и `raw/stanford-university/` — это отдельная незаконченная работа по карточкам; `git add` только своих файлов.

## Карта файлов

| Файл | Задача | Роль |
|---|---|---|
| `tools/schema.py` | 1 | `CONDITION_KINDS`, `TAGS_REQUIRED` |
| `tools/validate.py` | 1, 10 | проверка `field`/`kind` |
| `tools/tests/test_validate.py` | 1, 10 | тесты тегов |
| `data/programs/*.json` | 2 | разметка через review |
| `js/lib/format.js` (новый) | 3 | даты, падежи, срок, покрытие |
| `js/profile.js` | 3 | `profileSummary`, `profileReady` |
| `js/wording.js` (новый) | 4 | тексты причин, заголовок карточки |
| `js/rules.js` | 5 | коды вместо текста |
| `js/summary.js` (новый) | 6 | сводка и лестница экзамена |
| `js/card-model.js` (новый) | 7 | разделы раскрытой карточки |
| `tools/build.py` | 8 | `index.json` без текстов + `details.json` |
| `js/data.js` | 8 | `loadDetails` |
| `js/render.js`, `js/form.js`, `js/main.js`, `index.html`, `css/style.css` | 9 | новый экран |
| тесты в `tests/` | 3–9 | см. задачи |

---

### Task 1: Теги условий в схеме и валидаторе

**Files:**
- Modify: `tools/schema.py` (добавить константы рядом с `FIELDS`)
- Modify: `tools/validate.py` (сигнатура `validate_program`, цикл по `textConditions` около строк 85–97, новая функция)
- Test: `tools/tests/test_validate.py` (новый класс `TestConditionTags`)

**Interfaces:**
- Produces: `CONDITION_KINDS: tuple[str, ...]`, `TAGS_REQUIRED: bool` в `tools.schema`; `validate_program(program, snapshot_text, check_required=True, require_tags=None) -> list[str]`.

- [ ] **Step 1: Write the failing tests**

Добавь в конец `tools/tests/test_validate.py` (перед `if __name__`, если он есть). Функции `good_program()` и `SNAPSHOT` уже определены в начале файла.

```python
class TestConditionTags(unittest.TestCase):
    def with_condition(self, **tags):
        program = good_program()
        program["textConditions"] = [
            {"ru": "Условие", "evidence": "citizens of eligible countries", **tags}
        ]
        return program

    def test_valid_tags_pass(self):
        program = self.with_condition(field="citizenship", kind="workaround")
        self.assertEqual(validate_program(program, SNAPSHOT), [])

    def test_general_condition_without_field_passes(self):
        program = self.with_condition(field=None, kind="steps")
        self.assertEqual(validate_program(program, SNAPSHOT), [])

    def test_unknown_kind_is_caught(self):
        problems = validate_program(self.with_condition(kind="maybe"), SNAPSHOT)
        self.assertTrue(any("неизвестный kind" in p for p in problems), problems)

    def test_unknown_field_is_caught(self):
        problems = validate_program(self.with_condition(field="height", kind="note"), SNAPSHOT)
        self.assertTrue(any("не поле анкеты" in p for p in problems), problems)

    def test_workaround_needs_a_field(self):
        # Обходной путь без поля показать негде: интерфейс ставит его под
        # причиной отказа, а причина всегда про конкретное поле.
        problems = validate_program(self.with_condition(kind="workaround"), SNAPSHOT)
        self.assertTrue(any("обходной путь без field" in p for p in problems), problems)

    def test_untagged_is_fine_until_tags_are_required(self):
        self.assertEqual(validate_program(self.with_condition(), SNAPSHOT, require_tags=False), [])

    def test_untagged_is_caught_when_tags_are_required(self):
        problems = validate_program(self.with_condition(), SNAPSHOT, require_tags=True)
        self.assertTrue(any("нет kind" in p for p in problems), problems)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `PYTHONUTF8=1 python -m unittest tools.tests.test_validate -v`
Expected: FAIL — `validate_program() got an unexpected keyword argument 'require_tags'` и непойманные проблемы.

- [ ] **Step 3: Implement**

В `tools/schema.py` после определения `FIELDS`:

```python
# Что человеку делать с текстовым условием. По этому признаку интерфейс
# раскладывает условия карточки: обходной путь — под причиной отказа,
# деньги — в разделе денег. Смысл каждого — в спецификации 2026-09-14.
CONDITION_KINDS = ("workaround", "must", "money", "steps", "note")

# Пока разметка идёт, условия без тегов допустимы. Последняя задача
# разметки ставит True, и новая карточка без тегов не пройдёт review.
TAGS_REQUIRED = False
```

В `tools/validate.py`:
1. В импорт из `tools.schema` добавь `CONDITION_KINDS` и `TAGS_REQUIRED`.
2. Сигнатура и первая строка тела:

```python
def validate_program(
    program: dict, snapshot_text: str, check_required: bool = True, require_tags=None
) -> list[str]:
```

и сразу после docstring:

```python
    if require_tags is None:
        require_tags = TAGS_REQUIRED
```

3. В цикле `for number, condition in enumerate(program.get("textConditions") or [], 1):` после проверки цитаты добавь строку:

```python
        problems.extend(_check_condition_tags(number, condition, require_tags))
```

4. Новая функция в конце модуля:

```python
def _check_condition_tags(number: int, condition: dict, required: bool) -> list[str]:
    problems = []
    kind = condition.get("kind")
    field = condition.get("field")
    if kind is None:
        if required:
            problems.append(f"условие {number}: нет kind — непонятно, что человеку с ним делать")
    elif kind not in CONDITION_KINDS:
        problems.append(f"условие {number}: неизвестный kind {kind!r}")
    if field is not None and field not in FIELDS:
        problems.append(f"условие {number}: field {field!r} — не поле анкеты")
    if kind == "workaround" and not field:
        problems.append(f"условие {number}: обходной путь без field — непонятно, что он обходит")
    return problems
```

- [ ] **Step 4: Run all Python tests**

Run: `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .`
Expected: OK, все тесты (было 305, станет 312).

- [ ] **Step 5: Commit**

```bash
git add tools/schema.py tools/validate.py tools/tests/test_validate.py
git commit -m "Теги условий: field и kind в схеме и валидаторе"
```

---

### Task 2: Разметка всех условий

Долгая задача с данными, не пересекается по файлам с задачами 3–7. Можно запустить в фоне сразу после задачи 1 и продолжать с задачи 3.

**Files:**
- Modify (только через review): `data/programs/*.json`
- Scratch (в git не идут): `proposed/<id>.json`

**Interfaces:**
- Consumes: валидатор из задачи 1.
- Produces: у каждого условия `field` (поле из `FIELDS` или `null`) и `kind` (из `CONDITION_KINDS`).

- [ ] **Step 1: Запомнить базовый коммит и разбить карточки на группы**

```bash
git rev-parse HEAD
ls data/programs
```

Запиши SHA — дальше это `BASE`. Раздели список id по алфавиту на группы по 7–8 карточек.

- [ ] **Step 2: Запустить по агенту Sonnet на группу, параллельно**

Промпт агента (подставь `<ids>`):

```text
Ты размечаешь текстовые условия карточек программ обучения в проекте
C:\Users\ORYX\dev\eligibility-tool. Твои карточки: <ids>.

Зачем: сайт покажет обходной путь прямо под причиной отказа, деньги — в
разделе денег и т.д. Ошибка в разметке становится ложным обещанием на
экране абитуриента. Прочитай docs/superpowers/specs/2026-09-14-helpful-results-design.md,
раздел «1. Разметка условий».

Для каждого id:
1. Скопируй data/programs/<id>.json в proposed/<id>.json.
2. В proposed/<id>.json каждому элементу textConditions добавь два ключа:
   - "field": одно из citizenship, schoolCountry, schoolYears,
     graduationYear, age, gpa, language — или null;
   - "kind": workaround | must | money | steps | note.
   Больше ничего в файле не меняй: ни "ru", ни "evidence", ни порядок.
3. Запусти: PYTHONUTF8=1 python -m tools.review --by-assistant <id>
   Ожидаемо: «записано в …». Если «запись не прошла проверку» — исправь
   теги и повтори. Если review предлагает изменить что-то кроме
   textConditions — ОСТАНОВИСЬ и сообщи, не утверждай.

Как решать:
- workaround — только если текст прямо описывает другой способ выполнить
  или обойти требование из field (другой аттестат, проверка вуза,
  освобождение от экзамена, альтернативный экзамен). Советы «можно
  попробовать» без слов программы — не workaround. У workaround field
  обязателен.
- must — обязательное сверх анкеты: SAT, выдвижение, эссе, интервью,
  документы о доходах, «нельзя совмещать».
- money — покрытие, стоимость, взносы, стипендия, возврат денег.
- steps — как и когда подавать: платформа, этапы, сроки, пакет документов.
- note — всё остальное.
- field ставь и у must/note, если условие уточняет требование анкеты
  («Таджикистан в категории C: нужно 90%» → gpa, note; «IELTS General
  не принимают» → language, must).
- Смешанное условие: выбери то, что человек будет с ним делать.

Нельзя: git, python -m tools.build, сеть, правка js/tools/tests, чужие
карточки.

Отчёт (до 300 слов): по каждому id — сколько условий размечено, список
workaround с field, и все условия, где сомневался, с причиной.
```

- [ ] **Step 3: Проверить, что изменились только теги**

После всех агентов (подставь `BASE`):

```bash
PYTHONUTF8=1 python - <<'EOF'
import glob, json, subprocess
BASE = "<BASE>"
changed, untagged = [], []
def strip(p):
    p = dict(p)
    p["textConditions"] = [
        {k: v for k, v in c.items() if k not in ("field", "kind")}
        for c in p.get("textConditions") or []
    ]
    return p
for path in sorted(glob.glob("data/programs/*.json")):
    new = json.load(open(path, encoding="utf-8"))
    shown = subprocess.run(["git", "show", f"{BASE}:{path.replace(chr(92), '/')}"], capture_output=True)
    if shown.returncode == 0:
        old = json.loads(shown.stdout.decode("utf-8"))
        if strip(new) != strip(old):
            changed.append(path)
    for i, c in enumerate(new.get("textConditions") or [], 1):
        if "kind" not in c:
            untagged.append(f"{path}#{i}")
print("изменено помимо тегов:", changed or "ничего")
print("без тегов:", untagged or "нет")
EOF
```

Expected: `изменено помимо тегов: ничего`, `без тегов: нет`. Иначе — вернуть агенту этой группы с конкретным списком.

- [ ] **Step 4: Круги ревью разметки**

Новый агент Sonnet без контекста на все карточки (или по 25 на агента). Промпт:

```text
Проверь разметку textConditions (поля field и kind) в
C:\Users\ORYX\dev\eligibility-tool\data\programs\*.json. Правила разметки —
docs/superpowers/specs/2026-09-14-helpful-results-design.md, раздел 1.

Главное — ложные обещания. Сайт покажет каждое workaround под подписью
«Как обойти» рядом с отказом по его field. Проверь каждое workaround:
(1) текст действительно описывает другой путь к этому требованию;
(2) field верный — обход 11-летней школы не может быть на language.
Потом: must/money/steps/note по смыслу; field у условий, уточняющих
требование анкеты; нет ли обходных путей, размеченных как note.

Исправляй сам через proposed/<id>.json + PYTHONUTF8=1 python -m tools.review --by-assistant <id>,
меняя только field/kind. Нельзя: git, build, сеть, правка кода.

Отчёт: список исправлений (id, номер условия, было → стало, почему) и
вердикт production_ready: true/false.
```

Если ревьюер нашёл и исправил — запусти нового ревьюера с тем же промптом. Повторять, пока очередной не вернёт ноль исправлений и `production_ready: true`. После каждого круга снова Step 3.

- [ ] **Step 5: Проверки и коммит**

```bash
PYTHONUTF8=1 python -m tools.build
PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .
node --test
git add data/programs data/index.json
git commit -m "Разметка условий всех карточек: field и kind"
```

Expected: сборка пишет 50 программ в пределах лимита, тесты зелёные. `data/index.json` на этом шаге не меняется (теги в индекс ещё не идут) — если `git status` его не показывает, добавлять нечего.

---

### Task 3: Даты, падежи, срок, покрытие, строка профиля

**Files:**
- Create: `js/lib/format.js`
- Modify: `js/profile.js`
- Test: `tests/format.test.js`, `tests/profile.test.js` (дописать)

**Interfaces:**
- Produces (`js/lib/format.js`): `formatDate(iso) -> string`, `plural(n, one, few, many) -> string`, `daysBetween(fromIso, toIso) -> number`, `timeLeft(todayIso, dateIso) -> string|null`, `joinAnd(words) -> string`, `deadlineLine(deadline, todayIso) -> string`, `coverageLine(coverage) -> string`.
- Produces (`js/profile.js`): `profileSummary(profile) -> string`, `profileReady(profile) -> boolean`.

- [ ] **Step 1: Write the failing tests**

`tests/format.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, plural, timeLeft, joinAnd, deadlineLine, coverageLine } from '../js/lib/format.js';

test('дата словами, месяц в родительном падеже', () => {
  assert.equal(formatDate('2027-01-01'), '1 января 2027');
  assert.equal(formatDate('2026-10-09'), '9 октября 2026');
});

test('падежи после числа', () => {
  const p = (n) => plural(n, 'программа', 'программы', 'программ');
  assert.deepEqual([1, 2, 5, 11, 21, 22, 112].map(p), [
    'программа', 'программы', 'программ', 'программ', 'программа', 'программы', 'программ',
  ]);
});

test('сколько осталось: дни, недели, месяцы', () => {
  const t = '2026-09-14';
  assert.equal(timeLeft(t, '2026-09-14'), 'сегодня последний день');
  assert.equal(timeLeft(t, '2026-09-15'), 'остался 1 день');
  assert.equal(timeLeft(t, '2026-09-17'), 'осталось 3 дня');
  assert.equal(timeLeft(t, '2026-09-27'), 'осталось 13 дней');
  assert.equal(timeLeft(t, '2026-09-28'), 'осталось 2 недели');
  assert.equal(timeLeft(t, '2026-11-13'), 'осталось 8 недель');
  assert.equal(timeLeft(t, '2026-11-14'), 'осталось 2 месяца');
  assert.equal(timeLeft(t, '2026-11-28'), 'осталось 2,5 месяца');
  assert.equal(timeLeft(t, '2027-02-11'), 'осталось 5 месяцев');
  assert.equal(timeLeft(t, '2026-09-13'), null);
});

test('перечисление через запятую и «и»', () => {
  assert.equal(joinAnd(['учёбу']), 'учёбу');
  assert.equal(joinAnd(['жильё', 'перелёт']), 'жильё и перелёт');
  assert.equal(joinAnd(['учёбу', 'жильё', 'перелёт']), 'учёбу, жильё и перелёт');
});

test('строка срока для каждого состояния приёма', () => {
  const t = '2026-09-14';
  assert.equal(deadlineLine(null, t), 'Сроки программа не объявила');
  assert.equal(
    deadlineLine({ closes: '2026-10-09', confidence: 'confirmed' }, t),
    'Подать до 9 октября 2026 · осталось 3 недели',
  );
  assert.equal(
    deadlineLine({ opens: '2026-09-01', closes: '2027-01-01', confidence: 'expected' }, t),
    'Подать до 1 января 2027 · осталось 3,5 месяца (ожидаемая дата)',
  );
  assert.equal(
    deadlineLine({ opens: '2027-01-10', closes: '2027-02-20', confidence: 'confirmed' }, t),
    'Приём с 10 января 2027, до 20 февраля 2027',
  );
  assert.equal(
    deadlineLine({ closes: '2026-09-01', recurring: 'annual', confidence: 'expected' }, t),
    'Приём закрыт 1 сентября 2026, обычно повторяется каждый год',
  );
});

test('строка покрытия', () => {
  assert.equal(coverageLine({ tuition: true, living: true, travel: true }), 'Покрывает учёбу, жильё и перелёт');
  assert.equal(coverageLine({ tuition: true, living: false, travel: false }), 'Покрывает учёбу; жильё и перелёт — за свой счёт');
  assert.equal(coverageLine({ tuition: null, living: false, travel: false }), 'Жильё и перелёт — за свой счёт');
  assert.equal(coverageLine({ tuition: true, living: null, travel: null }), 'Покрывает учёбу');
  assert.equal(coverageLine({ tuition: null, living: null, travel: null }), 'Что покрывает — в подробностях');
  assert.equal(coverageLine(undefined), 'Что покрывает — в подробностях');
});

test('в строках нет дат в машинном виде', () => {
  const t = '2026-09-14';
  for (const d of [{ closes: '2026-10-09' }, { opens: '2027-01-10', closes: '2027-02-20' }, { closes: '2026-01-01' }]) {
    assert.doesNotMatch(deadlineLine(d, t), /\d{4}-\d{2}-\d{2}/);
  }
});
```

Допиши в `tests/profile.test.js` (импорт расширь: `profileSummary, profileReady`):

```js
test('строка профиля для свёрнутой анкеты', () => {
  const p = {
    ...emptyProfile(),
    citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11, graduationYear: 2027,
    gpa: { value: 4.8, scale: 'TJ_5' }, languageTests: [{ test: 'IELTS', score: null }],
  };
  assert.equal(profileSummary(p), 'Таджикистан · 11 лет школы · выпуск 2027 · балл 4.8 · IELTS не сдан');
});

test('страна школы в строке, только если отличается от гражданства', () => {
  const p = { ...emptyProfile(), citizenship: 'TJ', schoolCountry: 'RU', languageTests: [{ test: 'TOEFL_IBT_2026', score: 5 }] };
  assert.equal(profileSummary(p), 'Таджикистан · школа в России · TOEFL 5');
});

test('пустой профиль просит заполнить анкету', () => {
  assert.equal(profileSummary(emptyProfile()), 'Заполни анкету');
});

test('анкета готова, когда есть гражданство, страна, годы и выпуск', () => {
  const p = { ...emptyProfile(), citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11 };
  assert.equal(profileReady(p), false);
  assert.equal(profileReady({ ...p, graduationYear: 2027 }), true);
});
```

Проверь, что `emptyProfile` уже импортирован в `tests/profile.test.js`; если нет — добавь в импорт.

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/format.test.js tests/profile.test.js`
Expected: FAIL — `Cannot find module '../js/lib/format.js'` и `profileSummary is not a function`.

- [ ] **Step 3: Implement**

`js/lib/format.js`:

```js
// Даты и числа так, как их говорит человек. Даты приходят строками
// YYYY-MM-DD и так и считаются: Date в браузере тянет часовой пояс.
import { deadlineState } from './deadline.js';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function plural(n, one, few, many) {
  const tens = Math.abs(n) % 100;
  const ones = tens % 10;
  if (tens > 10 && tens < 20) return many;
  if (ones === 1) return one;
  if (ones >= 2 && ones <= 4) return few;
  return many;
}

export function daysBetween(from, to) {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function timeLeft(today, date) {
  const days = daysBetween(today, date);
  if (days < 0) return null;
  if (days === 0) return 'сегодня последний день';
  if (days < 14) {
    return `${plural(days, 'остался', 'осталось', 'осталось')} ${days} ${plural(days, 'день', 'дня', 'дней')}`;
  }
  if (days <= 60) {
    const weeks = Math.floor(days / 7);
    return `осталось ${weeks} ${plural(weeks, 'неделя', 'недели', 'недель')}`;
  }
  const months = Math.floor(days / 30);
  if (days - months * 30 >= 15) return `осталось ${months},5 месяца`;
  return `осталось ${months} ${plural(months, 'месяц', 'месяца', 'месяцев')}`;
}

export function joinAnd(words) {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} и ${words.at(-1)}`;
}

export function deadlineLine(deadline, today) {
  const state = deadlineState(deadline, today);
  if (state === 'unknown') return 'Сроки программа не объявила';
  if (state === 'closed') {
    const again = deadline.recurring === 'annual' ? ', обычно повторяется каждый год' : '';
    return `Приём закрыт ${formatDate(deadline.closes)}${again}`;
  }
  const tail = deadline.confidence !== 'confirmed' ? ' (ожидаемая дата)' : '';
  if (state === 'upcoming') {
    return `Приём с ${formatDate(deadline.opens)}, до ${formatDate(deadline.closes)}${tail}`;
  }
  return `Подать до ${formatDate(deadline.closes)} · ${timeLeft(today, deadline.closes)}${tail}`;
}

const PARTS = [['tuition', 'учёбу'], ['living', 'жильё'], ['travel', 'перелёт']];

export function coverageLine(coverage) {
  const c = coverage ?? {};
  const covered = PARTS.filter(([key]) => c[key] === true).map(([, word]) => word);
  const own = PARTS.filter(([key]) => c[key] === false).map(([, word]) => word);
  if (!covered.length && !own.length) return 'Что покрывает — в подробностях';
  const ownText = own.length ? `${joinAnd(own)} — за свой счёт` : '';
  if (!covered.length) return ownText.charAt(0).toUpperCase() + ownText.slice(1);
  return `Покрывает ${joinAnd(covered)}${ownText ? `; ${ownText}` : ''}`;
}
```

В конец `js/profile.js`:

```js
const COUNTRY = { TJ: 'Таджикистан', UZ: 'Узбекистан', KG: 'Кыргызстан', KZ: 'Казахстан', TM: 'Туркменистан', RU: 'Россия' };
const COUNTRY_IN = { TJ: 'Таджикистане', UZ: 'Узбекистане', KG: 'Кыргызстане', KZ: 'Казахстане', TM: 'Туркменистане', RU: 'России' };
const TEST_SHORT = { IELTS: 'IELTS', TOEFL_IBT: 'TOEFL', TOEFL_IBT_2026: 'TOEFL', DUOLINGO: 'Duolingo' };

// Одна строка вместо свёрнутой анкеты: человек видит, по какому профилю
// посчитан ответ, и не листает форму ради этого.
export function profileSummary(profile) {
  const parts = [];
  if (profile.citizenship) parts.push(COUNTRY[profile.citizenship] ?? profile.citizenship);
  if (profile.schoolCountry && profile.schoolCountry !== profile.citizenship) {
    parts.push(`школа в ${COUNTRY_IN[profile.schoolCountry] ?? profile.schoolCountry}`);
  }
  if (profile.schoolYears != null) parts.push(`${profile.schoolYears} лет школы`);
  if (profile.graduationYear != null) parts.push(`выпуск ${profile.graduationYear}`);
  if (profile.gpa?.value != null) parts.push(`балл ${profile.gpa.value}`);
  for (const t of profile.languageTests ?? []) {
    const name = TEST_SHORT[t.test] ?? t.test;
    parts.push(t.score == null ? `${name} не сдан` : `${name} ${t.score}`);
  }
  return parts.length ? parts.join(' · ') : 'Заполни анкету';
}

export function profileReady(profile) {
  return Boolean(
    profile.citizenship && profile.schoolCountry && profile.schoolYears != null && profile.graduationYear != null,
  );
}
```

- [ ] **Step 4: Run tests**

Run: `node --test`
Expected: все зелёные.

- [ ] **Step 5: Commit**

```bash
git add js/lib/format.js js/profile.js tests/format.test.js tests/profile.test.js
git commit -m "Даты словами, остаток срока, строка покрытия и профиля"
```

---

### Task 4: Тексты причин

**Files:**
- Create: `js/wording.js`
- Test: `tests/wording.test.js`

**Interfaces:**
- Consumes: причина `{ field, status, code, params }` — контракт задачи 5 (таблица кодов в спецификации, раздел 3).
- Produces: `reasonText(reason) -> { title, detail, short, changeable }`, `orderReasons(reasons) -> reasons`, `headline(verdict, program) -> string`, `testName(test) -> string`, `joinOr(items) -> string`, `USER_SIDE_STATES: Set<string>`.

- [ ] **Step 1: Write the failing tests**

`tests/wording.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reasonText, orderReasons, headline, joinOr } from '../js/wording.js';

const FIELDS = ['citizenship', 'schoolCountry', 'schoolYears', 'graduationYear', 'age', 'gpa', 'language'];
const opts = [{ test: 'IELTS', min: 6.5 }, { test: 'TOEFL_IBT', min: 90 }, { test: 'DUOLINGO', min: 125 }];

// Каждый код, который умеет выдавать движок, с правдоподобными числами.
const SAMPLES = [
  ...FIELDS.flatMap((f) => ['missing-rule', 'by-institution', 'not-measured'].map((s) => ({ field: f, status: 'unknown', code: `${f}.${s}`, params: {} }))),
  ...['citizenship', 'schoolCountry', 'schoolYears', 'graduationYear', 'age', 'gpa'].map((f) => ({ field: f, status: 'unknown', code: `${f}.no-value`, params: {} })),
  { field: 'citizenship', status: 'fail', code: 'citizenship.denied', params: {} },
  { field: 'citizenship', status: 'fail', code: 'citizenship.not-in-list', params: {} },
  { field: 'schoolCountry', status: 'fail', code: 'schoolCountry.denied', params: {} },
  { field: 'schoolCountry', status: 'fail', code: 'schoolCountry.not-in-list', params: {} },
  { field: 'schoolYears', status: 'fail', code: 'schoolYears.below-min', params: { min: 12, mine: 11 } },
  { field: 'graduationYear', status: 'fail', code: 'graduationYear.too-early', params: { min: 2025, mine: 2024 } },
  { field: 'graduationYear', status: 'unknown', code: 'graduationYear.cycle-unknown', params: {} },
  { field: 'graduationYear', status: 'fail', code: 'graduationYear.after-cycle', params: { max: 2027, mine: 2028 } },
  { field: 'graduationYear', status: 'fail', code: 'graduationYear.too-late', params: { max: 2026, mine: 2027 } },
  { field: 'age', status: 'unknown', code: 'age.asof-unknown', params: {} },
  ...['no-dates', 'cycle-guessed', 'asof-unknown', 'unconfirmed'].map((why) => ({ field: 'age', status: 'unknown', code: 'age.near-max', params: { age: 20, limit: 20, why } })),
  { field: 'age', status: 'fail', code: 'age.over-max', params: { age: 21, maxExclusive: 21 } },
  { field: 'age', status: 'fail', code: 'age.over-max', params: { age: 26, max: 25 } },
  { field: 'age', status: 'unknown', code: 'age.near-min', params: { age: 17, min: 18, why: 'unconfirmed' } },
  { field: 'age', status: 'fail', code: 'age.under-min', params: { age: 15, min: 18 } },
  { field: 'gpa', status: 'unknown', code: 'gpa.near-threshold', params: { mine: 72, need: 70 } },
  { field: 'gpa', status: 'unknown', code: 'gpa.below-advisory', params: { mine: 88, need: 90 } },
  { field: 'gpa', status: 'fail', code: 'gpa.below', params: { mine: 60, need: 70 } },
  { field: 'language', status: 'unknown', code: 'language.score-missing', params: { options: opts, advisory: false } },
  { field: 'language', status: 'unknown', code: 'language.score-missing', params: { options: opts, advisory: true } },
  { field: 'language', status: 'unknown', code: 'language.below-advisory', params: { options: opts } },
  { field: 'language', status: 'fail', code: 'language.below', params: { options: opts } },
  { field: 'language', status: 'unknown', code: 'language.other-test', params: { tests: ['TOEFL_IBT_2026'], options: opts, advisory: false } },
  { field: 'language', status: 'unknown', code: 'language.no-certificate', params: { options: opts, advisory: false } },
  { field: 'language', status: 'unknown', code: 'language.no-certificate', params: { options: opts, advisory: true } },
];

test('у каждого кода есть заголовок, объяснение и короткая форма', () => {
  for (const reason of SAMPLES) {
    const t = reasonText(reason);
    for (const key of ['title', 'detail', 'short']) {
      assert.ok(t[key] && t[key].length > 3, `${reason.code}: пустой ${key}`);
    }
  }
});

test('тексты не говорят про внутренности', () => {
  for (const reason of SAMPLES) {
    const t = reasonText(reason);
    const all = `${t.title} ${t.detail} ${t.short}`;
    assert.doesNotMatch(all, /инструмент|не считает|правил|undefined|NaN|\d{4}-\d{2}-\d{2}/, reason.code);
    for (const f of FIELDS) assert.ok(!all.includes(f), `${reason.code}: имя поля ${f} в тексте`);
    assert.doesNotMatch(all, /TOEFL_IBT|DUOLINGO/, reason.code);
  }
});

test('короткая форма помещается в заголовок карточки', () => {
  for (const reason of SAMPLES) assert.ok(reasonText(reason).short.length <= 60, reason.code);
});

test('незнакомый код — ошибка, а не пустая строка', () => {
  assert.throws(() => reasonText({ field: 'age', status: 'unknown', code: 'age.whatever', params: {} }));
});

test('образцы из спецификации', () => {
  const years = reasonText({ field: 'schoolYears', status: 'fail', code: 'schoolYears.below-min', params: { min: 12, mine: 11 } });
  assert.equal(years.title, 'Школа');
  assert.equal(years.short, 'нужно 12 лет школы, у тебя 11');
  assert.equal(years.detail, 'Программа принимает после 12 лет школы, а у тебя 11.');
  assert.equal(years.changeable, false);

  const cert = reasonText({ field: 'language', status: 'unknown', code: 'language.no-certificate', params: { options: opts, advisory: false } });
  assert.equal(cert.short, 'сдать английский (IELTS от 6.5)');
  assert.equal(cert.detail, 'Нужен сертификат: IELTS от 6.5, TOEFL по старой шкале от 90 или Duolingo от 125. Сертификата пока нет — сдать ещё успеешь.');

  const lang = reasonText({ field: 'language', status: 'fail', code: 'language.below', params: { options: opts } });
  assert.equal(lang.changeable, true);
});

test('рекомендованный балл не выдаётся за порог', () => {
  const t = reasonText({ field: 'gpa', status: 'unknown', code: 'gpa.below-advisory', params: { mine: 88, need: 90 } });
  assert.match(t.detail, /не отказ/);
  const l = reasonText({ field: 'language', status: 'unknown', code: 'language.below-advisory', params: { options: opts } });
  assert.match(l.detail, /не отказ/);
});

test('экзамены по-человечески', () => {
  const t = reasonText({ field: 'language', status: 'unknown', code: 'language.other-test', params: { tests: ['TOEFL_IBT_2026'], options: [{ test: 'IELTS', min: 6 }], advisory: false } });
  assert.match(t.detail, /TOEFL по новой шкале/);
  assert.match(t.detail, /IELTS от 6/);
});

test('перечисление через «или»', () => {
  assert.equal(joinOr(['a']), 'a');
  assert.equal(joinOr(['a', 'b', 'c']), 'a, b или c');
});

test('сначала отказы, среди остального — то, что делает сам человек', () => {
  const program = { code: 'schoolYears.not-measured', field: 'schoolYears', status: 'unknown', params: {} };
  const cert = { code: 'language.no-certificate', field: 'language', status: 'unknown', params: { options: opts } };
  const fail = { code: 'gpa.below', field: 'gpa', status: 'fail', params: { mine: 60, need: 70 } };
  assert.deepEqual(orderReasons([program, cert, fail]).map((r) => r.code), ['gpa.below', 'language.no-certificate', 'schoolYears.not-measured']);
});

test('заголовок: можно', () => {
  assert.equal(headline({ status: 'yes', reasons: [] }, {}), 'Можно подавать');
});

test('заголовок: нельзя насовсем, но с обходным путём', () => {
  const verdict = { status: 'no', reasons: [{ field: 'schoolYears', status: 'fail', code: 'schoolYears.below-min', params: { min: 12, mine: 11 } }] };
  assert.equal(headline(verdict, { workaroundFields: ['schoolYears'] }), 'Нельзя: нужно 12 лет школы, у тебя 11 · есть обходной путь');
  assert.equal(headline(verdict, {}), 'Нельзя: нужно 12 лет школы, у тебя 11');
});

test('заголовок: пока нельзя, если человек может это изменить', () => {
  const verdict = { status: 'no', reasons: [{ field: 'language', status: 'fail', code: 'language.below', params: { options: opts } }] };
  assert.equal(headline(verdict, {}), 'Пока нельзя: результат экзамена ниже порога');
});

test('заголовок: можно, но сначала — и сколько ещё', () => {
  const verdict = {
    status: 'check',
    reasons: [
      { field: 'schoolYears', status: 'unknown', code: 'schoolYears.not-measured', params: {} },
      { field: 'language', status: 'unknown', code: 'language.no-certificate', params: { options: opts } },
    ],
  };
  assert.equal(headline(verdict, {}), 'Можно, но сначала: сдать английский (IELTS от 6.5) и ещё 1');
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/wording.test.js`
Expected: FAIL — `Cannot find module '../js/wording.js'`.

- [ ] **Step 3: Implement `js/wording.js`**

```js
// Тексты причин. Правила возвращают код и числа, человек читает отсюда.
// Голос и образцы — docs/superpowers/specs/2026-09-14-helpful-results-design.md, раздел 4.

const TEST = {
  IELTS: 'IELTS',
  TOEFL_IBT: 'TOEFL по старой шкале',
  TOEFL_IBT_2026: 'TOEFL по новой шкале',
  DUOLINGO: 'Duolingo',
};
export const testName = (test) => TEST[test] ?? test;

export function joinOr(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} или ${items.at(-1)}`;
}

const optionList = (options) => joinOr(options.map((o) => `${testName(o.test)} от ${o.min}`));

const TITLE = {
  citizenship: 'Гражданство', schoolCountry: 'Страна школы', schoolYears: 'Школа',
  graduationYear: 'Год выпуска', age: 'Возраст', gpa: 'Средний балл', language: 'Язык',
};
// «требование к …»
const TO = {
  citizenship: 'гражданству', schoolCountry: 'стране школы', schoolYears: 'школе',
  graduationYear: 'году выпуска', age: 'возрасту', gpa: 'баллу', language: 'языку',
};
// «про …»
const ABOUT = {
  citizenship: 'гражданство', schoolCountry: 'страну школы', schoolYears: 'годы школы',
  graduationYear: 'год выпуска', age: 'возраст', gpa: 'средний балл', language: 'язык',
};
// «указать …»
const FILL = {
  citizenship: 'гражданство', schoolCountry: 'страну школы', schoolYears: 'число лет школы',
  graduationYear: 'год выпуска', age: 'дату рождения', gpa: 'средний балл',
};

const WHY = {
  'no-dates': 'даты приёма ещё не объявлены, и к подаче тебе может стать больше',
  'cycle-guessed': 'даты приёма ещё не объявлены, и год взят по ближайшему циклу',
  'asof-unknown': 'программа не пишет, на какую дату считает возраст',
  unconfirmed: 'дата приёма ещё не подтверждена',
};

// Состояния, которые человек исправляет сам: указать поле, сдать экзамен.
export const USER_SIDE_STATES = new Set(['no-value', 'no-certificate', 'score-missing', 'other-test']);

// Отказы, которые могут измениться: пересдать, дождаться возраста или цикла.
const CHANGEABLE = new Set(['language.below', 'gpa.below', 'age.under-min', 'graduationYear.after-cycle']);

function generic(field, state) {
  switch (state) {
    case 'missing-rule':
      return {
        short: `уточнить требования к ${TO[field]}`,
        detail: `На страницах программы про ${ABOUT[field]} ничего не нашлось. Если сомневаешься, спроси у неё.`,
      };
    case 'by-institution':
      return {
        short: `узнать требование к ${TO[field]} в вузе`,
        detail: `Требование к ${TO[field]} ставит принимающий вуз, у каждого своё. Смотри на сайте вуза, куда подаёшь.`,
      };
    case 'not-measured':
      return {
        short: `уточнить требование к ${TO[field]}`,
        detail: `Программа описывает требование к ${TO[field]} словами, а не числом.`,
      };
    case 'no-value':
      if (!FILL[field]) return null;
      return {
        short: `указать ${FILL[field]}`,
        detail: `Укажи в анкете ${FILL[field]} — иначе не проверить, подходишь ли ты.`,
      };
    default:
      return null;
  }
}

const SPECIAL = {
  'citizenship.denied': () => ({
    short: 'не принимает граждан твоей страны',
    detail: 'Программа не принимает граждан твоей страны.',
  }),
  'citizenship.not-in-list': () => ({
    short: 'твоей страны нет в списке',
    detail: 'Программа принимает граждан только из своего списка стран, твоей страны в нём нет.',
  }),
  'schoolCountry.denied': () => ({
    short: 'не принимает аттестаты твоей страны',
    detail: 'Программа не принимает аттестаты страны, где ты оканчиваешь школу.',
  }),
  'schoolCountry.not-in-list': () => ({
    short: 'аттестата твоей страны нет в списке',
    detail: 'Программа принимает аттестаты только из своего списка стран, твоей страны в нём нет.',
  }),
  'schoolYears.below-min': ({ min, mine }) => ({
    short: `нужно ${min} лет школы, у тебя ${mine}`,
    detail: `Программа принимает после ${min} лет школы, а у тебя ${mine}.`,
  }),
  'graduationYear.too-early': ({ min, mine }) => ({
    short: `берут выпускников с ${min} года`,
    detail: `Программа берёт тех, кто окончил школу в ${min} году или позже, а ты — в ${mine}.`,
  }),
  'graduationYear.cycle-unknown': () => ({
    short: 'уточнить, к какому году окончить школу',
    detail: 'Школу нужно окончить к году подачи, но даты приёма ещё не объявлены, поэтому крайний год пока не посчитать.',
  }),
  'graduationYear.after-cycle': ({ max, mine }) => ({
    short: `нужно окончить школу к ${max}, у тебя ${mine}`,
    detail: `Программа берёт тех, кто оканчивает школу к году подачи — к ${max}. Ты оканчиваешь в ${mine}, так что подать сможешь в следующем цикле.`,
  }),
  'graduationYear.too-late': ({ max, mine }) => ({
    short: `берут выпускников до ${max} года`,
    detail: `Программа берёт тех, кто оканчивает школу не позже ${max} года, а ты — в ${mine}.`,
  }),
  'age.asof-unknown': () => ({
    short: 'уточнить, на какую дату считают возраст',
    detail: 'У программы есть ограничение по возрасту, но не сказано, на какую дату его считают.',
  }),
  'age.near-max': ({ age, limit, why }) => ({
    short: `сверить возраст: около ${age} при пределе ${limit}`,
    detail: `К дате приёма тебе будет около ${age}, а программа берёт до ${limit}. Точно сказать нельзя: ${WHY[why]}. Проверь на сайте программы.`,
  }),
  'age.over-max': ({ age, max, maxExclusive }) => (maxExclusive != null
    ? {
      short: `к подаче тебе будет ${age}, берут младше ${maxExclusive}`,
      detail: `На дату приёма тебе будет ${age}, а программа берёт младше ${maxExclusive}.`,
    }
    : {
      short: `к подаче тебе будет ${age}, берут до ${max}`,
      detail: `На дату приёма тебе будет ${age}, а программа берёт до ${max} включительно.`,
    }),
  'age.near-min': ({ age, min, why }) => ({
    short: `сверить возраст: около ${age} при минимуме ${min}`,
    detail: `К дате приёма тебе будет около ${age}, а программа берёт с ${min}. Точно сказать нельзя: ${WHY[why]}. Проверь на сайте программы.`,
  }),
  'age.under-min': ({ age, min }) => ({
    short: `к подаче тебе будет ${age}, берут с ${min}`,
    detail: `На дату приёма тебе будет ${age}, а программа берёт с ${min}. Подать сможешь в одном из следующих циклов.`,
  }),
  'gpa.near-threshold': ({ mine, need }) => ({
    short: 'сверить балл с порогом',
    detail: `Твой балл — примерно ${mine}%, программе нужно ${need}%. Шкалы разные, и пересчёт приблизительный — сверь с условиями программы.`,
  }),
  'gpa.below-advisory': ({ mine, need }) => ({
    short: 'сверить балл с условиями программы',
    detail: `Твой балл — ${mine}%, программа называет ${need}%. Это не отказ: число не жёсткий порог или к нему есть обходной путь.`,
  }),
  'gpa.below': ({ mine, need }) => ({
    short: `балл ${mine}% при пороге ${need}%`,
    detail: `Твой балл — ${mine}%, программе нужно ${need}%. Решает итоговый балл аттестата: если он окажется выше, ответ изменится.`,
  }),
  'language.score-missing': ({ options, advisory }) => ({
    short: 'вписать балл экзамена',
    detail: `Ты отметил экзамен, но не вписал балл. ${advisory ? 'Программа советует' : 'Нужен'} ${optionList(options)}.`,
  }),
  'language.below-advisory': ({ options }) => ({
    short: 'балл ниже рекомендованного',
    detail: `Программа советует ${optionList(options)}, твой результат ниже. Это не отказ: программа называет балл рекомендацией, решает отбор.`,
  }),
  'language.below': ({ options }) => ({
    short: 'результат экзамена ниже порога',
    detail: `Программе нужен ${optionList(options)}, твой результат ниже. Экзамен можно пересдать.`,
  }),
  'language.other-test': ({ tests, options, advisory }) => ({
    short: 'уточнить, примут ли твой экзамен',
    detail: `Твой ${joinOr(tests.map(testName))} программа не называет — она ${advisory ? 'советует' : 'требует'} ${optionList(options)}. Спроси у программы, примут ли твой экзамен.`,
  }),
  'language.no-certificate': ({ options, advisory }) => {
    const first = `${testName(options[0].test)} от ${options[0].min}`;
    return advisory
      ? {
        short: `сдать английский (желательно ${first})`,
        detail: `Программа советует ${optionList(options)}, но это не порог — решает отбор. Сертификат всё равно понадобится.`,
      }
      : {
        short: `сдать английский (${first})`,
        detail: `Нужен сертификат: ${optionList(options)}. Сертификата пока нет — сдать ещё успеешь.`,
      };
  },
};

export function reasonText(reason) {
  const [field, state] = reason.code.split('.');
  const text = SPECIAL[reason.code] ? SPECIAL[reason.code](reason.params ?? {}) : generic(field, state);
  if (!text) throw new Error(`Нет текста для причины ${reason.code}`);
  return { title: TITLE[field] ?? field, ...text, changeable: CHANGEABLE.has(reason.code) };
}

const stateOf = (reason) => reason.code.split('.')[1];

export function orderReasons(reasons) {
  const rank = (r) => (r.status === 'fail' ? 0 : USER_SIDE_STATES.has(stateOf(r)) ? 1 : 2);
  return [...reasons].sort((a, b) => rank(a) - rank(b));
}

export function headline(verdict, program) {
  if (verdict.status === 'yes') return 'Можно подавать';
  const ordered = orderReasons(verdict.reasons);
  const first = ordered[0];
  const text = reasonText(first);
  if (verdict.status === 'no') {
    const way = (program.workaroundFields ?? []).includes(first.field) ? ' · есть обходной путь' : '';
    return `${text.changeable ? 'Пока нельзя' : 'Нельзя'}: ${text.short}${way}`;
  }
  const more = ordered.length - 1;
  return `Можно, но сначала: ${text.short}${more > 0 ? ` и ещё ${more}` : ''}`;
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/wording.test.js`
Expected: PASS. Если «короткая форма помещается» падает — укороти `short` у названного кода, не ослабляй тест.

- [ ] **Step 5: Commit**

```bash
git add js/wording.js tests/wording.test.js
git commit -m "Тексты причин: объясняют, что не так и что делать"
```

---

### Task 5: Правила возвращают коды

**Files:**
- Modify: `js/rules.js`
- Modify: `js/render.js:141-145` (строка причины)
- Modify: все `tests/rules-*.test.js`, где проверяется `message`
- Test: `tests/rules-codes.test.js` (новый)

**Interfaces:**
- Consumes: `reasonText` из задачи 4.
- Produces: каждая `check*` возвращает `{ status, code, params }`; у `pass` — `code: null, params: {}`. `evaluate` в `js/verdict.js` без изменений кода; его причины теперь `{ field, status, code, params }`.

- [ ] **Step 1: Write the failing coverage test**

`tests/rules-codes.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkCitizenship, checkSchoolCountry, checkSchoolYears, checkGraduationYear,
  checkAge, checkGpa, checkLanguage,
} from '../js/rules.js';
import { reasonText } from '../js/wording.js';

const deadline = { closes: '2027-02-20', confidence: 'confirmed' };
const ctx = { deadline, today: '2026-09-14' };
const lang = { anyOf: [{ test: 'IELTS', min: 6, evidence: 'x' }], evidence: 'x' };
const advisoryLang = { ...lang, advisory: true };

// [функция, профиль, правило, контекст, ожидаемый код]
const CASES = [
  ...[
    [checkCitizenship, 'citizenship', { citizenship: 'TJ' }],
    [checkSchoolCountry, 'schoolCountry', { schoolCountry: 'TJ' }],
  ].flatMap(([fn, f, me]) => [
    [fn, me, null, ctx, `${f}.missing-rule`],
    [fn, me, { definedBy: 'institution', evidence: 'x' }, ctx, `${f}.by-institution`],
    [fn, me, { notMeasured: true, evidence: 'x' }, ctx, `${f}.not-measured`],
    [fn, {}, { allow: '*', deny: [], evidence: 'x' }, ctx, `${f}.no-value`],
    [fn, me, { allow: '*', deny: ['TJ'], evidence: 'x' }, ctx, `${f}.denied`],
    [fn, me, { allow: ['UZ'], evidence: 'x' }, ctx, `${f}.not-in-list`],
  ]),
  [checkSchoolYears, { schoolYears: 11 }, null, ctx, 'schoolYears.missing-rule'],
  [checkSchoolYears, { schoolYears: 11 }, { definedBy: 'institution', evidence: 'x' }, ctx, 'schoolYears.by-institution'],
  [checkSchoolYears, { schoolYears: 11 }, { notMeasured: true, evidence: 'x' }, ctx, 'schoolYears.not-measured'],
  [checkSchoolYears, {}, { min: 12, evidence: 'x' }, ctx, 'schoolYears.no-value'],
  [checkSchoolYears, { schoolYears: 11 }, { min: 12, evidence: 'x' }, ctx, 'schoolYears.below-min'],
  [checkGraduationYear, { graduationYear: 2027 }, null, ctx, 'graduationYear.missing-rule'],
  [checkGraduationYear, { graduationYear: 2027 }, { definedBy: 'institution', evidence: 'x' }, ctx, 'graduationYear.by-institution'],
  [checkGraduationYear, { graduationYear: 2027 }, { notMeasured: true, evidence: 'x' }, ctx, 'graduationYear.not-measured'],
  [checkGraduationYear, {}, { min: 2025, evidence: 'x' }, ctx, 'graduationYear.no-value'],
  [checkGraduationYear, { graduationYear: 2024 }, { min: 2025, evidence: 'x' }, ctx, 'graduationYear.too-early'],
  [checkGraduationYear, { graduationYear: 2027 }, { maxRelative: 'applicationYear', evidence: 'x' }, { deadline: null }, 'graduationYear.cycle-unknown'],
  [checkGraduationYear, { graduationYear: 2028 }, { maxRelative: 'applicationYear', evidence: 'x' }, ctx, 'graduationYear.after-cycle'],
  [checkGraduationYear, { graduationYear: 2027 }, { max: 2026, evidence: 'x' }, ctx, 'graduationYear.too-late'],
  [checkAge, { birthDate: '2008-01-01' }, null, ctx, 'age.missing-rule'],
  [checkAge, { birthDate: '2008-01-01' }, { definedBy: 'institution', evidence: 'x' }, ctx, 'age.by-institution'],
  [checkAge, { birthDate: '2008-01-01' }, { notMeasured: true, evidence: 'x' }, ctx, 'age.not-measured'],
  [checkAge, {}, { max: 25, evidence: 'x' }, ctx, 'age.no-value'],
  [checkAge, { birthDate: '2008-01-01' }, { max: 25, asOf: { relativeTo: 'applicationYear', monthDay: '08-31' }, evidence: 'x' }, { deadline: null, today: null }, 'age.asof-unknown'],
  [checkAge, { birthDate: '2006-06-01' }, { maxExclusive: 21, evidence: 'x' }, ctx, 'age.near-max'],
  [checkAge, { birthDate: '2000-01-01' }, { max: 25, asOf: '2027-02-20', evidence: 'x' }, ctx, 'age.over-max'],
  [checkAge, { birthDate: '2009-06-01' }, { min: 18, evidence: 'x' }, ctx, 'age.near-min'],
  [checkAge, { birthDate: '2012-01-01' }, { min: 18, asOf: '2027-02-20', evidence: 'x' }, ctx, 'age.under-min'],
  [checkGpa, { gpa: { value: 4.8, scale: 'TJ_5' } }, null, ctx, 'gpa.missing-rule'],
  [checkGpa, { gpa: { value: 4.8, scale: 'TJ_5' } }, { definedBy: 'institution', evidence: 'x' }, ctx, 'gpa.by-institution'],
  [checkGpa, { gpa: { value: 4.8, scale: 'TJ_5' } }, { notMeasured: true, evidence: 'x' }, ctx, 'gpa.not-measured'],
  [checkGpa, { gpa: { value: null, scale: 'TJ_5' } }, { min: 70, scale: 'PERCENT', evidence: 'x' }, ctx, 'gpa.no-value'],
  [checkGpa, { gpa: { value: 3.6, scale: 'TJ_5' } }, { min: 70, scale: 'PERCENT', evidence: 'x' }, ctx, 'gpa.near-threshold'],
  [checkGpa, { gpa: { value: 60, scale: 'PERCENT' } }, { min: 70, scale: 'PERCENT', advisory: true, evidence: 'x' }, ctx, 'gpa.below-advisory'],
  [checkGpa, { gpa: { value: 60, scale: 'PERCENT' } }, { min: 70, scale: 'PERCENT', evidence: 'x' }, ctx, 'gpa.below'],
  [checkLanguage, { languageTests: [] }, null, ctx, 'language.missing-rule'],
  [checkLanguage, { languageTests: [] }, { definedBy: 'institution', evidence: 'x' }, ctx, 'language.by-institution'],
  [checkLanguage, { languageTests: [] }, { notMeasured: true, evidence: 'x' }, ctx, 'language.not-measured'],
  [checkLanguage, { languageTests: [{ test: 'IELTS', score: null }] }, lang, ctx, 'language.score-missing'],
  [checkLanguage, { languageTests: [{ test: 'IELTS', score: 5 }] }, advisoryLang, ctx, 'language.below-advisory'],
  [checkLanguage, { languageTests: [{ test: 'IELTS', score: 5 }] }, lang, ctx, 'language.below'],
  [checkLanguage, { languageTests: [{ test: 'DUOLINGO', score: 120 }] }, lang, ctx, 'language.other-test'],
  [checkLanguage, { languageTests: [] }, lang, ctx, 'language.no-certificate'],
];

test('каждое состояние правил отдаёт свой код', () => {
  for (const [fn, me, rule, c, code] of CASES) {
    assert.equal(fn(me, rule, c).code, code, `${fn.name} → ${code}`);
  }
});

test('каждый код, который отдают правила, можно прочитать человеку', () => {
  for (const [fn, me, rule, c] of CASES) {
    const got = fn(me, rule, c);
    const field = got.code.split('.')[0];
    assert.doesNotThrow(() => reasonText({ field, ...got }), got.code);
  }
});

test('у прохода нет кода и параметров', () => {
  assert.deepEqual(checkSchoolYears({ schoolYears: 12 }, { min: 12, evidence: 'x' }, ctx), { status: 'pass', code: null, params: {} });
});

test('в параметрах числа, а не текст', () => {
  assert.deepEqual(checkSchoolYears({ schoolYears: 11 }, { min: 12, evidence: 'x' }, ctx).params, { min: 12, mine: 11 });
  assert.deepEqual(checkGpa({ gpa: { value: 60, scale: 'PERCENT' } }, { min: 70, scale: 'PERCENT', evidence: 'x' }, ctx).params, { mine: 60, need: 70 });
  assert.deepEqual(checkLanguage({ languageTests: [] }, lang, ctx).params, { options: [{ test: 'IELTS', min: 6 }], advisory: false });
  assert.deepEqual(checkAge({ birthDate: '2006-06-01' }, { maxExclusive: 21, evidence: 'x' }, ctx).params, { age: 20, limit: 20, why: 'asof-unknown' });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/rules-codes.test.js`
Expected: FAIL — `code` равен `undefined`.

- [ ] **Step 3: Implement in `js/rules.js`**

Меняются только строки создания результата. Все комментарии, `noLimit`, `delegated`, `notMeasured`, `resolveAsOf` и ветвление оставить как есть.

1. Удали `TEST_NAMES` и `testName` (строки 18–28 с комментарием) — названия экзаменов теперь в `js/wording.js`.
2. Замени строку 16 и шапочный комментарий (строки 5–7):

```js
// Каждая возвращает { status, code, params }, где status — 'pass', 'fail'
// или 'unknown', code — «поле.состояние», params — числа для текста.
// Тексты собирает js/wording.js. У pass кода нет: человеку не нужно
// читать семь строк о том, что у него всё в порядке.
```

```js
const r = (status, code = null, params = {}) => ({ status, code, params });
```

3. `countryRule` получает префикс вместо `labels`:

```js
function countryRule(value, rule, field) {
  if (!rule) return r('unknown', `${field}.missing-rule`);
  if (noLimit(rule)) return r('pass');
  if (delegated(rule)) return r('unknown', `${field}.by-institution`);
  if (notMeasured(rule)) return r('unknown', `${field}.not-measured`);
  if (!value) return r('unknown', `${field}.no-value`);
  if (Array.isArray(rule.deny) && rule.deny.includes(value)) return r('fail', `${field}.denied`);
  if (rule.allow === '*') return r('pass');
  if (Array.isArray(rule.allow) && rule.allow.includes(value)) return r('pass');
  return r('fail', `${field}.not-in-list`);
}

export function checkCitizenship(profile, rule, ctx) {
  return countryRule(profile.citizenship, rule, 'citizenship');
}

export function checkSchoolCountry(profile, rule, ctx) {
  return countryRule(profile.schoolCountry, rule, 'schoolCountry');
}
```

4. Остальные `return r(...)` — по таблице (было → стало):

| Функция | Было (начало сообщения) | Стало |
|---|---|---|
| checkSchoolYears | `'Программа не указывает, сколько лет…'` | `r('unknown', 'schoolYears.missing-rule')` |
| | `'Сколько лет школы нужно, решает…'` | `r('unknown', 'schoolYears.by-institution')` |
| | `'Требование к школьному образованию есть…'` | `r('unknown', 'schoolYears.not-measured')` |
| | `'Ты не указал, сколько лет…'` | `r('unknown', 'schoolYears.no-value')` |
| | `` `Программа требует ${rule.min} лет школы…` `` | `r('fail', 'schoolYears.below-min', { min: rule.min, mine: profile.schoolYears })` |
| checkGraduationYear | `'Программа не указывает, в каком году…'` | `r('unknown', 'graduationYear.missing-rule')` |
| | `'Требование к году выпуска устанавливает…'` | `r('unknown', 'graduationYear.by-institution')` |
| | `'Требование к году выпуска есть…'` | `r('unknown', 'graduationYear.not-measured')` |
| | `'Ты не указал год выпуска'` | `r('unknown', 'graduationYear.no-value')` |
| | `` `…не раньше ${rule.min} года…` `` | `r('fail', 'graduationYear.too-early', { min: rule.min, mine: profile.graduationYear })` |
| | `'Год приёма неизвестен…'` | `r('unknown', 'graduationYear.cycle-unknown')` |
| | `` `…к году подачи — к ${max}…` `` | `r('fail', 'graduationYear.after-cycle', { max, mine: profile.graduationYear })` |
| | `` `…не позже ${rule.max} года…` `` | `r('fail', 'graduationYear.too-late', { max: rule.max, mine: profile.graduationYear })` |
| checkAge | `'Программа не указывает ограничение…'` | `r('unknown', 'age.missing-rule')` |
| | `'Ограничение по возрасту устанавливает…'` | `r('unknown', 'age.by-institution')` |
| | `'Требование к возрасту есть…'` | `r('unknown', 'age.not-measured')` |
| | `'Ты не указал дату рождения'` | `r('unknown', 'age.no-value')` |
| | `'Дата, на которую программа считает…'` | `r('unknown', 'age.asof-unknown')` |
| | `` `…около ${age} при пределе…` `` | `r('unknown', 'age.near-max', { age, limit: maxInclusive, why })` |
| | fail с `maxExclusive`/`max` | `r('fail', 'age.over-max', rule.maxExclusive != null ? { age, maxExclusive: rule.maxExclusive } : { age, max: rule.max })` |
| | `` `…около ${age} при нижней границе…` `` | `r('unknown', 'age.near-min', { age, min: rule.min, why })` |
| | `` `…программа берёт с ${rule.min}` `` | `r('fail', 'age.under-min', { age, min: rule.min })` |
| checkGpa | `'Программа не указывает требование к среднему…'` | `r('unknown', 'gpa.missing-rule')` |
| | `'Порог по среднему баллу устанавливает…'` | `r('unknown', 'gpa.by-institution')` |
| | `'Требование к успеваемости есть…'` | `r('unknown', 'gpa.not-measured')` |
| | `'Ты не указал средний балл'` | `r('unknown', 'gpa.no-value')` |
| | `'Твой балл близко к порогу…'` | `r('unknown', 'gpa.near-threshold', { mine, need })` |
| | advisory `` `Твой балл — ${mine}%… не отказ` `` | `r('unknown', 'gpa.below-advisory', { mine, need })` |
| | `` `Твой балл — ${mine}%, программе нужно…` `` | `r('fail', 'gpa.below', { mine, need })` |
| checkLanguage | `'Программа не указывает требование к языку'` | `r('unknown', 'language.missing-rule')` |
| | `'Язык знать нужно, но уровень…'` | `r('unknown', 'language.by-institution')` |
| | `'Требование к языку есть…'` | `r('unknown', 'language.not-measured')` |
| | `` `Ты отметил экзамен без результата…` `` | `r('unknown', 'language.score-missing', { options, advisory })` |
| | advisory `` `Рекомендовано ${list}, у тебя ниже…` `` | `r('unknown', 'language.below-advisory', { options })` |
| | `` `Нужен ${list}, твой результат ниже` `` | `r('fail', 'language.below', { options })` |
| | `` `Твой ${names} программа не называет…` `` | `r('unknown', 'language.other-test', { tests: other.map((x) => x.test), options, advisory })` |
| | advisory `` `Сертификат нужен, рекомендовано…` `` и `` `Нужен ${list}. Сертификата…` `` | одна строка `r('unknown', 'language.no-certificate', { options, advisory })` |

5. В `checkAge` замени вычисление `why` (строки 210–216):

```js
  const why = usingToday
    ? 'no-dates'
    : !ctx?.deadline?.closes
      ? 'cycle-guessed'
      : rule.asOf == null
        ? 'asof-unknown'
        : 'unconfirmed';
```

6. В `checkLanguage` вместо `const list = …` (строка 316):

```js
  const options = need.map(({ test, min }) => ({ test, min }));
  const advisory = rule.advisory === true;
```

и удали переменные `what`, `names`, `list`, ставшие ненужными.

7. В `js/render.js`, внутри `card()`, строку `li.textContent = reason.message;` замени на:

```js
      li.textContent = reasonText(reason).detail;
```

и добавь импорт `import { reasonText } from './wording.js';`.

- [ ] **Step 4: Перевести старые тесты правил на коды**

Run: `grep -rn "message" tests/`

Правило перевода для каждой найденной строки:
- `assert.match(got.message, /…/)` — найди в таблице шага 3 сообщение, которое совпадало с этим выражением, и замени на `assert.equal(got.code, '<код>')`. Если выражение проверяло число (например `/70%/`, `/12 лет/`), добавь проверку `got.params` с этим числом.
- `assert.doesNotMatch(got.message, /…/)` о коде — замени на `assert.notEqual(got.code, '<код, который выражение исключало>')`; например в `rules-delegated.test.js` `doesNotMatch /не указыва/` → `assert.notEqual(got.code?.split('.')[1], 'missing-rule')`, а `match /вуз/` → `assert.equal(got.code?.split('.')[1], 'by-institution')`.
- Проверка тона и слов (например `/не отказ/`, `/условия ниже/`, `/описывает своих поступивших/` в `rules-gpa.test.js`, «экзамены названы по-человечески» и «Duolingo назван по-человечески» в `rules-language.test.js`) переносится в `tests/wording.test.js` как проверка `reasonText({...}).detail` для соответствующего кода. `/условия ниже/` не переносится: этой фразы больше нет по спецификации.
- `assert.equal(….message, '')` → `assert.equal(….code, null)`.
- Проверки `status` не трогать.

Пример для `tests/rules-language.test.js`:

```js
test('сертификата нет вовсе — надо проверить, а не отказ', () => {
  const me = { languageTests: [] };
  const got = checkLanguage(me, need);
  assert.equal(got.status, 'unknown');
  assert.equal(got.code, 'language.no-certificate');
});

test('старая шкала не сравнивается с порогом новой', () => {
  const onlyNew = { anyOf: [{ test: 'IELTS', min: 6.5 }, { test: 'TOEFL_IBT_2026', min: 4.5 }], evidence: 'x' };
  const me = { languageTests: [{ test: 'TOEFL_IBT', score: 110 }] };
  const got = checkLanguage(me, onlyNew);
  assert.equal(got.status, 'unknown');
  assert.equal(got.code, 'language.other-test');
  assert.deepEqual(got.params.tests, ['TOEFL_IBT']);
});

test('рекомендованный балл: без сертификата это проверка', () => {
  const got = checkLanguage({ languageTests: [] }, advisory);
  assert.equal(got.status, 'unknown');
  assert.equal(got.code, 'language.no-certificate');
  assert.equal(got.params.advisory, true);
});
```

- [ ] **Step 5: Run all JS tests**

Run: `node --test`
Expected: все зелёные; `grep -rn "\.message" tests/ js/` находит только `err.message` в `js/main.js`.

- [ ] **Step 6: Commit**

```bash
git add js/rules.js js/render.js tests/
git commit -m "Правила возвращают код причины с числами, тексты — в wording.js"
```

---

### Task 6: Сводка и лестница экзамена

**Files:**
- Create: `js/summary.js`
- Test: `tests/summary.test.js`

**Interfaces:**
- Consumes: `evaluate` (`js/verdict.js`), `deadlineState` (`js/lib/deadline.js`), `formatDate`, `plural` (задача 3), `testName` (задача 4); у программ `workaroundFields: string[]` (задача 8 кладёт его в индекс; до неё поле отсутствует и считается `[]`).
- Produces: `examLadder(profile, programs, today) -> { test, steps: [{ score, gained }] }`, `summaryLines(profile, programs, today) -> string[]`.

- [ ] **Step 1: Write the failing tests**

`tests/summary.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { examLadder, summaryLines } from '../js/summary.js';

const today = '2026-09-14';
const me = {
  citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11, graduationYear: 2027,
  birthDate: '2009-03-01', gpa: { value: 4.8, scale: 'TJ_5' }, languageTests: [],
};
const open = (closes) => ({ closes, confidence: 'confirmed' });
const ok = { allow: '*', deny: [], evidence: 'x' };
const free = { noLimit: true, evidence: null, checkedBy: 'assistant', checkedAt: '2026-09-13', note: 'нет' };
const program = (id, over = {}) => ({
  id,
  name: { ru: `Программа ${id}` },
  deadline: open('2027-01-01'),
  eligibility: {
    citizenship: ok, schoolCountry: ok, schoolYears: free, graduationYear: free,
    age: free, gpa: free, language: free, ...over,
  },
});
const ielts = (min) => ({ anyOf: [{ test: 'IELTS', min }], evidence: 'x' });

test('лестница: сколько программ откроет каждый балл', () => {
  const programs = [
    program('a'),
    program('b', { language: ielts(6) }),
    program('c', { language: ielts(6.5) }),
    program('d', { language: ielts(6.5) }),
    program('e', { language: ielts(7) }),
  ];
  assert.deepEqual(examLadder(me, programs, today), {
    test: 'IELTS',
    steps: [{ score: 6, gained: 1 }, { score: 6.5, gained: 2 }, { score: 7, gained: 1 }],
  });
});

test('лестница берёт отмеченный экзамен и пропускает баллы не выше текущего', () => {
  const mine = { ...me, languageTests: [{ test: 'DUOLINGO', score: 115 }] };
  const programs = [
    program('a', { language: { anyOf: [{ test: 'DUOLINGO', min: 110 }], evidence: 'x' } }),
    program('b', { language: { anyOf: [{ test: 'DUOLINGO', min: 120 }], evidence: 'x' } }),
  ];
  assert.deepEqual(examLadder(mine, programs, today), { test: 'DUOLINGO', steps: [{ score: 120, gained: 1 }] });
});

test('лестница не обещает программу, которую держит другое требование', () => {
  const programs = [program('a', { language: ielts(6), schoolYears: { min: 12, evidence: 'x' } })];
  assert.deepEqual(examLadder(me, programs, today).steps, []);
});

test('сводка: сколько можно, ближайший срок, лестница', () => {
  const programs = [
    { ...program('a'), deadline: open('2027-01-01') },
    { ...program('b'), deadline: open('2026-10-09') },
    program('c', { language: ielts(6.5) }),
  ];
  assert.deepEqual(summaryLines(me, programs, today), [
    'Можешь подать в 2 программы. Ближайший срок — 9 октября 2026, Программа b.',
    'Наберёшь IELTS 6.5 — можно будет подавать ещё в 1 программу.',
  ]);
});

test('сводка без открытых программ говорит, что делать', () => {
  const programs = [program('a', { language: ielts(6.5) })];
  assert.equal(summaryLines(me, programs, today)[0], 'Прямо сейчас подать некуда — ниже видно, что поменять.');
});

test('сводка просит заполнить поле, которого не хватает чаще всего', () => {
  const noBirth = { ...me, birthDate: null };
  const programs = [program('a', { age: { max: 25, evidence: 'x' } }), program('b', { age: { max: 21, evidence: 'x' } })];
  assert.ok(summaryLines(noBirth, programs, today).includes('Укажи дату рождения — без этого не проверить 2 программы.'));
});

test('сводка называет главную преграду и обходные пути', () => {
  const years = { schoolYears: { min: 12, evidence: 'x' } };
  const programs = [
    { ...program('a', years), workaroundFields: ['schoolYears'] },
    program('b', years),
  ];
  assert.ok(summaryLines(me, programs, today).includes('Число лет школы закрывает 2 программы, у 1 из них есть обходной путь.'));
});

test('программы с закрытым приёмом в сводке не считаются', () => {
  const programs = [{ ...program('a'), deadline: open('2026-09-01') }];
  assert.equal(summaryLines(me, programs, today)[0], 'Прямо сейчас подать некуда — ниже видно, что поменять.');
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/summary.test.js`
Expected: FAIL — `Cannot find module '../js/summary.js'`.

- [ ] **Step 3: Implement `js/summary.js`**

```js
// Сводка над карточками: сколько можно прямо сейчас и что поменять, чтобы
// стало больше. Считает только программы с незакрытым приёмом.
import { evaluate } from './verdict.js';
import { deadlineState } from './lib/deadline.js';
import { formatDate, plural } from './lib/format.js';
import { testName } from './wording.js';

const programsWord = (n) => plural(n, 'программу', 'программы', 'программ');

const FILL = {
  citizenship: 'гражданство', schoolCountry: 'страну школы', schoolYears: 'число лет школы',
  graduationYear: 'год выпуска', age: 'дату рождения', gpa: 'средний балл',
};
const BLOCKER = {
  citizenship: 'Гражданство', schoolCountry: 'Страна школы', schoolYears: 'Число лет школы',
  graduationYear: 'Год выпуска', age: 'Возраст', gpa: 'Средний балл', language: 'Результат экзамена',
};

function withScore(profile, test, score) {
  const others = (profile.languageTests ?? []).filter((t) => t.test !== test);
  return { ...profile, languageTests: [...others, { test, score }] };
}

const readyIds = (profile, programs, today) =>
  new Set(programs.filter((p) => evaluate(profile, p, today).status === 'yes').map((p) => p.id));

// Баллы подставляются по возрастанию. Программа засчитывается шагу, на
// котором впервые стала зелёной: иначе 7.0 приписал бы себе всё, что уже
// открыл 6.5.
export function examLadder(profile, programs, today) {
  const mine = profile.languageTests ?? [];
  const test = mine[0]?.test ?? 'IELTS';
  const current = mine.find((t) => t.test === test)?.score ?? -Infinity;

  let seen = readyIds(profile, programs, today);
  const candidates = [
    ...new Set(
      programs
        .filter((p) => !seen.has(p.id))
        .flatMap((p) => (p.eligibility?.language?.anyOf ?? []).filter((o) => o.test === test).map((o) => o.min)),
    ),
  ]
    .filter((min) => min > current)
    .sort((a, b) => a - b);

  const steps = [];
  for (const score of candidates) {
    const now = readyIds(withScore(profile, test, score), programs, today);
    const gained = [...now].filter((id) => !seen.has(id)).length;
    if (gained > 0) steps.push({ score, gained });
    seen = new Set([...seen, ...now]);
  }
  return { test, steps: steps.slice(0, 3) };
}

function topField(rows, match) {
  const counts = new Map();
  for (const { verdict } of rows) {
    for (const reason of verdict.reasons) {
      if (match(reason)) counts.set(reason.field, (counts.get(reason.field) ?? 0) + 1);
    }
  }
  let best = null;
  for (const [field, count] of counts) if (!best || count > best.count) best = { field, count };
  return best;
}

export function summaryLines(profile, programs, today) {
  const open = programs.filter((p) => deadlineState(p.deadline, today) !== 'closed');
  const rows = open.map((program) => ({ program, verdict: evaluate(profile, program, today) }));
  const lines = [];

  const ready = rows.filter((row) => row.verdict.status === 'yes');
  if (ready.length) {
    let line = `Можешь подать в ${ready.length} ${programsWord(ready.length)}.`;
    const next = ready
      .filter((row) => row.program.deadline?.closes)
      .sort((a, b) => (a.program.deadline.closes < b.program.deadline.closes ? -1 : 1))[0];
    if (next) {
      line += ` Ближайший срок — ${formatDate(next.program.deadline.closes)}, ${next.program.name?.ru ?? next.program.id}.`;
    }
    lines.push(line);
  } else {
    lines.push('Прямо сейчас подать некуда — ниже видно, что поменять.');
  }

  const ladder = examLadder(profile, open, today);
  if (ladder.steps.length) {
    const [first, ...rest] = ladder.steps;
    let line = `Наберёшь ${testName(ladder.test)} ${first.score} — можно будет подавать ещё в ${first.gained} ${programsWord(first.gained)}`;
    for (const step of rest) line += `, ${step.score} — ещё в ${step.gained}`;
    lines.push(`${line}.`);
  }

  const missing = topField(rows, (r) => r.status === 'unknown' && r.code?.endsWith('.no-value') && FILL[r.field]);
  if (missing) {
    lines.push(`Укажи ${FILL[missing.field]} — без этого не проверить ${missing.count} ${programsWord(missing.count)}.`);
  }

  const blocker = topField(rows, (r) => r.status === 'fail');
  if (blocker) {
    const ways = rows.filter(
      (row) =>
        row.verdict.reasons.some((r) => r.status === 'fail' && r.field === blocker.field) &&
        (row.program.workaroundFields ?? []).includes(blocker.field),
    ).length;
    const tail = ways ? `, у ${ways} из них есть обходной путь` : '';
    lines.push(`${BLOCKER[blocker.field]} закрывает ${blocker.count} ${programsWord(blocker.count)}${tail}.`);
  }

  return lines;
}
```

- [ ] **Step 4: Run tests**

Run: `node --test`
Expected: все зелёные.

- [ ] **Step 5: Commit**

```bash
git add js/summary.js tests/summary.test.js
git commit -m "Сводка: сколько можно сейчас, что откроет экзамен, что заполнить"
```

---

### Task 7: Модель раскрытой карточки

**Files:**
- Create: `js/card-model.js`
- Modify: `js/render.js` — удалить `FIELD_TITLES` и `notLimitedItems` (перенос), импортировать из `card-model.js`
- Modify: `tests/render-wording.test.js` — импорт `notLimitedItems` из `../js/card-model.js`
- Test: `tests/card-model.test.js`

**Interfaces:**
- Consumes: `reasonText`, `orderReasons`, `headline` (задача 4); `deadlineLine`, `coverageLine`, `formatDate` (задача 3).
- Produces: `notLimitedItems(program, fields) -> string[]`; `cardModel(row, extra, today) -> CardModel`, где `row = { program, verdict, deadline }`, `extra` — запись программы из `details.json` или `null`:

```js
{
  id, status, closed, title, headline, deadlineLine, coverageLine, hasDetails,
  reasons: [{ field, status, title, detail, workarounds: string[], says: string[], noWorkaround: boolean, seeBelow: boolean }],
  sections: [{ key: 'must'|'money'|'steps'|'untagged', title, items: string[] }],
  more: { notes: string[], attested: string[] },
  applyUrl: string|null, sourceUrl: string|null, source: string|null,
}
```

- [ ] **Step 1: Write the failing tests**

`tests/card-model.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardModel } from '../js/card-model.js';

const today = '2026-09-14';
const fail = { field: 'schoolYears', status: 'fail', code: 'schoolYears.below-min', params: { min: 12, mine: 11 } };
const vague = { field: 'gpa', status: 'unknown', code: 'gpa.not-measured', params: {} };
const program = {
  id: 'apu',
  name: { ru: 'APU' },
  deadline: null,
  coverage: { tuition: null, living: false, travel: null },
  workaroundFields: ['schoolYears'],
  eligibility: { age: { noLimit: true, note: 'возраст не ограничен', checkedBy: 'assistant' } },
};
const extra = {
  coverageNote: 'Скидка 30–100%',
  applyUrl: 'https://apu.example/apply',
  source: { url: 'https://apu.example', lastVerified: '2026-09-13', approvedBy: 'assistant' },
  textConditions: [
    { ru: 'Главное: 12 лет школы', field: 'schoolYears', kind: 'note' },
    { ru: 'Другие пути: IB или проверка вуза', field: 'schoolYears', kind: 'workaround' },
    { ru: 'Балл смотрят целиком', field: 'gpa', kind: 'note' },
    { ru: 'Нужно записанное интервью', field: null, kind: 'must' },
    { ru: 'Взнос за общежитие 243 600 иен', field: null, kind: 'money' },
    { ru: 'Подача онлайн', field: null, kind: 'steps' },
    { ru: 'Кредитов нет', field: null, kind: 'note' },
  ],
};
const row = (reasons, status) => ({ program, verdict: { status, reasons, attested: ['age'] }, deadline: 'unknown' });

test('обходной путь стоит под отказом, а не в общем списке', () => {
  const model = cardModel(row([fail], 'no'), extra, today);
  assert.deepEqual(model.reasons[0].workarounds, ['Другие пути: IB или проверка вуза']);
  assert.equal(model.reasons[0].noWorkaround, false);
  assert.ok(!model.more.notes.includes('Другие пути: IB или проверка вуза'));
});

test('у размытого требования — слова программы про это поле', () => {
  const model = cardModel(row([vague], 'check'), extra, today);
  assert.deepEqual(model.reasons[0].says, ['Балл смотрят целиком']);
});

test('отказ без обходного пути говорит об этом честно', () => {
  const noWay = { ...extra, textConditions: extra.textConditions.filter((c) => c.kind !== 'workaround') };
  assert.equal(cardModel(row([fail], 'no'), noWay, today).reasons[0].noWorkaround, true);
});

test('без деталей не утверждает, что обходного пути нет', () => {
  const model = cardModel(row([fail], 'no'), null, today);
  assert.equal(model.hasDetails, false);
  assert.equal(model.reasons[0].noWorkaround, false);
  assert.deepEqual(model.sections, []);
});

test('разделы по kind, каждое условие один раз', () => {
  const model = cardModel(row([fail], 'no'), extra, today);
  const byKey = Object.fromEntries(model.sections.map((s) => [s.key, s.items]));
  assert.deepEqual(byKey.must, ['Нужно записанное интервью']);
  assert.deepEqual(byKey.money, ['Скидка 30–100%', 'Взнос за общежитие 243 600 иен']);
  assert.deepEqual(byKey.steps, ['Подача онлайн']);
  const all = [
    ...model.reasons.flatMap((r) => [...r.workarounds, ...r.says]),
    ...model.sections.flatMap((s) => s.items),
    ...model.more.notes,
  ];
  assert.equal(new Set(all).size, all.length);
});

test('неразмеченные условия идут одним списком', () => {
  const raw = { ...extra, textConditions: [{ ru: 'Старое условие без тегов' }] };
  const model = cardModel(row([], 'yes'), raw, today);
  assert.deepEqual(model.sections.find((s) => s.key === 'untagged').items, ['Старое условие без тегов']);
});

test('шапка карточки и подвал', () => {
  const model = cardModel(row([fail], 'no'), extra, today);
  assert.equal(model.headline, 'Нельзя: нужно 12 лет школы, у тебя 11 · есть обходной путь');
  assert.equal(model.deadlineLine, 'Сроки программа не объявила');
  assert.equal(model.coverageLine, 'Жильё — за свой счёт');
  assert.equal(model.source, 'Проверено по сайту программы 13 сентября 2026, проверял ассистент');
  assert.equal(model.applyUrl, 'https://apu.example/apply');
});

test('«не ограничивает» только на незакрытых карточках', () => {
  assert.deepEqual(cardModel(row([], 'yes'), extra, today).more.attested, ['Возраст: возраст не ограничен (проверил ассистент)']);
  assert.deepEqual(cardModel(row([fail], 'no'), extra, today).more.attested, []);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/card-model.test.js`
Expected: FAIL — `Cannot find module '../js/card-model.js'`.

- [ ] **Step 3: Implement**

`js/card-model.js` — перенеси в него из `js/render.js` константу `FIELD_TITLES` и функцию `notLimitedItems` **вместе с их комментариями без изменений**, затем добавь:

```js
import { reasonText, orderReasons, headline } from './wording.js';
import { deadlineLine, coverageLine, formatDate } from './lib/format.js';

// Состояния, при которых программа описала требование словами: под
// причиной показываем, что именно она пишет.
const PROGRAM_SIDE = new Set(['not-measured', 'by-institution', 'missing-rule']);

export function cardModel({ program, verdict, deadline }, extra, today) {
  const hasDetails = extra != null;
  const conditions = (extra?.textConditions ?? []).filter((c) => c.ru);
  const used = new Set();

  // Забирает подходящие условия, которые ещё нигде не показаны. Порядок
  // вызовов задаёт приоритет: сначала причины, потом разделы.
  const take = (match) => {
    const out = [];
    conditions.forEach((c, i) => {
      if (!used.has(i) && c.kind && match(c)) {
        used.add(i);
        out.push(c.ru);
      }
    });
    return out;
  };

  const reasons = orderReasons(verdict.reasons).map((reason) => {
    const text = reasonText(reason);
    const state = reason.code.split('.')[1];
    const workarounds = take((c) => c.kind === 'workaround' && c.field === reason.field);
    const says = PROGRAM_SIDE.has(state)
      ? take((c) => (c.kind === 'must' || c.kind === 'note') && c.field === reason.field)
      : [];
    return {
      field: reason.field,
      status: reason.status,
      title: text.title,
      detail: text.detail,
      workarounds,
      says,
      noWorkaround: hasDetails && reason.status === 'fail' && workarounds.length === 0,
      seeBelow: hasDetails && PROGRAM_SIDE.has(state) && says.length === 0 && workarounds.length === 0,
    };
  });

  const must = take((c) => c.kind === 'must');
  const money = take((c) => c.kind === 'money');
  const steps = take((c) => c.kind === 'steps');
  const notes = take((c) => c.kind === 'note' || c.kind === 'workaround');
  const untagged = conditions.filter((c) => !c.kind).map((c) => c.ru);

  const sections = [
    { key: 'must', title: 'Что ещё потребуется', items: must },
    { key: 'money', title: 'Деньги', items: [extra?.coverageNote, ...money].filter(Boolean) },
    { key: 'steps', title: 'Как подавать', items: steps },
    { key: 'untagged', title: 'Условия программы', items: untagged },
  ].filter((s) => hasDetails && s.items.length);

  const attested = verdict.status !== 'no' && verdict.attested?.length
    ? notLimitedItems(program, verdict.attested)
    : [];

  const checked = extra?.source?.lastVerified;
  const source = checked
    ? `Проверено по сайту программы ${formatDate(checked)}${extra.source.approvedBy === 'assistant' ? ', проверял ассистент' : ''}`
    : null;

  return {
    id: program.id,
    status: verdict.status,
    closed: deadline === 'closed',
    title: program.name?.ru ?? program.id,
    headline: headline(verdict, program),
    deadlineLine: deadlineLine(program.deadline, today),
    coverageLine: coverageLine(program.coverage),
    hasDetails,
    reasons,
    sections,
    more: { notes, attested },
    applyUrl: extra?.applyUrl ?? null,
    sourceUrl: extra?.source?.url ?? null,
    source,
  };
}
```

В `js/render.js`: удали `FIELD_TITLES` и `notLimitedItems`, добавь `import { notLimitedItems } from './card-model.js';` (старый `card()` ещё пользуется ею до задачи 9). В `tests/render-wording.test.js` поменяй импорт на `import { notLimitedItems } from '../js/card-model.js';`.

- [ ] **Step 4: Run tests**

Run: `node --test`
Expected: все зелёные.

- [ ] **Step 5: Commit**

```bash
git add js/card-model.js js/render.js tests/card-model.test.js tests/render-wording.test.js
git commit -m "Модель раскрытой карточки: обходной путь под причиной, условия по разделам"
```

---

### Task 8: Два файла данных — index.json и details.json

**Files:**
- Modify: `tools/build.py`
- Modify: `js/data.js`
- Test: `tools/tests/test_build.py`

**Interfaces:**
- Produces (Python): `MAX_DETAILS_WIRE_BYTES = 128 * 1024`; `publishable(programs) -> list[dict]`; `workaround_fields(program) -> list[str]`; `index_entry(program)` без `textConditions`, с `workaroundFields`; `details_entry(program) -> dict`; `build_details(programs, generated_at) -> dict`; `details_text(details) -> str`.
- Produces (JS): `loadDetails() -> Promise<{ generatedAt, programs: { [id]: Extra } }>`.
- Формат `Extra`: `{ coverageNote: string|null, applyUrl: string|null, source: { url, lastVerified, approvedBy }, textConditions: [{ ru, field?, kind? }] }`.

- [ ] **Step 1: Write the failing tests**

В `tools/tests/test_build.py`:
1. Импорт расширь: `MAX_DETAILS_WIRE_BYTES, build_details, details_entry, details_text, workaround_fields`.
2. В классе `TestIndexEntry` замени три теста про условия (`test_text_conditions_reach_the_site`, `test_text_condition_quotes_stay_behind`, `test_program_without_conditions_gets_an_empty_list`) на:

```python
    def test_condition_texts_are_not_in_index(self):
        # Тексты условий едут отдельным файлом: в индексе они не нужны для
        # ответа, а весят больше всего остального.
        self.assertNotIn("textConditions", index_entry(PROGRAM))

    def test_workaround_fields_reach_the_index(self):
        program = json.loads(json.dumps(PROGRAM))
        program["textConditions"] = [
            {"ru": "a", "evidence": "x", "field": "schoolYears", "kind": "workaround"},
            {"ru": "b", "evidence": "x", "field": "language", "kind": "note"},
            {"ru": "c", "evidence": "x", "field": "citizenship", "kind": "workaround"},
        ]
        self.assertEqual(index_entry(program)["workaroundFields"], ["citizenship", "schoolYears"])

    def test_program_without_conditions_has_no_workarounds(self):
        program = json.loads(json.dumps(PROGRAM))
        del program["textConditions"]
        self.assertEqual(index_entry(program)["workaroundFields"], [])
```

3. Новые классы в конце файла:

```python
class TestDetails(unittest.TestCase):
    def tagged(self):
        program = json.loads(json.dumps(PROGRAM))
        program["applyUrl"] = "https://example.gov/apply"
        program["source"] = {
            "url": "https://example.gov",
            "lastVerified": "2026-09-13",
            "approvedBy": "assistant",
            "humanChecked": False,
            "pages": [{"url": "https://example.gov", "contentHash": "sha256:x"}],
        }
        program["textConditions"] = [
            {"ru": "условие", "evidence": "цитата", "field": "age", "kind": "must"},
            {"ru": "без тегов", "evidence": "цитата"},
        ]
        return program

    def test_conditions_keep_text_and_tags_but_not_quotes(self):
        entry = details_entry(self.tagged())
        self.assertEqual(
            entry["textConditions"],
            [{"ru": "условие", "field": "age", "kind": "must"}, {"ru": "без тегов"}],
        )
        self.assertNotIn("цитата", json.dumps(entry, ensure_ascii=False))

    def test_coverage_note_apply_url_and_source(self):
        entry = details_entry(self.tagged())
        self.assertEqual(entry["coverageNote"], "нечто")
        self.assertEqual(entry["applyUrl"], "https://example.gov/apply")
        self.assertEqual(
            entry["source"],
            {"url": "https://example.gov", "lastVerified": "2026-09-13", "approvedBy": "assistant"},
        )

    def test_details_cover_the_same_programs_as_index(self):
        program = self.tagged()
        draft = dict(self.tagged(), id="draft", status="draft")
        details = build_details([program, draft], "2026-09-14")
        index = build_index([program, draft], "2026-09-14")
        self.assertEqual(list(details["programs"]), [p["id"] for p in index["programs"]])

    def test_details_text_reads_back_and_is_one_program_per_line(self):
        details = build_details([self.tagged()], "2026-09-14")
        text = details_text(details)
        self.assertEqual(json.loads(text), details)
        self.assertEqual(len(text.strip().splitlines()), 3)

    def test_details_limit_is_larger_than_index_limit(self):
        self.assertGreater(MAX_DETAILS_WIRE_BYTES, MAX_INDEX_WIRE_BYTES)


class TestWorkaroundFields(unittest.TestCase):
    def test_order_follows_the_form(self):
        program = {"textConditions": [
            {"field": "language", "kind": "workaround"},
            {"field": "age", "kind": "workaround"},
            {"field": "age", "kind": "workaround"},
        ]}
        self.assertEqual(workaround_fields(program), ["age", "language"])
```

Если `PROGRAM` в файле не проходит `build_index` (нет `source.pages` или `approvedBy`) — посмотри, как устроен `test_assistant_approved_programs_are_published`, и собери `tagged()` так же.

- [ ] **Step 2: Run to verify fail**

Run: `PYTHONUTF8=1 python -m unittest tools.tests.test_build -v`
Expected: FAIL — `ImportError: cannot import name 'MAX_DETAILS_WIRE_BYTES'`.

- [ ] **Step 3: Implement in `tools/build.py`**

1. После `MAX_INDEX_WIRE_BYTES`:

```python
# Детали — тексты раскрытой карточки. Грузятся в фоне после индекса и
# ответ не задерживают, поэтому предел больше. 14 сентября 2026 всё в одном
# файле весило бы 66,6 КБ при пределе индекса 64.
MAX_DETAILS_WIRE_BYTES = 128 * 1024
```

2. Импорт: `from tools.schema import FIELDS, SIGNERS, approved_by` уже есть — оставить.

3. Новые функции перед `index_entry`:

```python
def workaround_fields(program: dict) -> list[str]:
    """Поля, у которых есть обходной путь. По ним свёрнутая карточка
    пишет «есть обходной путь», не загружая тексты условий."""
    found = {
        condition.get("field")
        for condition in program.get("textConditions") or []
        if condition.get("kind") == "workaround"
    }
    return [field for field in FIELDS if field in found]


def _condition_for_site(condition: dict) -> dict:
    entry = {"ru": condition.get("ru") or ""}
    for key in ("field", "kind"):
        if key in condition:
            entry[key] = condition[key]
    return entry
```

4. В `index_entry` замени блок `"textConditions": [...]` (с комментарием над ним) на:

```python
        # Тексты условий уехали в details.json. Здесь остаётся только то,
        # что нужно свёрнутой карточке и сводке.
        "workaroundFields": workaround_fields(program),
```

5. После `index_entry`:

```python
def details_entry(program: dict) -> dict:
    coverage = program.get("coverage") or {}
    source = program.get("source") or {}
    return {
        "coverageNote": (coverage.get("note") or {}).get("ru") or None,
        "applyUrl": program.get("applyUrl"),
        "source": {
            "url": source.get("url"),
            "lastVerified": source.get("lastVerified"),
            "approvedBy": approved_by(program),
        },
        "textConditions": [
            _condition_for_site(condition)
            for condition in program.get("textConditions") or []
        ],
    }
```

6. Вынеси фильтр из `build_index` в функцию и используй в обеих сборках:

```python
def publishable(programs: list[dict]) -> list[dict]:
    # Запись без списка страниц публиковать нельзя: за таким источником
    # слежение не работает, и устаревшие требования выдавались бы
    # уверенно и бессрочно.
    chosen = [
        program
        for program in programs
        if program.get("status") == "published"
        and approved_by(program) in SIGNERS
        and (program.get("source") or {}).get("pages")
    ]
    return sorted(chosen, key=lambda program: program["id"])


def build_index(programs: list[dict], generated_at: str) -> dict:
    return {
        "generatedAt": generated_at,
        "programs": [index_entry(program) for program in publishable(programs)],
    }


def build_details(programs: list[dict], generated_at: str) -> dict:
    return {
        "generatedAt": generated_at,
        "programs": {program["id"]: details_entry(program) for program in publishable(programs)},
    }


def details_text(details: dict) -> str:
    """Как index_text: без отступов, по программе на строку."""
    compact = {"separators": (",", ":"), "ensure_ascii": False}
    programs = ",\n".join(
        f"{json.dumps(program_id, **compact)}:{json.dumps(entry, **compact)}"
        for program_id, entry in details["programs"].items()
    )
    head = json.dumps(details["generatedAt"], **compact)
    return f'{{"generatedAt":{head},"programs":{{\n{programs}\n}}}}\n'
```

Для пустого списка программ `details_text` даст `{"generatedAt":"…","programs":{\n\n}}` — это валидный JSON; тест `test_details_text_reads_back…` проверяет случай с программой.

7. В `main()` после `index = build_index(...)` добавь `details = build_details(programs, date.today().isoformat())`, а блок проверки размера и записи замени на:

```python
    text = index_text(index)
    extra = details_text(details)

    wire = wire_size(text)
    extra_wire = wire_size(extra)
    if wire > MAX_INDEX_WIRE_BYTES:
        print(f"Индекс вырос до {wire} байт по проводу при пределе {MAX_INDEX_WIRE_BYTES}.")
        print("Это не мелочь: аудитория сидит на дорогом мобильном интернете.")
        return 1
    if extra_wire > MAX_DETAILS_WIRE_BYTES:
        print(f"Детали выросли до {extra_wire} байт по проводу при пределе {MAX_DETAILS_WIRE_BYTES}.")
        return 1

    (root / "data" / "index.json").write_text(text, encoding="utf-8")
    (root / "data" / "details.json").write_text(extra, encoding="utf-8")
    print(
        f"Записано программ: {len(index['programs'])}; "
        f"индекс {wire} байт по проводу, детали {extra_wire}"
    )
    return 0
```

(переменная `size` больше не нужна — удали.)

8. `js/data.js` целиком:

```js
// Индекс — всё для ответа, сводки и свёрнутых карточек. Детали — тексты
// раскрытой карточки; грузятся следом и ответ не задерживают.
async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Не удалось загрузить данные: ${res.status}`);
  return res.json();
}

export const loadIndex = () => loadJson('data/index.json');
export const loadDetails = () => loadJson('data/details.json');
```

- [ ] **Step 4: Run tests and build**

```bash
PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .
PYTHONUTF8=1 python -m tools.build
node --test
```

Expected: тесты зелёные; сборка печатает индекс заметно меньше 55 867 байт и детали в пределах 128 КБ; появился `data/details.json`. Если в README упоминается только `index.json` как файл сайта — допиши рядом `details.json` одной строкой.

- [ ] **Step 5: Commit (сразу за ним — задача 9)**

```bash
git add tools/build.py tools/tests/test_build.py js/data.js data/index.json data/details.json README.md
git commit -m "Данные сайта в двух файлах: индекс для ответа и детали для карточки"
```

---

### Task 9: Новый экран — анкета, сводка, группы, карточки

**Files:**
- Modify: `index.html`, `js/render.js`, `js/form.js`, `js/main.js`, `css/style.css`
- Test: `tests/render-order.test.js` (дописать `groupRows`)

**Interfaces:**
- Consumes: `summaryLines` (6), `cardModel` (7), `loadIndex`/`loadDetails` (8), `profileSummary`/`profileReady` (3), `sortRows` (существующая).
- Produces: `groupRows(rows) -> [{ status, title, rows }]`; `renderResults({ summaryNode, resultsNode }, profile, programs, today, details)`, где `details = { status: 'loading'|'ready'|'failed', programs: object, retry: () => void }`; `setupProfileBox({ box, summary, button, target }, profile) -> { update(profile) }`.

- [ ] **Step 1: Write the failing test**

Допиши в `tests/render-order.test.js` (импорт: `import { sortRows, groupRows } from '../js/render.js';`):

```js
test('группы по ответу, пустые не показываются, порядок внутри сохраняется', () => {
  const rows = [
    row('no1', 'no', '2027-01-01'),
    row('yesLate', 'yes', '2027-07-12'),
    row('yesSoon', 'yes', '2026-10-09'),
    row('yesClosed', 'yes', '2026-05-01', 'closed'),
  ];
  const groups = groupRows(rows);
  assert.deepEqual(groups.map((g) => g.status), ['yes', 'no']);
  assert.deepEqual(groups[0].rows.map((r) => r.program.id), ['yesSoon', 'yesLate', 'yesClosed']);
  assert.equal(groups[0].title, 'Можно подавать');
});
```

`render.js` импортирует браузерные модули только через функции, так что `node --test` его загружает, как и сейчас.

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/render-order.test.js`
Expected: FAIL — `groupRows is not a function`.

- [ ] **Step 3: Replace `index.html` body structure**

Шапку и `<head>` оставить. `<main>` целиком:

```html
<main>
  <details id="profile-box" class="profile-box" open>
    <summary>
      <span class="profile-box-label">Анкета</span>
      <span id="profile-summary-text" class="profile-box-text">Заполни анкету</span>
      <span class="profile-box-edit">изменить</span>
    </summary>
    <form id="profile" autocomplete="off">
      <!-- ОБА существующих <fieldset> «О тебе» и «Языковые экзамены» — без изменений -->
      <button type="button" id="show-results" class="button">Показать, куда можно подать</button>
    </form>
  </details>

  <section id="summary" class="summary" aria-live="polite"></section>
  <div id="results"></div>
</main>
```

Перенеси оба `<fieldset>` из текущего файла внутрь нового `<form>` дословно.

- [ ] **Step 4: Replace `js/render.js`**

```js
// Единственный файл, который трогает DOM результатов (анкета — form.js).
// Решения о словах и разделах принимают wording.js, summary.js и
// card-model.js; здесь их только рисуют.
import { evaluate } from './verdict.js';
import { deadlineState } from './lib/deadline.js';
import { summaryLines } from './summary.js';
import { cardModel } from './card-model.js';

const ORDER = { yes: 0, check: 1, no: 2 };

const GROUPS = [
  ['yes', 'Можно подавать'],
  ['check', 'Можно, если доделаешь или уточнишь'],
  ['no', 'Сейчас нельзя'],
];

// ↓ sortRows перенести сюда без изменений, вместе с комментарием.

export function groupRows(rows) {
  sortRows(rows);
  return GROUPS
    .map(([status, title]) => ({ status, title, rows: rows.filter((row) => row.verdict.status === status) }))
    .filter((group) => group.rows.length);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function list(items, className) {
  const ul = el('ul', className);
  for (const item of items) ul.append(el('li', null, item));
  return ul;
}

// Пересчёт идёт на каждое нажатие в анкете. Без этого все раскрытые
// карточки захлопывались бы, пока человек правит балл.
function rememberOpen(node, selector) {
  return new Set([...node.querySelectorAll(`${selector}[open]`)].map((d) => d.dataset.id));
}

export function renderResults({ summaryNode, resultsNode }, profile, programs, today, details) {
  const openCards = rememberOpen(resultsNode, 'details.card');
  const openMore = rememberOpen(resultsNode, 'details.more');
  summaryNode.textContent = '';
  resultsNode.textContent = '';

  if (!programs.length) {
    resultsNode.append(el('p', 'empty', 'Программ пока нет. Данные собираются.'));
    return;
  }

  for (const line of summaryLines(profile, programs, today)) summaryNode.append(el('p', 'summary-line', line));
  summaryNode.append(el('p', 'summary-note', 'Ответ — только про то, пустят ли подавать. Отбор, эссе и документы решают отдельно.'));

  const rows = programs.map((program) => ({
    program,
    verdict: evaluate(profile, program, today),
    deadline: deadlineState(program.deadline, today),
  }));

  for (const group of groupRows(rows)) {
    const section = el('section', `group ${group.status}`);
    section.append(el('h2', 'group-title', `${group.title} (${group.rows.length})`));
    for (const row of group.rows) {
      const model = cardModel(row, details.programs?.[row.program.id] ?? null, today);
      section.append(card(model, details, openCards, openMore));
    }
    resultsNode.append(section);
  }
}

function card(model, details, openCards, openMore) {
  const box = el('details', `card ${model.status}${model.closed ? ' closed' : ''}`);
  box.dataset.id = model.id;
  box.open = openCards.has(model.id);

  const head = el('summary', 'card-head');
  head.append(
    el('span', 'card-title', model.title),
    el('span', 'card-headline', model.headline),
    el('span', 'card-meta', model.deadlineLine),
    el('span', 'card-meta', model.coverageLine),
  );
  box.append(head);

  const body = el('div', 'card-body');

  if (model.reasons.length) {
    body.append(el('h4', 'card-section-title', 'Почему так'));
    for (const reason of model.reasons) {
      const item = el('div', `reason ${reason.status}`);
      const line = el('p', 'reason-text');
      line.append(el('strong', null, `${reason.title}. `), document.createTextNode(reason.detail));
      item.append(line);
      if (reason.workarounds.length) {
        item.append(el('p', 'reason-label', 'Как обойти:'), list(reason.workarounds, 'reason-list'));
      }
      if (reason.says.length) {
        item.append(el('p', 'reason-label', 'Что пишет программа:'), list(reason.says, 'reason-list'));
      }
      if (reason.noWorkaround) {
        item.append(el('p', 'reason-muted', 'Обходного пути программа не называет. Если сомневаешься — напиши в приёмную комиссию.'));
      }
      if (reason.seeBelow) item.append(el('p', 'reason-muted', 'Подробности — в условиях программы ниже.'));
      body.append(item);
    }
  }

  if (!model.hasDetails) {
    if (details.status === 'failed') {
      const failed = el('p', 'details-state', 'Подробности не загрузились. Проверь интернет. ');
      const retry = el('button', 'button button-small', 'Попробовать ещё раз');
      retry.type = 'button';
      retry.addEventListener('click', () => details.retry());
      failed.append(retry);
      body.append(failed);
    } else {
      body.append(el('p', 'details-state', 'Подробности загружаются…'));
    }
  }

  for (const section of model.sections) {
    body.append(el('h4', 'card-section-title', section.title), list(section.items, 'card-list'));
  }

  if (model.applyUrl) {
    const link = el('a', 'button', 'Открыть сайт программы');
    link.href = model.applyUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    body.append(link);
  }

  if (model.more.notes.length || model.more.attested.length) {
    const more = el('details', 'more');
    more.dataset.id = model.id;
    more.open = openMore.has(model.id);
    more.append(el('summary', 'more-head', 'Ещё'));
    if (model.more.notes.length) more.append(list(model.more.notes, 'card-list'));
    if (model.more.attested.length) {
      more.append(el('p', 'reason-label', 'Не ограничивает — проверено по страницам программы:'), list(model.more.attested, 'card-list muted'));
    }
    body.append(more);
  }

  if (model.source) {
    const foot = el('p', 'card-source', `${model.source}. `);
    if (model.sourceUrl) {
      const a = el('a', null, 'Источник');
      a.href = model.sourceUrl;
      a.target = '_blank';
      a.rel = 'noopener';
      foot.append(a);
    }
    body.append(foot);
  }

  box.append(body);
  return box;
}
```

`notLimitedItems` больше не импортируется в `render.js` — её зовёт `card-model.js`.

- [ ] **Step 5: Add to `js/form.js`**

Импорт вверху: `import { emptyProfile, profileSummary, profileReady } from './profile.js';` (заменяет текущий импорт `emptyProfile`). В конец файла:

```js
// Анкета сворачивается в строку, когда главное уже заполнено, — и не
// сворачивается сама, пока человек печатает.
export function setupProfileBox({ box, summary, button, target }, profile) {
  box.open = !profileReady(profile);
  summary.textContent = profileSummary(profile);
  button.addEventListener('click', () => {
    box.open = false;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  });
  return {
    update(next) {
      summary.textContent = profileSummary(next);
    },
  };
}
```

- [ ] **Step 6: Replace `js/main.js`**

```js
import { loadProfile, saveProfile } from './profile.js';
import { readForm, writeForm, onProfileChange, setupProfileBox } from './form.js';
import { loadIndex, loadDetails } from './data.js';
import { renderResults } from './render.js';

const form = document.getElementById('profile');
const nodes = {
  summaryNode: document.getElementById('summary'),
  resultsNode: document.getElementById('results'),
};
const today = new Date().toISOString().slice(0, 10);

let programs = [];
const details = { status: 'loading', programs: {}, retry: fetchDetails };

const saved = loadProfile(localStorage);
writeForm(form, saved);
const profileBox = setupProfileBox(
  {
    box: document.getElementById('profile-box'),
    summary: document.getElementById('profile-summary-text'),
    button: document.getElementById('show-results'),
    target: nodes.summaryNode,
  },
  saved,
);

function refresh(profile = readForm(form)) {
  saveProfile(profile, localStorage);
  profileBox.update(profile);
  renderResults(nodes, profile, programs, today, details);
}

function fetchDetails() {
  details.status = 'loading';
  refresh();
  loadDetails()
    .then((data) => {
      details.programs = data.programs ?? {};
      details.status = 'ready';
    })
    .catch(() => {
      details.status = 'failed';
    })
    .finally(() => refresh());
}

onProfileChange(form, (profile) => refresh(profile));

loadIndex()
  .then((index) => {
    programs = index.programs ?? [];
    fetchDetails();
  })
  .catch((err) => {
    nodes.resultsNode.textContent = err.message;
  });
```

- [ ] **Step 7: Append to `css/style.css`**

В `:root` добавь `--soft: #f5f7fa;`. Правило `.card { … }` и все старые правила `.reasons`, `.attested*`, `.conditions*` удали; `.card.yes/.no/.check` (цвет левой полосы), `.card.closed`, `.verdict`-правила замени новыми ниже:

```css
.profile-box { border: 1px solid var(--line); border-radius: .5rem; margin: 0 0 1rem; }
.profile-box > summary { list-style: none; cursor: pointer; padding: .75rem; min-height: 44px; display: flex; flex-wrap: wrap; gap: .25rem .5rem; align-items: baseline; }
.profile-box > summary::-webkit-details-marker { display: none; }
.profile-box-label { font-weight: 600; }
.profile-box-text { color: var(--muted); flex: 1 1 12rem; }
.profile-box-edit { color: var(--yes); font-size: .875rem; }
.profile-box[open] .profile-box-edit { display: none; }
.profile-box form { padding: 0 .75rem .75rem; }

.button { display: inline-block; min-height: 44px; padding: .6rem 1rem; font: inherit; font-weight: 600; color: #fff; background: var(--yes); border: 0; border-radius: .375rem; text-decoration: none; cursor: pointer; }
.button-small { min-height: 36px; padding: .35rem .75rem; font-size: .875rem; }
#show-results { width: 100%; }

.summary { margin: 0 0 1rem; padding: .75rem; background: var(--soft); border-radius: .5rem; }
.summary:empty { display: none; }
.summary-line { margin: 0 0 .4rem; font-weight: 500; }
.summary-note { margin: .5rem 0 0; color: var(--muted); font-size: .8125rem; }

.group { margin: 0 0 1.25rem; }
.group-title { font-size: 1.05rem; margin: 0 0 .5rem; }

.card { border: 1px solid var(--line); border-left-width: 4px; border-radius: .5rem; margin: 0 0 .5rem; }
.card.yes { border-left-color: var(--yes); }
.card.no { border-left-color: var(--no); }
.card.check { border-left-color: var(--check); }
.card.closed { opacity: .6; }
.card-head { list-style: none; cursor: pointer; padding: .6rem .75rem; display: flex; flex-direction: column; gap: .15rem; min-height: 44px; position: relative; padding-right: 2rem; }
.card-head::-webkit-details-marker { display: none; }
.card-head::after { content: "▾"; position: absolute; right: .75rem; top: .6rem; color: var(--muted); transition: transform .15s ease; }
.card[open] > .card-head::after { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) { .card-head::after { transition: none; } }
.card-title { font-weight: 600; }
.card-headline { font-weight: 500; }
.card.yes .card-headline { color: var(--yes); }
.card.no .card-headline { color: var(--no); }
.card.check .card-headline { color: var(--check); }
.card-meta { color: var(--muted); font-size: .875rem; }

.card-body { padding: 0 .75rem .75rem; border-top: 1px solid var(--line); }
.card-section-title { margin: .75rem 0 .25rem; font-size: .875rem; }
.card-list { margin: 0; padding-left: 1.1rem; font-size: .9rem; }
.card-list li { margin-bottom: .35rem; }
.card-list.muted { color: var(--muted); }
.reason { margin: 0 0 .6rem; }
.reason-text { margin: 0; }
.reason-label { margin: .35rem 0 .15rem; font-size: .875rem; font-weight: 600; }
.reason-list { margin: 0; padding-left: 1.1rem; font-size: .9rem; }
.reason-muted, .details-state { margin: .35rem 0 0; color: var(--muted); font-size: .875rem; }
.card-body > .button { margin-top: .75rem; }
.more { margin-top: .75rem; }
.more-head { cursor: pointer; font-size: .875rem; font-weight: 600; min-height: 44px; display: flex; align-items: center; }
.card-source { margin: .75rem 0 0; color: var(--muted); font-size: .8125rem; }
```

- [ ] **Step 8: Run tests and build**

```bash
node --test
PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .
PYTHONUTF8=1 python -m tools.build
```

Expected: всё зелёное.

- [ ] **Step 9: Smoke-проверка в браузере**

Запусти сервер из `.claude/launch.json` (`site`, порт 8765) через preview-инструменты. Заполни профиль из спецификации (TJ, TJ, 11, 2027, 2009-03-01, 4.8, IELTS отмечен без балла). Проверь: в консоли нет ошибок; сводка из 2–4 строк; три группы с числами; карточки свёрнуты; раскрытие APU показывает «Почему так» и «Как обойти» (если разметка задачи 2 уже закоммичена). Полная проверка — задача 11.

- [ ] **Step 10: Commit**

```bash
git add index.html js/render.js js/form.js js/main.js css/style.css tests/render-order.test.js
git commit -m "Новый экран: свёрнутая анкета, сводка, группы и раскрывающиеся карточки"
```

---

### Task 10: Теги обязательны, документация

Выполнять только когда задача 2 закоммичена и её проверка «без тегов: нет».

**Files:**
- Modify: `tools/schema.py` (`TAGS_REQUIRED = True`)
- Modify: `docs/superpowers/specs/2026-09-03-eligibility-tool-design.md`

- [ ] **Step 1: Включить обязательность**

В `tools/schema.py`: `TAGS_REQUIRED = True`. Комментарий над константой замени на:

```python
# С 14 сентября 2026 все условия размечены. Новая карточка без field/kind
# не пройдёт review: без тегов интерфейс не знает, куда её условие класть.
```

- [ ] **Step 2: Проверить, что все карточки проходят**

```bash
PYTHONUTF8=1 python - <<'EOF'
import glob, json
from pathlib import Path
from tools.fetch import latest_snapshot
from tools.validate import validate_program
bad = 0
for path in sorted(glob.glob("data/programs/*.json")):
    program = json.load(open(path, encoding="utf-8"))
    snap = latest_snapshot(Path("."), program["id"])
    text = "\n\n".join(p.read_text(encoding="utf-8") for p in sorted(snap.glob("*.txt")))
    problems = validate_program(program, text)
    if problems:
        bad += 1
        print(program["id"], problems)
print("карточек с проблемами:", bad)
EOF
PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .
```

Expected: `карточек с проблемами: 0`; тесты зелёные. Если какой-то старый тест в `test_validate.py` строит программу с условием без тегов и теперь падает — передай ему `require_tags=False` явно.

- [ ] **Step 3: Документация**

В `docs/superpowers/specs/2026-09-03-eligibility-tool-design.md` найди место, где описаны `textConditions` (`grep -n textConditions`), и добавь после него абзац:

```markdown
С 14 сентября 2026 у каждого условия есть `field` (к какому требованию
анкеты относится, или `null`) и `kind` (`workaround`, `must`, `money`,
`steps`, `note`). Без них review не пропустит запись. Смысл и правила —
`docs/superpowers/specs/2026-09-14-helpful-results-design.md`, раздел 1.
Сайт получает данные двумя файлами: `data/index.json` (ответ и свёрнутые
карточки) и `data/details.json` (тексты раскрытой карточки).
```

- [ ] **Step 4: Commit**

```bash
git add tools/schema.py docs/superpowers/specs/2026-09-03-eligibility-tool-design.md tools/tests/test_validate.py
git commit -m "Теги условий обязательны для новых карточек"
```

---

### Task 11: Проверка в браузере, ревью, публикация

**Files:** по результатам ревью.

- [ ] **Step 1: Проверка на ширине телефона**

Сервер `site` через preview-инструменты, `resize_window` preset `mobile`. Профиль: гражданство TJ, страна школы TJ, 11 лет, выпуск 2027, дата рождения 2009-03-01, балл 4.8 по пятибалльной, IELTS отмечен без балла. Проверь и зафиксируй числами:

1. Высота страницы со свёрнутыми карточками (`document.body.scrollHeight`) — для сравнения: до изменений 58 649 px.
2. Сводка: 2–4 строки, есть строка про IELTS с числами.
3. Три группы с числами в заголовках, сумма = числу программ в индексе.
4. Раскрыть карточку APU: «Почему так», «Как обойти» с текстом про IB/проверку вуза, разделы «Деньги» и «Как подавать», кнопка сайта, подвал с датой словами.
5. Не закрывая APU, поменять балл в анкете — APU остаётся раскрытой.
6. Нажать «Показать, куда можно подать» — анкета сворачивается в строку профиля, страница прокручена к сводке. Перезагрузить страницу — анкета свёрнута.
7. Временно переименовать `data/details.json`, перезагрузить, раскрыть карточку — «Подробности не загрузились» с кнопкой; вернуть имя, нажать кнопку — подробности появились.
8. Горизонтальной прокрутки нет (`document.documentElement.scrollWidth <= innerWidth`); в консоли нет ошибок.
9. Пустой профиль (очистить localStorage): анкета открыта, «Заполни анкету», страница не падает.
10. Сброс `resize_window` preset `desktop`. Скриншот раскрытой APU на телефонной ширине сохранить для отчёта.

Найденное — исправить, прогнать тесты, закоммитить, повторить шаги.

- [ ] **Step 2: Круги код-ревью**

Запусти агента Sonnet без контекста. Промпт:

```text
Сделай ревью всех изменений ветки main от коммита 05563ca до HEAD в
C:\Users\ORYX\dev\eligibility-tool (git diff 05563ca..HEAD). Замысел —
docs/superpowers/specs/2026-09-14-helpful-results-design.md, план —
docs/superpowers/plans/2026-09-14-helpful-results.md.

Сайт помогает таджикским выпускникам понять, куда они могут подать
документы. Любая ложь на экране — вред реальному человеку.

Проверь особенно:
1. Ложные обещания: текст говорит «можно»/«есть обходной путь»/«не
   отказ», когда данные этого не подтверждают. «Как обойти» только из
   kind=workaround с тем же field.
2. Логика правил не изменилась: для одинаковых входов status тот же, что
   в 05563ca (сравни ветвления rules.js до и после).
3. Каждый код, который может вернуть rules.js, есть в wording.js; тексты
   без «инструмент», имён полей, ISO-дат, undefined/NaN при пустых params.
4. Сводка: лестница не засчитывает программу дважды и не обещает
   программу, закрытую другим требованием; закрытый приём не считается.
5. Рендер: раскрытые карточки и «Ещё» переживают перерисовку; кнопка
   повтора работает; aria-live только на сводке; нет XSS — все тексты
   через textContent, ссылки только из applyUrl/source.url с
   rel="noopener".
6. Даты: границы timeLeft (0, 13/14, 60/61 день), часовые пояса,
   падежи чисел 11–14 и 21–24.
7. build.py: index и details из одного набора программ, пределы размера,
   цитаты не утекают в details.json.
8. Разметка data/programs: выборочно 10 карточек — workaround реально
   обходит своё field.

Найденные проблемы исправляй сам, с тестом на каждую, и прогоняй
node --test и PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .
Коммить каждое исправление отдельно. Нельзя: push, правка data/programs
руками (только через tools.review --by-assistant).

Отчёт до 400 слов: что нашёл, что исправил, вердикт production_ready.
```

Если ревьюер что-то нашёл и исправил — запусти нового ревьюера без контекста с тем же промптом. Повторять, пока очередной не найдёт ничего и не вернёт `production_ready: true`. Исправляет всегда тот ревьюер, который нашёл, а не автор кода.

- [ ] **Step 3: Финальные проверки**

```bash
node --test
PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .
PYTHONUTF8=1 python -m tools.build
git status --short
```

Expected: всё зелёное; в `git status` только ожидаемые незакоммиченные `tools/sources.toml` и `raw/stanford-university/` из чужой работы.

- [ ] **Step 4: Push**

```powershell
cd C:\Users\ORYX\dev\eligibility-tool
for ($i = 1; $i -le 10; $i++) {
  git fetch -q origin; git rebase -q origin/main; git push -q origin main
  if ($?) { Write-Output "PUSH_OK"; break }
  Start-Sleep -Seconds 45
}
git log --oneline -1; git rev-parse HEAD origin/main
```

Перед `git rebase` незакоммиченные `tools/sources.toml` и `raw/stanford-university/` мешать не должны (rebase с грязным деревом откажет) — если откажет, `git stash push tools/sources.toml` перед циклом и `git stash pop` после; `raw/stanford-university/` неотслеживаемый и rebase не мешает. GitHub часто рвёт соединение — это нормально, цикл повторяет.

- [ ] **Step 5: Отчёт человеку**

По-русски, коротко: высота страницы было/стало, сводка на профиле из спецификации (дословно), что нашли ревью, скриншот раскрытой карточки на телефоне (через SendUserFile), хеш коммита.
