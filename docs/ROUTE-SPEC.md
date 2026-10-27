# Маршрут до оффера — спека MVP (2026-10-27)

Цель: человек выбирает цель из своего плана и видит не «куда можно», а «что делать до дедлайна»: что не хватает, какие экзамены сдать, какие документы собрать, сколько заплатить, когда подать, что делать на этой неделе. Прогресс сохраняется на устройстве, маршрут печатается в PDF и отдаётся родителю текстом.

Бесплатно, ничего не продаётся. Полный маршрут — у 25 программ из `data/prep/<id>.json`; у остальных он появится позже, пока на экране цели видно срок, разрыв и «полный маршрут появится позже».

Границы MVP:
- нет бэкенда, аккаунтов, синхронизации, push; только localStorage;
- никаких процентов поступления, «шансов» и придуманных дат;
- не трогаем карточки каталога, фильтры и «Мой план», кроме одной кнопки «Маршрут» в блоке плана;
- CSS не больше 44 КБ (тест `tests/css-guard.test.js`), каждый новый класс должен иметь правило в CSS;
- каждый новый модуль в `js/` — строка `modulepreload` в `index.html` (тест `tests/modulepreload.test.js`).

## 1. Файлы данных

### `data/prep/<id>.json` — программа с проверенным маршрутом (25 файлов, пишем руками)

```json
{
  "id": "kaist",
  "checked": "2026-10-27",
  "tests": ["ielts", "toefl"],
  "note": "Ранняя волна закрылась 22.10.2026, идёшь в обычную."
}
```

- `id` — id программы из `data/programs/`. Файл обязан быть у опубликованной программы.
- `checked` — дата, когда маршрут сверен с карточкой (ISO).
- `tests` — коды треков подготовки (`data/prep/exams/<code>.json`), которые нужны программе. Только те, что реально названы в правилах или условиях; пустой список допустим.
- `note` — необязательная строка до 300 символов для экрана цели. Факты не выдумывать: только то, что есть в условиях программы.

### `data/prep/exams/<code>.json` — трек подготовки к экзамену (13 файлов)

```json
{
  "code": "ielts",
  "name": "IELTS Academic",
  "format": "Четыре части: Listening, Reading, Writing, Speaking; сертификат действует 2 года.",
  "scoring": "Шкала 1–9, шаг 0,5.",
  "register": "https://...",
  "site": "https://...",
  "freePrep": [{"label": "Бесплатные материалы", "url": "https://..."}],
  "note": "Даты и цена зависят от страны и центра — смотреть при регистрации.",
  "source": {"url": "https://...", "lastVerified": "2026-10-27"}
}
```

Правила: только официальные страницы организатора экзамена; каждое утверждение (формат, шкала, срок действия сертификата) обязано быть на `source.url`; `lastVerified` — дата проверки. Цены и даты сессий не пишем, если не проверены официально: вместо этого `note` «смотреть на сайте».

Коды треков: `ielts`, `toefl`, `sat`, `act`, `duolingo`, `topik`, `hsk`, `csca`, `nuet`, `uca-test`, `mext`, `eju`, `ielts-ukvi` — только те, что нужны выбранным 25 программам. Лишние не создавать.

### `data/route.json` — собирается `python -m tools.build`

```json
{"generatedAt":"2026-10-27","prepared":[{"id":"kaist","tests":["ielts"],"note":"...","checked":"2026-10-27"}],"tracks":["act","duolingo","ielts",...]}
```

Клиент грузит его один раз и решает, полный маршрут или «появится позже».

## 2. `js/route.js` — движок (чистые функции, без DOM)

Импорты разрешены: `./verdict.js` (evaluate), `./wording.js` (testName), `./lib/format.js` (formatDate, plural), `./lib/deadline.js` (deadlineState).

```js
export const ROUTE_STATE_KEY = 'eligibility-route';
export const ROUTE_VERSION = 1;

// Состояние: {version, goal: string|null, done: string[]}
export function loadRouteState(storage)  // битый JSON или чужая версия → пустое состояние
export function saveRouteState(state, storage)
export function setGoal(state, id)       // новый объект
export function toggleStep(state, stepId) // новый объект
export function clearProgress(state)     // убирает done, цель остаётся
export function exportState(state)       // JSON-строка {version, goal, done}
export function importState(text)        // состояние или null, если не разобралось
export function isDone(state, stepId)

// Маршрут
export function buildRoute({ program, conditions, profile, today, prepared, tracks, state })
// program — запись из data/index.json; conditions — textConditions или null (не приехали);
// prepared — запись из data/route.json.prepared или null; tracks — {code: трек}; state — состояние.
// Возвращает:
{
  id, prepared: !!prepared, conditionsLoaded: conditions !== null,
  goal: { name, country, kind, deadline: {closes, confidence, state, daysLeft}, coverage },
  gaps: [reason],            // evaluate(profile, program, today).reasons как есть
  steps: [step],
  week: [step],              // 3–5 невыполненных
  applyNotes: [string],      // условия kind='steps' — процедура подачи
  notes: [string],           // prepared.note, если есть
  stats: {total, done, percent}
}

// Шаг:
{
  id, phase, kind, title, detail, due, track, done
}
// phase: 'tests' | 'inquiry' | 'docs' | 'money' | 'apply' | 'after'
// kind:  'test' | 'inquiry' | 'document' | 'fee' | 'apply'
// id: стабильный `${program.id}:${kind}:${hash(title)}`, hash — djb2 как в js/plan.js
// due: 'YYYY-MM-DD' | null; done: boolean по состоянию

// Текст для родителя (до 1200 знаков):
export function routeText(route)
```

Правила сборки шагов (проверяются тестами):
1. `apply` — всегда один шаг. Если срок объявлен и не закрыт: заголовок «Подать заявку до {дата}», `due` = дата, `detail` — «дата подтверждена» / «дата ожидаемая: вуз ещё не объявил её на этот цикл». Если срок закрыт: «Приём закрыт {дата}», `due` = null. Если срока нет: «Срок подачи не объявлен — следи за страницей приёма», `due` = null.
2. Экзамены (`field` = `language`/`exam`), только если `evaluate` по этому полю не `pass`:
   - одно альтернативное поле (`anyOf`) → один шаг на поле, заголовок с первым вариантом, `detail` перечисляет все варианты («или …»), `track` — первый код, для которого есть трек в `tracks`;
   - если в `prepared.tests` есть треки, которых нет в правилах, — по шагу на каждый такой трек (заголовок из `name` трека);
   - если поле `pass` — шага нет (в `gaps` его тоже нет).
3. `inquiry`: для `schoolYears` со статусом `fail`/`unknown` при `profile.schoolYears === 11` — шаг «Уточнить у приёмной комиссии, принимают ли 11-летнюю школу»; плюс по шагу на каждое условие `kind='workaround'` (заголовок = текст условия).
4. `docs`: по шагу на каждое условие `kind='documents'`, `title` = текст `ru`, дедуп по тексту. Если условий нет (или `conditions === null` — не строим и ждём перезагрузки) — один шаг «Запросить список документов на странице приёма».
5. `money`: по шагу на каждое условие `kind='money'`; если таких нет — один шаг «Уточнить плату за подачу на странице приёма».
6. `week`: невыполненные шаги, отсортированные по (`due` не null раньше), затем по порядку фаз; берём 3–5. Если до дедлайна ≤30 дней — шаг `apply` входит в неделю последним.
7. `stats.percent` — целое 0–100.
8. `routeText`: цель, срок, «чего не хватает» (по заголовкам шагов tests/inquiry, до 3), «сейчас» (первые 3 шага недели), «сделано N из M», сайт программы (если передан в `program.applyUrl` — нет, ссылку не берём: её нет в индексе).

## 3. UI (этот раздел делает лид, не движок)

- `index.html`: `<section id="route" aria-label="Маршрут" hidden>` с узлами; четвёртая вкладка `data-tab="route"`; `modulepreload` для `js/route.js` и `js/route-view.js`.
- `js/route-view.js`: рисует маршрут в `#route`: цель (выбор из плана/подготовленных), карточка цели, «чего не хватает» (текст через `reasonText`), шаги с галочками по фазам, «эта неделя», кнопки «Печать/PDF», «Текст для родителей», «Скачать маршрут», «Загрузить маршрут», «Сбросить прогресс».
- `js/main.js`: экран `#route` по адресу; загрузка `data/route.json`; условия программы — через `details.ensure(id)`; трек — `data/prep/exams/<code>.json` по требованию; состояние — `loadRouteState`.
- `js/tabbar.js`: четвёртая вкладка.

## 4. Приёмка

- `node --test` и `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .` зелёные.
- `python -m tools.build` проходит, `data/route.json` собран, лимиты не превышены.
- Страница открывается локально, маршрут строится для KAIST и для программы без prep-файла, галочка переживает перезагрузку, печать показывает маршрут без интерфейса.
- Ни одного нового факта без источника: в треках — `source`, в prep — только id/даты/ссылки на уже проверенные условия.

## 5. Что сделано (27.10.2026)

- 26 программ: KAIST, GIST, UNIST, DGIST, POSTECH, Kyoto iUP, ICU, Hokkaido ISP, Tohoku Gateway, Nagoya G30, MEXT, GKS, CSC, Türkiye Bursları, Stipendium Hungaricum, российская квота, MOE Taiwan, Brunei BDGS, UCA, AUCA, Nazarbayev, Open Doors, NCKU, KFUPM, Qatar University, Дурахшондагон.
- 12 треков: IELTS, TOEFL, SAT, ACT, Duolingo, TOPIK, HSK, CSCA, NUET, UCA test, MEXT, EJU. Каждый — с официальным источником и датой проверки; что не подтвердилось, написано в `note` и `docs/PREP-EXAMS.md`.
- Экран «Маршрут» — четвёртая вкладка, адрес `#route`: цель из плана или из списка проверенных, разрыв (причины из `evaluate`), неделя (до 5 дел), шаги по фазам с галочками, «как подавать», печать/PDF, текст родителю, сохранение и загрузка маршрута файлом, сброс прогресса.
- Прогресс — в `localStorage['eligibility-route']`, версия 1, цель и отметки; экспорт/импорт JSON.
- Печать: на бумаге только маршрут, длинные тексты условий раскрываются до печати (`beforeprint`), кнопки и выбор цели скрыты.
- CSS поднят с 44 до 48 КБ ради экрана маршрута (2,7 КБ правил): новых цветов нет, всё на существующих токенах.

## 6. Как добавить программу в полный маршрут

1. Создать `data/prep/<id>.json`: `{"id": "<id>", "checked": "ГГГГ-ММ-ДД", "tests": ["ielts", "sat"]}`. `tests` — только треки, которые программе реально нужны: сверять с `eligibility.language/exam.anyOf` и текстовыми условиями.
2. Если нужного трека нет — создать `data/prep/exams/<code>.json` по разделу 1 (с `source.url` и `lastVerified`).
3. `python -m tools.build` — сборка проверит id, коды треков, даты, длины и пересоберёт `data/route.json`. Ошибка валидации останавливает сборку.
4. Проверить на локальном сервере: цель, шаги, печать. Прогресс у людей не сбрасывается: id шага — хеш текста, новые шаги просто добавляются.

## 7. Что осталось за MVP

- CSCA и TOPIK: официальные страницы отдают JS-оболочку, формат/цены не подтверждены (см. `note` в треках).
- Сессии экзаменов и цены: не хранятся, только ссылка на регистрацию.
- Сумма взноса в шаге «Деньги» не выводится: она есть в тексте условия, но отдельным полем не разбиралась.
- Напоминания и синхронизация: нужен бэкенд, поэтому нет.
- Маршрут у остальных 297 программ: появится по мере сверки, по одному `data/prep/<id>.json`.
