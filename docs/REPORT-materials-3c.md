# DS-1, партия 3C: материалы заявки (88 программ)

26.11.2026. Ветка `deepseek/materials-3c`, папка `C:\Users\ORYX\dev\nerio-mat-c`.
Журнал прогресса: по таблице продолжает следующий чат. Статус: «—» не начато, «готово»,
«частично», «пропуск».

## Итог по программам

| id | статус | найдено (типы) | notStated | причина пропуска / что частично |
|---|---|---|---|---|
| nottingham | готово | essay, recommendation, interview, other | activities, cv, awards, portfolio, studyPlan, video, certificates | — |
| tohoku-gateway-college | готово | essay, interview | recommendation, activities, cv, awards, portfolio, studyPlan, video | — |
| carleton-college | готово | recommendation, interview, portfolio, video | essay, activities, cv, awards, studyPlan, certificates | — |
| denison-university | готово | recommendation, interview, portfolio | activities, cv, awards, studyPlan, video, certificates | — |
| kth | готово | other | activities, cv, awards, portfolio, studyPlan, video, interview | — |
| oberlin | готово | recommendation, cv, portfolio, studyPlan, interview | activities, awards, video | — |
| soka | частично | essay, recommendation, activities | cv, awards, portfolio, studyPlan, video, interview, certificates | не скачана страница вопроса эссе admissions.soka.edu/portal/essays: секция на manual-файлах, которых нет в worktree, fetch падает; вопроса и объёма в снимке нет |
| ubc | готово | essay, activities, recommendation | cv, awards, portfolio, studyPlan, video, interview, certificates | — |
| ntu-singapore | готово | essay, recommendation, portfolio, interview | activities, cv, awards, studyPlan, video, certificates | — |
| bocconi | готово | other (отборочный тест) | essay, activities, awards, portfolio, studyPlan, video, interview | рекомендации, мотивационные письма, CV не рассматриваются; отбор — тест и GPA |
| nthu | готово | studyPlan, recommendation, essay, portfolio, video, awards, interview, other | activities, cv | — |
| uca | готово | awards, activities, interview, certificates | essay, cv, portfolio, studyPlan, video | форма Stage 3 описана для набора 2026 — прошлый цикл |
| turkiye-burslari | готово | essay, other (тест), interview, studyPlan | recommendation, activities, cv, awards, portfolio, video | — |
| tsinghua-university | частично | portfolio, interview, awards | essay, recommendation, activities, cv, studyPlan, video, certificates | перечень документов (personal statement, 2 рекомендации, CV, видео) только в PDF List.pdf; секция на manual-файлах, которых нет в worktree, fetch невозможен |
| nccu | частично | — | essay, recommendation, activities, cv, awards, portfolio, studyPlan, video, interview, certificates, other | письменных материалов в снимках нет; требования факультетов — в брошюре на Google Drive, домен не одобрен |
| qatar-university | готово | recommendation, portfolio, video, interview | essay, activities, cv, studyPlan, certificates | всё только для Talent Scholarship; набор Fall 2026 — прошлый |
| romania-gov | готово | cv, essay, other, interview | recommendation, activities, awards, portfolio, studyPlan, video, certificates | набор 2026/2027 прошёл; письмо, согласие руководителя и интервью — только докторантура |
| sophia-fla | готово | essay, recommendation | activities, cv, awards, portfolio, studyPlan, video, interview, certificates | буклет подписан «for 2026 Entry», внутри набор 2027 |
| tartu-estonia | готово | essay, other (тесты), interview, awards | recommendation, cv, activities, portfolio, studyPlan, video, certificates | набор 2026, требования 2027 обещают до конца декабря |
| rug | готово | cv, essay, video | activities, awards, interview, portfolio, studyPlan, certificates | — |
| vilnius | — | | | |
| kazakhstan-grant | — | | | |
| hkust | — | | | |
| bilkent | — | | | |
| germany-public | — | | | |
| wiut | — | | | |
| kiut | — | | | |
| austria-study | — | | | |
| ajou | — | | | |
| aus-uae | — | | | |
| bhos | — | | | |
| boston-university | — | | | |
| chung-ang | — | | | |
| cnu | — | | | |
| corvinus | — | | | |
| elte | — | | | |
| erasmus | — | | | |
| finland-study | — | | | |
| gyeongsang | — | | | |
| heidelberg | — | | | |
| hse | — | | | |
| imd-tajikistan | — | | | |
| istanbul-bilgi | — | | | |
| jagiellonian-university | — | | | |
| kangwon | — | | | |
| khazar | — | | | |
| kit | — | | | |
| kookmin | — | | | |
| kyung-hee | — | | | |
| manas | — | | | |
| medipol | — | | | |
| monash | — | | | |
| newuu | — | | | |
| ntut | — | | | |
| osh-state | — | | | |
| paris-saclay | — | | | |
| polimi | — | | | |
| psl | — | | | |
| russia-quota | — | | | |
| sapienza-italy | — | | | |
| seoultech | — | | | |
| slovak-university-of-technology | — | | | |
| sookmyung | — | | | |
| sweden-study | — | | | |
| tiu-japan | — | | | |
| tudelft | — | | | |
| uba | — | | | |
| uiuc | — | | | |
| unist | — | | | |
| university-of-warsaw | — | | | |
| usm | — | | | |
| uts | — | | | |
| wcu | — | | | |
| yonsei | — | | | |
| spbu | — | | | |
| tongji | — | | | |
| islamic-university-madinah | — | | | |
| renmin | — | | | |
| itu | — | | | |
| wuhan-university | — | | | |
| mephi | — | | | |
| harbin-institute-of-technology | — | | | |
| ibn-haldun | — | | | |
| utoronto-pearson | — | | | |
| od | — | | | |
| hokkaido-mjsp | — | | | |
| ubc-scholars | — | | | |
| hokkaido-isp | — | | | |

## Проверки

- `PYTHONUTF8=1 python -m tools.validate` в начале: 323 программы, **с ошибками 11**:
  auca, cornell, fudan-university, hkbu-hongkong, nazarbayev, ntu-singapore, polimi,
  tianjin-university, utwente, vanderbilt-university, vassar-college.
- `python -m tools.materials --check` в начале: проверено 56, с ошибками 0.

## Новые ошибки validate

После `tools.fetch` 26.11 число выросло с 11 до 15. data/programs не трогал. Что сломалось:

- `carleton-college` — снимок 26.11 заменил 26.09; 5 условий:
  - было «we meet 100% of demonstrated need for every student.» → на новой странице
    «Carleton meets 100% of your demonstrated financial need, without loans.»;
  - было «The estimated cost of attendance for the 2025-2026 academic year is $99,580 .» →
    «The estimated cost of attendance for the 2026-2027 academic year is $104,746 .»;
  - было «…or the CSS/Profile (you submit this through the College Board website)» →
    «…or the 2027-28 CSS/Profile (you submit this through the College Board website)»
    (условия 6 и 19, цитата одна и та же);
  - было «…automatically considered for these scholarships: Starr Foundation Grants:
    Scholarship opportunities for students from Asia» → слов «Starr» на новой странице нет.
- `erasmus` — снимок 26.11: «Scholarship for Chinese students who wish to fund their Bachelor
  or Master at EUR.» на странице стипендий больше нет; остались China Scholarship Council
  (PhD) и Entrepreneurial Spirit Scholarship.
- `sapienza-italy` — снимок 26.11: итальянской фразы «Le informazioni per l'anno accademico
  2026-2027 saranno pubblicate dopo il 30 settembre» больше нет; английская страница уже
  описывает 2026-2027 (TOLC, взносы, сроки).
- `uca` — снимок 26.11: «No student is denied admission to UCA on financial grounds, and once
  admitted, financial assistance is guaranteed.» на новых страницах нет; остался только этап
  «Stage 4 Fees and Financial Assistance».

## Домены, ждущие «да»

пока нет.

## Адреса, добавленные в tools/sources.toml

Все — на доменах, которые уже стояли в секциях. Снимки 26.11 в `raw/<id>/2026-11-26/`.

- `[carleton-college]` — https://www.carleton.edu/admissions/apply/steps/materials
- `[heidelberg]` — https://www.uni-heidelberg.de/en/study/application-enrolment/starting-the-first-academic-semester-of-your-degree-programme,
  https://www.uni-heidelberg.de/en/study/application-enrolment/study-requirements
- `[erasmus]` — https://www.eur.nl/en/bachelor/bachelor-international-business-administration/admission
- `[sapienza-italy]` — https://www.uniroma1.it/en/pagina/international-admissions-2026-2027
- `[uca]` — https://admissions.ucentralasia.org/apply/stage-3/
- `[turkiye-burslari]` — https://turkiyeburslari.gov.tr/evaluationandselectionprocess,
  https://turkiyeburslari.gov.tr/applysteps
- `[nccu]` — https://nccuadmission.nccu.edu.tw/Post/204
- `[rug]` — https://www.rug.nl/education/application-enrolment-tuition-fees/admission/non-dutch-qualification/bachelor/bachelor-application-documents
- `[ajou]` — https://www.ajou.ac.kr/iadmissions_en/undergraduate/guideline.do
- `[jagiellonian-university]` — https://welcome.uj.edu.pl/en_GB/admission/how-to-apply,
  https://welcome.uj.edu.pl/en_GB/admission/documents/undergraduate
- `[uiuc]` — https://www.admissions.illinois.edu/essays/
- `[university-of-warsaw]` — https://rekrutacja.uw.edu.pl/en/how-to-apply/,
  https://rekrutacja.uw.edu.pl/en/required-documents/
- `[slovak-university-of-technology]` — https://www.stuba.sk/en/applicants/how-to-start-to-study/admission-process,
  https://www.fiit.stuba.sk/en/applicants/how-to-start-studying/admission-to-study/admission-for-bachelors-studies/admission-procedure-for-bachelor-studies-in-english-language
- `[unist]` — https://admu-intl.unist.ac.kr/admission-eng/admissions/admissions.do,
  https://admu-intl.unist.ac.kr/admission-eng/contact/faq.do

Не добавлены:
- `[soka]` — http://admissions.soka.edu/portal/essays найден, но секция собрана из `files`
  (manual-файлы, которых нет в worktree): `tools.fetch soka` падает на отсутствующем
  `manual/soka/00.html`. Файл материалов будет частичным.
- `[tsinghua-university]` — https://international.join-tsinghua.edu.cn/List.pdf найден, но
  секция тоже на `files` без manual-файлов в worktree; fetch невозможен.
- `[unist]` и `[slovak-university-of-technology]` — адреса добавлены, но `tools.fetch`
  26.11 не снял: таймаут соединения (WinError 10060). Старые снимки целы; файлы будут
  частичными с причиной.

## Команды

После первой десятки (26.11): `tools.materials --check` → 73 файла, 0 ошибок;
`validate` → 15 с ошибками (11 в начале + 4 разобранных выше); `node --test` → 834, 0 упавших.

## Ветка и коммиты

`deepseek/materials-3c`, коммитов пока нет.
