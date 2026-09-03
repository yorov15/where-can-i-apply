# Сайт и движок вердикта — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Статическая страница, которая по анкете из семи полей выдаёт по каждой программе один из трёх вердиктов с причинами на русском.

**Architecture:** Семь чистых функций правил, по одной на поле профиля; сборщик вердикта над ними; отдельный слой отрисовки, который единственный трогает DOM. Логика не знает про HTML, отрисовка не знает про правила. Данные читаются из готового JSON.

**Tech Stack:** HTML, CSS, ES-модули без сборки. Тесты — встроенный `node --test`, ноль зависимостей. Node 24.

**Spec:** `docs/superpowers/specs/2026-09-03-eligibility-tool-design.md`

## Global Constraints

- Ноль внешних библиотек, ноль подключаемых шрифтов, ноль шагов сборки. `package.json` допустим только без зависимостей.
- ES-модули везде. `package.json` содержит `"type": "module"`.
- Тесты только встроенным раннером: `node --test tests/`.
- Тестируются `js/lib/`, `js/rules.js`, `js/verdict.js`, чистая часть `js/profile.js`. DOM не тестируется.
- `js/rules.js` не обращается к DOM, к сети и к `localStorage`. `js/render.js` — единственный файл, который трогает DOM.
- Интерфейс и все сообщения — по-русски.
- `data/index.json` не больше 100 КБ.
- **Данные о реальных программах в этом плане не создаются.** Всё, что похоже на программу, лежит в `tests/fixtures/` и помечено как выдуманное. Настоящие записи собирает план 2 по первоисточникам с цитатами.
- Уточнение к спеке: сигнатура правил — `check*(profile, rule, ctx)`, где `ctx = { deadline }`. Спека писала `(profile, rule)`; правилу возраста нужна дата дедлайна, а разные сигнатуры у семи однотипных функций хуже, чем один игнорируемый аргумент.
- Каждое правило возвращает `{ status, message }`, где `status` — строка `'pass'`, `'fail'` или `'unknown'`. У `pass` сообщение пустое: оно не показывается.

---

### Task 1: Каркас и возраст на дату

**Files:**
- Create: `package.json`
- Create: `js/lib/dates.js`
- Test: `tests/dates.test.js`

**Interfaces:**
- Consumes: ничего
- Produces: `ageAt(birthDate: string, onDate: string) -> number` — полных лет на дату. Обе даты в формате `YYYY-MM-DD`.

- [ ] **Step 1: Создать package.json**

```json
{
  "name": "eligibility-tool",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

- [ ] **Step 2: Написать падающий тест**

Создать `tests/dates.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageAt } from '../js/lib/dates.js';

test('в день рождения возраст уже полный', () => {
  assert.equal(ageAt('2008-08-09', '2026-08-09'), 18);
});

test('за день до дня рождения на год меньше', () => {
  assert.equal(ageAt('2008-08-09', '2026-08-08'), 17);
});

test('родившийся 29 февраля до 1 марта ещё не постарел', () => {
  assert.equal(ageAt('2008-02-29', '2027-02-28'), 18);
});

test('родившийся 29 февраля с 1 марта постарел', () => {
  assert.equal(ageAt('2008-02-29', '2027-03-01'), 19);
});
```

- [ ] **Step 3: Запустить тест и убедиться, что он падает**

Run: `node --test tests/dates.test.js`
Expected: FAIL — модуль `../js/lib/dates.js` не найден.

- [ ] **Step 4: Написать минимальную реализацию**

Создать `js/lib/dates.js`:

```js
// Полных лет на дату onDate. Обе даты — строки YYYY-MM-DD.
// Строки, а не Date: Date в браузере тянет часовой пояс, и человек,
// родившийся 1 января, в другом поясе оказывается на год моложе.
export function ageAt(birthDate, onDate) {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = onDate.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return age;
}
```

- [ ] **Step 5: Запустить тест и убедиться, что он проходит**

Run: `node --test tests/dates.test.js`
Expected: PASS, 4 теста.

- [ ] **Step 6: Коммит**

```bash
git add package.json js/lib/dates.js tests/dates.test.js
git commit -m "Считать возраст на произвольную дату"
```

---

### Task 2: Перевод шкал оценок в проценты

**Files:**
- Create: `js/lib/scales.js`
- Test: `tests/scales.test.js`

**Interfaces:**
- Consumes: ничего
- Produces: `SCALES: Record<string, number>` — максимум каждой шкалы; `toPercent(value: number, scale: string) -> number` — бросает `Error` на неизвестной шкале.

- [ ] **Step 1: Написать падающий тест**

Создать `tests/scales.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPercent } from '../js/lib/scales.js';

test('таджикская пятибалльная переводится в проценты', () => {
  assert.equal(toPercent(4.8, 'TJ_5'), 96);
});

test('проценты остаются процентами', () => {
  assert.equal(toPercent(70, 'PERCENT'), 70);
});

test('американская четырёхбалльная переводится в проценты', () => {
  assert.equal(toPercent(3.5, 'GPA_4'), 87.5);
});

test('корейская шкала 4.5 переводится в проценты', () => {
  assert.equal(toPercent(4.5, 'GPA_4_5'), 100);
});

test('неизвестная шкала — это ошибка, а не молчаливый ноль', () => {
  assert.throws(() => toPercent(4, 'ABRAKADABRA'), /Неизвестная шкала/);
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test tests/scales.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `js/lib/scales.js`:

```js
// Максимум каждой шкалы. Перевод линейный — это соглашение, а не факт:
// официального соответствия между таджикской пятибалльной и процентами
// не существует. Поэтому сравнение по баллу в правилах намеренно
// приблизительное, см. полосу неопределённости в checkGpa.
export const SCALES = {
  PERCENT: 100,
  TJ_5: 5,
  GPA_4: 4,
  GPA_4_5: 4.5,
};

export function toPercent(value, scale) {
  const max = SCALES[scale];
  if (max === undefined) throw new Error(`Неизвестная шкала: ${scale}`);
  // Округление до десятой доли процента. Без него 4.8 по пятибалльной даёт
  // 96.00000000000001 — двоичная дробь не ложится в десятичную ровно.
  // Точность выше десятой доли здесь всё равно выдуманная.
  return Math.round((value / max) * 1000) / 10;
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `node --test tests/scales.test.js`
Expected: PASS, 5 тестов.

- [ ] **Step 5: Коммит**

```bash
git add js/lib/scales.js tests/scales.test.js
git commit -m "Переводить шкалы оценок в проценты"
```

---

### Task 3: Состояние приёма по дедлайну

**Files:**
- Create: `js/lib/deadline.js`
- Test: `tests/deadline.test.js`

**Interfaces:**
- Consumes: ничего
- Produces: `deadlineState(deadline: object|null, today: string) -> 'open' | 'upcoming' | 'closed' | 'unknown'`. `deadline` — объект `{ opens, closes, recurring, confidence }` из записи программы, любое поле может быть `null`.

Это не часть вердикта. Дедлайн — отдельный признак карточки: не пройти по возрасту и опоздать на две недели — разные вещи с разными действиями.

- [ ] **Step 1: Написать падающий тест**

Создать `tests/deadline.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deadlineState } from '../js/lib/deadline.js';

const d = (opens, closes) => ({ opens, closes, recurring: 'annual', confidence: 'confirmed' });

test('приём идёт, если сегодня между датами', () => {
  assert.equal(deadlineState(d('2027-01-10', '2027-02-20'), '2027-01-15'), 'open');
});

test('приём ещё не начался', () => {
  assert.equal(deadlineState(d('2027-01-10', '2027-02-20'), '2026-12-31'), 'upcoming');
});

test('приём закрыт', () => {
  assert.equal(deadlineState(d('2027-01-10', '2027-02-20'), '2027-03-01'), 'closed');
});

test('день закрытия ещё считается открытым', () => {
  assert.equal(deadlineState(d('2027-01-10', '2027-02-20'), '2027-02-20'), 'open');
});

test('без даты закрытия состояние неизвестно', () => {
  assert.equal(deadlineState(d('2027-01-10', null), '2027-01-15'), 'unknown');
});

test('без объекта дедлайна состояние неизвестно', () => {
  assert.equal(deadlineState(null, '2027-01-15'), 'unknown');
});

test('без даты открытия приём считается идущим', () => {
  assert.equal(deadlineState(d(null, '2027-02-20'), '2027-01-15'), 'open');
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test tests/deadline.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `js/lib/deadline.js`:

```js
// Даты в формате YYYY-MM-DD сравниваются как строки: лексикографический
// порядок совпадает с хронологическим, парсить не нужно.
export function deadlineState(deadline, today) {
  if (!deadline || !deadline.closes) return 'unknown';
  if (today > deadline.closes) return 'closed';
  if (deadline.opens && today < deadline.opens) return 'upcoming';
  return 'open';
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `node --test tests/deadline.test.js`
Expected: PASS, 7 тестов.

- [ ] **Step 5: Коммит**

```bash
git add js/lib/deadline.js tests/deadline.test.js
git commit -m "Определять состояние приёма по датам дедлайна"
```

---

### Task 4: Правила по странам — гражданство и страна школы

**Files:**
- Create: `js/rules.js`
- Test: `tests/rules-country.test.js`

**Interfaces:**
- Consumes: ничего
- Produces:
  - `checkCitizenship(profile, rule, ctx) -> { status, message }`
  - `checkSchoolCountry(profile, rule, ctx) -> { status, message }`
  - Правило по стране: `{ allow: '*' | string[], deny: string[], evidence: string }` либо `null`.

- [ ] **Step 1: Написать падающий тест**

Создать `tests/rules-country.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCitizenship, checkSchoolCountry } from '../js/rules.js';

const me = { citizenship: 'TJ', schoolCountry: 'TJ' };

test('null-правило означает «в источнике этого нет», а не «ограничений нет»', () => {
  assert.equal(checkCitizenship(me, null).status, 'unknown');
});

test('звёздочка пускает всех', () => {
  const r = { allow: '*', deny: [], evidence: 'x' };
  assert.equal(checkCitizenship(me, r).status, 'pass');
});

test('запрет перевешивает звёздочку', () => {
  const r = { allow: '*', deny: ['TJ'], evidence: 'x' };
  const got = checkCitizenship(me, r);
  assert.equal(got.status, 'fail');
  assert.match(got.message, /не принимает/);
});

test('гражданство есть в списке', () => {
  const r = { allow: ['TJ', 'UZ'], deny: [], evidence: 'x' };
  assert.equal(checkCitizenship(me, r).status, 'pass');
});

test('гражданства нет в списке', () => {
  const r = { allow: ['KZ', 'UZ'], deny: [], evidence: 'x' };
  assert.equal(checkCitizenship(me, r).status, 'fail');
});

test('незаполненное поле профиля даёт unknown с текстом про пользователя', () => {
  const r = { allow: '*', deny: [], evidence: 'x' };
  const got = checkCitizenship({}, r);
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /Ты не указал/);
});

test('страна школы проверяется отдельно от гражданства', () => {
  const r = { allow: ['TJ'], deny: [], evidence: 'x' };
  const other = { citizenship: 'TJ', schoolCountry: 'RU' };
  assert.equal(checkSchoolCountry(other, r).status, 'fail');
});

test('у pass сообщение пустое', () => {
  const r = { allow: '*', deny: [], evidence: 'x' };
  assert.equal(checkCitizenship(me, r).message, '');
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test tests/rules-country.test.js`
Expected: FAIL — модуль `../js/rules.js` не найден.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `js/rules.js`:

```js
// Семь функций правил, по одной на поле профиля. Каждая знает про своё
// поле и больше ни про что: ошибку в правиле возраста нельзя занести в
// правило языка. Ни одна из них не трогает DOM, сеть и localStorage.
//
// Каждая возвращает { status, message }, где status — 'pass', 'fail' или
// 'unknown'. У pass сообщение пустое: человеку не нужно читать семь строк
// о том, что у него всё в порядке.
//
// rule === null означает «в источнике этого нет» и даёт unknown. Явное
// «ограничения нет» записывается объектом с пустыми значениями и цитатой,
// которая это подтверждает, — такой объект даёт pass.

const r = (status, message = '') => ({ status, message });

function countryRule(value, rule, labels) {
  if (!rule) return r('unknown', labels.noRule);
  if (!value) return r('unknown', labels.noValue);
  if (Array.isArray(rule.deny) && rule.deny.includes(value)) return r('fail', labels.denied);
  if (rule.allow === '*') return r('pass');
  if (Array.isArray(rule.allow) && rule.allow.includes(value)) return r('pass');
  return r('fail', labels.notInList);
}

export function checkCitizenship(profile, rule, ctx) {
  return countryRule(profile.citizenship, rule, {
    noRule: 'Программа не указывает, граждан каких стран принимает',
    noValue: 'Ты не указал гражданство',
    denied: 'Программа не принимает граждан твоей страны',
    notInList: 'Твоего гражданства нет в списке стран программы',
  });
}

export function checkSchoolCountry(profile, rule, ctx) {
  return countryRule(profile.schoolCountry, rule, {
    noRule: 'Программа не указывает, в какой стране должна быть окончена школа',
    noValue: 'Ты не указал, в какой стране окончил школу',
    denied: 'Программа не принимает аттестаты твоей страны',
    notInList: 'Твоей страны школы нет в списке программы',
  });
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `node --test tests/rules-country.test.js`
Expected: PASS, 8 тестов.

- [ ] **Step 5: Коммит**

```bash
git add js/rules.js tests/rules-country.test.js
git commit -m "Правила по гражданству и стране школы"
```

---

### Task 5: Правила по школе — сколько лет и год выпуска

**Files:**
- Modify: `js/rules.js`
- Test: `tests/rules-school.test.js`

**Interfaces:**
- Consumes: `js/rules.js` из задачи 4
- Produces:
  - `checkSchoolYears(profile, rule, ctx)`, правило `{ min: number|null, evidence }` либо `null`
  - `checkGraduationYear(profile, rule, ctx)`, правило `{ min: number|null, max: number|null, evidence }` либо `null`

- [ ] **Step 1: Написать падающий тест**

Создать `tests/rules-school.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSchoolYears, checkGraduationYear } from '../js/rules.js';

const me = { schoolYears: 11, graduationYear: 2027 };

test('одиннадцати лет не хватает там, где нужно двенадцать', () => {
  const got = checkSchoolYears(me, { min: 12, evidence: 'x' });
  assert.equal(got.status, 'fail');
  assert.match(got.message, /12/);
  assert.match(got.message, /11/);
});

test('одиннадцати лет хватает там, где нужно одиннадцать', () => {
  assert.equal(checkSchoolYears(me, { min: 11, evidence: 'x' }).status, 'pass');
});

test('явное «ограничения нет» даёт pass, а не unknown', () => {
  assert.equal(checkSchoolYears(me, { min: null, evidence: 'No minimum' }).status, 'pass');
});

test('отсутствие правила даёт unknown', () => {
  assert.equal(checkSchoolYears(me, null).status, 'unknown');
});

test('незаполненное поле профиля даёт unknown', () => {
  assert.equal(checkSchoolYears({}, { min: 12, evidence: 'x' }).status, 'unknown');
});

test('выпуск раньше нижней границы — отказ', () => {
  const got = checkGraduationYear(me, { min: 2028, max: null, evidence: 'x' });
  assert.equal(got.status, 'fail');
  assert.match(got.message, /2028/);
});

test('выпуск позже верхней границы — отказ', () => {
  assert.equal(checkGraduationYear(me, { min: null, max: 2026, evidence: 'x' }).status, 'fail');
});

test('выпуск внутри границ — проходит', () => {
  assert.equal(checkGraduationYear(me, { min: 2025, max: 2027, evidence: 'x' }).status, 'pass');
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test tests/rules-school.test.js`
Expected: FAIL — `checkSchoolYears is not a function`.

- [ ] **Step 3: Дописать реализацию**

Добавить в конец `js/rules.js`:

```js
export function checkSchoolYears(profile, rule, ctx) {
  if (!rule) return r('unknown', 'Программа не указывает, сколько лет школы нужно');
  if (profile.schoolYears == null) return r('unknown', 'Ты не указал, сколько лет учился в школе');
  if (rule.min == null) return r('pass');
  if (profile.schoolYears < rule.min) {
    return r('fail', `Программа требует ${rule.min} лет школы, у тебя ${profile.schoolYears}`);
  }
  return r('pass');
}

export function checkGraduationYear(profile, rule, ctx) {
  if (!rule) return r('unknown', 'Программа не указывает, в каком году нужно окончить школу');
  if (profile.graduationYear == null) return r('unknown', 'Ты не указал год выпуска');
  if (rule.min != null && profile.graduationYear < rule.min) {
    return r('fail', `Программа берёт выпускников не раньше ${rule.min} года, у тебя ${profile.graduationYear}`);
  }
  if (rule.max != null && profile.graduationYear > rule.max) {
    return r('fail', `Программа берёт выпускников не позже ${rule.max} года, у тебя ${profile.graduationYear}`);
  }
  return r('pass');
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `node --test tests/rules-school.test.js`
Expected: PASS, 8 тестов.

- [ ] **Step 5: Коммит**

```bash
git add js/rules.js tests/rules-school.test.js
git commit -m "Правила по годам школы и году выпуска"
```

---

### Task 6: Правило по возрасту

**Files:**
- Modify: `js/rules.js`
- Test: `tests/rules-age.test.js`

**Interfaces:**
- Consumes: `ageAt` из `js/lib/dates.js`, `js/rules.js` из задач 4–5
- Produces: `checkAge(profile, rule, ctx)`. Правило: `{ min: number|null, max: number|null, asOf: 'deadline' | 'YYYY-MM-DD', evidence }` либо `null`. `ctx = { deadline }`.

`asOf: 'deadline'` — возраст считается на `ctx.deadline.closes`. Иначе `asOf` содержит явную дату: у MEXT возраст считается на 1 апреля года заезда, и эта дата записывается в данные целиком.

Если `deadline.confidence !== 'confirmed'`, а возраст отличается от предела не больше чем на год, результат `unknown`. Причина: даты приёма взяты по прошлому году и могут сдвинуться на недели, а пограничный возраст на несуществующей дате — ровно то место, где ошибка стоит человеку года.

- [ ] **Step 1: Написать падающий тест**

Создать `tests/rules-age.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAge } from '../js/rules.js';

const me = { birthDate: '2008-08-09' };
const confirmed = { deadline: { opens: '2027-01-10', closes: '2027-02-20', confidence: 'confirmed' } };
const expected = { deadline: { opens: '2027-01-10', closes: '2027-02-20', confidence: 'expected' } };
const rule = (max) => ({ min: null, max, asOf: 'deadline', evidence: 'x' });

test('проходит по возрасту с запасом', () => {
  assert.equal(checkAge(me, rule(21), confirmed).status, 'pass');
});

test('не проходит по возрасту', () => {
  const got = checkAge(me, rule(17), confirmed);
  assert.equal(got.status, 'fail');
  assert.match(got.message, /18/);
  assert.match(got.message, /17/);
});

test('ровно на пределе при подтверждённой дате — проходит', () => {
  assert.equal(checkAge(me, rule(18), confirmed).status, 'pass');
});

test('ровно на пределе при неподтверждённой дате — надо проверить', () => {
  const got = checkAge(me, rule(18), expected);
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /не подтверждена/);
});

test('далеко от предела при неподтверждённой дате — обычный ответ', () => {
  assert.equal(checkAge(me, rule(25), expected).status, 'pass');
});

test('явная дата в asOf используется вместо дедлайна', () => {
  const r = { min: null, max: 18, asOf: '2027-04-01', evidence: 'x' };
  assert.equal(checkAge(me, r, confirmed).status, 'pass');
});

test('без даты закрытия возраст посчитать не на что', () => {
  const ctx = { deadline: { opens: null, closes: null, confidence: 'expected' } };
  assert.equal(checkAge(me, rule(21), ctx).status, 'unknown');
});

test('нижняя граница возраста тоже работает', () => {
  const r = { min: 19, max: null, asOf: 'deadline', evidence: 'x' };
  assert.equal(checkAge(me, r, confirmed).status, 'fail');
});

test('незаполненная дата рождения даёт unknown', () => {
  assert.equal(checkAge({}, rule(21), confirmed).status, 'unknown');
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test tests/rules-age.test.js`
Expected: FAIL — `checkAge is not a function`.

- [ ] **Step 3: Дописать реализацию**

Добавить импорт в начало `js/rules.js`:

```js
import { ageAt } from './lib/dates.js';
```

Добавить в конец `js/rules.js`:

```js
export function checkAge(profile, rule, ctx) {
  if (!rule) return r('unknown', 'Программа не указывает ограничение по возрасту');
  if (!profile.birthDate) return r('unknown', 'Ты не указал дату рождения');

  const on = rule.asOf === 'deadline' ? ctx?.deadline?.closes : rule.asOf;
  if (!on) return r('unknown', 'Дата, на которую программа считает возраст, неизвестна');

  const age = ageAt(profile.birthDate, on);
  const shaky = ctx?.deadline?.confidence !== 'confirmed' && rule.asOf === 'deadline';

  if (rule.max != null) {
    if (shaky && Math.abs(age - rule.max) <= 1) {
      return r('unknown', `На дату приёма тебе будет около ${age}, предел программы ${rule.max}, но дата приёма ещё не подтверждена — проверь на сайте`);
    }
    if (age > rule.max) {
      return r('fail', `На дату приёма тебе будет ${age}, программа берёт до ${rule.max}`);
    }
  }
  if (rule.min != null && age < rule.min) {
    return r('fail', `На дату приёма тебе будет ${age}, программа берёт с ${rule.min}`);
  }
  return r('pass');
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `node --test tests/rules-age.test.js`
Expected: PASS, 9 тестов.

- [ ] **Step 5: Коммит**

```bash
git add js/rules.js tests/rules-age.test.js
git commit -m "Правило по возрасту с учётом даты отсчёта"
```

---

### Task 7: Правило по среднему баллу

**Files:**
- Modify: `js/rules.js`
- Test: `tests/rules-gpa.test.js`

**Interfaces:**
- Consumes: `toPercent` из `js/lib/scales.js`
- Produces: `checkGpa(profile, rule, ctx)`, `GPA_BAND: number`. Правило: `{ min: number|null, scale: string, evidence }` либо `null`. Профиль: `gpa: { value, scale }`.

Полоса неопределённости `GPA_BAND = 5` процентных пунктов. Она покрывает сразу две погрешности: перевод между шкалами — соглашение, а не факт, и входное число — балл за текущую четверть, тогда как программы спрашивают средний по аттестату. Внутри полосы честный ответ — «проверь сам».

- [ ] **Step 1: Написать падающий тест**

Создать `tests/rules-gpa.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkGpa } from '../js/rules.js';

const me = (value, scale = 'TJ_5') => ({ gpa: { value, scale } });
const need = (min, scale = 'PERCENT') => ({ min, scale, evidence: 'x' });

test('балл заметно выше порога — проходит', () => {
  assert.equal(checkGpa(me(4.8), need(70)).status, 'pass');
});

test('балл заметно ниже порога — отказ', () => {
  const got = checkGpa(me(3.0), need(85));
  assert.equal(got.status, 'fail');
});

test('балл внутри полосы неопределённости — надо проверить', () => {
  // 4.8 по пятибалльной — это 96%, порог 94% отличается на 2 пункта
  const got = checkGpa(me(4.8), need(94));
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /проверь/);
});

test('ровно на границе полосы — ещё надо проверить', () => {
  // 96% против порога 91% — ровно 5 пунктов
  assert.equal(checkGpa(me(4.8), need(91)).status, 'unknown');
});

test('шкалы приводятся к одной, а не сравниваются как числа', () => {
  // 3.6 по четырёхбалльной это 90%, порог 3.0 по пятибалльной это 60%
  assert.equal(checkGpa(me(3.6, 'GPA_4'), need(3.0, 'TJ_5')).status, 'pass');
});

test('явное «порога нет» даёт pass', () => {
  assert.equal(checkGpa(me(4.8), need(null)).status, 'pass');
});

test('отсутствие правила даёт unknown', () => {
  assert.equal(checkGpa(me(4.8), null).status, 'unknown');
});

test('незаполненный балл даёт unknown', () => {
  assert.equal(checkGpa({}, need(70)).status, 'unknown');
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test tests/rules-gpa.test.js`
Expected: FAIL — `checkGpa is not a function`.

- [ ] **Step 3: Дописать реализацию**

Добавить вторую строку импорта в начало `js/rules.js`, рядом с импортом `ageAt`:

```js
import { toPercent } from './lib/scales.js';
```

Добавить в конец `js/rules.js`:

```js
// Полоса неопределённости в процентных пунктах. Внутри неё движок
// отказывается давать точный ответ, потому что точного ответа там нет:
// перевод шкал приблизителен, а балл за четверть не равен баллу аттестата.
export const GPA_BAND = 5;

export function checkGpa(profile, rule, ctx) {
  if (!rule) return r('unknown', 'Программа не указывает требование к среднему баллу');
  if (!profile.gpa || profile.gpa.value == null) return r('unknown', 'Ты не указал средний балл');
  if (rule.min == null) return r('pass');

  const mine = toPercent(profile.gpa.value, profile.gpa.scale);
  const need = toPercent(rule.min, rule.scale);

  if (Math.abs(mine - need) <= GPA_BAND) {
    return r('unknown', `Твой балл близко к порогу программы, а шкалы разные — проверь на сайте программы`);
  }
  if (mine < need) {
    return r('fail', `Программа требует ${rule.min} по шкале ${rule.scale}, твой балл ниже`);
  }
  return r('pass');
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `node --test tests/rules-gpa.test.js`
Expected: PASS, 8 тестов.

- [ ] **Step 5: Коммит**

```bash
git add js/rules.js tests/rules-gpa.test.js
git commit -m "Правило по среднему баллу с полосой неопределённости"
```

---

### Task 8: Правило по языку

**Files:**
- Modify: `js/rules.js`
- Test: `tests/rules-language.test.js`

**Interfaces:**
- Consumes: `js/rules.js` из задач 4–7
- Produces: `checkLanguage(profile, rule, ctx)`. Правило: `{ anyOf: [{ test: string, min: number }], evidence }` либо `null`. Профиль: `languageTests: [{ test: string, score: number|null }]`.

Отсутствие сертификата — `unknown`, а не `fail`: экзамен можно сдать, и человеку нужно видеть, какие двери откроются после IELTS. `fail` только когда сертификат есть и результат ниже порога.

- [ ] **Step 1: Написать падающий тест**

Создать `tests/rules-language.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLanguage } from '../js/rules.js';

const need = { anyOf: [{ test: 'IELTS', min: 6.0 }, { test: 'TOEFL_IBT', min: 72 }], evidence: 'x' };

test('балл выше порога — проходит', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 7.0 }] };
  assert.equal(checkLanguage(me, need).status, 'pass');
});

test('хватает любого одного из перечисленных', () => {
  const me = { languageTests: [{ test: 'TOEFL_IBT', score: 90 }] };
  assert.equal(checkLanguage(me, need).status, 'pass');
});

test('сертификата нет вовсе — надо проверить, а не отказ', () => {
  const me = { languageTests: [] };
  const got = checkLanguage(me, need);
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /можно сдать/);
});

test('сертификат отмечен без результата — надо проверить', () => {
  const me = { languageTests: [{ test: 'IELTS', score: null }] };
  const got = checkLanguage(me, need);
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /без результата/);
});

test('сертификат есть, но балл ниже — отказ', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 5.0 }] };
  assert.equal(checkLanguage(me, need).status, 'fail');
});

test('один сертификат ниже порога, другой выше — проходит', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 5.0 }, { test: 'TOEFL_IBT', score: 90 }] };
  assert.equal(checkLanguage(me, need).status, 'pass');
});

test('пустой список требований — проходит', () => {
  const me = { languageTests: [] };
  assert.equal(checkLanguage(me, { anyOf: [], evidence: 'No language requirement' }).status, 'pass');
});

test('отсутствие правила даёт unknown', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 7.0 }] };
  assert.equal(checkLanguage(me, null).status, 'unknown');
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test tests/rules-language.test.js`
Expected: FAIL — `checkLanguage is not a function`.

- [ ] **Step 3: Дописать реализацию**

Добавить в конец `js/rules.js`:

```js
export function checkLanguage(profile, rule, ctx) {
  if (!rule) return r('unknown', 'Программа не указывает требование к языку');
  const need = rule.anyOf ?? [];
  if (need.length === 0) return r('pass');

  const mine = profile.languageTests ?? [];
  let sawEmpty = false;
  let sawBelow = false;

  for (const req of need) {
    const got = mine.find((x) => x.test === req.test);
    if (!got) continue;
    if (got.score == null) { sawEmpty = true; continue; }
    if (got.score >= req.min) return r('pass');
    sawBelow = true;
  }

  const list = need.map((x) => `${x.test} ${x.min}`).join(' или ');
  if (sawEmpty) return r('unknown', `Ты отметил экзамен без результата. Нужен ${list}`);
  if (sawBelow) return r('fail', `Нужен ${list}, твой результат ниже`);
  return r('unknown', `Нужен ${list}. Сертификата у тебя пока нет — экзамен можно сдать`);
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `node --test tests/rules-language.test.js`
Expected: PASS, 8 тестов.

- [ ] **Step 5: Коммит**

```bash
git add js/rules.js tests/rules-language.test.js
git commit -m "Правило по языковому сертификату"
```

---

### Task 9: Сборка вердикта из семи правил

**Files:**
- Create: `js/verdict.js`
- Test: `tests/verdict.test.js`

**Interfaces:**
- Consumes: все семь функций из `js/rules.js`
- Produces:
  - `FIELDS: [string, Function][]` — порядок полей и их правила
  - `evaluate(profile, program) -> { status: 'yes'|'no'|'check', reasons: [{ field, status, message }] }`

Одно `fail` перевешивает всё, процентов совпадения нет: условия правомочности не складываются, а умножаются. Причины идут сначала отказные, потом требующие проверки; `pass` не показываются.

- [ ] **Step 1: Написать падающий тест**

Создать `tests/verdict.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../js/verdict.js';

const me = {
  citizenship: 'TJ',
  schoolCountry: 'TJ',
  schoolYears: 11,
  graduationYear: 2027,
  birthDate: '2008-08-09',
  gpa: { value: 4.8, scale: 'TJ_5' },
  languageTests: [{ test: 'IELTS', score: 7.0 }],
};

const full = {
  deadline: { opens: '2027-01-10', closes: '2027-02-20', confidence: 'confirmed' },
  eligibility: {
    citizenship: { allow: '*', deny: [], evidence: 'x' },
    schoolCountry: { allow: '*', deny: [], evidence: 'x' },
    schoolYears: { min: 11, evidence: 'x' },
    graduationYear: { min: 2025, max: 2028, evidence: 'x' },
    age: { min: null, max: 25, asOf: 'deadline', evidence: 'x' },
    gpa: { min: 70, scale: 'PERCENT', evidence: 'x' },
    language: { anyOf: [{ test: 'IELTS', min: 6.0 }], evidence: 'x' },
  },
};

test('все правила проходят — зелёный без причин', () => {
  const got = evaluate(me, full);
  assert.equal(got.status, 'yes');
  assert.deepEqual(got.reasons, []);
});

test('одно правило отказало — красный', () => {
  const p = structuredClone(full);
  p.eligibility.schoolYears = { min: 12, evidence: 'x' };
  const got = evaluate(me, p);
  assert.equal(got.status, 'no');
  assert.equal(got.reasons[0].field, 'schoolYears');
});

test('отказ перевешивает неизвестность', () => {
  const p = structuredClone(full);
  p.eligibility.schoolYears = { min: 12, evidence: 'x' };
  p.eligibility.language = null;
  const got = evaluate(me, p);
  assert.equal(got.status, 'no');
  assert.equal(got.reasons[0].status, 'fail');
  assert.equal(got.reasons[1].status, 'unknown');
});

test('только неизвестность — жёлтый', () => {
  const p = structuredClone(full);
  p.eligibility.gpa = null;
  const got = evaluate(me, p);
  assert.equal(got.status, 'check');
  assert.equal(got.reasons.length, 1);
});

test('отсутствие блока eligibility целиком даёт жёлтый по всем семи полям', () => {
  const got = evaluate(me, { deadline: full.deadline });
  assert.equal(got.status, 'check');
  assert.equal(got.reasons.length, 7);
});

test('текстовые условия на цвет не влияют', () => {
  const p = structuredClone(full);
  p.textConditions = [{ ru: 'Нельзя, если уже учишься в стране программы', evidence: 'x' }];
  assert.equal(evaluate(me, p).status, 'yes');
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test tests/verdict.test.js`
Expected: FAIL — модуль `../js/verdict.js` не найден.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `js/verdict.js`:

```js
import {
  checkCitizenship,
  checkSchoolCountry,
  checkSchoolYears,
  checkGraduationYear,
  checkAge,
  checkGpa,
  checkLanguage,
} from './rules.js';

// Порядок полей задаёт порядок причин в выдаче.
export const FIELDS = [
  ['citizenship', checkCitizenship],
  ['schoolCountry', checkSchoolCountry],
  ['schoolYears', checkSchoolYears],
  ['graduationYear', checkGraduationYear],
  ['age', checkAge],
  ['gpa', checkGpa],
  ['language', checkLanguage],
];

// Одно fail перевешивает всё. Процентов совпадения здесь нет намеренно:
// если недостающая часть — это гражданство, любые проценты равны нулю.
// textConditions в цвет не входят: они есть почти у каждой программы, и
// если каждое красит в жёлтый, светофор перестаёт различать.
export function evaluate(profile, program) {
  const ctx = { deadline: program.deadline ?? null };
  const results = FIELDS.map(([field, fn]) => ({
    field,
    ...fn(profile, program.eligibility?.[field] ?? null, ctx),
  }));

  const fails = results.filter((x) => x.status === 'fail');
  const unknowns = results.filter((x) => x.status === 'unknown');

  const status = fails.length ? 'no' : unknowns.length ? 'check' : 'yes';
  return { status, reasons: [...fails, ...unknowns] };
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `node --test tests/`
Expected: PASS, все файлы тестов зелёные.

- [ ] **Step 5: Коммит**

```bash
git add js/verdict.js tests/verdict.test.js
git commit -m "Собрать вердикт из семи правил"
```

---

### Task 10: Выдуманные записи программ для проверки целиком

**Files:**
- Create: `tests/fixtures/README.md`
- Create: `tests/fixtures/index.json`
- Create: `tests/fixtures/programs/otkrytaya.json`
- Create: `tests/fixtures/programs/zakrytaya.json`
- Create: `tests/fixtures/programs/dyrjavaya.json`
- Test: `tests/fixtures.test.js`

**Interfaces:**
- Consumes: `evaluate` из `js/verdict.js`
- Produces: три файла-фикстуры в форме настоящей записи программы и `tests/fixtures/index.json` в форме настоящего индекса `{ generatedAt, programs: [] }`, где каждый элемент — запись без блоков `evidence` и `textConditions`.

**Эти три файла — выдуманные.** Ни одно значение в них не взято из реального источника, и они никогда не переезжают в `data/`. Настоящие записи собирает план 2 по первоисточникам с цитатами.

- [ ] **Step 1: Написать предупреждение в папке фикстур**

Создать `tests/fixtures/README.md`:

```markdown
# Выдуманные данные

Файлы в этой папке придуманы для тестов. Ни одно значение здесь не взято
из первоисточника и ни одно не является правдой о реальной программе.

Копировать их в `data/` нельзя. Настоящие записи собираются конвейером
из `tools/` по утверждённым источникам, с цитатой на каждое поле.
```

- [ ] **Step 2: Написать падающий тест**

Создать `tests/fixtures.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate } from '../js/verdict.js';

const load = async (name) =>
  JSON.parse(await readFile(new URL(`./fixtures/programs/${name}.json`, import.meta.url), 'utf8'));

const me = {
  citizenship: 'TJ',
  schoolCountry: 'TJ',
  schoolYears: 11,
  graduationYear: 2027,
  birthDate: '2008-08-09',
  gpa: { value: 4.8, scale: 'TJ_5' },
  languageTests: [{ test: 'IELTS', score: 7.0 }],
};

test('открытая программа даёт зелёный', async () => {
  assert.equal(evaluate(me, await load('otkrytaya')).status, 'yes');
});

test('закрытая программа даёт красный с причиной по гражданству', async () => {
  const got = evaluate(me, await load('zakrytaya'));
  assert.equal(got.status, 'no');
  assert.equal(got.reasons[0].field, 'citizenship');
});

test('дырявая запись даёт жёлтый, а не зелёный', async () => {
  const got = evaluate(me, await load('dyrjavaya'));
  assert.equal(got.status, 'check');
  assert.ok(got.reasons.length >= 1);
});

test('индекс фикстур перечисляет все три программы', async () => {
  const index = JSON.parse(
    await readFile(new URL('./fixtures/index.json', import.meta.url), 'utf8')
  );
  assert.equal(index.programs.length, 3);
});
```

- [ ] **Step 3: Запустить тест и убедиться, что он падает**

Run: `node --test tests/fixtures.test.js`
Expected: FAIL — файлы фикстур не найдены.

- [ ] **Step 4: Создать фикстуры**

Создать `tests/fixtures/programs/otkrytaya.json`:

```json
{
  "id": "otkrytaya",
  "status": "published",
  "name": { "ru": "Выдуманная открытая программа", "orig": "Fixture Open" },
  "hostCountry": "XX",
  "level": "bachelor",
  "coverage": { "tuition": true, "living": true, "travel": false, "note": { "ru": "Выдумано" } },
  "eligibility": {
    "citizenship": { "allow": "*", "deny": [], "evidence": "выдумано" },
    "schoolCountry": { "allow": "*", "deny": [], "evidence": "выдумано" },
    "schoolYears": { "min": 11, "evidence": "выдумано" },
    "graduationYear": { "min": 2025, "max": 2028, "evidence": "выдумано" },
    "age": { "min": null, "max": 25, "asOf": "deadline", "evidence": "выдумано" },
    "gpa": { "min": 70, "scale": "PERCENT", "evidence": "выдумано" },
    "language": { "anyOf": [{ "test": "IELTS", "min": 6.0 }], "evidence": "выдумано" }
  },
  "textConditions": [],
  "deadline": { "opens": "2027-01-10", "closes": "2027-02-20", "recurring": "annual", "confidence": "confirmed" },
  "applyUrl": "https://example.invalid/",
  "coversInstitutions": { "kind": "list", "approxCount": 1, "note": { "ru": "Выдумано" } },
  "source": { "url": "https://example.invalid/", "lastVerified": "2026-09-03", "contentHash": "sha256:0", "humanChecked": false }
}
```

Создать `tests/fixtures/programs/zakrytaya.json`:

```json
{
  "id": "zakrytaya",
  "status": "published",
  "name": { "ru": "Выдуманная закрытая программа", "orig": "Fixture Closed" },
  "hostCountry": "XX",
  "level": "bachelor",
  "coverage": { "tuition": true, "living": false, "travel": false, "note": { "ru": "Выдумано" } },
  "eligibility": {
    "citizenship": { "allow": "*", "deny": ["TJ"], "evidence": "выдумано" },
    "schoolCountry": { "allow": "*", "deny": [], "evidence": "выдумано" },
    "schoolYears": { "min": 12, "evidence": "выдумано" },
    "graduationYear": { "min": 2025, "max": 2028, "evidence": "выдумано" },
    "age": { "min": null, "max": 25, "asOf": "deadline", "evidence": "выдумано" },
    "gpa": { "min": 70, "scale": "PERCENT", "evidence": "выдумано" },
    "language": { "anyOf": [{ "test": "IELTS", "min": 6.0 }], "evidence": "выдумано" }
  },
  "textConditions": [
    { "ru": "Выдуманное условие, которое инструмент не считает", "evidence": "выдумано" }
  ],
  "deadline": { "opens": "2027-01-10", "closes": "2027-02-20", "recurring": "annual", "confidence": "confirmed" },
  "applyUrl": "https://example.invalid/",
  "coversInstitutions": { "kind": "list", "approxCount": 1, "note": { "ru": "Выдумано" } },
  "source": { "url": "https://example.invalid/", "lastVerified": "2026-09-03", "contentHash": "sha256:0", "humanChecked": false }
}
```

Создать `tests/fixtures/programs/dyrjavaya.json`:

```json
{
  "id": "dyrjavaya",
  "status": "published",
  "name": { "ru": "Выдуманная программа с дырами", "orig": "Fixture Incomplete" },
  "hostCountry": "XX",
  "level": "bachelor",
  "coverage": { "tuition": true, "living": null, "travel": null, "note": { "ru": "Выдумано" } },
  "eligibility": {
    "citizenship": { "allow": "*", "deny": [], "evidence": "выдумано" },
    "schoolCountry": null,
    "schoolYears": null,
    "graduationYear": { "min": 2025, "max": null, "evidence": "выдумано" },
    "age": { "min": null, "max": 18, "asOf": "deadline", "evidence": "выдумано" },
    "gpa": null,
    "language": null
  },
  "textConditions": [],
  "deadline": { "opens": null, "closes": "2027-02-20", "recurring": "annual", "confidence": "expected" },
  "applyUrl": "https://example.invalid/",
  "coversInstitutions": { "kind": "chosen-in-application", "approxCount": 12, "note": { "ru": "Выдумано" } },
  "source": { "url": "https://example.invalid/", "lastVerified": "2026-09-03", "contentHash": "sha256:0", "humanChecked": false }
}
```

Создать `tests/fixtures/index.json`:

```json
{
  "generatedAt": "2026-09-03",
  "programs": [
    {
      "id": "otkrytaya",
      "name": { "ru": "Выдуманная открытая программа", "orig": "Fixture Open" },
      "hostCountry": "XX",
      "level": "bachelor",
      "coverage": { "tuition": true, "living": true, "travel": false },
      "eligibility": {
        "citizenship": { "allow": "*", "deny": [] },
        "schoolCountry": { "allow": "*", "deny": [] },
        "schoolYears": { "min": 11 },
        "graduationYear": { "min": 2025, "max": 2028 },
        "age": { "min": null, "max": 25, "asOf": "deadline" },
        "gpa": { "min": 70, "scale": "PERCENT" },
        "language": { "anyOf": [{ "test": "IELTS", "min": 6.0 }] }
      },
      "deadline": { "opens": "2027-01-10", "closes": "2027-02-20", "recurring": "annual", "confidence": "confirmed" }
    },
    {
      "id": "zakrytaya",
      "name": { "ru": "Выдуманная закрытая программа", "orig": "Fixture Closed" },
      "hostCountry": "XX",
      "level": "bachelor",
      "coverage": { "tuition": true, "living": false, "travel": false },
      "eligibility": {
        "citizenship": { "allow": "*", "deny": ["TJ"] },
        "schoolCountry": { "allow": "*", "deny": [] },
        "schoolYears": { "min": 12 },
        "graduationYear": { "min": 2025, "max": 2028 },
        "age": { "min": null, "max": 25, "asOf": "deadline" },
        "gpa": { "min": 70, "scale": "PERCENT" },
        "language": { "anyOf": [{ "test": "IELTS", "min": 6.0 }] }
      },
      "deadline": { "opens": "2027-01-10", "closes": "2027-02-20", "recurring": "annual", "confidence": "confirmed" }
    },
    {
      "id": "dyrjavaya",
      "name": { "ru": "Выдуманная программа с дырами", "orig": "Fixture Incomplete" },
      "hostCountry": "XX",
      "level": "bachelor",
      "coverage": { "tuition": true, "living": null, "travel": null },
      "eligibility": {
        "citizenship": { "allow": "*", "deny": [] },
        "schoolCountry": null,
        "schoolYears": null,
        "graduationYear": { "min": 2025, "max": null },
        "age": { "min": null, "max": 18, "asOf": "deadline" },
        "gpa": null,
        "language": null
      },
      "deadline": { "opens": null, "closes": "2027-02-20", "recurring": "annual", "confidence": "expected" }
    }
  ]
}
```

- [ ] **Step 5: Запустить тест и убедиться, что он проходит**

Run: `node --test tests/`
Expected: PASS, все файлы тестов зелёные.

- [ ] **Step 6: Коммит**

```bash
git add tests/fixtures tests/fixtures.test.js
git commit -m "Выдуманные записи программ для сквозной проверки вердикта"
```

---

### Task 11: Профиль — чтение, запись, проверка заполненности

**Files:**
- Create: `js/profile.js`
- Test: `tests/profile.test.js`

**Interfaces:**
- Consumes: ничего
- Produces:
  - `STORAGE_KEY: string`
  - `emptyProfile() -> object` — профиль со всеми семью ключами, значения пустые
  - `saveProfile(profile, storage) -> void`
  - `loadProfile(storage) -> object` — при любой поломке возвращает `emptyProfile()`
  - `missingFields(profile) -> string[]` — имена незаполненных полей

`storage` передаётся аргументом, а не берётся из `localStorage` напрямую: так функции проверяются тестом без браузера, и файл остаётся чистым от глобальных объектов.

- [ ] **Step 1: Написать падающий тест**

Создать `tests/profile.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProfile, saveProfile, loadProfile, missingFields } from '../js/profile.js';

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
}

const filled = {
  citizenship: 'TJ',
  schoolCountry: 'TJ',
  schoolYears: 11,
  graduationYear: 2027,
  birthDate: '2008-08-09',
  gpa: { value: 4.8, scale: 'TJ_5' },
  languageTests: [{ test: 'IELTS', score: 7.0 }],
};

test('пустой профиль содержит все семь ключей', () => {
  assert.deepEqual(Object.keys(emptyProfile()).sort(), [
    'birthDate', 'citizenship', 'gpa', 'graduationYear',
    'languageTests', 'schoolCountry', 'schoolYears',
  ]);
});

test('профиль переживает запись и чтение', () => {
  const s = fakeStorage();
  saveProfile(filled, s);
  assert.deepEqual(loadProfile(s), filled);
});

test('пустое хранилище даёт пустой профиль, а не падение', () => {
  assert.deepEqual(loadProfile(fakeStorage()), emptyProfile());
});

test('битый JSON в хранилище даёт пустой профиль, а не падение', () => {
  const s = fakeStorage({ 'eligibility-profile': '{не json' });
  assert.deepEqual(loadProfile(s), emptyProfile());
});

test('заполненный профиль ничего не требует', () => {
  assert.deepEqual(missingFields(filled), []);
});

test('незаполненные поля перечисляются поимённо', () => {
  const partial = { ...filled, birthDate: null, gpa: { value: null, scale: 'TJ_5' } };
  const got = missingFields(partial);
  assert.ok(got.includes('birthDate'));
  assert.ok(got.includes('gpa'));
});

test('пустой список сертификатов — это заполненный ответ, а не пропуск', () => {
  assert.deepEqual(missingFields({ ...filled, languageTests: [] }), []);
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test tests/profile.test.js`
Expected: FAIL — модуль `../js/profile.js` не найден.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `js/profile.js`:

```js
// Профиль живёт только в браузере пользователя и никуда не отправляется.
// Бэкенда у инструмента нет физически: часть пользователей несовершеннолетние,
// и единственный надёжный способ сохранить их данные — не собирать их.
//
// storage передаётся аргументом, а не берётся из глобального localStorage:
// так файл проверяется тестом без браузера.

export const STORAGE_KEY = 'eligibility-profile';

export function emptyProfile() {
  return {
    citizenship: null,
    schoolCountry: null,
    schoolYears: null,
    graduationYear: null,
    birthDate: null,
    gpa: { value: null, scale: 'TJ_5' },
    languageTests: [],
  };
}

export function saveProfile(profile, storage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function loadProfile(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyProfile();
    return { ...emptyProfile(), ...JSON.parse(raw) };
  } catch {
    return emptyProfile();
  }
}

// Пустой список сертификатов — осмысленный ответ «у меня их нет»,
// поэтому в пропуски не попадает.
export function missingFields(profile) {
  const out = [];
  for (const key of ['citizenship', 'schoolCountry', 'schoolYears', 'graduationYear', 'birthDate']) {
    if (profile[key] == null || profile[key] === '') out.push(key);
  }
  if (!profile.gpa || profile.gpa.value == null) out.push('gpa');
  if (!Array.isArray(profile.languageTests)) out.push('languageTests');
  return out;
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `node --test tests/`
Expected: PASS, все файлы тестов зелёные.

- [ ] **Step 5: Коммит**

```bash
git add js/profile.js tests/profile.test.js
git commit -m "Хранение профиля в браузере и проверка заполненности"
```

---

### Task 12: Страница и форма анкеты

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/form.js`
- Create: `data/index.json`

**Interfaces:**
- Consumes: `emptyProfile`, `loadProfile`, `saveProfile` из `js/profile.js`
- Produces:
  - `readForm(root) -> profile` — собирает профиль из полей формы
  - `writeForm(root, profile) -> void` — заполняет форму из профиля
  - `onProfileChange(root, handler) -> void` — вызывает `handler(profile)` при любом изменении

Здесь тестов нет: это работа с DOM, а по спеке DOM не тестируется. Проверка ручная, шаги ниже конкретные.

Мобильный вперёд: основное устройство аудитории — телефон на дорогом мобильном интернете. Никаких библиотек, никаких подключаемых шрифтов.

- [ ] **Step 1: Создать пустой индекс данных**

Создать `data/index.json`:

```json
{
  "generatedAt": null,
  "programs": []
}
```

Настоящие записи появятся здесь из конвейера `tools/` во втором плане. Выдуманные фикстуры сюда не копируются насовсем.

- [ ] **Step 2: Создать разметку**

Создать `index.html`:

```html
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Куда я могу подать документы</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<header>
  <h1>Куда я могу подать документы</h1>
  <p class="lead">Заполни анкету — увидишь, в какие программы тебя пускают, а в какие нет и почему. Данные остаются в твоём телефоне и никуда не отправляются.</p>
</header>

<main>
  <form id="profile" autocomplete="off">
    <fieldset>
      <legend>О тебе</legend>

      <label>Гражданство
        <select name="citizenship">
          <option value="">не выбрано</option>
          <option value="TJ">Таджикистан</option>
          <option value="UZ">Узбекистан</option>
          <option value="KG">Кыргызстан</option>
          <option value="KZ">Казахстан</option>
          <option value="TM">Туркменистан</option>
        </select>
      </label>

      <label>В какой стране оканчиваешь школу
        <select name="schoolCountry">
          <option value="">не выбрано</option>
          <option value="TJ">Таджикистан</option>
          <option value="UZ">Узбекистан</option>
          <option value="KG">Кыргызстан</option>
          <option value="KZ">Казахстан</option>
          <option value="TM">Туркменистан</option>
          <option value="RU">Россия</option>
        </select>
      </label>

      <label>Сколько лет длится школа
        <select name="schoolYears">
          <option value="">не выбрано</option>
          <option value="11">11 лет</option>
          <option value="12">12 лет</option>
        </select>
      </label>

      <label>Год выпуска
        <input type="number" name="graduationYear" min="2020" max="2035" inputmode="numeric" placeholder="2027">
      </label>

      <label>Дата рождения
        <input type="date" name="birthDate">
        <small>Возраст программы считают на дату приёма, а не на сегодня — поэтому нужна именно дата.</small>
      </label>

      <label>Средний балл за последнюю четверть
        <input type="number" name="gpaValue" step="0.1" min="0" max="100" inputmode="decimal" placeholder="4.8">
        <select name="gpaScale">
          <option value="TJ_5">по пятибалльной</option>
          <option value="PERCENT">в процентах</option>
          <option value="GPA_4">по шкале 4.0</option>
          <option value="GPA_4_5">по шкале 4.5</option>
        </select>
        <small>Итоговый балл аттестата может отличаться, и решает именно он.</small>
      </label>
    </fieldset>

    <fieldset>
      <legend>Языковые экзамены</legend>
      <p class="hint">Если экзамен ещё не сдан — оставь балл пустым, но отметь галочку. Программа тогда не отсеется: её покажет жёлтым с подписью, какой балл нужен.</p>

      <label class="row"><input type="checkbox" name="has-IELTS"> IELTS
        <input type="number" name="score-IELTS" step="0.5" min="0" max="9" inputmode="decimal" placeholder="балл">
      </label>
      <label class="row"><input type="checkbox" name="has-TOEFL_IBT"> TOEFL iBT
        <input type="number" name="score-TOEFL_IBT" step="1" min="0" max="120" inputmode="numeric" placeholder="балл">
      </label>
    </fieldset>
  </form>

  <section id="results" aria-live="polite"></section>
</main>

<script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Создать стили**

Создать `css/style.css`:

```css
/* Мобильный вперёд. Системные шрифты: подключаемые стоят трафика,
   которого у аудитории нет. */
:root {
  --fg: #16181d;
  --muted: #5b6472;
  --bg: #ffffff;
  --line: #dfe3ea;
  --yes: #1a7f47;
  --no: #b3261e;
  --check: #8a6100;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 1rem;
  max-width: 40rem;
  font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--fg);
  background: var(--bg);
}

h1 { font-size: 1.4rem; margin: 0 0 .5rem; }
.lead, .hint, small { color: var(--muted); font-size: .875rem; }

fieldset { border: 1px solid var(--line); border-radius: .5rem; margin: 0 0 1rem; padding: .75rem; }
legend { font-weight: 600; padding: 0 .25rem; }

label { display: block; margin: 0 0 .875rem; font-weight: 500; }
label small { display: block; font-weight: 400; margin-top: .25rem; }
label.row { display: flex; align-items: center; gap: .5rem; font-weight: 400; }

input, select {
  display: block;
  width: 100%;
  margin-top: .25rem;
  padding: .5rem;
  font: inherit;
  color: inherit;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: .375rem;
}
label.row input { display: inline-block; width: auto; margin-top: 0; }
input[type="checkbox"] { width: 1.1rem; height: 1.1rem; }

.card { border: 1px solid var(--line); border-left-width: 4px; border-radius: .5rem; padding: .75rem; margin: 0 0 .75rem; }
.card.yes { border-left-color: var(--yes); }
.card.no { border-left-color: var(--no); }
.card.check { border-left-color: var(--check); }
.card.closed { opacity: .6; }

.card h3 { margin: 0 0 .25rem; font-size: 1rem; }
.verdict { font-weight: 600; }
.card.yes .verdict { color: var(--yes); }
.card.no .verdict { color: var(--no); }
.card.check .verdict { color: var(--check); }

.reasons { margin: .5rem 0 0; padding-left: 1.1rem; }
.reasons li { margin-bottom: .25rem; }
.empty { color: var(--muted); }
```

- [ ] **Step 4: Написать связь формы с профилем**

Создать `js/form.js`:

```js
// Единственный файл, который знает про поля формы. Читает и пишет
// профиль в той же форме, что описана в js/profile.js.
import { emptyProfile } from './profile.js';

const LANG_TESTS = ['IELTS', 'TOEFL_IBT'];

const num = (v) => (v === '' || v == null ? null : Number(v));

export function readForm(root) {
  const f = root.elements;
  const profile = emptyProfile();

  profile.citizenship = f.citizenship.value || null;
  profile.schoolCountry = f.schoolCountry.value || null;
  profile.schoolYears = num(f.schoolYears.value);
  profile.graduationYear = num(f.graduationYear.value);
  profile.birthDate = f.birthDate.value || null;
  profile.gpa = { value: num(f.gpaValue.value), scale: f.gpaScale.value };

  profile.languageTests = LANG_TESTS
    .filter((t) => f[`has-${t}`].checked)
    .map((t) => ({ test: t, score: num(f[`score-${t}`].value) }));

  return profile;
}

export function writeForm(root, profile) {
  const f = root.elements;

  f.citizenship.value = profile.citizenship ?? '';
  f.schoolCountry.value = profile.schoolCountry ?? '';
  f.schoolYears.value = profile.schoolYears ?? '';
  f.graduationYear.value = profile.graduationYear ?? '';
  f.birthDate.value = profile.birthDate ?? '';
  f.gpaValue.value = profile.gpa?.value ?? '';
  f.gpaScale.value = profile.gpa?.scale ?? 'TJ_5';

  for (const t of LANG_TESTS) {
    const got = (profile.languageTests ?? []).find((x) => x.test === t);
    f[`has-${t}`].checked = Boolean(got);
    f[`score-${t}`].value = got?.score ?? '';
  }
}

export function onProfileChange(root, handler) {
  const fire = () => handler(readForm(root));
  root.addEventListener('input', fire);
  root.addEventListener('change', fire);
}
```

- [ ] **Step 5: Проверить руками**

Запустить локальный сервер (модули не грузятся с `file://`):

```bash
python -m http.server 8000
```

Открыть `http://localhost:8000/`. Проверить по пунктам:

1. Форма видна целиком на узком экране, горизонтальной прокрутки нет. В браузере включить режим телефона шириной 375 пикселей.
2. Заполнить все поля. Обновить страницу. **Ожидание на этом шаге: значения пропадут** — сохранение подключается в задаче 13. Это не ошибка.
3. В консоли браузера ровно одна ошибка: не найден `js/main.js`. Так и должно быть, этот файл создаётся в задаче 13. Любая другая ошибка — настоящая, чинить до коммита.

- [ ] **Step 6: Коммит**

```bash
git add index.html css/style.css js/form.js data/index.json
git commit -m "Страница анкеты и связь формы с профилем"
```

---

### Task 13: Загрузка данных, отрисовка результатов и связка

**Files:**
- Create: `js/data.js`
- Create: `js/render.js`
- Create: `js/main.js`
- Create: `README.md`

**Interfaces:**
- Consumes: `evaluate` из `js/verdict.js`, `deadlineState` из `js/lib/deadline.js`, `loadProfile`/`saveProfile` из `js/profile.js`, `readForm`/`writeForm`/`onProfileChange` из `js/form.js`
- Produces:
  - `loadIndex() -> Promise<{ generatedAt, programs }>`
  - `renderResults(node, profile, programs, today) -> void`

`js/render.js` — единственный файл во всём проекте, который трогает DOM после формы. Правила о его существовании не знают.

- [ ] **Step 1: Написать загрузку данных**

Создать `js/data.js`:

```js
// Индекс — один файл со всем, что нужно для вердикта. Цитаты и источники
// в него не входят: они нужны только когда человек открыл карточку.
export async function loadIndex() {
  const res = await fetch('data/index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Не удалось загрузить данные: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: Написать отрисовку**

Создать `js/render.js`:

```js
// Единственный файл, который трогает DOM. Правила и вердикт про него
// не знают — поэтому их можно переписать, не сломав страницу.
import { evaluate } from './verdict.js';
import { deadlineState } from './lib/deadline.js';

const VERDICT_TEXT = {
  yes: 'Подходишь',
  no: 'Не подходишь',
  check: 'Надо проверить самому',
};

const DEADLINE_TEXT = {
  open: 'Приём идёт',
  upcoming: 'Приём ещё не начался',
  closed: 'Приём закрыт',
  unknown: 'Даты приёма неизвестны',
};

const ORDER = { no: 0, check: 1, yes: 2 };

export function renderResults(node, profile, programs, today) {
  node.textContent = '';

  if (!programs.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Программ пока нет. Данные собираются.';
    node.append(p);
    return;
  }

  const rows = programs.map((program) => ({
    program,
    verdict: evaluate(profile, program),
    deadline: deadlineState(program.deadline, today),
  }));

  // Закрытый приём уезжает вниз, но не краснеет: опоздать и не пройти
  // по возрасту — разные вещи с разными действиями.
  rows.sort((a, b) => {
    const closed = (a.deadline === 'closed') - (b.deadline === 'closed');
    if (closed !== 0) return closed;
    return ORDER[a.verdict.status] - ORDER[b.verdict.status];
  });

  for (const row of rows) node.append(card(row));
}

function card({ program, verdict, deadline }) {
  const el = document.createElement('article');
  el.className = `card ${verdict.status}${deadline === 'closed' ? ' closed' : ''}`;

  const title = document.createElement('h3');
  title.textContent = program.name?.ru ?? program.id;
  el.append(title);

  const status = document.createElement('p');
  status.className = 'verdict';
  status.textContent = VERDICT_TEXT[verdict.status];
  el.append(status);

  const when = document.createElement('p');
  when.className = 'hint';
  when.textContent = DEADLINE_TEXT[deadline];
  if (deadline !== 'unknown' && program.deadline?.closes) {
    when.textContent += ` — до ${program.deadline.closes}`;
    if (program.deadline.confidence !== 'confirmed') when.textContent += ' (дата по прошлому году)';
  }
  el.append(when);

  if (verdict.reasons.length) {
    const list = document.createElement('ul');
    list.className = 'reasons';
    for (const reason of verdict.reasons) {
      const li = document.createElement('li');
      li.textContent = reason.message;
      list.append(li);
    }
    el.append(list);
  }

  return el;
}
```

- [ ] **Step 3: Написать связку**

Создать `js/main.js`:

```js
import { loadProfile, saveProfile } from './profile.js';
import { readForm, writeForm, onProfileChange } from './form.js';
import { loadIndex } from './data.js';
import { renderResults } from './render.js';

const form = document.getElementById('profile');
const results = document.getElementById('results');
const today = new Date().toISOString().slice(0, 10);

let programs = [];

function refresh(profile) {
  saveProfile(profile, localStorage);
  renderResults(results, profile, programs, today);
}

writeForm(form, loadProfile(localStorage));
onProfileChange(form, refresh);

loadIndex()
  .then((index) => {
    programs = index.programs ?? [];
    refresh(readForm(form));
  })
  .catch((err) => {
    results.textContent = err.message;
  });
```

- [ ] **Step 4: Написать README**

Создать `README.md`:

````markdown
# Куда я могу подать документы

Инструмент показывает школьнику из Центральной Азии, в какие программы
обучения за рубежом он может подать документы, в какие не может и по
какой именно причине. Правомочность проверяется на уровне программы, а
не университета: одна запись покрывает десятки вузов сразу.

## Откуда данные

Каждое поле каждой записи берётся с официального сайта программы и
хранится вместе с дословной цитатой из источника, ссылкой, датой
проверки и хешем страницы. Ничего не пишется по памяти.

Проверить любое число можно так: открыть `data/programs/<id>.json`,
взять поле `evidence` рядом с интересующим значением и найти эту фразу
на странице по адресу из `source.url`.

Если цитата на странице не находится — это ошибка, и её надо чинить.

## Как запустить у себя

```bash
python -m http.server 8000
```

Открыть http://localhost:8000/

## Тесты

```bash
node --test tests/
```

Тестами покрыты правила и сборка вердикта. Работа с DOM не тестируется.

## Дисклеймер

Инструмент не заменяет сайт программы. Жёлтый вердикт означает, что
условие проверить не удалось, а не что оно выполнено.
````

- [ ] **Step 5: Проверить руками на выдуманных данных**

Временно подложить фикстуры вместо пустого индекса:

```bash
cp tests/fixtures/index.json data/index.json
python -m http.server 8000
```

Открыть `http://localhost:8000/` и проверить по пунктам:

1. Пустая анкета — все три карточки жёлтые или красные, ни одной зелёной.
2. Заполнить: Таджикистан, Таджикистан, 11 лет, 2027, дата рождения `2008-08-09`, балл `4.8` по пятибалльной, IELTS с баллом `7`.
3. «Выдуманная открытая программа» — зелёная, без списка причин.
4. «Выдуманная закрытая программа» — красная, первая причина про гражданство.
5. «Выдуманная программа с дырами» — жёлтая, среди причин есть строки про то, что программа чего-то не указывает.
6. Снять галочку IELTS — открытая программа желтеет, в причине текст «экзамен можно сдать».
7. Обновить страницу — все поля анкеты на месте, результаты те же.
8. Ширина экрана 375 пикселей — горизонтальной прокрутки нет.
9. В консоли браузера ошибок нет.

**Обязательно вернуть пустой индекс, выдуманные данные в продукт не едут:**

```bash
git checkout data/index.json
```

Убедиться, что `data/index.json` снова содержит `"programs": []`.

- [ ] **Step 6: Прогнать все тесты**

Run: `node --test tests/`
Expected: PASS, все файлы зелёные.

- [ ] **Step 7: Коммит**

```bash
git add js/data.js js/render.js js/main.js README.md
git commit -m "Загрузка данных, отрисовка вердиктов и связка страницы"
```

---

## Что этот план не делает

- Не собирает ни одной настоящей программы. Это план 2: конвейер `tools/`, проверка цитат, первые десять государственных программ.
- Не создаёт `tools/schema/program.schema.json`. Формальная схема нужна валидатору сборщика, а валидатор — во втором плане. Здесь форма записи задана фикстурами и тем, что читает `evaluate`.
- Не публикует сайт на GitHub Pages. Для этого репозиторий нужно сделать публичным, и это отдельный шаг после появления настоящих данных.
- Не показывает карточку программы с цитатами и ссылкой на источник. Индекс для этого достаточен, но полный JSON программы догружается только когда такие карточки появятся — вместе с настоящими данными во втором плане.
- Не делает поиск, фильтры, сравнение программ и тёмную тему. По спеке это вне v1.
