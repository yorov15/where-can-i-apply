# Сроки Nerio — цикл 2027, партия A

Проверено 112 из 112 программ списка DS-11A. Дата проверки — 2026-11-28. Данные каталога не изменены: это очередь решений для сверки цитат владельцем.

Цитата попадает в JSON только после того, как она буквально нашлась в выдержке `raw/deadline-review/2026-11-26-a/<id>.txt`. У таких цитат `freshFetch` и `exactQuoteMatched` равны `true`, в выдержке указан sha256 ответа. Где сайт закрыт для прямой загрузки, стоит `freshFetch: false` и `exactQuoteMatched: false` — такую цитату нужно сверять руками.

## По статусам

- `update` — 35 (новая дата найдена)
- `annual_windows_only` — 28 (повторяющиеся окна без года)
- `no_new_announcement` — 22 (только прошлый цикл)
- `closed_correctly` — 12 (срок прошёл, нового цикла нет)
- `blocked` — 12 (страница не отдалась)
- `imprecise_new_cycle` — 2 (2027 объявлен без дня)
- `wrong_track` — 1 (дата для другой программы)

## Открытые сроки (ещё не прошли)

- 2026-12-01 — `sydney`: Semester 1 2027 (international), Australia/Sydney
- 2026-12-03 — `nucb`: Autumn 2027, stage 3
- 2026-12-04 — `hokkaido-isp`: 2027 enrollment, рекомендация должна прийти, JST, до 17:00
- 2026-12-10 — `kimep`: Spring 2027, foreign students
- 2026-12-11 — `chungbuk`: 2027 spring, 2nd round, KST
- 2026-12-18 — `sookmyung`: Spring 2027, 3rd round, KST
- 2026-12-31 — `utm`: international undergraduate, February 2027 intake
- 2027-01-02 — `jhu`: Early Decision II
- 2027-01-02 — `jhu`: Regular Decision
- 2027-01-04 — `davidson-college`: Early Decision II
- 2027-01-04 — `northwestern-university`: Regular Decision
- 2027-01-04 — `swarthmore-college`: Regular Decision
- 2027-01-04 — `swarthmore-college`: Winter Early Decision
- 2027-01-04 — `tufts-university`: Early Decision II
- 2027-01-04 — `tufts-university`: Regular Decision
- 2027-01-05 — `grinnell-college`: Early Decision II
- 2027-01-05 — `wellesley-college`: Early Decision II
- 2027-01-08 — `wellesley-college`: Regular Decision
- 2027-01-11 — `davidson-college`: Regular Decision
- 2027-01-14 — `unsw`: Term 1 2027, onshore, Australia/Sydney
- 2027-01-15 — `grinnell-college`: Regular Decision
- 2027-01-21 — `nucb`: Autumn 2027, stage 4
- 2027-01-22 — `aalto-finland`: bachelor's programmes in English, admission rounds A and B
- 2027-01-26 — `uba`: Pre-ingreso UBA (поступление в 2027), America/Argentina/Buenos_Aires
- 2027-02-01 — `khalifa-uae`: Fall 2027 undergraduate (scholarship assessed at admission)
- 2027-02-11 — `nucb`: Autumn 2027, stage 5
- 2027-02-15 — `stanford-university`: Regular Decision, international need-based aid (CSS Profile priority filing)
- 2027-02-15 — `uca`: Undergraduate (Khorog/Naryn), GMT+6
- 2027-02-25 — `unsw`: Term 2 2027, offshore, Australia/Sydney
- 2027-03-01 — `jhu`: Transfer
- 2027-03-09 — `polimi`: TEST STANDARD, prima finestra, CEST
- 2027-03-11 — `nucb`: Autumn 2027, stage 6
- 2027-03-15 — `handong`: 2027 Fall Semester (freshmen, international), KST, 5 PM
- 2027-03-31 — `sjtu`: Regular Application, Beijing Time, GMT+8
- 2027-04-01 — `aus-uae`: Fall 2027
- 2027-04-01 — `northwestern-university`: Transfer
- 2027-04-08 — `nucb`: Autumn 2027, stage 7
- 2027-04-30 — `renmin`: Global BBA (School of Business), не общий приём, Beijing Time, 17:00
- 2027-05-15 — `nanjing`: Bachelor's (Chinese-taught), autumn 2027
- 2027-05-29 — `polimi`: TEST STANDARD, seconda finestra, CEST
- 2027-05-29 — `sydney`: Semester 2 2027 (international), Australia/Sydney
- 2027-06-10 — `polimi`: Prima fase - immatricolazioni anticipate (extra-UE), CEST
- 2027-06-10 — `unsw`: Term 3 2027, offshore, Australia/Sydney
- 2027-06-17 — `polimi`: Seconda fase - immatricolazioni standard, CEST
- 2027-07-22 — `polimi`: Terza fase - posti residui, CEST
- 2027-08-15 — `kimep`: Autumn 2027 bachelor (Kazakh and foreign citizens)
- 2027-08-26 — `polimi`: Quarta fase - ulteriori posti residui, CEST
- 2027-10-31 — `italy-universitaly`: visa application a.a. 2027/2028 (preiscrizione via Universitaly)

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
| `bme-budapest` | — → — (expected) | update | Опубликован только срок весеннего набора 2027 (старт в феврале 2027): 15 октября - 15 ноября 2026, он уже закрыт, и в этом наборе доступны не все программы. Окно на осень 2027 не опубликовано. |
| `boston-university` | — → — (expected) | annual_windows_only | Сроки на странице без года: заявка на первый курс 5 января, Early Decision 1 ноября, merit-стипендии 1 декабря. Цикла 2026/27 или 2027/28 текст не называет, поэтому дату 2027 не ставлю. |
| `charles-university` | — → — (expected) | annual_windows_only | Единого срока нет: каждый факультет устанавливает свой (для англоязычных бакалавриатов - с февраля по июнь/июль). Год на странице не указан. |
| `chungbuk` | — → — (expected) | update | Для весеннего набора 2027 (старт в марте 2027) два раунда: 1-й 12-30 октября 2026, 2-й 23 ноября - 11 декабря 2026 (второй ещё открыт). Сроки на осень 2027 не опубликованы. |
| `cnu` | — → — (expected) | annual_windows_only | На странице только повторяющееся расписание без года: срок подачи - конец мая (осенний семестр) и конец ноября (весенний). |
| `copenhagen` | — → — (expected) | annual_windows_only | Срок для абитуриентов с иностранными документами - 15 марта в 12:00, год на странице не указан. Все бакалаврские программы ведутся на датском. |
| `czech-public` | — → — (expected) | annual_windows_only | Годового срока нет: большинство программ с началом в сентябре закрывают приём между февралём и апрелем, конкретные даты - у вуза. |
| `elte` | — → — (expected) | annual_windows_only | Без года: приём открывается в ноябре, сроки для платных студентов - с конца апреля до середины июля, для госстипендий - с ноября до середины января. |
| `epfl` | — → — (expected) | annual_windows_only | Основной срок - 30 апреля (заявки с середины ноября), год на странице не указан. Отдельно указана регистрация на вступительный экзамен: 1 октября - 1 декабря 2026, экзамены 18-22 января 2027. |
| `estonia-study` | — → — (expected) | no_new_announcement | Опубликован только раунд 2026: приём заявок 1-31 октября 2026 (до 23:59 по Таллину). Раунд 2027 не объявлен; приём в вузы идёт по срокам самих вузов и DreamApply. |
| `finland-study` | — → — (expected) | annual_windows_only | Точных дат нет: основной совместный приём англоязычных бакалавриатов - в январе на осень следующего года, конкретные даты публикуются на Studyinfo.fi. |
| `gks-korea` | — → — (expected) | no_new_announcement | На странице только график 2026 года (заявки 7-20 мая 2026). Приём GKS 2027 (объявление в феврале, заявки февраль-март) ещё не опубликован. |
| `handong` | — → — (expected) | update | Даты набора 2027 опубликованы картинкой на странице, текстом их нет: осень 2027 — заявки 1 февраля — 15 марта 2027 до 17:00, итог 30 апреля 2027; весна 2027 — 1 августа — 15 сентября 2026, закрыт. Цитата подтверждает только публикацию сроков 2027, сами даты с картинки — требуют сверки глазами. |
| `heidelberg` | — → — (expected) | annual_windows_only | Единого срока нет: сроки 1-го семестра бакалавриата зависят от процедуры отбора конкретной программы. Год на странице не указан. |
| `hongik` | — → — (expected) | update | В гайде для иностранцев указан приём на весну 2027: онлайн-заявка 16-23 июля 2026 (срок прошёл), регистрация 10-12 февраля 2027. Гайд на осень 2027 не опубликован. |
| `hufs` | — → — (expected) | update | Гайд Spring 2027 (2027-1): ранний раунд 1–11 сентября 2026, обычный 19 октября – 20 ноября 2026; основным считаю обычный как более поздний с тем же покрытием. Осень 2027 пока не объявлена. |
| `imd-tajikistan` | — → — (expected) | no_new_announcement | На сайте НТЦ только пособие довталаба и календарь ИМД-2026 (опубликовано 16.01.2026); сроков регистрации на ЦВЭ 2027 нет. |
| `inu` | — → — (expected) | update | Набор 27.3 (март 2027): 1-й раунд 7 сентября – 16 октября, 2-й раунд 26 октября – 20 ноября 2026; 2-й раунд закрылся 20.11.2026. Осень 2027 не объявлена. |
| `italy-universitaly` | — → — (expected) | update | Предзапись идёт через Universitaly; для a.a. 2027/2028 министерский крайний срок подачи визы — 31.10.2027, точные сроки предзаписи каждый вуз устанавливает сам (циркуляр действует на 2026/27 и 2027/28). |
| `itu` | — → — (expected) | no_new_announcement | На страницах только 2026-2027 учебный год (раунды осени 2026, в т.ч. 2-й раунд 3–6 сентября 2026); дат 2027-2028 нет. |
| `jbnu` | — → — (expected) | update | Spring 2027: 1-й раунд 21 сентября – 2 октября 2026, 2-й раунд 9–20 ноября 2026 (KST); основным считаю 2-й как более поздний. Осень 2027 не объявлена. |
| `kangwon` | — → — (expected) | update | Spring 2027 (2027학년도 전기), иностранцы-бакалавры: приём заявок и документов 26.10.2026 09:00 – 20.11.2026 17:00 KST; срок уже прошёл. Осень 2027 не объявлена. |
| `khalifa-uae` | — → — (expected) | update | Приём на Fall 2027 открыт до 1 февраля 2027; стипендия для иностранцев оценивается в рамках приёма, отдельной заявки на неё нет. |
| `kimep` | — → — (expected) | update | Бакалавриат, осенний семестр 2027: приём документов 16.10.2026 – 15.08.2027 (для иностранцев весной 2027 — до 10.12.2026). |
| `kit` | — → — (expected) | annual_windows_only | Для иностранцев вне ЕС бакалавриат: зимний семестр — 15 июля, летний — 15 января; года на странице нет, цикла 2027/28 отдельно не объявлено. |
| `konkuk` | — → — (expected) | no_new_announcement | На сайте только гайды 2026 Spring и 2026 Fall (в гайде Fall 2026 заявки 9–20 марта 2026); набора 2027 нет. |
| `korea-university` | — → — (expected) | update | Календарь приёма: Spring 2027 — заявки 3–31 августа 2026 (закрылись), Fall 2027 — только "March, 2027 (TBA)" без дня. |
| `kyung-hee` | — → — (expected) | update | Spring 2027 (1-й и 2-й наборы): заявки 17–28 августа 2026 и 26 октября – 6 ноября 2026; основным считаю 2-й набор как более поздний. Осень 2027 не объявлена. |
| `lund-sweden` | — → — (expected) | annual_windows_only | Бакалавриат стартует только осенью; в международном раунде дедлайн документов — начало февраля, но года и дат цикла 2027 на страницах Lund нет. |
| `masaryk-university` | — → — (expected) | annual_windows_only | Сроки по факультетам даны без года (напр. 1 ноября – 28 февраля, педагогический 1 октября – 31 марта); цикла 2027/28 с датами на странице нет. |
| `medipol` | — → — (expected) | blocked | Страницы приёма medipol.edu.tr и mio.medipol.edu.tr отвечают 403 Forbidden, сроков получить не удалось. |
| `michigan` | — → — (expected) | blocked | admissions.umich.edu отдаёт 403 Forbidden на все страницы международного приёма, дат получить не удалось. |
| `nanjing` | — → — (expected) | update | Китайский гайд опубликован 16.09.2026 и прямо относится к осени 2027 (каталог 2027 года и «2027年秋季入学»), поэтому 3月1日–5月15日 — это 2027-03-01…2027-05-15; английская страница ещё показывает прошлый срок 15.05.2026. |
| `newuu` | — → — (expected) | no_new_announcement | На странице только набор Fall 2026 (заявки открыты, дедлайн регистрации 19 июня, документы до 13 июля); сроков на 2027 нет. |
| `nsu` | — → — (expected) | annual_windows_only | Срок зависит от страны и указан без года; для Таджикистана конкретной даты на странице нет. |
| `nucb` | — → — (expected) | update | Таблица «Admission for 2027»: для иностранцев осенний набор (сентябрь 2027) идёт по stage 1–7, последний — 29.03–08.04.2027; stage 8–9 только для внутренних. |
| `osh-state` | — → — (expected) | no_new_announcement | Раздел приёма на сайте до сих пор называется «АБИТУРИЕНТ 2025», календарных сроков 2026/2027 на страницах приёма нет. |
| `palacky-university` | — → — (expected) | no_new_announcement | На admissions и в PDF для 2026/27 нет календарных дат: сроки подачи устанавливает декан факультета, а портал admission.upol.cz отдаёт пустой JS-текст. |
| `penn-state` | — → — (expected) | annual_windows_only | Даты указаны без года: Early Action 1 ноября, приём на осень закрывается 28 июля; таблица с точными датами на странице не отдаётся (JS). |
| `polimi` | — → — (expected) | update | Bando 2027/2028: для поступающих со школьным дипломом 2026/2027 действует TEST STANDARD с двумя окнами (последнее закрывается 29.05.2027), затем immatricolazione anticipata до 10.06.2027; extra-UE идут в тех же фазах (ст. 7), третья и четвёртая — только оставшиеся места. |
| `postech` | — → — (expected) | imprecise_new_cycle | Spring 2027 набор уже закрыт (заявки 25.08–02.09.2026); для Fall 2027 объявлено только «March-April 2027», гид обещан в январе 2027. |
| `pusan-national` | — → — (expected) | closed_correctly | Гид 2027 Spring: заявки 12–23.10.2026 (уже прошли), документы до 06.11.2026; гид осеннего набора 2027 ещё не опубликован. |
| `russia-quota` | — → — (expected) | blocked | education-in-russia.com не отвечает (таймаут чтения) ни на главной, ни на странице admission-process; в rest-выгрузке текста тоже 0. |
| `sabanci-university` | — → — (expected) | no_new_announcement | Страница описывает только цикл 2026–2027 с приёмом 15.12.2025–28.08.2026; условий и дат на 2027–2028 ещё нет. |
| `science-tokyo` | — → — (expected) | closed_correctly | GSEP набирает только на апрель: приём на апрель 2027 закрылся 21.08.2026; набор на апрель 2028 ещё не объявлен, процесс отбора меняется с AY 2028. |
| `seoultech` | — → — (expected) | closed_correctly | Найдено расписание набора на весну 2027 (март 2027): два раунда, оба уже закрыты — 2 октября и 18 ноября 2026. Гайд на осенний набор 2027 не опубликован, на сайте есть только PDF для сентября 2026. |
| `skku` | — → — (expected) | closed_correctly | Второй раунд набора на весну 2027 для иностранных первокурсников шёл 4–13 ноября 2026 и уже закрыт, документы принимались до 27 ноября 2026. Осенний набор 2027 не объявлен. |
| `snu-korea` | — → — (expected) | closed_correctly | Приём на весну 2027 (март 2027) шёл 6–9 июля 2026 и закрыт; гайд на осенний набор 2027 ещё не опубликован. |
| `sookmyung` | — → — (expected) | update | Набор на весну 2027 идёт тремя раундами, третий (3–18 декабря 2026) ещё открыт — это ближайший доступный срок. В PDF-гайде есть оговорка «Only residents of Korea are eligible to apply», иностранцам вне Кореи велят списаться с приёмной комиссией до подачи. |
| `stanford-university` | — → — (expected) | update | Страница финпомощи для international озаглавлена «Application Requirements 2027-2028»: приоритетная дата подачи CSS Profile — 15 февраля 2027. Страница приёма даёт сроки без года (REA 1 ноября, RD 5 января), поэтому в windows только aid-срок. |
| `sydney` | — → — (expected) | update | Сроки считаются по правилу со страницы: для international закрытие семестра 1 — 1 декабря предыдущего года, семестра 2 — 29 мая; там же указаны старты 2027 (22 февраля и 2 августа), отсюда 1 декабря 2026 и 29 мая 2027. |
| `tiu` | — → — (expected) | no_new_announcement | На официальном сайте Tashkent International University (tiu.uz) висит только срок прошлого цикла — 1 июня 2026, набора 2027 нет. Карточка ведёт на узбекский вуз, а не на Tokyo International University, поэтому раунды English Track не проверял. |
| `tsu` | — → — (expected) | no_new_announcement | На сайте приёмной комиссии и в правилах приёма есть только кампания 2026-2027 учебного года, конкретных дат набора 2027 нет — сроки приёма 2027 ещё не объявлены. |
| `tum` | — → — (expected) | annual_windows_only | TUM не публикует общий срок для бакалавриата: на странице дат сказано «Please refer to the specific programs»; единственные датированные окна — Studienkolleg (15.05–15.07 зима, 15.11–15.01 лето) без года. |
| `uba` | — → — (expected) | update | В академическом календаре UBA XXI (официальная страница UBA) есть блок «Inscripciones 2027»: Pre-ingreso UBA для поступления в 2027 идёт с 12 ноября по 26 января (на странице опечатка «26/011»). Общая страница CBC отдаёт пустой JS-текст. |
| `ucl` | — → — (expected) | blocked | Все страницы ucl.ac.uk из карточки отдают HTTP 403 Forbidden, обходить не стал. |
| `umm-al-qura` | — → — (expected) | no_new_announcement | На английских страницах приёма только условия для иностранцев, дат нет; последняя новость о старте подачи — внешние стипендии 1447 г.х. (2025). Расписание приёма живёт в JS-портале uqu.edu.sa/App/Admission, PDF-гид датирован 2023 годом. |
| `unist` | — → — (expected) | blocked | Английская страница приёмов www.unist.ac.kr/en/admissions/ дважды не открылась по таймауту, корейская admissions.do отдаётся без дат; поддомен admission.unist.ac.kr не резолвится. |
| `university-of-szeged` | — → — (expected) | update | Для иностранцев на платной основе приём на весну 2027 открыт с 16 октября 2026; дата закрытия на сайте вуза не опубликована — она указывается в карточке каждой программы в DreamApply. |
| `unsw` | — → — (expected) | update | Для Таджикистана действуют offshore-сроки: Term 1 2027 уже закрыт 15 ноября 2026, ближайший доступный — Term 2 2027 (25 февраля 2027), затем Term 3 2027 (10 июня 2027); не все программы имеют Term 2/3. |
| `usm` | — → — (expected) | no_new_announcement | Страница международного приёма переделана (Last Update 26.11.2026): сроков подачи на ней нет, только проспект 2026/2027 и кнопка Apply via Pohon@USM. Объявления окна на 2027 нет. |
| `utm` | — → — (expected) | update | На странице международного бакалавриата указан приём February 2027: подача 1 ноября — 31 декабря 2026. Это единственное окно на странице. |
| `uwashington` | — → — (expected) | annual_windows_only | Срок годового цикла для first-year: autumn — 15 ноября, продлён до 1 декабря, но год в тексте срока не указан (есть только подвал © 2026). Зимний квартал для иностранцев закрыт. |
| `wcu` | — → — (expected) | no_new_announcement | На официальной странице приёма иностранцев сроков подачи нет вообще — только порядок регистрации на portal.edu.az и список документов; академический календарь на сайте только за 2024-2025. |
| `yeditepe` | — → — (expected) | blocked | Все страницы приёма (international.yeditepe.edu.tr, www.yeditepe.edu.tr и PDF-гайд) отдают 403 Forbidden; не обходил. |
| `yonsei` | — → — (expected) | closed_correctly | Опубликован гайд Spring 2027 (март 2027): подача 01.09.2026–17.09.2026 через интернет, срок прошёл; осеннего гайда на 2027 на странице приёма нет. |
| `aalto-finland` | — → 2027-01-22 (expected) | update | Единый срок для бакалаврских программ на английском: 7–22 января 2027, оба раунда A и B в одном окне (совместный приём Studyinfo). |
| `austria-study` | — → 2027-09-05 (expected) | annual_windows_only | OeAD даёт общие сроки: 5 сентября (зимний семестр) и 5 февраля (летний), год не указан. Отдельного срока для третьих стран на просмотренных страницах studyinaustria.at и oead.at нет — только совет подавать заранее из-за проверки иностранных документов. |
| `bard-college` | — → 2027-01-15 (expected) | annual_windows_only | Для иностранцев: Early Action/Early Decision — 1 ноября, Early Decision II и Regular Decision — 15 января; год в тексте сроков не указан (на странице только ©2026). |
| `bilkent` | 2027-02-02 → 2027-07-12 (expected) | no_new_announcement | Опубликовано только окно прошлого цикла — 2 февраля — 12 июля 2026 для осеннего семестра 2026-2027; объявления приёма на 2027-2028 нет. |
| `bryn-mawr-college` | — → 2027-01-15 (expected) | annual_windows_only | Сроки для иностранцев: Early Decision 15 ноября или 1 января, Regular Decision 15 января — без года; Supplement на странице назван «2025-2026 Application Cycle», то есть страница ещё прошлого цикла. |
| `carleton-college` | — → 2027-01-15 (expected) | annual_windows_only | Сроки без года: Fall Early Decision — 15 ноября, Winter Early Decision и Regular Decision — 15 января; на странице международного приёма при этом указан CSS/Profile на 2027-28. |
| `colgate-university` | — → 2027-01-15 (expected) | annual_windows_only | Сроки раундов без года: Early Decision I — 1 ноября, Early Decision II и Regular Decision — 15 января (для иностранцев те же даты). Единственная дата с годом — 31.01.2027, но это повторная заявка на aid для продолжающих. |
| `csc-china` | 2026-11-22 → 2026-12-19 (expected) | no_new_announcement | На сайте посольства последнее объявление — набор 2026 (опубликовано 21.11.2025, старт отбора в ноябре 2025); объявления на 2027 на 28.11.2026 нет. |
| `davidson-college` | — → 2027-01-11 (expected) | update | Точные даты с годами: ED I — 15.11.2026, ED II — 04.01.2027, Regular Decision — 11.01.2027; годы взяты из заголовков таблиц «2026 Dates & Deadlines» и «2027 Dates & Deadlines» на этой же странице. Основной — RD 11.01.2027. |
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

### bme-budapest

- bachelor's, fee-paying, spring 2027 intake (Feb 2027 start): 2026-10-15 → 2026-11-15; пояс/время: CET (Budapest)
- цитата: «The next application period (for programmes starting in February 2027) for fee-paying students is 15 October - 15 November, 2026.» — https://xplore.bme.hu/admission/
- цитата: «Please note that for the 2027 spring intake not every degree programme is available» — https://xplore.bme.hu/admission/

### chungbuk

- 2027 spring, 1st round: 2026-10-12 → 2026-10-30; пояс/время: KST
- 2027 spring, 2nd round: 2026-11-23 → 2026-12-11; пояс/время: KST
- цитата: «2027 Spring Undergraduate(Freshmen ·Transfer) Application Period: 1st round 9AM Oct 12 ~ 6PM Oct 30, 2026 Period: 2nd round 9AM Nov 23 ~ 6PM Dec 11, 2026» — https://oia.cbnu.ac.kr/home/board/download.do?menukey=7903&fsn=1790905542-131-524&bsn=1743121796-900-601&dsn=1790829752-489-500

### estonia-study

- Estonian national bachelor scholarship, 2026 round: 2026-10-01 → 2026-10-31; пояс/время: Europe/Tallinn, 23:59
- цитата: «Bachelor degree scholarships 2026 application period will be open from 1st of October 2026 until 31st of October (23:59, Estonian time)» — https://www.studyinestonia.ee/bachelor-degree-scholarships

### gks-korea

- GKS undergraduate, 2026 round (online application): 2026-05-07 → 2026-05-20; пояс/время: KST
- цитата: «Selection Schedule and Process Step 1. Online Preliminary Briefing Session '26.4.8(Wed) Step 2. Online Application Submission '26.5.7(Thu) 10:00~'26.5.20(Wed) 10:00 (System Deadline)» — https://www.studyinkorea.go.kr/en/plan/scholarship.do

### handong

- 2027 Fall Semester (freshmen, international): 2027-02-01 → 2027-03-15; пояс/время: KST, 5 PM
- 2027 Spring Semester (freshmen, international): 2026-08-01 → 2026-09-15; пояс/время: KST, 5 PM
- цитата: «Dates for 2027 Undergraduate Admissions» — https://www.handong.edu/eng/admission/undergraduate/application/overview/

### hongik

- 2027 spring semester (international students): 2026-07-16 → 2026-07-23; пояс/время: KST
- цитата: «Online Application 7.16(Thu) 10:00 ~ 7.23(Thu) 16:00» — https://www.hongik.ac.kr/kr/admission/recruitment-is.do?mode=download&articleNo=153270&attachNo=89407

### hufs

- Early Decision (Spring 2027): 2026-09-01 → 2026-09-11
- Regular Decision (Spring 2027): 2026-10-19 → 2026-11-20
- цитата: «Early Decision Regular Decision Online Application and Document Submission Tue, September 1, 2026 - Fri, September 11, 2026 Mon, October 19, 2026 - Fri, November 20, 2026» — https://international.hufs.ac.kr/sites/international/contents/files/2027spring/HUFS_2027-1_Admission_guide(ENG).pdf

### inu

- 1st round (March 2027 intake): 2026-09-07 → 2026-10-16
- 2nd round (March 2027 intake): 2026-10-26 → 2026-11-20
- цитата: «1차 : 2026.9 .7 ~ 10 .16 / 2차 : 10.26 ~ 11 .20» — https://isc.inu.ac.kr/bbs/isc/3184/429961/artclView.do

### italy-universitaly

- visa application a.a. 2027/2028 (preiscrizione via Universitaly): — → 2027-10-31
- цитата: «Per l'anno accademico 2027/2028, invece, il termine ultimo per la presentazione delle domande di visto è fissato al 31 ottobre 2027.» — https://www.universitaly.it/it/studenti-stranieri

### jbnu

- 1st round (Spring 2027): 2026-09-21 → 2026-10-02; пояс/время: KST
- 2nd round (Spring 2027): 2026-11-09 → 2026-11-20; пояс/время: KST
- цитата: «1st Round: 26. September. 21. (Mon) 09:00 am ~ October . 2. (Fri) 17:00 pm KST ·2nd Round: 26. November. 9. (Mon) 09:00 am ~ November. 20. (Fri) 17:00 pm KST» — https://www.jbnu.ac.kr/en/Board/217720/detailView.do?pageIndex=1&menu=2952

### kangwon

- Spring 2027 international undergraduate: 2026-10-26 → 2026-11-20; пояс/время: KST
- цитата: «원서접수 및 서류제출 기간: 2026. 10. 26.（월） 09:00 ~ 11. 20.（금） 17:00» — https://global.kangwon.ac.kr/global/bbs/1283/detail.do?pstSn=3864&pageIndex=1&pageItm=10&searchOrderSort=0&searchGbn=0
- цитата: «2027학년도 전기 외국인 학부 입학전형 모집 안내 / Spring 2027 International Undergraduate Admissions Notice» — https://global.kangwon.ac.kr/global/bbs/1283/detail.do?pstSn=3864&pageIndex=1&pageItm=10&searchOrderSort=0&searchGbn=0

### khalifa-uae

- Fall 2027 undergraduate (scholarship assessed at admission): — → 2027-02-01
- цитата: «Undergraduate Admissions for Fall 2027 are now open. Applications will be accepted until 1 February 2027.» — https://www.ku.ac.ae/undergraduate-admissions
- цитата: «Scholarship eligibility is assessed as part of the admission process and applicants are not required to submit a separate scholarship application.» — https://www.ku.ac.ae/undergraduate-scholarships

### kimep

- Autumn 2027 bachelor (Kazakh and foreign citizens): 2026-10-16 → 2027-08-15
- Spring 2027, foreign students: 2026-10-16 → 2026-12-10
- цитата: «2027 ж күзгі семестрге құжаттар тапсырудың ең соңғы мерзімі Бакалавриат бағдарламаларының студенттері (Қазақстан және шет елдер азаматтары) Құжаттар қабылдаудың басталуы 2026 ж 16 қазан Құжаттар қабылдаудың аяқталуы 2027 ж 15 тамыз» — https://www.kimep.kz/prospective-students/en/admission/application-deadlines/

### korea-university

- Spring 2027 freshman: 2026-08-03 → 2026-08-31; пояс/время: KST
- Fall 2027 freshman: — → —; пояс/время: KST
- цитата: «Step Spring 2027 Fall 2027 Important Notes Online Application Submission August 3 (10:00) - August 31, 2026 (17:00) March, 2027 (TBA)» — https://oia.korea.ac.kr/oia2026/Admission-Guide.do

### kyung-hee

- 1st Intake (Spring 2027): 2026-08-17 → 2026-08-28
- 2nd Intake (Spring 2027): 2026-10-26 → 2026-11-06
- цитата: «Online Application Submission Monday, August 17th, 2026 ~ Friday, August 28th, 2026, 5:00 PM» — https://iadmission.khu.ac.kr/gglobalcenter/user/contents/view.do?menuNo=8000031
- цитата: «Online Application Submission Monday, October 26th, 2026 ~ Friday, November 6th, 2026, 5:00 PM» — https://iadmission.khu.ac.kr/gglobalcenter/user/contents/view.do?menuNo=8000031
- цитата: «2027 Spring Semester Undergraduate International Student Online Application(2nd Intake)» — https://iadmission.khu.ac.kr/

### nanjing

- Bachelor's (Chinese-taught), autumn 2027: 2027-03-01 → 2027-05-15
- цитата: «申报时间 3月1日至5月15日» — https://hwxy.nju.edu.cn/lxnd/zsxx/bkxm/sbzn/index.html
- цитата: «2027年秋季入学等事宜，请以录取通知书和官方电邮通知为准» — https://hwxy.nju.edu.cn/lxnd/zsxx/bkxm/sbzn/index.html

### nucb

- Autumn 2027, stage 1: 2026-10-05 → 2026-10-15
- Autumn 2027, stage 2: 2026-11-02 → 2026-11-12
- Autumn 2027, stage 3: 2026-11-23 → 2026-12-03
- Autumn 2027, stage 4: 2027-01-11 → 2027-01-21
- Autumn 2027, stage 5: 2027-02-01 → 2027-02-11
- Autumn 2027, stage 6: 2027-03-01 → 2027-03-11
- Autumn 2027, stage 7: 2027-03-29 → 2027-04-08
- цитата: «Application Deadlines Admission for 2027 Stage Spring Autumn 1 2026 Jun 1 ~ Jun 11 2026 Oct 5 ~ Oct 15 2 2026 Jul 6 ~ Jul 16 2026 Nov 2 ~ Nov 12 3 2025 Aug 31 ~ Sep 10 2026 Nov 23 ~ Dec 3 4 2026 Oct 5 ~ Oct 15 2027 Jan 11 ~ Jan 21 5 2026 Nov 2 ~ Nov 12 2027 Feb 1 ~ Feb 11 6 2026 Nov 23 ~ Dec 3* 2027 Mar 1 ~ Mar 11 7 2027 Jan 11 ~ Feb 11* 2027 Mar 29 ~ Apr 8 8 --- 2027 May 10 ~ May 20* 9 --- 2027 Jun 7 ~ Jul 1*» — https://www.nucba.ac.jp/en/admission/schedule/

### polimi

- TEST STANDARD, prima finestra: 2027-02-01 → 2027-03-09; пояс/время: CEST
- TEST STANDARD, seconda finestra: 2027-03-10 → 2027-05-29; пояс/время: CEST
- Prima fase - immatricolazioni anticipate (extra-UE): 2027-05-03 → 2027-06-10; пояс/время: CEST
- Seconda fase - immatricolazioni standard: 2027-06-14 → 2027-06-17; пояс/время: CEST
- Terza fase - posti residui: 2027-07-19 → 2027-07-22; пояс/время: CEST
- Quarta fase - ulteriori posti residui: 2027-08-23 → 2027-08-26; пояс/время: CEST
- цитата: «2 - i candidati che sono in possesso di un titolo di Scuola secondaria di secondo grado e per coloro che lo conseguiranno con l'anno scolastico 2026/2027 possono sostenere il TEST STANDARD.» — https://www.polimi.it/fileadmin/user_upload/futuri_studenti/Ingegneria_LT/BandoLaureaIngegneria27-28.pdf
- цитата: «PRIMA FINESTRA: test dal 01.02.2027 al 09.03.2027; - SECONDA FINESTRA: test dall' 10.03.2027 al 29.05.2027.» — https://www.polimi.it/fileadmin/user_upload/futuri_studenti/Ingegneria_LT/BandoLaureaIngegneria27-28.pdf
- цитата: «Candidati comunitari, equiparati ed Extra Ue PRIMA FASE - IMMATRICOLAZIONI ANTICIPATE dalle ore 10:30 del giorno 03/05/2027 fino alle ore 23:59:59 del giorno 10/06/2027» — https://www.polimi.it/fileadmin/user_upload/futuri_studenti/Ingegneria_LT/BandoLaureaIngegneria27-28.pdf
- цитата: «Termine ultimo per l'iscrizione alla prima graduatoria e modifica delle preferenze fino alle ore 11:59:59 del giorno 17/06/2027» — https://www.polimi.it/fileadmin/user_upload/futuri_studenti/Ingegneria_LT/BandoLaureaIngegneria27-28.pdf

### postech

- Spring 2027 (прошёл): 2026-08-25 → 2026-09-02; пояс/время: KST
- Fall 2027: — → —
- цитата: «The Fall 2027 intake is scheduled to open for applications in March-April 2027, and the application guidelines will be posted on the official website in January 2027.» — https://adm-iu.postech.ac.kr/comm/cmfile/download.do?encFileGrpSeq=cc2ba150020190627ad899352ae4d036&encFileSeq=82c441f65591f55a229cf6d79a4d6b8a
- цитата: «Online Application August 25 (Tue), 2026, 14:00 - September 2 (Wed), 2026, 17:00» — https://adm-iu.postech.ac.kr/comm/cmfile/download.do?encFileGrpSeq=cc2ba150020190627ad899352ae4d036&encFileSeq=82c441f65591f55a229cf6d79a4d6b8a

### pusan-national

- Spring 2027 (прошёл): 2026-10-12 → 2026-10-23; пояс/время: KST
- цитата: «원서접수 2026. 10. 12.(월) 9:00 ~ 10. 23.(금) 18:00» — http://go.pusan.ac.kr/_common/new_download_file.asp?menu=mojib&page_no=115&field=title_img

### science-tokyo

- GSEP April 2027 (прошёл): 2026-08-12 → 2026-08-21
- цитата: «For applicants commencing in April 2027 Application and Admissions Schedule Announcing the application schedule for GSEP 2027. Application period August 12 - August 21, 2026» — https://admissions.isct.ac.jp/en/013/undergraduate/programs/gsep

### seoultech

- Spring 2027, 1st round (undergraduate): 2026-09-07 → 2026-10-02; пояс/время: KST
- Spring 2027, 2nd round (undergraduate): 2026-11-09 → 2026-11-18; пояс/время: KST
- цитата: «Online Application, Application Fee Payment, Application Submission (in person or via courier) Sepmtember 7, 2026 (Mon) ~ October 2, 2026 (Fri) 17:00 November 9, 2026 (Mon) ~ November 18, 2026 (Wed) 17:00 October 1, 2026 (Thur) ~ October 30, 2026 (Fri) 17:00» — https://global.seoultech.ac.kr/storage/irt2/ckfinder/files/F0E4E852ED39449A8BF10D92E57F528C.pdf

### skku

- Spring 2027 freshman, 2nd round: 2026-11-04 → 2026-11-13; пояс/время: KST
- цитата: «[2027 Spring Undergraduate Admissions] Online Application for Freshman Admission (2nd Round) ○ Application Period: Nov. 4 (Wed), 2026, 10:00 - Nov. 13 (Fri), 2026, 17:00 (KST)» — https://admission-global.skku.edu/eng/undergraduate_view.html?idx=59069

### snu-korea

- Spring 2027 international undergraduate: 2026-07-06 → 2026-07-09; пояс/время: KST
- цитата: «* Online Application Period : Monday, July 6 , 2026, 10:00 - Thursday, July 9, 2026, 17:00» — https://en.snu.ac.kr/admission/overview/notice?md=v&bbsidx=170606

### sookmyung

- Spring 2027, 1st round: 2026-10-07 → 2026-10-16; пояс/время: KST
- Spring 2027, 2nd round: 2026-11-06 → 2026-11-20; пояс/время: KST
- Spring 2027, 3rd round: 2026-12-03 → 2026-12-18; пояс/время: KST
- цитата: «1ST ROUND : October 7, 2026 (Wed. 10 a.m. KST) ~ October 16, 2026 (Fri. 5 p.m. KST) 2ND ROUND : November 6, 2026 (Fri. 10 a.m. KST) ~ November 20, 2026 (Fri. 5 p.m. KST) 3RD ROUND : December 3, 2026 (Thu. 10 a.m. KST) ~ December 18, 2026(Fri. 5. pm. KST)» — https://e.sookmyung.ac.kr/en/admission/undergraduate.do

### stanford-university

- Regular Decision, international need-based aid (CSS Profile priority filing): — → 2027-02-15
- цитата: «Application Requirements 2027-2028 International students who are applying for aid must indicate this intention on the admission application.» — https://financialaid.stanford.edu/undergrad/apply/requirements/rd_international.html
- цитата: «CSS Profile/IDOC Available October 1 Priority Filing Date February 15 Award Notification April» — https://financialaid.stanford.edu/undergrad/apply/requirements/rd_international.html

### sydney

- Semester 1 2027 (international): — → 2026-12-01; пояс/время: Australia/Sydney
- Semester 2 2027 (international): — → 2027-05-29; пояс/время: Australia/Sydney
- цитата: «Semester 1 (Feb) 1 December of the year prior to commencement Semester 2 (Aug) 29 May of the commencing year» — https://www.sydney.edu.au/study/applying/application-dates.html
- цитата: «2027 start dates Semester 1 22 February 2027 Semester 2 2 August 2027» — https://www.sydney.edu.au/study/applying/application-dates.html

### uba

- Pre-ingreso UBA (поступление в 2027): 2026-11-12 → 2027-01-26; пояс/время: America/Argentina/Buenos_Aires
- цитата: «Inscripciones 2027 Noviembre 2026 Pre-ingreso UBA : desde 12/11 hasta 26/011 (para cursar en 2027)» — https://ubaxxi.uba.ar/calendario-academico/

### university-of-szeged

- Spring 2027, international self-financed: 2026-10-16 → —
- цитата: «From October 16, 2026, prospective international students can apply to 16 selected programs offered for the spring semester.» — https://apply.u-szeged.hu/en_GB/news/new/131-applications-now-open-international-self-financed-study-programs-starting-spring-2027

### unsw

- Term 1 2027, offshore: — → 2026-11-15; пояс/время: Australia/Sydney
- Term 1 2027, onshore: — → 2027-01-14; пояс/время: Australia/Sydney
- Term 2 2027, offshore: — → 2027-02-25; пояс/время: Australia/Sydney
- Term 3 2027, offshore: — → 2027-06-10; пояс/время: Australia/Sydney
- цитата: «Term 1 2027 application and offer key dates Offshore Onshore Application closing date Sunday, 15 November 2026 Thursday, 14 January 2027» — https://www.unsw.edu.au/study/international-students/admissions-info
- цитата: «Term 2 2027 application and offer key dates Offshore Onshore Application closing date Thursday, 25 February 2027 Thursday, 29 April 2027» — https://www.unsw.edu.au/study/international-students/admissions-info
- цитата: «Term 3 2027 application and offer key dates Offshore Onshore Application closing date Thursday, 10 June 2027 Thursday, 12 August 2027» — https://www.unsw.edu.au/study/international-students/admissions-info

### utm

- international undergraduate, February 2027 intake: 2026-11-01 → 2026-12-31
- цитата: «February 2027 Intake Date of Application : 1 November 2026 - 31 December 2026» — https://admission.utm.my/undergraduate-international/

### yonsei

- international undergraduate, Spring 2027 (March 2027 intake): 2026-09-01 → 2026-09-17; пояс/время: KST
- цитата: «Int'l Student Spring 2027 International Admission - Application Guide» — https://admission.yonsei.ac.kr/seoul/admission/html/international/guide.asp
- цитата: «Online Application 2026. 9. 1.(Tue) 10:00 ~ 9. 17.(Thu) 17:00» — https://admission.yonsei.ac.kr/seoul/upload/guide/20260529144906YVFHLB.PDF

### aalto-finland

- bachelor's programmes in English, admission rounds A and B: 2027-01-07 → 2027-01-22
- цитата: «The application period for both rounds is from 7 to 22 January 2027.» — https://www.aalto.fi/en/admission-services/apply-to-bachelors-programmes-in-english

### davidson-college

- Early Decision I: — → 2026-11-15
- Early Decision II: — → 2027-01-04
- Regular Decision: — → 2027-01-11
- цитата: «November 15 Early Decision I Admission & Aid Application Deadline» — https://www.davidson.edu/admission-and-financial-aid/admission-aid-timeline
- цитата: «January 11 Regular Decision Admission & Aid Application Deadline Deadline to apply for regular decision.» — https://www.davidson.edu/admission-and-financial-aid/admission-aid-timeline

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

- `lund-sweden`: universityadmissions.se — государственный портал приёма Швеции, где опубликованы точные даты раунда на осень 2027
- `usm`: pohon.usm.my — официальный портал подачи заявок USM, на него ведёт кнопка Apply via Pohon@USM со страницы admission.usm.my; там публикуются окна приёма.

## Что прогнано

```
node --test                                          — pass, fail 0
PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .   — Ran 547 tests, OK
python -m tools.build                                — 323 программы, индекс 97 229 Б по проводу
```
Вывод сборки в коммиты не попадал. Рабочая копия в этом worktree переведена в LF: байтовые хеши `raw/apply-channels` сверяются по байтам, с CRLF падают 29 тестов аудита. Эти переводы строк не закоммичены.

Ветка `deepseek/deadlines-2027-a`, последний коммит `25cafc27 Сроки 2027: партии 7–8, ещё 22 программы`.
