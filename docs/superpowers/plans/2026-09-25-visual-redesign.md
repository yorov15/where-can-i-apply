# Визуальный редизайн: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Новая визуальная система (токены, типографика, кнопки, поля, чипы, карточки, шаги, календарь сроков, состояния) и новая вёрстка всех экранов сайта без изменения логики и текстов.

**Architecture:** Один переписанный `css/style.css` на CSS-переменных, покрывающий все существующие классы, плюс точечные правки разметки (`index.html`, статичные страницы, `render.js`, `steps.js`, `filter.js`, `main.js`). Новые чистые функции покрыты тестами `node --test`; DOM тестами не покрыт, поэтому каждый срез проверяется в браузере. Страховочный тест `tests/css-guard.test.js` ловит рассинхрон «класс в JS или HTML есть, правила в CSS нет».

**Tech Stack:** чистые HTML, CSS, JavaScript (ES-модули), `node --test`. Ни зависимостей, ни сборки.

**Spec:** `docs/superpowers/specs/2026-09-25-visual-redesign-design.md`

## Global Constraints

- Стек без фреймворков, сборщиков и зависимостей. Шрифт системный (`system-ui`), никаких `@font-face` и подключаемых шрифтов.
- CSP не менять: `style-src 'self'`, `script-src 'self'`. Поэтому **никаких атрибутов `style="..."` и `setAttribute('style', ...)`**, только классы.
- Никаких картинок, иконочных библиотек и рукописных SVG-иконок. Значки вердиктов текстовые (✓ ≈ ! ✕).
- Не править `js/wording.js`, `data/`, `js/rules.js`, `js/verdict.js`, `js/summary.js`, `js/card-model.js`, `js/profile.js`. Существующие тексты не переписывать (длинное тире остаётся: это русская пунктуация).
- Цвет несёт только вердикт: кнопки, ссылки и фокус нейтральные. Вердикт всегда со словом и значком.
- Одна система скруглений: 12px (`--r-control`) у кнопок и полей, 20px (`--r-container`) у контейнеров, пилюля (`--r-pill`) только у вердикта и чипов.
- Анимируются только `transform` и `opacity` (плюс shimmer скелетона). Всё движение гасится под `prefers-reduced-motion: reduce`.
- Без `100vh` (только `dvh` или без высоты), без чисто чёрного `#000` и чисто белого `#fff` в CSS.
- Размер `css/style.css` не больше 30 КБ.
- Публичные id (`#profile`, `#profile-box`, `#answer`, `#summary`, `#agenda`, `#catalog`, `#results`, `#catalog-tools`, `#catalog-search`, `#catalog-kind`, `#catalog-country`, `#catalog-status`, `#catalog-reset`, `#open-catalog`, `#back-to-answer`, `#show-results`, `#wizard-*`, `#clear-profile`, `#clear-status`) и `data-`атрибуты не менять.
- Ветка `ui/redesign` (уже создана). В индекс попадают только явные пути: `git add <файл>`, никогда `git add -A` и `git commit -a`. Сообщения коммитов по-русски, в конце строка `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Перед каждым коммитом: `node --test` зелёный. Базовая линия на 2026-09-25: 317 тестов, 0 падений.

## Как проверять в браузере

Тестами DOM не покрыт, поэтому после каждого среза открыть сайт:

```bash
cd C:/Users/ORYX/dev/eligibility-tool && python -m http.server 8765
```

Открыть `http://localhost:8765/`. Проверить: 375 px (телефон), около 800 px, 1280 px; светлая и тёмная тема (`resize_window` с `colorScheme`); Tab-навигация; `prefers-reduced-motion`. Чтобы увидеть выдачу без прохождения анкеты, в консоли браузера:

```js
localStorage.setItem('eligibility-profile', JSON.stringify({citizenship:'TJ',schoolCountry:'TJ',schoolYears:11,graduationYear:2027,birthDate:'2009-05-14',gpa:{value:4.8,scale:'TJ_5'},languageTests:[{test:'IELTS',score:6.5}]})); location.reload();
```

Форма профиля описана в `emptyProfile()` (`js/profile.js`); если ответ не появился, сверить поля `languageTests` с `js/form.js`. Сбросить: кнопка «Стереть мою анкету с этого устройства».

## Файлы

| Файл | Что делает |
|---|---|
| `css/style.css` | Вся визуальная система. Переписывается целиком (Задача 2), дальше правится точечно. |
| `tests/css-guard.test.js` | Новый. Каждому классу из HTML и JS есть правило; нет `100vh`, `#000`, `#fff`, `@font-face`; есть фокус и reduced-motion; размер ≤ 30 КБ; в HTML нет `style=`; на страницах есть skip-link. |
| `tests/steps-label.test.js` | Новый. Подпись шага «Шаг N из 4 · Название». |
| `tests/agenda-parts.test.js` | Новый. Разбор срока на дату и остаток для строки календаря. |
| `index.html`, `faq.html`, `privacy.html`, `404.html` | Skip-link, `id="main"`, индикатор шагов, обёртка `.catalog-bar`, основная кнопка каталога. |
| `js/steps.js` | Индикатор шагов вместо `<progress>`, подпись с названием шага. |
| `js/render.js` | `agendaParts`, строка календаря из трёх частей, скелетон, `aria-busy` у кнопки ИИ. |
| `js/filter.js` | Признак пустой выдачи `data-empty` у статуса. |
| `js/main.js` | Оформленная ошибка загрузки списка программ с повтором. |

---

### Task 1: Страховочный тест CSS

**Files:**
- Create: `tests/css-guard.test.js`

**Interfaces:**
- Consumes: `css/style.css`, `index.html`, `faq.html`, `privacy.html`, `404.html`, `js/*.js` (читает как текст).
- Produces: набор проверок (запрет чистого чёрного и белого добавляет Задача 2, потому что старый CSS его нарушает), которые Задачи 2-6 дополняют и которые должны оставаться зелёными.

- [ ] **Step 1: Написать тест**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const css = read('css/style.css');
const PAGES = ['index.html', 'faq.html', 'privacy.html', '404.html'];

// Обёртки, на которые опирается только JS: стиль им не нужен.
const UNSTYLED = new Set(['explain-answer']);

const isClassName = (token) => /^[a-z][a-z0-9-]*$/.test(token);

function splitClasses(value) {
  // Динамические куски вида ${model.bucket} отбрасываем целиком: их
  // значения (yes, likely, check, no) стилизуются отдельно и проверяются глазами.
  return value.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter(isClassName);
}

function classesUsed() {
  const used = new Set();
  for (const page of PAGES) {
    for (const match of read(page).matchAll(/class="([^"]+)"/g)) {
      splitClasses(match[1]).forEach((name) => used.add(name));
    }
  }
  for (const file of readdirSync(join(root, 'js')).filter((name) => name.endsWith('.js'))) {
    const source = read(`js/${file}`);
    for (const match of source.matchAll(/el\(\s*'[a-z0-9]+'\s*,\s*(?:'([^']+)'|`([^`]+)`)/g)) {
      splitClasses(match[1] ?? match[2]).forEach((name) => used.add(name));
    }
    for (const match of source.matchAll(/classList\.(?:add|toggle)\('([a-z0-9-]+)'/g)) {
      used.add(match[1]);
    }
  }
  return used;
}

test('каждому классу из HTML и JS есть правило в CSS', () => {
  const missing = [...classesUsed()].filter((name) => !UNSTYLED.has(name) && !css.includes(`.${name}`));
  assert.deepEqual(missing, []);
});

test('высота экрана задаётся не через 100vh', () => {
  assert.doesNotMatch(css, /\b100vh\b/);
});

test('шрифт системный: нет @font-face и адресов из сети', () => {
  assert.doesNotMatch(css, /@font-face/);
  assert.doesNotMatch(css, /url\(\s*['"]?https?:/i);
});

test('есть видимый фокус и отключение движения', () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('CSS не больше 30 КБ', () => {
  assert.ok(Buffer.byteLength(css) <= 30 * 1024, `размер ${Buffer.byteLength(css)} байт`);
});

test('в разметке нет атрибутов style (CSP их не пустит)', () => {
  for (const page of PAGES) {
    assert.doesNotMatch(read(page), /\sstyle\s*=/, page);
  }
  for (const file of readdirSync(join(root, 'js')).filter((name) => name.endsWith('.js'))) {
    assert.doesNotMatch(read(`js/${file}`), /setAttribute\(\s*['"]style['"]/, file);
  }
});
```

- [ ] **Step 2: Запустить, убедиться, что проходит на текущем CSS**

Run: `cd C:/Users/ORYX/dev/eligibility-tool && node --test tests/css-guard.test.js`
Expected: 6 тестов PASS (текущий CSS уже соответствует этим правилам; тест страхует то, что будет переписано). Если первый тест назовёт класс, которого нет в CSS, это реальная находка: занести его в отчёт, а не в `UNSTYLED`.

- [ ] **Step 3: Полный прогон**

Run: `node --test`
Expected: 323 теста PASS (317 + 6).

- [ ] **Step 4: Закоммитить тест и правку спеки**

```bash
git add tests/css-guard.test.js docs/superpowers/specs/2026-09-25-visual-redesign-design.md docs/superpowers/plans/2026-09-25-visual-redesign.md
git commit -m "$(cat <<'EOF'
Редизайн: страховочный тест CSS, план и правка спеки про движение

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Новая таблица стилей

**Files:**
- Modify: `css/style.css` (переписать целиком)
- Modify: `tests/css-guard.test.js` (добавить проверку палитры)

**Interfaces:**
- Consumes: существующая разметка с классами `.button`, `.button-small`, `.button-quiet`, `.link-button`, `.chip`, `.card*`, `.group*`, `.summary*`, `.agenda*`, `.profile-box*`, `.wizard-*`, `.explain*`, `.faq`, `.prose`, `.site-footer`, `.back`, `.lead`, `.hint`, `.fineprint`, `.empty`, `.details-state`, `.more*`, `.reason*`.
- Produces: токены `--bg --surface --soft --line --line-strong --fg --muted --ink --on-ink --yes* --likely* --check* --no* --r-control --r-container --r-pill --s-1..--s-8 --shadow --ease --dur --gutter --z-tools --z-bar`; классы, которые появятся в разметке позже (правила уже лежат в файле): `.stepper` (Задача 4), `.agenda-left` (Задача 5), `.catalog-bar`, `.sr-only`, `.skeleton-lines`, `.skeleton`, `.state-error` (Задача 6), `.skip-link` (Задача 3). Временные правила `.wizard-progress` остаются до Задачи 4.

- [ ] **Step 1: Добавить в `tests/css-guard.test.js` проверку палитры**

Дописать в конец файла:

```js
test('в CSS нет чисто чёрного и чисто белого', () => {
  assert.doesNotMatch(css, /#(?:000|000000|fff|ffffff)\b/i);
});

test('палитра: токены поверхностей заданы, вердикты сохранены в обеих темах', () => {
  for (const token of ['--bg', '--surface', '--soft', '--line', '--fg', '--muted', '--ink', '--on-ink']) {
    assert.match(css, new RegExp(`${token}:`), token);
  }
  for (const verdict of ['yes', 'likely', 'check', 'no']) {
    const count = css.split(`--${verdict}:`).length - 1;
    assert.equal(count, 2, `--${verdict} должен быть в светлой и тёмной теме`);
  }
  assert.match(css, /prefers-color-scheme:\s*dark/);
});
```

- [ ] **Step 2: Запустить и убедиться, что падает**

Run: `node --test tests/css-guard.test.js`
Expected: FAIL на «в CSS нет чисто чёрного и чисто белого» (в текущем CSS `--bg: #ffffff`, `--on-ink: #ffffff`) и на «палитра» (нет токена `--surface`).

- [ ] **Step 3: Заменить `css/style.css` целиком**

```css
/* Система «спокойный и чистый». Мобильный вперёд. Один системный шрифт:
   подключаемые стоят трафика, которого у аудитории нет, а CSP шрифтов из
   сети всё равно не пустит.

   Цвет в интерфейсе один: цвет вердикта. Кнопки, ссылки и рамка фокуса
   чернильные (в тёмной теме светлые): зелёная кнопка читалась бы как
   «можно». Вердикт не различается только цветом: у каждого есть слово и
   значок (✓ ≈ ! ✕).

   Скругления: 12px у кнопок и полей, 20px у контейнеров, пилюля только у
   вердикта и чипов. Анимируются transform и opacity. */
:root {
  color-scheme: light dark;

  --bg: #f6f7f9;
  --surface: #fdfdfe;
  --soft: #eceef2;
  --line: #e0e3e9;
  --line-strong: #858d9a;
  --fg: #14171c;
  --muted: #555c68;
  --ink: #14171c;
  --on-ink: #f6f7f9;

  --yes: #146c3e;
  --yes-bg: #e2f2e9;
  --likely: #0d6079;
  --likely-bg: #e0f0f5;
  --check: #7a4f00;
  --check-bg: #f8edd3;
  --no: #a3231b;
  --no-bg: #f9e5e2;

  --shadow: 0 1px 2px rgb(24 32 48 / .05), 0 10px 28px -14px rgb(24 32 48 / .22);
  --hover: rgb(24 32 48 / .06);

  --r-control: .75rem;
  --r-container: 1.25rem;
  --r-pill: 999px;

  --s-1: .25rem;
  --s-2: .5rem;
  --s-3: .75rem;
  --s-4: 1rem;
  --s-5: 1.5rem;
  --s-6: 2rem;
  --s-7: 3rem;
  --s-8: 4rem;
  --gutter: 1rem;

  --ease: cubic-bezier(.16, 1, .3, 1);
  --dur: .18s;

  --z-tools: 10;
  --z-bar: 20;
  --z-skip: 30;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1115;
    --surface: #161a20;
    --soft: #1e232b;
    --line: #262c35;
    --line-strong: #7a8393;
    --fg: #e8eaee;
    --muted: #a3abb8;
    --ink: #e8eaee;
    --on-ink: #0f1115;

    --yes: #7fd8a4;
    --yes-bg: #14261c;
    --likely: #7cc8e6;
    --likely-bg: #132631;
    --check: #efc063;
    --check-bg: #2a2110;
    --no: #ff9d95;
    --no-bg: #331917;

    --shadow: 0 0 0 1px rgb(255 255 255 / .05);
    --hover: rgb(255 255 255 / .06);
  }
}

* { box-sizing: border-box; }

/* Без этого display у .button и других перебивает атрибут hidden. */
[hidden] { display: none !important; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0 auto;
  padding: var(--s-5) var(--gutter) 5rem;
  max-width: 42rem;
  font: 1rem/1.55 system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif;
  color: var(--fg);
  background: var(--bg);
  overflow-wrap: anywhere;
}

h1, h2, h3, h4 { text-wrap: balance; }
p { text-wrap: pretty; }

h1 { font-size: clamp(1.75rem, 1.35rem + 1.9vw, 2.5rem); line-height: 1.1; margin: 0 0 var(--s-3); font-weight: 700; letter-spacing: -.025em; }
.lead { margin: 0 0 var(--s-6); max-width: 60ch; color: var(--muted); font-size: 1.0625rem; }
.hint, small { color: var(--muted); font-size: .875rem; }
.hint { margin: 0 0 var(--s-4); padding: var(--s-3) var(--s-4); background: var(--soft); border-radius: var(--r-control); }

a { color: var(--fg); text-decoration: underline; text-decoration-color: var(--line-strong); text-underline-offset: .2em; }
@media (hover: hover) { a:hover { text-decoration-color: currentColor; } }

/* Фокус виден на любом фоне: сплошной контур цвета текста. Внутри
   раскрывающихся заголовков он уходит внутрь, чтобы не обрезаться. */
:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
summary:focus-visible { outline-offset: -3px; }

.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

.skip-link { position: fixed; left: var(--s-3); top: var(--s-3); z-index: var(--z-skip); padding: var(--s-3) var(--s-4); font-weight: 600; color: var(--on-ink); background: var(--ink); border-radius: var(--r-control); transform: translateY(-200%); }
.skip-link:focus { transform: none; }

/* Поля */
fieldset { border: 0; margin: 0 0 var(--s-6); padding: 0; min-width: 0; }
legend { font-size: 1.25rem; font-weight: 650; letter-spacing: -.01em; padding: 0; margin: 0 0 var(--s-4); }
legend:focus { outline: none; }

label { display: block; margin: 0 0 var(--s-5); font-size: .9375rem; font-weight: 600; }
label small { display: block; font-weight: 400; margin-top: var(--s-2); }
label.row { display: grid; grid-template-columns: 1.5rem 1fr 6rem; align-items: center; gap: var(--s-3); min-height: 56px; margin: 0 0 var(--s-2); padding: var(--s-2) var(--s-3); font-size: 1rem; font-weight: 400; background: var(--soft); border-radius: var(--r-control); }

input, select {
  display: block;
  width: 100%;
  min-height: 48px;
  margin-top: var(--s-2);
  padding: .625rem var(--s-3);
  font: inherit;
  font-weight: 400;
  color: var(--fg);
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-control);
}
input::placeholder { color: var(--muted); opacity: 1; }
input:focus-visible, select:focus-visible { outline-offset: 1px; border-color: var(--ink); }
@media (hover: hover) { input:hover, select:hover { border-color: var(--fg); } }
label.row input[type="number"] { width: 100%; margin: 0; }
input[type="checkbox"] { width: 1.5rem; height: 1.5rem; min-height: 0; margin: 0; accent-color: var(--ink); }
select { -webkit-appearance: none; appearance: none; padding-right: 2.5rem; background-image: linear-gradient(45deg, transparent 50%, var(--muted) 50%), linear-gradient(135deg, var(--muted) 50%, transparent 50%); background-position: calc(100% - 1.2rem) 55%, calc(100% - .85rem) 55%; background-size: .35rem .35rem; background-repeat: no-repeat; }
select + input, input + select { margin-top: var(--s-2); }

/* Кнопки. Наведение и нажатие идут через прозрачную накладку: анимируется
   только opacity и transform. Три вида: основная, тональная, текстовая. */
.button { position: relative; isolation: isolate; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; gap: var(--s-2); min-height: 48px; padding: .625rem 1.25rem; font: inherit; font-weight: 600; white-space: nowrap; color: var(--on-ink); background: var(--ink); border: 0; border-radius: var(--r-control); text-decoration: none; cursor: pointer; transition: transform var(--dur) var(--ease); }
.button::before { content: ""; position: absolute; inset: 0; z-index: -1; background: currentColor; opacity: 0; transition: opacity var(--dur) var(--ease); }
@media (hover: hover) { .button:hover::before { opacity: .12; } }
.button:active { transform: scale(.98); }
.button:active::before { opacity: .18; }
.button:disabled { opacity: .55; cursor: default; transform: none; }
.button:disabled::before { opacity: 0; }
.button-small { min-height: 44px; padding: .5rem var(--s-4); font-size: .9375rem; }
.button-quiet { color: var(--fg); background: var(--soft); }
.button[aria-busy="true"] { cursor: progress; }
@media (prefers-reduced-motion: no-preference) {
  .button[aria-busy="true"] { animation: pulse 1.1s ease-in-out infinite; }
}
@keyframes pulse { 50% { opacity: .65; } }

.link-button { display: inline-flex; align-items: center; min-height: 44px; padding: 0; font: inherit; color: var(--muted); text-decoration: underline; text-decoration-color: var(--line-strong); text-underline-offset: .2em; background: none; border: 0; cursor: pointer; text-align: left; }
@media (hover: hover) { .link-button:hover { color: var(--fg); text-decoration-color: currentColor; } }
#show-results { width: 100%; }
#open-catalog { width: 100%; margin-top: var(--s-3); }
#back-to-answer { margin: 0 0 var(--s-5); }

/* Анкета */
.profile-box { margin: 0 0 var(--s-5); background: var(--surface); border-radius: var(--r-container); box-shadow: var(--shadow); }
.profile-box > summary { list-style: none; cursor: pointer; padding: var(--s-3) var(--s-4); min-height: 60px; display: flex; flex-wrap: wrap; gap: var(--s-1) var(--s-3); align-items: center; border-radius: var(--r-container); }
.profile-box > summary::-webkit-details-marker { display: none; }
/* Слева «Анкета», справа «изменить», под ними краткое содержание. */
.profile-box-label { order: 1; font-weight: 650; }
.profile-box-edit { order: 2; margin-left: auto; padding: var(--s-1) var(--s-3); font-size: .875rem; font-weight: 600; background: var(--soft); border-radius: var(--r-control); }
.profile-box-text { order: 3; color: var(--muted); flex: 1 1 100%; }
.profile-box[open] .profile-box-edit { display: none; }
.profile-box[open] > summary { border-bottom: 1px solid var(--line); border-radius: var(--r-container) var(--r-container) 0 0; }
.profile-box form { padding: var(--s-5) var(--s-4) var(--s-4); }

/* Пошаговая анкета: пока человек впервые её заполняет, виден один шаг. */
.wizard-head { display: none; }
.profile-box.wizard > summary, .profile-box.wizard .step { display: none; }
.profile-box.wizard .step.is-current { display: block; }
.profile-box.wizard .wizard-head { display: block; margin: 0 0 var(--s-5); }
.wizard-progress-label { margin: 0 0 var(--s-2); font-size: .875rem; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
.wizard-error { margin: 0 0 var(--s-3); color: var(--no); font-weight: 600; }
.wizard-error:empty { display: none; }

/* Индикатор шагов: четыре сегмента, заполнение растёт слева направо. */
.stepper { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: .375rem; margin: 0; padding: 0; list-style: none; }
.stepper li { position: relative; height: .375rem; overflow: hidden; background: var(--line); border-radius: var(--r-pill); }
.stepper li::after { content: ""; position: absolute; inset: 0; background: var(--ink); transform: scaleX(0); transform-origin: left; transition: transform var(--dur) var(--ease); }
.stepper li.is-done::after, .stepper li.is-current::after { transform: scaleX(1); }

/* Временное: старый индикатор, пока разметка не переехала на .stepper. */
.wizard-progress { display: block; width: 100%; height: .375rem; border: 0; border-radius: var(--r-pill); background: var(--line); overflow: hidden; -webkit-appearance: none; appearance: none; }
.wizard-progress::-webkit-progress-bar { background: var(--line); }
.wizard-progress::-webkit-progress-value { background: var(--ink); }
.wizard-progress::-moz-progress-bar { background: var(--ink); }

.wizard-nav { display: flex; gap: var(--s-3); }
.wizard-nav .button { flex: 1 1 0; width: auto; }
.wizard-nav #wizard-back { flex: 0 0 auto; }
/* На телефоне панель кнопок липнет к низу экрана, а не уезжает за поле. */
.profile-box.wizard .wizard-nav { position: sticky; bottom: 0; z-index: var(--z-bar); margin: 0 calc(var(--s-4) * -1) calc(var(--s-4) * -1); padding: var(--s-4) var(--s-4) calc(var(--s-4) + env(safe-area-inset-bottom)); background: linear-gradient(to top, var(--surface) 70%, transparent); border-radius: 0 0 var(--r-container) var(--r-container); }

/* Ответ */
.summary { margin: var(--s-6) 0 var(--s-5); padding: var(--s-5) var(--s-4); background: var(--surface); border-radius: var(--r-container); box-shadow: var(--shadow); }
.summary:empty { display: none; }
.summary-line { margin: 0 0 var(--s-2); }
.summary-line:first-child { font-size: 1.25rem; font-weight: 650; line-height: 1.35; letter-spacing: -.01em; }
.summary-more { margin: var(--s-2) 0 0; }
.summary-note { margin: var(--s-3) 0 0; color: var(--muted); font-size: .875rem; }

.summary-more-head, .agenda-more-head, .catalog-more > summary { list-style: none; cursor: pointer; display: flex; align-items: center; min-height: 44px; font-weight: 600; color: var(--muted); }
.summary-more-head::-webkit-details-marker, .agenda-more-head::-webkit-details-marker, .catalog-more > summary::-webkit-details-marker { display: none; }
.summary-more-head::after, .agenda-more-head::after, .catalog-more > summary::after { content: ""; width: .45rem; height: .45rem; margin-left: .6rem; border: solid currentColor; border-width: 0 2px 2px 0; transform: rotate(45deg); transition: transform var(--dur) var(--ease); }
.summary-more[open] > .summary-more-head::after, .agenda-more[open] > .agenda-more-head::after, .catalog-more[open] > summary::after { transform: rotate(-135deg); }
.agenda-more { margin-top: var(--s-3); }
.catalog-more { margin: 0 0 var(--s-4); }

/* Календарь сроков: строки, а не карточки. Здесь человек выбирает, куда идти
   смотреть, а читает уже в каталоге. Дата слева, остаток справа. */
.agenda { margin: 0 0 var(--s-5); }
.agenda-title { font-size: 1.25rem; letter-spacing: -.01em; margin: 0 0 var(--s-1); }
.agenda-horizon { font-size: .875rem; font-weight: 600; color: var(--muted); margin: var(--s-4) 0 var(--s-2); }
.agenda-list { list-style: none; margin: 0; padding: 0; background: var(--surface); border-radius: var(--r-container); box-shadow: var(--shadow); overflow: hidden; }
.agenda-list li + li { border-top: 1px solid var(--line); }
.agenda-item { display: grid; grid-template-columns: 1fr auto; column-gap: var(--s-4); row-gap: .125rem; align-items: center; width: 100%; min-height: 60px; padding: var(--s-3) var(--s-4); font: inherit; color: inherit; text-align: left; background: none; border: 0; cursor: pointer; }
.agenda-item:focus-visible { outline-offset: -3px; }
@media (hover: hover) { .agenda-item:hover { background: var(--hover); } }
.agenda-name { grid-column: 1; font-weight: 600; line-height: 1.35; }
.agenda-when { grid-column: 1; color: var(--muted); font-size: .875rem; font-variant-numeric: tabular-nums; }
.agenda-left { grid-column: 2; grid-row: 1 / span 2; max-width: 7.5rem; font-size: .875rem; font-weight: 600; line-height: 1.3; text-align: right; font-variant-numeric: tabular-nums; }

/* Каталог: поиск и чипы закреплены сверху. */
.catalog-tools { margin: 0 0 var(--s-5); }
.catalog-bar { position: sticky; top: 0; z-index: var(--z-tools); margin: 0 calc(var(--gutter) * -1) var(--s-3); padding: var(--s-3) var(--gutter) var(--s-2); background: var(--bg); }
.catalog-bar input[type="search"] { margin: 0 0 var(--s-3); -webkit-appearance: none; appearance: none; }
.chips { display: flex; gap: .375rem; margin: 0 calc(var(--gutter) * -1); padding: 0 var(--gutter); overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity; }
.chips::-webkit-scrollbar { display: none; }
.chip { flex: none; display: inline-flex; align-items: center; gap: .3rem; min-height: 44px; padding: .375rem .85rem; font: inherit; font-size: .9375rem; color: var(--fg); background: var(--soft); border: 0; border-radius: var(--r-pill); cursor: pointer; scroll-snap-align: start; transition: transform var(--dur) var(--ease); }
.chip:active { transform: scale(.97); }
.chip[aria-pressed="true"] { color: var(--on-ink); background: var(--ink); font-weight: 650; }
.chip-glyph { font-weight: 800; }
.chip-count { opacity: .8; font-variant-numeric: tabular-nums; }
@media (hover: hover) { .chip[aria-pressed="false"]:hover { background: var(--line); } }
.catalog-tools .fineprint:empty { display: none; }
.catalog-tools .fineprint[data-empty="true"] { margin: var(--s-3) 0; padding: var(--s-4); color: var(--fg); background: var(--soft); border-radius: var(--r-control); }

/* Подвал и текстовые страницы (конфиденциальность, вопросы, 404). */
.site-footer { margin-top: var(--s-8); padding-top: var(--s-5); border-top: 1px solid var(--line); }
.site-footer nav { display: flex; flex-wrap: wrap; gap: var(--s-1) var(--s-5); }
.site-footer a { display: inline-flex; align-items: center; min-height: 44px; }
.fineprint { color: var(--muted); font-size: .875rem; margin: var(--s-2) 0 0; }
.back { margin: 0 0 var(--s-4); }
.back a { display: inline-flex; align-items: center; min-height: 44px; font-weight: 600; text-decoration: none; }
@media (hover: hover) { .back a:hover { text-decoration: underline; } }
.prose { max-width: 65ch; }
.prose h2 { font-size: 1.25rem; letter-spacing: -.01em; margin: var(--s-6) 0 var(--s-2); }
.prose p, .prose ul { margin: 0 0 var(--s-4); }
.prose ul { padding-left: 1.25rem; }
.prose li { margin-bottom: var(--s-2); }

.faq { margin: 0 0 var(--s-2); background: var(--surface); border-radius: var(--r-container); box-shadow: var(--shadow); }
.faq > summary { list-style: none; cursor: pointer; min-height: 60px; display: flex; align-items: center; padding: var(--s-3) 3rem var(--s-3) var(--s-4); font-weight: 600; position: relative; border-radius: var(--r-container); }
.faq > summary::-webkit-details-marker { display: none; }
.faq > summary::after { content: ""; position: absolute; right: 1.25rem; top: 50%; width: .5rem; height: .5rem; margin-top: -.4rem; border: solid var(--muted); border-width: 0 2px 2px 0; transform: rotate(45deg); transition: transform var(--dur) var(--ease); }
.faq[open] > summary::after { transform: rotate(-135deg); }
.faq > p { margin: 0; padding: 0 var(--s-4) var(--s-4); }

/* Выдача */
.group { margin: 0 0 var(--s-6); }
.group-title { display: flex; gap: var(--s-2); align-items: baseline; font-size: 1.0625rem; line-height: 1.4; margin: 0 0 var(--s-3); }
.group-title::before { flex: none; font-weight: 800; }
.group.yes .group-title::before { content: "✓"; color: var(--yes); }
.group.likely .group-title::before { content: "≈"; color: var(--likely); }
.group.check .group-title::before { content: "!"; color: var(--check); }
.group.no .group-title::before { content: "✕"; color: var(--no); }

.card { margin: 0 0 var(--s-3); background: var(--surface); border-radius: var(--r-container); box-shadow: var(--shadow); }
/* Закрытый приём не бледнеет через opacity: тот съел бы контраст текста.
   Его выдаёт пунктир и подпись «Приём закрыт». */
.card.closed { background: var(--soft); box-shadow: none; outline: 1px dashed var(--line-strong); outline-offset: -1px; }

.card-head { list-style: none; cursor: pointer; display: flex; flex-direction: column; align-items: flex-start; gap: .375rem; min-height: 60px; padding: var(--s-4) 3rem var(--s-4) var(--s-4); position: relative; border-radius: var(--r-container); }
.card-head::-webkit-details-marker { display: none; }
.card-head::after { content: ""; position: absolute; right: 1.25rem; top: 1.5rem; width: .5rem; height: .5rem; border: solid var(--muted); border-width: 0 2px 2px 0; transform: rotate(45deg); transition: transform var(--dur) var(--ease); }
.card[open] > .card-head::after { transform: rotate(-135deg); }
@media (hover: hover) { .card-head:hover { background: var(--hover); } }

/* Вердикт: слово и значок в плашке, первое, что видно в карточке. */
.card-verdict { display: inline-flex; align-items: center; gap: .4rem; padding: .25rem .75rem .25rem .625rem; font-size: .9375rem; font-weight: 650; line-height: 1.4; border-radius: var(--r-pill); }
.card-verdict::before { font-weight: 800; }
.card.yes .card-verdict { color: var(--yes); background: var(--yes-bg); }
.card.yes .card-verdict::before { content: "✓"; }
.card.likely .card-verdict { color: var(--likely); background: var(--likely-bg); }
.card.likely .card-verdict::before { content: "≈"; }
.card.check .card-verdict { color: var(--check); background: var(--check-bg); }
.card.check .card-verdict::before { content: "!"; }
.card.no .card-verdict { color: var(--no); background: var(--no-bg); }
.card.no .card-verdict::before { content: "✕"; }

/* Тип и страна: что за программа. Стоит между вердиктом и названием и
   тише названия, чтобы не спорить с ответом. */
.card-kind { color: var(--muted); font-size: .8125rem; font-weight: 600; line-height: 1.35; }
.card-title { font-size: 1.125rem; font-weight: 650; line-height: 1.3; letter-spacing: -.01em; }
.card-reason { line-height: 1.45; }
.card-reason::first-letter { text-transform: uppercase; }
.card-reason-tail { color: var(--muted); font-size: .9375rem; }
.card-meta { color: var(--muted); font-size: .875rem; line-height: 1.45; font-variant-numeric: tabular-nums; }
.card-meta:empty { display: none; }

.card-body { padding: 0 var(--s-4) var(--s-4); border-top: 1px solid var(--line); }
.card-section-title { margin: var(--s-5) 0 .375rem; font-size: .9375rem; }
.card-list { margin: 0; padding-left: 1.25rem; font-size: .9375rem; }
.card-list li { margin-bottom: .375rem; }
.card-list.muted { color: var(--muted); }
.reason { margin: var(--s-4) 0 0; }
.reason-text { margin: 0; }
.reason-label { margin: var(--s-2) 0 var(--s-1); font-size: .875rem; font-weight: 600; }
.reason-list { margin: 0; padding-left: 1.25rem; font-size: .9375rem; }
.reason-muted, .details-state { margin: var(--s-2) 0 0; color: var(--muted); font-size: .875rem; }
.card-body > .button { margin-top: var(--s-5); width: 100%; }
.more { margin-top: var(--s-4); }
.more-head { cursor: pointer; font-size: .9375rem; font-weight: 600; min-height: 48px; display: flex; align-items: center; }
.card-source { margin: var(--s-4) 0 0; color: var(--muted); font-size: .8125rem; }
.empty { color: var(--muted); }

.explain { margin: var(--s-5) 0 var(--s-1); padding: var(--s-3) var(--s-4); background: var(--soft); border-radius: var(--r-control); }
.explain-note { margin: var(--s-2) 0 0; color: var(--muted); font-size: .8125rem; }
.explain-heading { margin: var(--s-3) 0 var(--s-1); font-size: .9375rem; }
.explain-heading:first-child { margin-top: 0; }
.explain-line { margin: 0 0 .375rem; font-size: .9375rem; }

/* Состояния: загрузка и ошибка. */
.skeleton-lines { display: grid; gap: var(--s-2); margin: var(--s-4) 0 0; }
.skeleton { position: relative; display: block; height: .875rem; overflow: hidden; background: var(--soft); border-radius: .375rem; }
.skeleton:nth-child(2) { width: 92%; }
.skeleton:nth-child(3) { width: 78%; }
.skeleton:nth-child(4) { width: 60%; }
@media (prefers-reduced-motion: no-preference) {
  .skeleton::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, var(--hover), transparent); transform: translateX(-100%); animation: shimmer 1.4s ease-in-out infinite; }
}
@keyframes shimmer { to { transform: translateX(100%); } }
.state-error { display: grid; justify-items: start; gap: var(--s-3); }
.state-error p { margin: 0; color: var(--no); font-weight: 600; }

/* Переход между экранами: мягкое появление, чтобы было видно, что экран
   сменился. Списки внутри не анимируются: они пересобираются на каждое
   нажатие в анкете. */
@keyframes screen-in { from { opacity: 0; transform: translateY(.5rem); } }
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
  #answer:not([hidden]), #catalog:not([hidden]) { animation: screen-in .24s var(--ease) backwards; }
}

@media (min-width: 40rem) {
  :root { --gutter: 1.5rem; }
  body { padding-top: var(--s-7); }
  .card-body > .button { width: auto; }
  .chips { flex-wrap: wrap; overflow: visible; }
  .profile-box form { padding: var(--s-6) var(--s-5) var(--s-5); }
  .profile-box.wizard .wizard-nav { margin: 0 calc(var(--s-5) * -1) calc(var(--s-5) * -1); padding: var(--s-4) var(--s-5) calc(var(--s-4) + env(safe-area-inset-bottom)); }
  .summary { padding: var(--s-5); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

- [ ] **Step 4: Запустить тесты**

Run: `node --test`
Expected: все PASS (323 + 2 = 325). Если «каждому классу есть правило» назвал класс, проверить, не опечатка ли в CSS.

- [ ] **Step 5: Проверить в браузере**

Открыть сайт (см. «Как проверять в браузере»). Убедиться: анкета на первом шаге читается, есть карточка с тенью, кнопка «Далее» тёмная с откликом при нажатии; после подстановки профиля виден ответ (сводка, календарь) и каталог `#programs` (карточки, чипы). Светлая и тёмная темы, 375 px. В консоли нет ошибок (`read_console_messages`). Старый индикатор шагов (`<progress>`) на месте и выглядит нормально. Чипы на 375 px прокручиваются вбок.

- [ ] **Step 6: Закоммитить**

```bash
git add css/style.css tests/css-guard.test.js
git commit -m "$(cat <<'EOF'
Редизайн, срез 1: новая таблица стилей на токенах

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Статичные страницы: skip-link и общая шапка

**Files:**
- Modify: `tests/css-guard.test.js` (проверка skip-link и `id="main"`)
- Modify: `index.html`, `faq.html`, `privacy.html`, `404.html`

**Interfaces:**
- Consumes: `.skip-link`, `.sr-only`, `.back` из Задачи 2.
- Produces: на каждой странице первой в `<body>` идёт ссылка `<a class="skip-link" href="#main">К содержимому</a>`, а `<main>` имеет `id="main"`.

- [ ] **Step 1: Дописать тест в `tests/css-guard.test.js`**

```js
test('на каждой странице есть ссылка «к содержимому» и main с id', () => {
  for (const page of PAGES) {
    const html = read(page);
    assert.match(html, /<body>\s*<a class="skip-link" href="#main">К содержимому<\/a>/, `${page}: skip-link`);
    assert.match(html, /<main[^>]*\sid="main"/, `${page}: main#main`);
  }
});
```

- [ ] **Step 2: Запустить, убедиться, что падает**

Run: `node --test tests/css-guard.test.js`
Expected: FAIL «index.html: skip-link».

- [ ] **Step 3: Внести правки в четыре страницы**

В каждом из `index.html`, `faq.html`, `privacy.html`, `404.html` заменить `<body>` на:

```html
<body>
<a class="skip-link" href="#main">К содержимому</a>
```

В `index.html` строку `<main>` заменить на `<main id="main">`. В `faq.html`, `privacy.html` и `404.html` строку `<main class="prose">` заменить на `<main id="main" class="prose">`. Больше в этих файлах в этой задаче ничего не менять.

- [ ] **Step 4: Запустить тесты**

Run: `node --test`
Expected: все PASS (326).

- [ ] **Step 5: Проверить в браузере**

Открыть `index.html`, `faq.html`, `privacy.html`, локально `404.html` (у неё путь к CSS абсолютный `/where-can-i-apply/css/style.css`, локально стили не подхватятся: это ожидаемо, полная проверка только на Pages). На каждой странице нажать Tab один раз: сверху появляется тёмная кнопка «К содержимому», Enter переводит фокус к основному содержимому. FAQ: пункты стали карточками, стрелка поворачивается при раскрытии. Тёмная тема тоже.

- [ ] **Step 6: Закоммитить**

```bash
git add tests/css-guard.test.js index.html faq.html privacy.html 404.html
git commit -m "$(cat <<'EOF'
Редизайн, срез 1: ссылка «к содержимому» на всех страницах

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Индикатор шагов и подпись шага

**Files:**
- Create: `tests/steps-label.test.js`
- Modify: `js/steps.js` (функция `progressWithTitle`, `paint`)
- Modify: `index.html` (заменить `<progress>` на `<ol class="stepper">`)
- Modify: `css/style.css` (удалить временные правила `.wizard-progress*`)

**Interfaces:**
- Consumes: `stepView(step, total)` из `js/steps.js`, возвращает `{ progressText, showBack, showNext, showFinish }`. `.stepper`, `is-done`, `is-current` из Задачи 2.
- Produces: `progressWithTitle(view, title)` → строка `«Шаг N из M · Название»`. `setupWizard` принимает в `progress` элемент со списком дочерних сегментов (`progress.children`), а не `<progress>`.

- [ ] **Step 1: Написать падающий тест `tests/steps-label.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { stepView, progressWithTitle } from '../js/steps.js';

test('подпись шага: номер, всего и название', () => {
  assert.equal(progressWithTitle(stepView(1, 4), 'Выпуск и возраст'), 'Шаг 2 из 4 · Выпуск и возраст');
});

test('подпись первого шага', () => {
  assert.equal(progressWithTitle(stepView(0, 4), 'Кто ты'), 'Шаг 1 из 4 · Кто ты');
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `node --test tests/steps-label.test.js`
Expected: FAIL, `progressWithTitle` is not a function (или SyntaxError на импорте).

- [ ] **Step 3: Реализовать в `js/steps.js`**

После функции `stepView` добавить:

```js
// Подпись над индикатором: номер шага и его название, чтобы человек видел
// не только «где он», но и «о чём этот шаг».
export function progressWithTitle(view, title) {
  return `${view.progressText} · ${title}`;
}
```

В `paint` заменить строки

```js
    progress.max = steps.length;
    progress.value = step + 1;
    progressLabel.textContent = view.progressText;
```

на

```js
    [...progress.children].forEach((segment, i) => {
      segment.classList.toggle('is-done', i < step);
      segment.classList.toggle('is-current', i === step);
    });
    progressLabel.textContent = progressWithTitle(view, steps[step].querySelector('legend').textContent);
```

- [ ] **Step 4: Запустить тест**

Run: `node --test tests/steps-label.test.js tests/steps.test.js`
Expected: PASS.

- [ ] **Step 5: Заменить разметку в `index.html`**

Строку

```html
      <progress id="wizard-progress" class="wizard-progress" value="1" max="4" aria-hidden="true"></progress>
```

заменить на

```html
      <ol id="wizard-progress" class="stepper" aria-hidden="true"><li></li><li></li><li></li><li></li></ol>
```

- [ ] **Step 6: Удалить временные правила из `css/style.css`**

Удалить блок от комментария `/* Временное: старый индикатор ... */` до строки `.wizard-progress::-moz-progress-bar { background: var(--ink); }` включительно (5 строк).

- [ ] **Step 7: Полный прогон и браузер**

Run: `node --test`
Expected: все PASS (328).

В браузере: очистить анкету (кнопка внизу), пройти четыре шага. Сегменты заполняются слева направо с мягким движением, подпись меняется «Шаг 2 из 4 · Выпуск и возраст». На шаге без обязательного поля «Далее» показывает ошибку под полем. На 375 px панель «Назад / Далее» прилипает к низу экрана и не перекрывает поля (проверить на шаге 4 «Языковые экзамены», где полей много). Клавиатура: фокус переходит на заголовок шага после «Далее».

- [ ] **Step 8: Закоммитить**

```bash
git add tests/steps-label.test.js js/steps.js index.html css/style.css
git commit -m "$(cat <<'EOF'
Редизайн, срез 2: сегментный индикатор шагов с названием шага

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Экран ответа: календарь сроков и основная кнопка каталога

**Files:**
- Create: `tests/agenda-parts.test.js`
- Modify: `js/render.js` (`agendaParts`, `agendaGroups`)
- Modify: `index.html` (кнопка `#open-catalog` становится основной)

**Interfaces:**
- Consumes: `formatDate(iso)` и `timeLeft(today, iso)` из `js/lib/format.js` (`timeLeft` возвращает строку вроде «осталось 3 недели» или `null` для прошедшей даты). `.agenda-when`, `.agenda-left` из Задачи 2.
- Produces: `agendaParts(closes, today)` → `{ when: string, left: string | null }`.

- [ ] **Step 1: Написать падающий тест `tests/agenda-parts.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { agendaParts } from '../js/render.js';
import { formatDate, timeLeft } from '../js/lib/format.js';

test('срок известен: дата и остаток идут раздельно', () => {
  const parts = agendaParts('2026-12-01', '2026-11-20');
  assert.equal(parts.when, `до ${formatDate('2026-12-01')}`);
  assert.equal(parts.left, timeLeft('2026-11-20', '2026-12-01'));
  assert.ok(parts.left);
});

test('срока нет: остатка нет, дата не выдумывается', () => {
  assert.deepEqual(agendaParts(undefined, '2026-11-20'), { when: 'дату программа не назвала', left: null });
});

test('срок прошёл: остатка нет', () => {
  assert.equal(agendaParts('2026-11-01', '2026-11-20').left, null);
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `node --test tests/agenda-parts.test.js`
Expected: FAIL, `agendaParts` is not a function.

- [ ] **Step 3: Реализовать в `js/render.js`**

Перед функцией `agendaGroups` добавить:

```js
// Строка календаря читается в два столбца: слева «до какого числа», справа
// «сколько осталось». Остаток считает format.js; для прошедшей даты он
// отдаёт null, и правого столбца тогда нет.
export function agendaParts(closes, today) {
  if (!closes) return { when: 'дату программа не назвала', left: null };
  return { when: `до ${formatDate(closes)}`, left: timeLeft(today, closes) };
}
```

В `agendaGroups` заменить блок

```js
      const closes = row.program.deadline?.closes;
      line.append(el('span', 'agenda-name', row.program.name?.ru ?? row.program.id));
      line.append(el('span', 'agenda-when', closes
        ? `до ${formatDate(closes)} · ${timeLeft(today, closes)}`
        : 'дату программа не назвала'));
```

на

```js
      const { when, left } = agendaParts(row.program.deadline?.closes, today);
      line.append(el('span', 'agenda-name', row.program.name?.ru ?? row.program.id));
      line.append(el('span', 'agenda-when', when));
      if (left) line.append(el('span', 'agenda-left', left));
```

- [ ] **Step 4: Запустить тесты**

Run: `node --test`
Expected: все PASS (331).

- [ ] **Step 5: Сделать кнопку каталога основной в `index.html`**

Строку

```html
    <button type="button" id="open-catalog" class="button button-quiet" hidden></button>
```

заменить на

```html
    <button type="button" id="open-catalog" class="button" hidden></button>
```

Кнопку `#back-to-answer` оставить тональной (`button button-quiet`).

- [ ] **Step 6: Проверить в браузере**

Подставить профиль (см. «Как проверять в браузере») и открыть ответ. Сводка крупной карточкой, «Ближайшие сроки» как список: название и «до 15 января 2027» слева, «осталось 3 недели» справа, цифры выровнены. Строка без даты: справа пусто, слева «дату программа не назвала». Кнопка «Все программы (N)» тёмная и широкая. Нажатие открывает каталог с мягким появлением; «Назад к ответу» тональная. На 375 px правый столбец не ломает название (длинные названия переносятся). В консоли ошибок нет. Тёмная тема.

- [ ] **Step 7: Закоммитить**

```bash
git add tests/agenda-parts.test.js js/render.js index.html
git commit -m "$(cat <<'EOF'
Редизайн, срез 3: календарь сроков в два столбца, основная кнопка каталога

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Каталог, карточки и состояния

**Files:**
- Modify: `index.html` (обёртка `.catalog-bar`, скрытая подпись поиска)
- Modify: `js/filter.js` (признак пустой выдачи)
- Modify: `js/render.js` (скелетон, `aria-busy` у кнопки ИИ)
- Modify: `js/main.js` (ошибка загрузки списка)

**Interfaces:**
- Consumes: `.catalog-bar`, `.sr-only`, `.skeleton-lines`, `.skeleton`, `.state-error`, `.fineprint[data-empty="true"]`, `.button[aria-busy="true"]` из Задачи 2. `#catalog-search`, `.chip` (id и классы, на которые опирается `js/filter.js`, не меняются).
- Produces: `ui.status.dataset.empty` = `"true"` при пустой выдаче фильтра; функция `skeleton(label)` в `js/render.js`; функция `showLoadError(node)` в `js/main.js`.

- [ ] **Step 1: Проверить, что тесты не привязаны к строкам, которые правим**

Run: `grep -rn "загружаются\|Думаю\|Название или страна" tests`
Expected: пусто (найденное в `tests/` править не надо, если совпадений нет; если есть, обновить тест под новую разметку).

- [ ] **Step 2: Правка `index.html`: панель поиска и чипов**

В блоке `<div id="catalog-tools" class="catalog-tools">` заменить фрагмент от `<label for="catalog-search">` до закрывающего `</div>` группы чипов на:

```html
      <div class="catalog-bar">
        <label for="catalog-search" class="sr-only">Найти программу</label>
        <input type="search" id="catalog-search" placeholder="Название или страна" autocomplete="off" enterkeyhint="search">
        <div class="chips" role="group" aria-label="Показать только">
          <button type="button" class="chip" data-bucket="all" aria-pressed="true">Все <span class="chip-count"></span></button>
          <button type="button" class="chip" data-bucket="yes" aria-pressed="false"><span class="chip-glyph" aria-hidden="true">✓</span> Подходишь <span class="chip-count"></span></button>
          <button type="button" class="chip" data-bucket="likely" aria-pressed="false"><span class="chip-glyph" aria-hidden="true">≈</span> Похоже <span class="chip-count"></span></button>
          <button type="button" class="chip" data-bucket="check" aria-pressed="false"><span class="chip-glyph" aria-hidden="true">!</span> Доделать <span class="chip-count"></span></button>
          <button type="button" class="chip" data-bucket="no" aria-pressed="false"><span class="chip-glyph" aria-hidden="true">✕</span> Нельзя <span class="chip-count"></span></button>
        </div>
      </div>
```

Остальное в `#catalog-tools` (`<details class="catalog-more">`, `#catalog-status`, `#catalog-reset`) не трогать.

- [ ] **Step 3: Правка `js/filter.js`: признак пустой выдачи**

После блока

```js
  ui.status.textContent = !active
    ? ''
    : shown === 0 ? 'Ничего не нашлось. Попробуй убрать фильтр.' : `Показано ${shown} из ${cards.length}`;
```

добавить строку:

```js
  ui.status.dataset.empty = String(active && shown === 0);
```

- [ ] **Step 4: Правка `js/render.js`: скелетон вместо «загружаются»**

Перед функцией `card` добавить:

```js
// Пока подробности едут по сети, вместо пустоты стоит заготовка будущего
// списка. Текст остаётся для экранного диктора: глазами его не видно.
function skeleton(label) {
  const box = el('div', 'skeleton-lines');
  box.setAttribute('role', 'status');
  box.append(el('span', 'sr-only', label));
  for (let i = 0; i < 3; i += 1) box.append(el('span', 'skeleton'));
  return box;
}
```

В `card` заменить строку

```js
      body.append(el('p', 'details-state', 'Подробности загружаются…'));
```

на

```js
      body.append(skeleton('Подробности загружаются…'));
```

- [ ] **Step 5: Правка `js/render.js`: `aria-busy` у кнопки объяснения**

В `explainBlock` внутри обработчика клика заменить

```js
    button.disabled = true;
    button.textContent = 'Думаю…';
```

на

```js
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Думаю…';
```

а в `catch` перед `button.disabled = false;` добавить строку

```js
      button.removeAttribute('aria-busy');
```

- [ ] **Step 6: Правка `js/main.js`: ошибка загрузки списка**

Перед строкой `let programs = [];` добавить:

```js
// Список программ не приехал: без него ответа нет. Человек видит, что
// случилось и что делать, а не сырой текст исключения.
function showLoadError(node) {
  const box = document.createElement('div');
  box.className = 'state-error';
  box.setAttribute('role', 'alert');
  const text = document.createElement('p');
  text.textContent = 'Не удалось загрузить список программ. Проверь интернет и попробуй ещё раз.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'button button-small';
  retry.textContent = 'Попробовать ещё раз';
  retry.addEventListener('click', () => location.reload());
  box.append(text, retry);
  node.replaceChildren(box);
}
```

Заменить в конце файла

```js
  .catch((err) => {
    nodes.resultsNode.textContent = err.message;
  });
```

на

```js
  .catch(() => {
    showLoadError(nodes.summaryNode);
  });
```

- [ ] **Step 7: Тесты**

Run: `node --test`
Expected: все PASS (331). Страховочный тест подтвердит, что все новые классы (`catalog-bar`, `sr-only`, `skeleton-lines`, `skeleton`) есть в CSS.

- [ ] **Step 8: Проверить в браузере**

Подставить профиль, открыть каталог. Проверить:
1. Поиск и ряд чипов закреплены сверху при прокрутке; на 375 px чипы прокручиваются вбок, выбранный чип тёмный; подпись «Найти программу» не видна, но есть у диктора (`read_page`).
2. Ввести в поиск «zzzz»: под панелью появляется мягкий блок «Ничего не нашлось. Попробуй убрать фильтр.», кнопка «Сбросить фильтры» работает.
3. Карточка: вердикт-плашка, тип и страна, название, причина, мета. Раскрыть карточку: стрелка поворачивается, «Открыть сайт программы» полной ширины на телефоне. Закрытый приём отличается пунктиром и подписью.
4. Скелетон: в консоли на DevTools Network поставить Slow 3G или заблокировать `data/details*` (`read_network_requests` покажет адрес), раскрыть карточку: три полоски с мерцанием, при `prefers-reduced-motion` без мерцания.
5. Ошибка загрузки: временно заблокировать запрос индекса программ (в консоли `localStorage` не поможет; проще остановить сервер `python -m http.server` и перезагрузить страницу на шаге ответа): виден блок с красным текстом и кнопкой «Попробовать ещё раз». Вернуть сервер.
6. Тёмная тема и 800 px.

- [ ] **Step 9: Закоммитить**

```bash
git add index.html js/filter.js js/render.js js/main.js
git commit -m "$(cat <<'EOF'
Редизайн, срез 3: закреплённая панель каталога, скелетон, состояния ошибок

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Итоговая проверка и слияние

**Files:**
- Modify: `docs/HANDOFF.md` (короткая запись о статусе редизайна)

**Interfaces:**
- Consumes: всё сделанное в Задачах 1-6.
- Produces: слитая в `main` ветка `ui/redesign`, отчёт пользователю.

- [ ] **Step 1: Полные тесты обоих языков**

Run: `cd C:/Users/ORYX/dev/eligibility-tool && node --test && python -m unittest discover -s tools/tests -t .`
Expected: `node --test` все PASS (331), `unittest` OK. Если падает не связанный с редизайном Python-тест, записать это в отчёт и не чинить молча.

- [ ] **Step 2: Поиск остатков старой системы**

Run: `grep -nE "wizard-progress\b|100vh|#fff|#000" css/style.css index.html js/*.js; grep -c "" css/style.css; wc -c css/style.css`
Expected: `wizard-progress` встречается только в `wizard-progress-label` (id и класс подписи), `100vh`, `#fff`, `#000` не находятся, размер CSS не больше 30720 байт.

- [ ] **Step 3: Матрица ручной проверки**

Пройти в браузере и записать результат по каждой строке (пройдено или что сломано):

| Проверка | 375 px | 800 px | 1280 px |
|---|---|---|---|
| Старт и четыре шага анкеты, ошибка обязательного поля | | | |
| Ответ: сводка, календарь, кнопка «Все программы» | | | |
| Каталог: поиск, чипы, фильтры, пустая выдача | | | |
| Карточка: раскрытие, «Открыть сайт программы», «Объяснить» | | | |
| FAQ и конфиденциальность | | | |

Дополнительно: тёмная и светлая тема на каждом экране; клавиатура (Tab проходит всё в логичном порядке, фокус виден везде, Enter и пробел работают на `summary` и чипах); эмуляция `prefers-reduced-motion: reduce` (нет мерцания и сдвигов); масштаб текста браузера 200% без горизонтальной прокрутки. Снять скриншоты «до» (живой сайт `https://kuda-podat.vercel.app/`) и «после» (локально) для старта, ответа и карточки на 375 px.

- [ ] **Step 4: Запись в `docs/HANDOFF.md`**

В конец файла добавить раздел:

```markdown
## Статус на 2026-09-25: визуальный редизайн

- Спека: `docs/superpowers/specs/2026-09-25-visual-redesign-design.md`, план: `docs/superpowers/plans/2026-09-25-visual-redesign.md`.
- Сделано на ветке `ui/redesign`: новые токены и стили (`css/style.css`), индикатор шагов, календарь сроков в два столбца, закреплённая панель каталога, скелетоны и состояния ошибок, ссылка «к содержимому». Логика, `wording.js` и данные не менялись.
- `tests/css-guard.test.js` страхует связку «класс в HTML/JS есть, правила в CSS нет». При добавлении класса в разметку дописать правило в CSS.
- Не проверено: `404.html` (путь к CSS абсолютный, работает только на Pages), рендер кириллицы на iOS.
```

- [ ] **Step 5: Закоммитить запись**

```bash
git add docs/HANDOFF.md
git commit -m "$(cat <<'EOF'
Handoff: статус визуального редизайна

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Слить в `main` локально**

Робот пишет в `main` строки `lastVerified`, поэтому сначала подтянуть:

```bash
git fetch origin && git rebase origin/main
node --test
git checkout main && git merge --ff-only ui/redesign
```

Expected: fast-forward без конфликтов (робот трогает только `data/programs/*.json`), тесты после ребейза зелёные. Если ребейз дал конфликт, остановиться и показать его, не решать вслепую.

- [ ] **Step 7: Спросить пользователя перед пушем**

Пуш публикует сайт (Vercel и Pages деплоят из `main`), а на этой машине пуш к github.com рвётся и делается порциями. Показать пользователю итог (что сделано, скриншоты до и после, результат матрицы) и только после его «да» выполнить пуш: сначала `git gc --prune=now`, затем порциями `git push origin <sha>:refs/heads/main` с повтором на каждую порцию. Force push запрещён.
