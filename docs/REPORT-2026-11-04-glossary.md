# Словарь приёма — 04.11.2026

Ветка `claude/glossary` от `main` (`1ae51f5`). В `main` не влито, не выложено.
Идея — `docs/RESEARCH-2026-11-04-rea-crawl.md`, п. 2.1 (замена справкам Common App и BigFuture).

## Что сделано

- **40 терминов** в `js/glossary.js`: английское слово, как его пишут вузы, русский вариант, объяснение
  в 1–2 фразы на «ты» (что это значит и что сделать). Пять групп: сроки и решения, документы, эссе и письма,
  деньги, подача и учёба. Фактов о конкретных программах нет; где правило зависит от вуза, так и написано
  («у каждого вуза свои правила — смотри условие программы»).
- **Страница «Словарь»** `glossary.html`: поиск по полю без перезагрузки, по-английски и по-русски
  (регистр, дефисы и ё/е не важны), строка «Нашлось N слов» для диктора (`role="status"`), до трёх
  совпадений раскрываются сразу. Адрес `glossary.html#apostille` открывает и фокусирует нужное слово.
  Подпись «Простые объяснения Nerio, не условия программы». Ссылки: «Помощь» (`faq.html`, в шапке,
  новом вопросе и подвале) и подвал главной. Страница в `sitemap.xml` (`tools/seo.py`).
- **Подсказки в тексте** (`js/glossary-view.js`): в карточке программы и в «Моём пути → Подготовка»
  английский термин (и кальки «апостиль», «легализация», «транскрипт») становится кнопкой с тем же текстом,
  подчёркнутой пунктиром. Нажатие (палец, Enter, пробел) — под абзацем короткое объяснение и ссылка
  «Весь словарь»; повторное нажатие или Escape закрывает, фокус возвращается на слово. Наведения нет.
  - Только первое вхождение термина в блоке. Блок в карточке — абзац, весь список или одна причина;
    в «Моём пути» — один шаг (`.route-step`) или строка `.route-detail` / `.route-warn` вне шага.
  - В ссылках, кнопках, подписях полей (`label`), заголовках раскрывашек и полях ввода подсказок нет.
  - В «Моём пути» размечаются только строки из данных маршрута, не тексты ученика.
  - Текст цитаты не меняется: кнопка содержит ровно ту же строку, `textContent` блока прежний
    (проверено тестом на всех цитатах и в браузере).
  - Кусок адреса или почты (`portal.edu.az`, `cv@…`) и слово внутри другого слова (`interviewer`) не
    размечаются; «Deferred Action» (DACA), «bank deposit», «tuition deferral» тоже.
- **Офлайн:** список и поиск лежат в JS, сеть не нужна. Страница регистрирует тот же `sw.js`; после
  захода с сетью поиск работает без сети (проверено в Chromium: открыл, отключил сеть, перезагрузил,
  нашёл «deposit»).
- **CSS:** +235 Б (одна строка: `.term`, `.term[aria-expanded]`, `.term-note`), итого 50 965 из 51 200 Б.
  Страница словаря использует готовые `.prose`, `.faq`, `.fineprint`, поле поиска — общий стиль `input`.

## Термины и сколько программ их упоминают

Счёт — тем же кодом, что ставит подсказки (`findTerms` из `js/glossary.js`): все строковые значения
`data/programs/<id>.json` и `data/conditions/<id>.json`, кроме ссылок, хешей, дат и id. Программа
считается один раз, сколько бы раз слово ни встретилось. Всего программ 323.

| Термин | Программ |
|---|---|
| Transcript | 203 |
| GPA | 154 |
| Application fee | 141 |
| Recommendation / reference | 114 |
| High school diploma | 81 |
| Interview | 73 |
| Certified copy / translation | 73 |
| Student visa | 70 |
| Financial aid | 70 |
| Personal statement | 56 |
| Common App | 50 |
| School counselor | 49 |
| Application portal | 48 |
| Early Decision | 44 |
| CSS Profile | 43 |
| Fee waiver | 40 |
| Tuition waiver | 38 |
| Foundation year | 38 |
| Regular Decision | 37 |
| Portfolio | 37 |
| Stipend | 35 |
| Merit scholarship | 34 |
| Motivation letter (и statement of purpose) | 33 |
| Need-blind / need-aware | 31 |
| Credit transfer | 28 |
| CV / résumé | 26 |
| Apostille | 25 |
| Test-optional | 24 |
| Legalization | 24 |
| Proof of funds | 21 |
| Early Action | 20 |
| Full scholarship | 12 |
| Conditional offer | 12 |
| Supplemental essay | 9 |
| Predicted grades | 9 |
| Enrollment deposit | 9 |
| Waitlist | 4 |
| Restrictive Early Action | 4 |
| Deferral | 3 |
| Rolling admission | 2 |

Последние четыре редки, но оставлены: это исходы решения, которые ученик увидит в письме вуза, а не
в условиях. **Не вошли:** gap year (1 программа), UCAS (17, это название портала, а не понятие),
медицинская страховка (28, понятна по-русски), MOI letter (9).

Скрипт подсчёта (запуск: `node count.mjs .` из корня репозитория):

```js
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const root = process.argv[2];
const { TERMS, findTerms } = await import(`${root}/js/glossary.js`);
const SKIP = new Set(['url','sha256','hash','contentHash','snapshot','id','checkedBy','checkedAt','lastVerified','retrievedAt']);
const vals = (o, acc) => { if (Array.isArray(o)) o.forEach(v => vals(v, acc)); else if (o && typeof o === 'object') { for (const [k, v] of Object.entries(o)) if (!SKIP.has(k)) vals(v, acc); } else if (typeof o === 'string' && !o.startsWith('http')) acc.push(o); };
const ids = readdirSync(`${root}/data/programs`).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const counts = Object.fromEntries(TERMS.map(t => [t.id, 0]));
for (const id of ids) {
  const acc = [];
  for (const d of ['programs', 'conditions']) { const p = `${root}/data/${d}/${id}.json`; if (existsSync(p)) vals(JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, '')), acc); }
  const found = new Set();
  for (const s of acc) for (const t of TERMS) {
    if (found.has(t.id)) continue;
    const others = new Set(TERMS.filter(x => x.id !== t.id).map(x => x.id));
    if (findTerms(s, others).length) found.add(t.id);
  }
  found.forEach(t => counts[t]++);
}
for (const t of TERMS) console.log(`${counts[t.id]}\t${t.en}`);
```

## Файлы

- новые: `js/glossary.js` (данные, `findTerms`, `segmentText`, `searchTerms`), `js/glossary-view.js`
  (`annotateTerms`), `js/glossary-page.js`, `glossary.html`, `tests/glossary.test.js`, этот отчёт;
- точечно: `js/main.js` (импорт и два вызова `annotateTerms` — после экрана программы и после «Моего пути»),
  `index.html` (ссылка в подвале, два `modulepreload`), `faq.html` (шапка, вопрос, подвал),
  `css/style.css` (одна строка), `tools/seo.py` + `sitemap.xml` (адрес словаря),
  `tests/pages.test.js`, `tests/css-guard.test.js` (страница в списке проверяемых),
  `tools/tests/test_seo.py` (в карте сайта 6 адресов вместо 5).
- `js/route-view.js` и `js/recommenders*` не тронуты.

## Проверено

- `node --test`: 747 pass (было 738, +9 в `tests/glossary.test.js`: состав словаря, поиск по-английски,
  по-русски, ё/е, пустой и пустой результат, только первое вхождение в блоке и общий набор на блок,
  длинный термин выигрывает у короткого, границы слова/адреса/почты, склейка кусков равна цитате для всех
  `quote` и `ru` в данных — больше 200 цитат с терминами, ссылки из «Помощи» и подвала).
- `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .`: 512 OK.
- `python -m tools.build` проходит; `data/route.json`, где поменялась только дата, откачен.
- Chromium (Playwright): `glossary.html` на 280, 375, 430, 1280 px, светлая и тёмная тема — 40 слов,
  без горизонтальной прокрутки и ошибок в консоли, поиск «виза» и бессмыслица, переход по `#apostille`.
  Карточка Boston University (375/280/1280, обе темы): 6 подсказок, повторов в блоке нет, Enter открывает,
  Escape закрывает и возвращает фокус, касание открывает и закрывает, `textContent` блока до и после равен.
  Дерево доступности: `button "транскриптов — что это значит"`. «Мой путь → Подготовка» с тремя целями
  (375 светлая, 1280 тёмная): 15 подсказок на 51 шаг, ни одной в `label`, ссылке или `summary`.

## Как проверить руками

```bash
python -m http.server 8765
```

1. `http://localhost:8765/glossary.html` — набрать «waitlist», «лист ожидания», «виза», «зачет»;
   открыть `glossary.html#css-profile`.
2. `http://localhost:8765/#program/boston-university` — нажать пунктирное «транскриптов», потом Escape;
   Tab до «Early Decision» и пробел; раскрыть «Источники и точные требования».
3. Выбрать 2–3 цели (POSTECH, CSC, Назарбаев), открыть «Мой путь → Подготовка» — «апостиль»,
   «Personal Statement», «GPA».
4. Подвал главной и `faq.html` — ссылка «Словарь приёма».

## Чего не сделано

- Объяснения — общие тексты Nerio без цитат из первоисточников (так поставлена задача; исследование
  предлагало сверять с Common App). Если нужны цитаты — отдельная задача, домены согласует Мурод.
- «Сегодня» и список «Куда можно» без подсказок: задача называла только карточку и «Мой путь».
- Экранный диктор живьём, Safari/iOS и ученики не проверены; проверено дерево доступности в Chromium.
- Офлайн: если человек открыл словарь впервые и сайт до этого не открывал, страница попадёт в кэш
  только со второго захода — воркер ничего не кэширует заранее (так устроен весь сайт).
- В «Моём пути» одно и то же слово может встретиться в нескольких шагах (апостиль у разных документов) —
  подсказка у каждого шага своя.
- Ложные срабатывания возможны у общих слов (visa, portal, interview, recommendation) — они размечены
  как термины и в контексте «visa page».
