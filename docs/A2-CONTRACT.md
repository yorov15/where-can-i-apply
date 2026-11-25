# A2: план материалов и форматы — контракт

25.11.2026, Claude (архитектура). Черновик для согласования с чатом редизайна: до его «да» кода нет. Сценарий — `docs/PORTFOLIO-SCENARIO.md`, данные — `docs/MATERIALS-SCHEMA.md`, просьба редизайна — §9 `docs/REDESIGN-NOTES.md` на ветке `claude/redesign-portfolio`.

Всё ниже — чистые функции без DOM, без сети и без ИИ. Экран получает готовые объекты и только рисует.

## 1. Откуда берутся данные программ

Без сборки. Экран шагов 2–4б грузит `data/materials/<id>.json` по одному на цель, только когда открыт шаг (в среднем 2,7 КБ на файл). Индекс и детали не растут.

- 404 или битый файл → цель в `unchecked` (программу не проверяли), а не ошибка экрана.
- Загрузка и кэш — в `js/materials-data.js` (мой файл): `loadMaterials(goalIds) → Promise<Map<id, file|null>>`. Файл проходит ту же проверку формы, что `tools/materials.py`, но без цитат: цитаты уже проверены при сборке ветки.

## 2. Поля записи (дополнение к `experience` в `js/portfolio.js`)

Все поля необязательные. Версия портфолио остаётся `1`: старые записи просто без них, миграции нет, экспорт читается как был. `proof` и `survey` из шага 1 сохраняются.

| Поле | Тип | Проверка | Зачем |
|---|---|---|---|
| `grades` | массив целых | 1–12, без повторов, до 4 | «классы» в формах активностей |
| `hoursPerWeek` | число | 0–80, шаг 0,5 | формы активностей, CV |
| `weeksPerYear` | целое | 0–52 | то же |
| `level` | строка | `school`, `district`, `national`, `international` | есть уровень → запись считается наградой |
| `place` | строка | до 60 знаков | «2 место», «финалист» |
| `proofBy` | строка | до 160 знаков | кто подтвердит, если `proof: 'person'` |
| `proofLanguage` | строка | код языка из 2–3 букв | нужен ли перевод подтверждения |

Отдельного типа «награда» не вводим: `EXPERIENCE_KINDS` не меняется, наградой запись делает `level`. Так олимпиада остаётся «Учёбой», а турнир — «Спортом».

**Кто пишет:** `js/portfolio.js` по WORK-SPLIT — файл редизайна, и шаг 1 уже в нём. Предлагаю: нормализацию этих полей добавляет чат редизайна вместе с формой записи, по таблице выше. Я пишу тесты на форматы на простых объектах и в `portfolio.js` не захожу.

## 3. `js/materials-plan.js`

Типы материалов — как в схеме: `essay`, `recommendation`, `activities`, `cv`, `awards`, `portfolio`, `studyPlan`, `video`, `interview`, `certificates`, `other`.

### `materialsTable(goals, files, cards, today)`

- `goals` — `state.goals` (id программ);
- `files` — `Map` из `loadMaterials`;
- `cards` — карточки индекса по id (`name`, `deadline.closes`).

Возвращает:

```js
{
  // шаг 2, сетка: строки — цели, столбцы — типы
  cells: { [goalId]: { [type]: 'required' | 'optional' | 'some' | 'notStated' | 'unchecked' } },
  // шаг 2, список и шаг 3: один ряд на материал, одинаковое слито
  rows: [{
    key: 'cv' | 'activities' | 'awards' | 'recommendation:teacher' | 'essay:harvard-college:0' | …,
    type: 'essay',
    need: 'required' | 'optional' | 'some',  // самое строгое среди целей
    closes: '2027-01-01' | null,             // самый ранний срок среди целей, которым это нужно
    goals: [{ goalId, need, count, limit, prompt, who, ru, evidence, url, lastVerified }],
    shared: true                             // одно на несколько целей: «CV нужно 4 целям — делаешь один»
  }],
  unchecked: [goalId]                        // «не знаем, открой страницу программы»
}
```

Что сливается: `activities`, `cv`, `awards`, `certificates` — по одному на всех. `recommendation` — по `who`, с наибольшим `count`. Эссе, видео, портфолио работ, учебный план и собеседование не сливаются: у каждой цели свои.

Порядок `rows`: по `closes`, потом `required` → `some` → `optional`.

### `portfolioMode(goals, cards, today)`

```js
{ mode: 'pack' | 'one' | 'grow' | null, goalId, closes, days }
```

`null` без целей или без известных сроков. Пороги — две именованные константы (`PACK_DAYS = 70`, `GROW_DAYS = 183`): до ответа на вопрос 1 §10 сценария стоят значения из сценария.

### `materialGaps(table, portfolio, recommenders, mode, today)`

```js
[{
  id: 'gap:recommendation:teacher',          // стабильный: по нему «Сегодня» отмечает дело
  kind: 'recommenders' | 'proof' | 'records' | 'awards' | 'story' | 'unchecked',
  goalIds: ['harvard-college'],
  closes: '2027-01-01' | null,
  due: '2026-11-20' | null,                  // когда начать, если правило это говорит (рекомендации — за 6 недель)
  ru: 'Нужны 2 рекомендации от учителей, в «Рекомендациях» пока никого.',
  evidence: '…', url: '…',                   // цитата требования; у совета Nerio их нет
  advice: false,                             // true — правило Nerio, а не требование вуза
  entryId: null                              // для 'proof' и 'story' — запись, о которой речь
}]
```

Правила — таблица шага 3 сценария. В режиме `pack` нет `records` и `awards`: новых работ не предлагаем. Дел-работ одновременно не больше одного. Подключение дел к недельному плану и «Сегодня» — A3, отдельно.

## 4. `js/formats/`

Общий ответ любого формата:

```js
{
  text: 'Организовал шахматный клуб: 12 учеников, турнир раз в месяц',
  unit: 'chars' | 'words' | null,
  max: 150 | null,        // null — предел неизвестен, счётчик показывает только used
  used: 61,
  over: 0,                // сколько лишнего; 0 — влезает
  missing: ['result']     // чего нет в записи для этого формата: 'actions', 'result', 'hours', 'level'…
}
```

Счёт: `chars` — символы Юникода с пробелами (`[...text].length`), `words` — куски между пробелами. Текст Nerio не сокращает и не дописывает, только склеивает поля ученика.

| Файл | Функция | Что делает |
|---|---|---|
| `formats/measure.js` | `measure(text, unit, max)` | счётчик выше, без текста формата |
| `formats/activity.js` | `activityLine(entry, {unit, max})` | роль + что сделал + результат |
| `formats/award.js` | `awardLine(entry, {unit, max})` | название, место, уровень, год |
| `formats/cv.js` | `cv(entries, {order})` | `{sections: [{title, lines: [{entryId, text}]}], text}`; награды отдельной секцией |
| `formats/preflight.js` | `preflight(goalId, {table, portfolio, recommenders, applications})` | `[{rule, ok, ru, entryId}]` — пять проверок §4б сценария |

Пределы форм (150 знаков у Common App и т. п.) в `data/materials` не лежат. Пока их нет с цитатой, `max: null`: счётчик есть, порога нет. Пределы с цитатами — отдельная задача DeepSeek после «да» на домен формы.

Подборка и шпаргалка учителю переходят на те же записи позже, вместе с переездом экранов в шаг 4б.

## 5. Файлы и владельцы

| Файл | Кто |
|---|---|
| `js/materials-data.js`, `js/materials-plan.js`, `js/formats/*.js`, их тесты в `tests/` | Claude, архитектура |
| поля записи в `js/portfolio.js`, форма записи, экраны шагов 2–4б | Claude, редизайн |

Порядок: я пишу модули и тесты на своей ветке, в main по «да» Мурода. Редизайн до того рисует на заглушке той же формы и переключается на импорт, когда модули в main.

## 6. Что нужно от чата редизайна

1. Формы `cells`, `rows`, `materialGaps` и ответа формата подходят для экранов?
2. Поля записи из §2 добавляешь ты, в `portfolio.js`, — согласен?
3. Нужен ли экрану ещё какой-то вход или выход, которого здесь нет?
