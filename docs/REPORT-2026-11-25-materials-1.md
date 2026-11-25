# DS-1, партия 1: что программа просит написать или собрать

25.11.2026. Ветка `deepseek/materials-1`, папка `C:\Users\ORYX\dev\nerio-ds1`.

Сделано 28 файлов `data/materials/<id>.json` из 30 программ партии: 84 пункта.
Две программы пропущены, причины ниже. Каждая цитата и каждый вопрос эссе проверены
валидатором по снимку из `raw/`.

## Итог по программам

| id | найдено пунктов (типы) | notStated | пропуск и причина |
|---|---|---|---|
| melbourne | 2 (interview) | essay, recommendation, activities, cv, awards, portfolio, studyPlan, video, certificates | |
| anu | 5 (cv, essay, interview, portfolio) | activities, awards, video, studyPlan, certificates | |
| uwa | 1 (interview) | essay, recommendation, activities, cv, awards, portfolio, studyPlan, video, certificates | |
| csc-china | 2 (recommendation, studyPlan) | essay, activities, cv, awards, portfolio, video, interview, certificates | |
| duke-kunshan | 4 (essay, interview, recommendation, video) | activities, cv, awards, portfolio, studyPlan, certificates | |
| campus-france | 0 | essay, recommendation, activities, cv, awards, portfolio, studyPlan, video, interview, certificates, other | страница описывает только процедуру DAP; что писать, решает вуз |
| kyoto-iup | 3 (cv, essay, interview) | recommendation, activities, awards, portfolio, studyPlan, video, certificates | |
| tokyo | 1 (recommendation) | essay, activities, cv, awards, studyPlan, video, interview, certificates, portfolio | |
| kyushu | 2 (essay, interview) | recommendation, activities, cv, awards, portfolio, studyPlan, video, certificates | |
| auckland | 3 (interview, portfolio, recommendation) | essay, cv, activities, awards, studyPlan, video, certificates | |
| bahcesehir | 3 (essay, portfolio, recommendation) | activities, cv, awards, studyPlan, video, interview | |
| berea-college | 1 (essay) | activities, cv, awards, portfolio, studyPlan, video, interview, certificates | |
| uc-berkeley | 2 (interview, recommendation) | activities, cv, studyPlan, video, certificates | |
| ucla | 2 (essay, portfolio) | activities, cv, awards, studyPlan, video, certificates | |
| ucsd | 2 (essay, portfolio) | recommendation, interview, activities, cv, awards, studyPlan, video, certificates | |
| ut-austin | 3 (cv, essay, recommendation) | interview, portfolio, awards, studyPlan, video, certificates | |
| columbia-university | — | — | нет файла: в снимке нет страницы требований |
| dartmouth-college | 1 (interview) | activities, cv, awards, portfolio, studyPlan, video, certificates | |
| emory | 5 (cv, essay, interview, portfolio, recommendation) | activities, awards, studyPlan, video, certificates | |
| harvard-college | 5 (essay, interview, recommendation, video) | cv, awards, portfolio, studyPlan, certificates | |
| princeton | 4 (interview, other, recommendation) | activities, cv, awards, studyPlan, video, certificates | |
| vanderbilt-university | 5 (cv, interview, portfolio, recommendation, video) | activities, awards, studyPlan, certificates | |
| vassar-college | 5 (interview, portfolio, recommendation) | activities, cv, awards, studyPlan, video, certificates | |
| wesleyan | 3 (interview, recommendation) | essay, activities, cv, awards, portfolio, studyPlan, video, certificates | |
| cornell | 4 (essay, portfolio, recommendation) | activities, cv, awards, studyPlan, video, certificates | |
| jhu | — | — | нет файла: снимок отдаёт 1,4–1,9 тыс. знаков без требований |
| yale-college | 3 (interview, recommendation) | activities, cv, awards, portfolio, studyPlan, video, certificates | |
| caltech | 3 (interview, portfolio, recommendation) | activities, cv, awards, studyPlan, video, certificates | |
| colby-college | 3 (interview, recommendation) | essay, activities, cv, awards, portfolio, studyPlan | |
| duke-university | 7 (essay, interview, portfolio, recommendation, video) | studyPlan, certificates | |

## Пропуски

- `columbia-university` — снимок `2026-09-19` содержит страницы про международные заявки,
  финансовую помощь и английский, но не список требований. Эссе и рекомендации упомянуты
  без числа и статуса. Файл не создан.
- `jhu` — страницы снимка `2026-09-26` отдают по 1,4–1,9 тыс. знаков (JS-сайт), требований
  и вопросов эссе в тексте нет. Файл не создан.

## Источники и домены

- Новых доменов не подключал. В `[kyushu]` добавлен адрес инструкции 2027 на уже
  утверждённом `www.kyushu-u.ac.jp`:
  `https://www.kyushu-u.ac.jp/f/66827/ENG_2027_Application%20Instruction.pdf`
- 15 программ партии (`melbourne`, `anu`, `uwa`, `tokyo`, `auckland`, `bahcesehir`,
  `uc-berkeley`, `ucla`, `ucsd`, `columbia-university`, `emory`, `wesleyan`, `jhu`,
  `caltech`, `colby-college`) в `sources.toml` подключены через `files = manual/…`;
  этих файлов в worktree нет, `tools.fetch` их не снимает. Цитаты взяты из уже
  лежащих в `raw/` снимков от 19.09–02.10.2026, `source.lastVerified` равен дате снимка.
- Остальные 14 программ сняты заново 25.11.2026 (`raw/<id>/2026-11-25/`).
- `princeton` и `duke-kunshan` при первом снятии сорвались по таймауту; `duke-kunshan`
  снят повтором, для `princeton` оставлен снимок `2026-09-24`.

## Числа в цитатах

`count` и `limit.max` стоят только там, где число есть в цитате: UCLA и UCSD — 4 ответа
по 350 слов, Harvard — 5 ответов по 150, Duke — 250 слов, Emory и Cornell — по 2 письма,
Colby — 1 консультант и 2 учителя, CSC — 2 рекомендации. Где написано «не менее 200 знаков»
(CSC) или «300–500 слов» (ANU), предел не ставился: схема хранит только максимум.

## Команды

- `python -m tools.materials --check` → «проверено 28, с ошибками 0».
- `node --test` → 790 тестов, 790 прошли.
- `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .` → 532 теста, OK.
- `python -m tools.build` → индекс 97 326 из 98 304 байт, детали 76 880; вывод сборки
  откачен, в коммиты не попал.
- Коммиты: `d3d9650` (15 программ), `f5cff63` (13 программ, инструкция Kyushu).
