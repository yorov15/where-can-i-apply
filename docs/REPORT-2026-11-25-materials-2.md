# DS-1, партия 2: что программа просит написать или собрать

25.11.2026. Ветка `deepseek/materials-2`, папка `C:\Users\ORYX\dev\nerio-ds1b`.

Сделано 28 файлов `data/materials/<id>.json` из 30 программ, 168 пунктов. Две программы
пропущены, причины ниже. Каждая цитата, вопрос эссе, число `count`/`limit.max` и хеш
проверены `python -m tools.materials --check` по снимку из `raw/`.

## Итог по программам

| id | пунктов (типы) | notStated | пропуск / частично |
|---|---|---|---|
| mit | 13 (essay, recommendation, activities, interview, portfolio) | awards, studyPlan, video, certificates | — |
| uchicago | 9 (essay, activities, recommendation, video, portfolio, certificates) | cv, awards, studyPlan | — |
| washu | 10 (essay, recommendation, activities, portfolio, video, certificates, interview) | cv, awards, studyPlan | — |
| middlebury-college | 5 (recommendation, portfolio, interview, video) | cv, studyPlan | — |
| northwestern-university | 14 (essay, recommendation, activities, interview, video, portfolio) | cv, studyPlan, certificates | — |
| rice-university | 15 (essay, other, portfolio, recommendation, interview) | cv, awards, studyPlan, video, certificates | — |
| swarthmore-college | 9 (essay, recommendation, video, interview, portfolio, cv, awards) | certificates, studyPlan | — |
| tufts-university | 9 (essay, recommendation, portfolio, interview) | cv, awards, studyPlan, video, certificates | — |
| williams-college | 3 (recommendation, interview) | essay, cv, awards, portfolio, studyPlan, video, certificates | — |
| amherst-college | — | — | пропуск: в снимке 2026-09-19 нет страницы требований (эссе, рекомендации); amherst.edu отдаёт HTTP 405, `tools.fetch` недоступен — секция собрана из manual-файлов, которых нет в worktree |
| bowdoin-college | 8 (essay, recommendation, video, interview, portfolio) | cv, awards, studyPlan, certificates | — |
| brown-university | — | — | пропуск: в снимке 2026-09-13 нет страниц Application Checklist, School Forms, Supplementary Materials, Video Introduction и вопросов эссе; только общие страницы |
| nyu-shanghai | 3 (recommendation) | interview, video, portfolio, cv, awards, studyPlan, certificates | частично: нет страницы Application Tips / NYU Questions, дополнительные эссе не внесены |
| nyuad | 1 (recommendation) | cv, awards, portfolio, studyPlan, video, certificates | частично: нет страницы Apply for Admission, отдельных эссе в снимке нет |
| osaka-iudp | 3 (essay, recommendation, interview) | activities, cv, awards, portfolio, studyPlan, video | — |
| upenn | 6 (essay, recommendation) | interview, video, portfolio, cv, awards, studyPlan, certificates | — |
| cuhk | 5 (essay, recommendation, cv, interview, certificates) | activities, awards, portfolio, studyPlan, video | — |
| wellesley-college | 6 (essay, recommendation, interview, portfolio, other) | video, cv, awards, studyPlan | — |
| bates | 5 (recommendation, interview, portfolio) | video, cv, awards, studyPlan | — |
| haverford | 6 (other, recommendation, interview) | essay, video, cv, awards, studyPlan, certificates | частично: вопросы Haverford Supplement в снимке не описаны; supplement внесён как `other` |
| davidson-college | 7 (essay, recommendation, activities, interview) | cv, awards, studyPlan, certificates, portfolio | частично: страница Arts Portfolio Guidelines в снимке не раскрыта |
| birmingham | 3 (essay, recommendation, interview) | activities, cv, awards, portfolio, studyPlan, video, certificates | — |
| bristol | 3 (essay, other) | recommendation, activities, cv, awards, portfolio, studyPlan, video, interview, certificates | частично: нет страниц о личном заявлении, рекомендации и интервью; заявление — по упоминанию UCAS |
| durham | 4 (essay, recommendation, interview, other) | activities, cv, awards, portfolio, studyPlan, video, certificates | частично: нет страниц What is a Personal Statement?, Interviews and Selection Days, LNAT/Mathematics Tests |
| edinburgh | 5 (essay, recommendation, portfolio, other) | activities, cv, awards, studyPlan, video, certificates, interview | частично: нет страниц The UCAS Personal Statement, The UCAS Reference, Interviews, tests and portfolios |
| glasgow | 3 (essay, recommendation, interview) | awards, certificates, cv, portfolio, studyPlan, video | частично: страницы Applying on Common App нет; объём и вопросы заявления вуз не публикует |
| imperial-college-london | 4 (essay, recommendation, interview, other) | activities, awards, certificates, cv, portfolio, studyPlan, video | частично: нет отдельных страниц Personal statement, Application reference, Interviews |
| kcl | 3 (essay, recommendation, interview) | awards, cv, portfolio, studyPlan, video | — |
| leeds | 2 (essay, recommendation) | activities, awards, cv, interview, portfolio, studyPlan, video | частично: нет страницы Personal statement tips; лимит и вопросы не указаны |
| lse | 4 (essay, recommendation, other) | activities, awards, certificates, cv, portfolio, studyPlan, video | частично: нет страницы Completing the Application Form |

## Пропуски

- `amherst-college` — в снимке `raw/amherst-college/2026-09-19/` только международная
  страница, финансовые страницы и календарь. Ни эссе, ни числа рекомендаций там нет.
  Живая страница `amherst.edu/admission/apply/firstyear` отвечает HTTP 405. Файл не создан.
- `brown-university` — в снимке `2026-09-13` есть Application Process, Admission Criteria,
  English Proficiency, Early/Regular Decision, тесты и финпомощь, но нет ни одной страницы
  с материалами заявки: Application Checklist, School Forms, Supplementary Materials,
  Video Introduction, вопросы эссе. Файл не создан.

## Частичные файлы

- `nyu-shanghai` — в снимке есть список документов (`how-apply`), но нет страницы
  Application Tips / NYU Questions. Внесены только три рекомендации; эссе и активности —
  в `note`, не в `notStated`.
- `nyuad` — в снимке есть entry-requirements с одним письмом рекомендации, но нет страницы
  Apply for Admission. Отдельных эссе в снимке нет; интервью NYU не проводит — в `note`.
- `haverford` — Haverford Supplement обязателен, но его вопросы в снимке не описаны.
  Supplement внесён как `other`, `essay` — в `notStated`, причина в `note`.
- `davidson-college` — ссылка на Arts Portfolio Guidelines есть в навигации, содержания
  в снимке нет; `portfolio` — в `notStated`.
- `bristol`, `durham`, `edinburgh`, `glasgow`, `imperial-college-london`, `leeds`, `lse` —
  файлы собраны по тому, что есть; недостающие страницы перечислены в таблице и ниже.

## Чего не хватает в снимках (для следующих партий)

- `brown-university` — весь блок требований: Application Checklist, School Forms,
  Supplementary Materials, Video Introduction, вопросы эссе.
- `nyu-shanghai` — Application Tips / NYU Questions.
- `nyuad` — Apply for Admission.
- `haverford` — вопросы Haverford Supplement.
- `davidson-college` — Arts Portfolio Guidelines.
- `bristol` — страницы о личном заявлении, рекомендации и интервью.
- `durham` — What is a Personal Statement?, Interviews and Selection Days, LNAT/Mathematics Tests.
- `edinburgh` — The UCAS Personal Statement, The UCAS Reference, Interviews, tests and portfolios,
  What you need to apply.
- `glasgow` — Applying on Common App.
- `imperial-college-london` — Personal statement, Application reference, Teacher reference
  guidance, Interviews, Our selection process.
- `leeds` — Personal statement tips, страницы курсов.
- `lse` — Completing the Application Form.
- `kcl`, `birmingham` — страницы отдельных курсов (портфолио/тесты/прослушивания).

## Источники и домены

- Новых доменов не подключал.
- В `tools/sources.toml` добавлены страницы на уже одобренных доменах:
  - `[mit]` — `https://mitadmissions.org/apply/firstyear/essays-activities-academics/`
    (вопросы эссе, активности, портфолио); снимок `raw/mit/2026-11-25/`.
  - `[tufts-university]` — `https://admissions.tufts.edu/apply/essay-questions/` и
    `https://admissions.tufts.edu/apply/applying-to-tufts/checklist-and-deadlines/`;
    снимок `raw/tufts-university/2026-11-25/`.
- Остальные 26 программ — по снимкам `2026-09-13`…`2026-10-02`, новые страницы не качались.
- `ucas.com` ждёт «да»: британские вузы пишут о подаче через UCAS, но `ucas.com` не
  использовался и в `sources.toml` не добавлен.

## Числа в цитатах

`count` и `limit.max` стоят только там, где число есть в `evidence` или `prompt`.
Диапазоны: «75–150» → max 150, «250–400» → 400, «150–200» → 200, «100–200» → 200,
«250–300» → 300, «около 4 000» → 4000, «около 700» → 700. Слово «около» остаётся в `ru`.

Примеры: MIT — 2 письма учителей, 4 активности, 200 и 50 слов; UChicago — 2 письма
учителей, по одному развёрнутому и короткому эссе; WashU — 1 учитель и 250 слов;
Rice — 2 письма учителей, 150/500/250 слов; Swarthmore — 2 учителя и 250 слов;
Tufts — 150/200 слов; Bowdoin — 250 слов; KCL и Birmingham — 3 вопроса и 4000 знаков;
UPenn — 150–200 слов у двух ответов; Osaka — около 700 слов.

У Rice портфолио Architecture и Art оставлено без `limit`: число страниц/файлов на
странице есть, но в выбранной цитате о требовании его нет.

## Команды

- `python -m tools.materials --check` → «проверено 56, с ошибками 0».
- `node --test` → 817 тестов, 817 прошли, 0 упали.
- `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .` → 535 тестов, OK.
- `python -m tools.build` → индекс 97 322 из 98 304 байт, детали 78 235; вывод сборки
  откачен, в коммиты не попал.
- Перед коммитами `git status --short`, `git add` только явными путями.

Замечание по worktree: git с `core.autocrlf=true` отдавал `raw/apply-channels/2026-11-25/`
с CRLF, из-за чего 29 Python-тестов падали на байтовых хешах. Вернул LF в 24 файлах
рабочей копии; в коммиты эти файлы не попали.

## Коммиты

- `90b1ca0` — 10 программ: MIT, UChicago, WashU, Middlebury, Northwestern, Rice,
  Swarthmore, Tufts, Williams, Bowdoin.
- `7adcf0c` — 9 программ: CUHK, Wellesley, Bates, Haverford, Davidson, Birmingham,
  Bristol, Durham, Edinburgh; плюс уточнения формулировок в первой десятке.
- `75a62c7` — 9 программ: Glasgow, Imperial, KCL, Leeds, LSE, NYU Shanghai,
  NYU Abu Dhabi, Osaka, UPenn.
- Отчёт и правка Davidson (`portfolio` в `notStated`) — отдельным коммитом после них.

Ветка `deepseek/materials-2`. Пуш — после коммита отчёта.
