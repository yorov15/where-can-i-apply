# A2: план материалов и форматы — контракт

25.11.2026, Claude (архитектура). Согласован с чатом редизайна: его ответ на §6 первой версии вошёл сюда целиком (шесть правок, поля записи, порядок записей под цель). Сценарий — `docs/PORTFOLIO-SCENARIO.md`, данные — `docs/MATERIALS-SCHEMA.md`.

Всё ниже, кроме загрузки файлов, — чистые функции без DOM, без сети и без ИИ. Экран получает готовые объекты и только рисует.

## 1. Данные программ: `js/materials-data.js`

Сборка не меняется. Экран шагов 2–4б грузит `data/materials/<id>.json` по одному на цель, только когда шаг открыт (в среднем 2,7 КБ на файл). Индекс и детали не растут.

```js
loadMaterials(goalIds, fetchJson?) → Promise<Map<goalId, {status: 'ok' | 'missing' | 'failed', file}>>
normalizeMaterials(value) → file | null   // форма как в tools/materials.py, без проверки цитат
```

- `ok` — файл есть и прошёл проверку формы;
- `missing` — сервер ответил 404: программу не проверяли;
- `failed` — нет сети, ошибка сервера или битый файл. Мы проверяли, но сейчас показать не можем. «Не проверяли» в этом случае писать нельзя.

`ok` и `missing` запоминаются до перезагрузки, `failed` при следующем вызове пробуется снова.

**Офлайн.** `sw.js` уже кладёт в кэш любой свой GET: сначала сеть, без сети — копия. Файл цели, хоть раз открытый с интернетом, есть и офлайн. Менять `sw.js` не нужно.

## 2. Поля записи (в `js/portfolio.js`, пишет редизайн)

Все необязательные. Версия портфолио остаётся `1`, старые записи проходят проверку. `proof` и `survey` из шага 1 сохраняются.

| Поле | Тип | Проверка | Зачем |
|---|---|---|---|
| `grades` | массив целых | 1–12, без повторов, до 4 | «классы» в формах активностей |
| `hoursPerWeek` | число | 0–80, шаг 0,5 | формы активностей, CV |
| `weeksPerYear` | целое | 0–52 | то же |
| `level` | строка | `school`, `district`, `national`, `international` | есть уровень → запись считается наградой |
| `place` | строка | до 60 знаков | «2 место», «финалист» |
| `proofBy` | строка | до 160 знаков | кто подтвердит; экран показывает при `proof: 'person'` |
| `proofLanguage` | строка | код языка из 2–3 букв | язык подтверждения |

На уровне портфолио: `order: {goalId: [entryId, …]}` — порядок записей под цель для шага 4б. Хранит и проверяет редизайн, мои функции получают его на вход.

Отдельного типа «награда» нет: `EXPERIENCE_KINDS` не меняется, наградой запись делает `level`.

## 3. `js/materials-plan.js`

### Подписи

```js
MATERIAL_TYPES = [['essay','Эссе'], ['recommendation','Рекомендации'], ['activities','Список активностей'],
  ['cv','CV'], ['awards','Награды'], ['portfolio','Портфолио работ'], ['studyPlan','Учебный план'],
  ['video','Видео'], ['interview','Собеседование'], ['certificates','Сертификаты'], ['other','Другое']]
NEED_LABELS = [['required','Нужно'], ['some','Нужно не всем'], ['optional','По желанию'],
  ['notStated','Программа не пишет'], ['unchecked','Не проверяли'], ['failed','Не загрузилось']]
LEVEL_LABELS = [['school','школа'], ['district','район или город'], ['national','страна'], ['international','мир']]
GAP_KINDS = [['recommenders',…], ['proof',…], ['records',…], ['awards',…], ['story',…], ['unchecked',…]]
```

Порядок столбцов — порядок `MATERIAL_TYPES`.

### `materialsTable({goals, materials, cards, urls})`

- `goals` — `state.goals`;
- `materials` — `Map` из `loadMaterials`;
- `cards` — карточки индекса по id (`name`, `deadline.closes`);
- `urls` — `{goalId: applyUrl}` из `data/details.json`. В карточках индекса адреса нет.

```js
{
  columns: ['essay', 'recommendation', 'interview'],   // типы, которые есть в items хотя бы одной цели
  cells: { [goalId]: { [type]: 'required' | 'optional' | 'some' | 'notStated' | 'unchecked' | 'failed' } },
  rows: [{
    key: 'cv' | 'recommendation:teacher' | 'essay:harvard-college:0' | …,
    type: 'essay',
    need: 'required' | 'optional' | 'some',  // самое строгое среди целей
    count: 2 | null,                         // наибольшее из цитат
    closes: '2027-01-01' | null,             // самый ранний срок среди целей ряда
    shared: true,                            // одно на несколько целей
    goals: [{ goalId, closes, need, count, limit, prompt, who, language, via, ru, evidence, url, lastVerified }]
  }],
  unchecked: [{ goalId, url }],              // файла нет
  failed: [{ goalId, url }]                  // не загрузился
}
```

Сливаются `activities`, `cv`, `awards`, `certificates` (по одному на всех) и `recommendation` (по `who`). Эссе, видео, портфолио работ, учебный план, собеседование и `other` у каждой цели свои. Порядок `rows`: срок, потом `required` → `some` → `optional`, потом порядок типов. Детальный вид клетки экран делает сам, фильтром по `rows`.

### `portfolioMode({goals, cards, today})`

```js
{ mode: 'pack' | 'one' | 'grow', goalId, closes, days } | null
```

`null` без целей или без будущих сроков. Пороги — `PACK_DAYS = 70` и `GROW_DAYS = 183`, значения из сценария до ответа Мурода на вопрос 1 §10.

### `materialGaps({table, portfolio, recommenders, stories, mode, today, leadWeeks})`

- `recommenders` — `recommendersOf(state)`;
- `stories` — `applicationNotesOf(state).stories`;
- `leadWeeks` — `leadWeeksOf(state)`.

```js
[{
  id: 'gap:recommenders:harvard-college',    // стабильный
  kind: 'recommenders' | 'proof' | 'records' | 'awards' | 'story' | 'unchecked',
  goalIds: ['harvard-college'],
  closes: '2027-01-01' | null,
  due: '2026-11-20' | null,                  // когда начать (рекомендации — срок минус leadWeeks)
  have: 1 | null, need: 3 | null,            // для плитки «1 из 3»; null, где счёта нет
  done: false,
  ru: '…',
  evidence: '…' | null, url: '…' | null,     // цитата требования
  advice: false,                             // true — правило Nerio, а не требование вуза
  entryId: null                              // для 'proof' — запись, о которой речь
}]
```

| Вид | Когда | have / need |
|---|---|---|
| `recommenders` | цель просит письма (`required` или `some`) | люди в «Рекомендациях», привязанные к цели / сумма `count` по пунктам цели (`null` в цитате → 1) |
| `proof` | цель просит награды или сертификаты, а у её записи нет подтверждения | — |
| `records` | режим `one` или `grow`; совет Nerio | записи не черновики / 3 |
| `awards` | цель засчитывает награды, а записей с `level` нет; не в режиме `pack` | записи с `level` / 1 |
| `story` | цель просит эссе; совет Nerio | истории / 1 |
| `unchecked` | файла материалов нет | — |

Закрытые пробелы возвращаются с `done: true` для видов со счётом (`recommenders`, `records`, `awards`, `story`), чтобы экран показывал прогресс. Сначала открытые, по `due`, потом по `closes`. Дел-работ (`records`, `awards`) открыто не больше одного: если нужны оба, остаётся `awards`. Как дела попадают в недельный план и на «Сегодня» — A3, отдельно.

## 4. `js/formats/`

Общий ответ любого формата:

```js
{
  text: 'Организовал шахматный клуб. 12 учеников, турнир раз в месяц',
  unit: 'chars' | 'words' | null,
  max: 150 | null,               // null — предела нет: счётчик показывает только used
  used: 58,
  over: 0,                       // сколько лишнего
  limitSource: { evidence, url } | null,   // откуда взялся предел
  missing: ['hours']             // чего нет в записи для этого формата
}
```

`MISSING_LABELS` (в `formats/measure.js`) — русские подписи для кодов `missing`: `role`, `actions`, `result`, `hours`, `weeks`, `grades`, `level`, `place`, `proof`, `period`.

Счёт: `chars` — символы Юникода с пробелами, `words` — куски между пробелами. Текст Nerio не сокращает и не дописывает, только склеивает поля ученика.

| Файл | Функция | Что делает |
|---|---|---|
| `formats/measure.js` | `measure(text, {unit, max, limitSource})` | счётчик |
| `formats/activity.js` | `activityLine(entry, limit)` | роль, что сделал, результат |
| `formats/award.js` | `awardLine(entry, limit)` | название, место, уровень, период |
| `formats/cv.js` | `cv(entries, {order})` | `{sections: [{title, lines: [{entryId, text}]}], text}`; награды отдельной секцией; `order` — массив id из `portfolio.order[goalId]` |
| `formats/preflight.js` | `preflight({goalId, table, entries, order, recommenders, lines, essays})` | `[{rule, ok, ru, entryIds}]` |

`limit` = `{unit, max, limitSource}` или ничего. Пределов форм с цитатами в данных пока нет, поэтому сейчас `max: null`. Пределы с цитатами — отдельная задача DeepSeek после «да» на домен формы.

Проверки `preflight` (`ok: null` — нечего проверять):
1. `limits` — все строки `lines` (ответы форматов) влезают;
2. `content` — у каждой записи в `order` есть «что сделал» и результат;
3. `essayOverlap` — эссе не перечисляет записи подряд: в тексте названия трёх и больше записей. Сравнение по точному названию, падежей не ловит: это грубая подсказка, а не запрет;
4. `proof` — у наград в `order` есть подтверждение;
5. `recommenders` — привязанные к цели рекомендатели отметили «Письмо отправлено», и их не меньше, чем просят.

Переводов подтверждений `preflight` не проверяет: перевод живёт в библиотеке документов, связать их — после A3.

## 5. Файлы и владельцы

| Файл | Кто |
|---|---|
| `js/materials-data.js`, `js/materials-plan.js`, `js/formats/*.js`, их тесты в `tests/` | Claude, архитектура |
| поля записи и `order` в `js/portfolio.js`, форма записи, экраны шагов 2–4б | Claude, редизайн |

Когда экран начнёт импортировать эти модули из `main.js`, `tests/modulepreload.test.js` потребует строки `<link rel="modulepreload">` в `index.html`. Их добавляет редизайн: файл его.

Порядок: модули и тесты на ветке `claude/a2-contract`, в main — по «да» Мурода. Редизайн до того рисует на заглушке этой формы.
