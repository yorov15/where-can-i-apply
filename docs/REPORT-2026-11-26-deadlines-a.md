# Сроки Nerio — цикл 2027, партия A

Проверено 37 из 112 программ списка DS-11A. Дата проверки — 2026-11-28. Данные каталога не изменены: это очередь решений для сверки цитат владельцем.

Цитата попадает в JSON только после того, как она буквально нашлась в выдержке `raw/deadline-review/2026-11-26-a/<id>.txt`. У таких цитат `freshFetch` и `exactQuoteMatched` равны `true`, в выдержке указан sha256 ответа. Где сайт закрыт для прямой загрузки, стоит `freshFetch: false` и `exactQuoteMatched: false` — такую цитату нужно сверять руками.

## По статусам

- `update` — 10 (новая дата найдена)
- `annual_windows_only` — 7 (повторяющиеся окна без года)
- `closed_correctly` — 6 (срок прошёл, нового цикла нет)
- `blocked` — 6 (страница не отдалась)
- `no_new_announcement` — 6 (только прошлый цикл)
- `wrong_track` — 1 (дата для другой программы)
- `imprecise_new_cycle` — 1 (2027 объявлен без дня)

## Программы

| Программа | В данных сейчас | Статус | Что нашёл |
|---|---|---|---|
| `cambridge` | — → 2026-10-15 (confirmed) | closed_correctly | Набор 2027 (старт осенью 2027): заявка UCAS закрыта 15.10.2026 в 18:00 по UK. Дат набора 2028 на странице нет. |
| `hokkaido-isp` | 2026-11-12 → 2026-11-20 (confirmed) | closed_correctly | Набор октябрь 2027: онлайн-регистрация 12–20.11.2026 (JST, 10:00–17:00), рекомендация должна прийти до 04.12.2026. Окно закрыто, набор 2028 не объявлен. |
| `king-abdulaziz` | 2026-09-16 → 2026-10-06 (confirmed) | closed_correctly | Объявление от 08.09.2026: приём несаудовцев 16.09–06.10.2026 через Study in Saudi. Окно закрыто, объявления на 2027 нет. |
| `mipt` | 2026-06-20 → 2026-07-10 (expected) | blocked | Страницы правил приёма 2027 (mipt.ru/pk, pk.mipt.ru) отдают пустой текст, внешняя читалка — ошибку сертификата. Дат 2027 не подтверждаю. |
| `oxford-reach` | — → 2026-10-15 (confirmed) | closed_correctly | Сайт ox.ac.uk закрыт для прямой загрузки (403). В читалке: для 2027 entry крайний срок 15.10.2026, 18:00 UK; дат 2028 нет. Цитату нужно сверить руками. |
| `renmin` | 2026-01-01 → 2026-05-31 (expected) | wrong_track | Общего приёма на 2027 на iso.ruc.edu.cn нет, PDF от 2026-07 отдаёт 404. Единственные даты 2027 — Global BBA бизнес-школы: 05.11.2026–30.04.2027 17:00 по Пекину. Это отдельная программа, не общий бакалавриат. |
| `study-in-saudi` | 2026-09-16 → 2026-10-06 (confirmed) | no_new_announcement | Прямая загрузка закрыта (403); в читалке — только Second Semester Academic Calendar 2026 с приёмом 16.09–06.10.2026. Объявления 2027 нет. |
| `tsukuba-ide` | 2026-10-01 → 2026-11-04 (confirmed) | closed_correctly | Набор сентябрь 2027: приём заявок начало октября — начало ноября 2026 (точные дни на сайте программы закрыты скриптом), результаты 26.03.2027. Окно закрыто, набор 2028 не объявлен. |
| `urfu` | 2026-08-20 → 2026-11-01 (expected) | closed_correctly | Open Doors 2026/27: регистрация и портфолио 20.08–01.11.2026. Окно закрыто, следующего конкурса на странице нет. |
| `warsaw-university-of-technology` | — → 2026-07-21 (expected) | imprecise_new_cycle | Страница B.Sc. уже про 2027/28, но дни не объявлены: регистрация — начало мая 2027 (to be updated), заявку создать до середины июля 2027, документы загрузить до середины августа 2027. Точных дат не ставлю. |
| `zhejiang-university` | — → 2026-02-28 (expected) | blocked | Страница приёма отдаёт пустой текст (данные грузятся скриптом). В читалке на iczu.zju.edu.cn дат бакалавриата 2027 нет — только график стипендий для магистратуры и докторантуры. |
| `aiu-japan` | — → — (expected) | update | Набор сентябрь 2027: онлайн-заявка 01–09.10.2026 (JST, до 23:00), документы до 26.10.2026, зачисление сентябрь 2027. Окно закрыто; набор 2028 не объявлен. |
| `apu-japan` | — → — (expected) | blocked | Сроки на admissions.apu.ac.jp подгружаются скриптом: в HTML только заголовок «2027 ENTRY Next application deadline». Адрес перенаправляет на apu-admissions.jp — другой домен, без «да» Мурода не подключаю. |
| `aus-uae` | — → — (expected) | update | Осень 2027: заявка до 01.04.2027; онлайн-формы закрываются в 16:00 в день срока. Фраза стоит на странице стипендий и названа общим сроком Fall 2027. |
| `bauman` | — → — (expected) | blocked | bmstu.ru отдаёт пустой текст на всех страницах приёма иностранцев, внешняя читалка — 403. Дат 2027 не подтверждаю. |
| `germany-public` | — → 2027-07-15 (expected) | annual_windows_only | DAAD даёт общее правило для вузов: приём на зимний семестр идёт с начала мая до 15 июля, но год на странице не указан, поэтому дату 2027 не ставлю. Для зимнего семестра 2027/28 это ориентировочно 15 июля 2027, официально не подтверждено. |
| `grinnell-college` | — → 2027-01-15 (expected) | update | Страница называет цикл 2026-27, то есть приём осенью 2027: ED I 15.11.2026, ED II 5.01.2027, RD 15.01.2027; основной — RD. ED I уже прошёл. |
| `jhu` | — → 2027-01-02 (expected) | update | Таблица сроков прямо на цикл 2026-27: ED I 1.11.2026, ED II и RD 2.01.2027, перевод 1.03.2027. Основной срок для иностранца — RD 2 января 2027. |
| `kenyon-college` | — → 2027-01-15 (expected) | annual_windows_only | На странице сроков приёма только месяцы без года (ED1 15 ноября, ED2/RD 15 января), год цикла не указан, поэтому дату 2027 не ставлю. 2027 упоминается только в связи с CSS Profile 2027-28 на странице финпомощи. |
| `kiut` | — → 2027-07-31 (expected) | annual_windows_only | Страница про приём 2026/2027: осенний поток — 31 июля, весенний — 31 декабря. Года у самих дат нет, поэтому 2027 не ставлю; для 2027/2028 объявления нет. |
| `lmu` | — → 2027-07-15 (expected) | annual_windows_only | LMU называет только общее правило: 15 января для летнего и 15 июля для зимнего семестра, год к этим срокам не привязан. Для зимнего семестра 2027/28 это ориентировочно 15 июля 2027; портал приёма меняется с лета 2027, точных дат на странице нет. |
| `metu-turkey` | 2027-06-01 → 2027-07-12 (expected) | no_new_announcement | На странице только прошедший приём на 2026-2027 учебный год (1 июня - 12 июля 2026). Приём на 2027-2028 не объявлен. |
| `moe-taiwan` | 2027-02-01 → 2027-03-31 (expected) | annual_windows_only | На страницах MOE дат нет: заявку подают в представительство Тайваня за рубежом, и срок устанавливает само представительство. Для 2027 года срок на сайте не опубликован. |
| `ncku` | 2026-12-20 → 2027-03-15 (expected) | no_new_announcement | Сейчас на странице только приём на весну 2027 (23.09-13.10.2026), он уже закрыт. Приём на осень 2027 не объявлен. |
| `northwestern-university` | — → 2027-01-04 (expected) | update | Таблица сроков на цикл 2026-27: QuestBridge 1.10.2026, ED 1.11.2026, RD 4.01.2027, перевод 1.04.2027. Основной для иностранца — RD 4 января 2027. |
| `peking-university` | 2026-01-01 → 2027-02-28 (expected) | no_new_announcement | На сайте только цикл 2026: два раунда 19.12.2025-28.02.2026 и 12.06-10.07.2026. Для 2027 опубликованы лишь требования к баллам, сроков подачи на бакалавриат 2027 нет. |
| `qatar-university` | 2027-03-01 → 2027-03-25 (expected) | blocked | Все три страницы qu.edu.qa отдают только навигацию и новости, содержимое раздела приёма подгружается скриптом, текста со сроками нет. |
| `romania-gov` | 2027-02-16 → 2027-03-31 (expected) | no_new_announcement | На сайте действующий конкурс 2026 года: подача 16.02-31.03.2026, результаты около 15.07.2026. Конкурс на 2027 год ещё не объявлен. |
| `sjtu` | — → 2027-03-31 (expected) | update | Это страница программы Undergraduate Engineering Cluster Program in English: Early Action 1.11.2026 (прошёл), обычный раунд 31.03.2027. Основной срок — 31 марта 2027, время Пекина. |
| `smith-college` | — → 2027-01-15 (expected) | annual_windows_only | На странице приёма сроки без года: ED I 15 ноября, ED II 5 января, RD 15 января. Год цикла не указан (2027-28 есть только на странице финпомощи), поэтому дату 2027 не ставлю. |
| `swarthmore-college` | — → 2027-01-04 (expected) | update | Страница прямо называет цикл 2026-2027: Fall ED 15.11, Winter ED 4.01, RD 4.01. Основной для иностранца — RD 4 января 2027. |
| `trento` | 2026-12-01 → 2027-03-23 (expected) | blocked | Все страницы unitn.it отдают 403 Forbidden, обходить не стал. |
| `tufts-university` | — → 2027-01-04 (expected) | update | Таблица на цикл 2026-27: ED I 2.11.2026, ED II 4.01.2027, RD 4.01.2027. Основной — RD 4 января 2027. |
| `uca` | 2026-10-01 → 2027-02-14 (expected) | update | Приём 2027 года уже идёт: открыт 15.10.2026, дедлайн 15.02.2027 в 18:00 (GMT+6), тест 6-7 марта 2027. Дедлайн одинаков для кампусов Нарын и Хорог. |
| `uva-amsterdam` | — → 2027-05-01 (expected) | annual_windows_only | UvA указывает общий срок 1 мая для бакалавриата с началом 1 сентября, но год к сроку не привязан. 2027-2028 упоминается только на странице оценки дипломов, поэтому дату 2027 не ставлю. |
| `wellesley-college` | — → 2027-01-08 (expected) | update | Страница прямо про приём осенью 2027: ED I 1.11.2026 (прошёл), ED II 5.01.2027, RD 8.01.2027. Основной — RD 8 января 2027. |
| `wiut` | — → 2027-07-15 (expected) | no_new_announcement | Портал называет сроки для 2026-2027 учебного года: CIFS 15.07.2026, бакалавриат/direct entry 17.08.2026, они прошли. Для следующего года на странице direct entry стоит «TBA». |

## Окна по программам

### cambridge

- UCAS, набор 2027: — → 2026-10-15; пояс/время: UK time, 18:00
- цитата: «Are you planning to start an undergraduate course at Cambridge in 2027?» — https://www.undergraduate.study.cam.ac.uk/apply/application-dates-deadlines
- цитата: «15 October 2026 Deadline to submit your UCAS application (6pm UK time).» — https://www.undergraduate.study.cam.ac.uk/apply/application-dates-deadlines

### hokkaido-isp

- 2027 enrollment, online registration: 2026-11-12 → 2026-11-20; пояс/время: JST, 10:00–17:00
- 2027 enrollment, рекомендация должна прийти: — → 2026-12-04; пояс/время: JST, до 17:00
- цитата: «Application Schedule and Deadline Date and Time/Period (JST) Online Registration Period November 12, 2026 (Thu.) at 10:00 a.m. - November 20, 2026 (Fri.) at 5:00 p.m.» — https://www.oia.hokudai.ac.jp/isp/wp-content/uploads/2026/09/ISP-Application-Guidelines-for-2027-Enrollment.pdf
- цитата: «Deadline for Arrival of Letter of Recommendation at University (Form 5) No later than 5:00 p.m. on December 4, 2026 (Fri.)» — https://www.oia.hokudai.ac.jp/isp/wp-content/uploads/2026/09/ISP-Application-Guidelines-for-2027-Enrollment.pdf

### king-abdulaziz

- несаудовцы, бакалавриат и магистратура: 2026-09-16 → 2026-10-06
- цитата: «Application period: September 16-October 6, 2026» — https://www.kau.edu.sa/en/announcement/the-date-for-opening-admission-applications-for-non-saudi-students-residing-both-inside-and-outside-the-kingdom-for-undergraduate-and-postgraduate-programs
- цитата: «Announcement Period From 16 September 2026 To 6 October 2026» — https://www.kau.edu.sa/en/announcement/the-date-for-opening-admission-applications-for-non-saudi-students-residing-both-inside-and-outside-the-kingdom-for-undergraduate-and-postgraduate-programs

### oxford-reach

- UCAS, набор 2027: — → 2026-10-15; пояс/время: UK time, 18:00
- цитата (не сверено): «Final deadline 6pm (UK time) on 15 October» — https://www.ox.ac.uk/admissions/undergraduate/applying/admissions-timeline

### renmin

- Global BBA (School of Business), не общий приём: 2026-11-05 → 2027-04-30; пояс/время: Beijing Time, 17:00
- цитата: «The application window is November 5, 2026, 00:00 - April 30, 2027, 17:00 (Beijing Time).» — http://globalbba.rmbs.ruc.edu.cn/Admissions/KeyTimelines/index.htm

### urfu

- Open Doors, регистрация и портфолио: 2026-08-20 → 2026-11-01
- цитата: «Registration period: August 20 - November 1, 2026.» — https://urfu.ru/en/open-doors-russian-scholarship-project/

### aiu-japan

- International Examination, сентябрь 2027: 2026-10-01 → 2026-10-09; пояс/время: JST, до 23:00
- документы после онлайн-заявки: 2026-10-01 → 2026-10-26; пояс/время: JST
- цитата: «Enrollment Date September 2027» — https://admission.aiu.ac.jp/wp/wp-content/uploads/2026/08/2027-International-Admissions-Examination-Guide.pdf
- цитата: «Period for online application and payment of the application fee October 1, 2026, 10:00 a.m. - October 9, 2026, 11:00 p.m.» — https://admission.aiu.ac.jp/wp/wp-content/uploads/2026/08/2027-International-Admissions-Examination-Guide.pdf
- цитата: «Deadline for submission of required documents after online application October 1, 2026 - October 26, 2026» — https://admission.aiu.ac.jp/wp/wp-content/uploads/2026/08/2027-International-Admissions-Examination-Guide.pdf

### aus-uae

- Fall 2027: — → 2027-04-01
- цитата: «Fall 2027 application deadline: April 01, 2027» — https://www.aus.edu/admissions/financial-grants-and-scholarships
- цитата: «Online applications are due by 4:00 p.m. on the day of the deadline.» — https://www.aus.edu/admissions/financial-grants-and-scholarships

### grinnell-college

- Early Decision I: — → 2026-11-15
- Early Decision II: — → 2027-01-05
- Regular Decision: — → 2027-01-15
- цитата: «Application Deadlines 2026-27 Early Decision I Early Decision II Regular Decision Application Deadline Nov. 15 Jan. 5 Jan. 15» — https://www.grinnell.edu/admission/apply/first-year/requirements

### jhu

- Early Decision I: — → 2026-11-01
- Early Decision II: — → 2027-01-02
- Regular Decision: — → 2027-01-02
- Transfer: — → 2027-03-01
- цитата: «Early Decision I Early Decision II Regular Decision Transfer Application Deadline November 1, 2026 January 2, 2027 January 2, 2027 March 1, 2027» — https://apply.jhu.edu/how-to-apply/application-deadlines-requirements/

### northwestern-university

- QuestBridge: — → 2026-10-01
- Early Decision: — → 2026-11-01
- Regular Decision: — → 2027-01-04
- Transfer: — → 2027-04-01
- цитата: «Application Due Date October 1, 2026 November 1, 2026 January 4, 2027 March 1, 2027* April 1, 2027*» — https://admissions.northwestern.edu/apply/application-deadlines.html

### sjtu

- Early Action: — → 2026-11-01; пояс/время: Beijing Time, GMT+8
- Regular Application: — → 2027-03-31; пояс/время: Beijing Time, GMT+8
- цитата: «Application Deadlines for 2027 Admission Early Action: November 1 , 2026 (Beijing Time, GMT+8)» — https://global.sjtu.edu.cn/en/study-sjtu/prospective/degree-programs/278
- цитата: «Regular Application: March 31, 202 7 (Beijing Time, GMT+8)» — https://global.sjtu.edu.cn/en/study-sjtu/prospective/degree-programs/278

### swarthmore-college

- Fall Early Decision: — → 2026-11-15
- Winter Early Decision: — → 2027-01-04
- Regular Decision: — → 2027-01-04
- цитата: «For the 2026-2027 admissions cycle» — https://www.swarthmore.edu/admissions-aid/application-materials-deadlines
- цитата: «Winter Early Decision Application Deadline: January 4» — https://www.swarthmore.edu/admissions-aid/application-materials-deadlines
- цитата: «Regular Decision Application Deadline: January 4» — https://www.swarthmore.edu/admissions-aid/application-materials-deadlines

### tufts-university

- Early Decision I: — → 2026-11-02
- Early Decision II: — → 2027-01-04
- Regular Decision: — → 2027-01-04
- цитата: «Early Decision I November 2, 2026 Mid-December Early Decision II January 4, 2027 Early February Regular Decision January 4, 2027 By April 1» — https://admissions.tufts.edu/apply/first-year-students/

### uca

- Undergraduate (Khorog/Naryn): 2026-10-15 → 2027-02-15; пояс/время: GMT+6
- цитата: «Important Dates 15 October 2026 Applications open 15 February 2027 Application deadline 6-7 March 2027 Admissions test April-May 2027 Interviews and financial aid application form» — https://ucentralasia.org/admissions/undergraduate/how-to-applyeur
- цитата: «before the application deadline on 15 February, 2027 at 18:00 (GMT +6)» — https://ucentralasia.org/admissions/undergraduate/how-to-applyeur

### wellesley-college

- Early Decision I: — → 2026-11-01
- Early Decision II: — → 2027-01-05
- Regular Decision: — → 2027-01-08
- цитата: «Wellesley College will continue to be test optional for those applying for entry in fall 2027.» — https://www.wellesley.edu/admission-aid/apply/first-year-applicants
- цитата: «Materials and Notifications Early Decision I Early Decision II Regular Decision Application November 1 January 5 January 8» — https://www.wellesley.edu/admission-aid/apply/first-year-applicants

## Домены, которые ждут «да» Мурода

Новых доменов не понадобилось: все цитаты с уже одобренных страниц программ.

## Что прогнано

```
node --test                                          — pass, fail 0
PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .   — Ran 547 tests, OK
python -m tools.build                                — 323 программы, индекс 97 229 Б по проводу
```
Вывод сборки в коммиты не попадал. Рабочая копия в этом worktree переведена в LF: байтовые хеши `raw/apply-channels` сверяются по байтам, с CRLF падают 29 тестов аудита. Эти переводы строк не закоммичены.

Ветка `deepseek/deadlines-2027-a`, последний коммит `2f605b89 Отчёт: сроки цикла 2027, партия 1`.
