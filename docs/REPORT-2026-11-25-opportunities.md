# Конкурсы и олимпиады для каталога — 25.11.2026

Задача DS-2. Ветка `deepseek/opportunities`, worktree `C:\Users\ORYX\dev\nerio-ds2`, от `origin/main` `b3d5974`. Коммит с отчётом и снимками: `05c906c`; следующий за ним коммит только дописывает эту строку.

## Итог

- Проверено по страницам организаторов: 6 конкурсов полностью (бесплатно + доступно школьнику из Таджикистана + срок 2026-12…2027-09 + официальный сайт).
- В `data/opportunities.json` не внесено ни одной записи: все 6 — на новых доменах, а реестр `tools/opportunity-sources.json` по заданию не трогается, и тест требует точного совпадения пары «домен + URL» с реестром.
- 9 записей проверены частично: нет одной фразы (обычно «бесплатно» или даты 2027 года) — в отчёт, но не в данные.
- Ещё 15 отклонены: платно, закрыто, нет входа для Таджикистана или страница недоступна.

## Ограничение: домены

Тест `tests/opportunities.test.js` требует, чтобы URL каждой записи точно совпадал со строкой реестра (`s.domain === url.hostname && s.url === source.url`), а тест реестра жёстко проверяет число доменов. В реестре 10 адресов:

- `caeconomicsprize.org` — один конкурс (CAEP), второй выпуск не объявлен;
- `www.immerse.education` — один конкурс, набор 2027 закрыт;
- `www.ted.immerse.education`, `aldevere.com`, `oxfordglobaleducation.com`, `horizoninspires.com`, `www.lumiere-education.com` — по одному конкурсу на страницу;
- `www.ibo-info.org`, `www.imo-official.org` — страницы страны без дат;
- `www.sbs.ox.ac.uk` — Cloudflare, 403 (как и 04.11).

Второго конкурса ни на одной одобренной странице нет. Поэтому «~40 записей в данных» без нового «да» по доменам недостижимы: каталог остаётся на 9 записях, а всё найденное лежит ниже готовыми черновиками.

## Проверенные черновики

Проверены 25.11.2026 по странице организатора. Цитаты — дословные строки из снимка `raw/opportunities/<id>.txt`; sha256 — по UTF-8/LF. Реестр доменов не менялся.

| id | Название | Тип | Срок | Кому | Стоимость | Домен | snapshot | sha256 |
|---|---|---|---|---|---|---|---|---|
| `purple-comet` | Purple Comet! Math Meet | math | 2027-04-15 (окно 6–15 апреля) | любой школьник до 20 лет, не закончивший среднюю школу; команда и взрослый руководитель | бесплатно | purplecomet.org | raw/opportunities/purple-comet.txt | a6bb0bc4b26aace36e2a1729c720980231bbc14fb782a68215a03f6cdcf43775 |
| `european-math-cup` | European Mathematical Cup | math | 2026-12-20 (окно 12–20 декабря) | школьники; младшая категория — до 17 лет и без участия в IMO | бесплатно | emc.mnm.hr | raw/opportunities/european-math-cup.txt | 84c75096982c6686c39f5eb3daee6b1cc0476408de4b474673e096ba1e6093f7 |
| `cern-beamline` | CERN Beamline for Schools | science | 2027-03-12, 23:59 CET | команда школьников со всего мира с тренером-учителем; участникам от 16 лет на день подачи | бесплатно | beamlineforschools.cern | raw/opportunities/cern-beamline.txt | 787a5e9e0eceec9dd08206c926aebf5c525a82164b157ec9da60bd40f73f3dec |
| `sony-youth` | Sony World Photography Awards — Youth | arts | 2027-01-05, 16:00 GMT | все желающие 19 лет и младше на дату закрытия; страна не ограничена | бесплатно | www.worldphoto.org | raw/opportunities/sony-youth.txt | d1f99a1e487b23c7a3b8a814ee12fe13bbb26cb1f83e69930611ffe47430f86d |
| `bow-seat` | Blue Planet Awareness Contest | arts | 2027-06-07, 23:59 ET | школьники 11–18 лет, учащиеся средней или старшей школы, из любых стран | бесплатно | bowseat.org | raw/opportunities/bow-seat.txt | ac57a36d71ce0b28408a7ca0e66d6f0fbda8071f3b37709745ca0ebe6104ab7a |
| `blue-ocean` | Blue Ocean Student Entrepreneur Competition | social | 2027-02-21, полночь по местному времени | старшеклассники или учащиеся предуниверситетского уровня из любых стран; команды | бесплатно | blueoceancompetition.org | raw/opportunities/blue-ocean.txt | 51abb85618ace5eac9608b8f76edeedec20f61fa35b33fd3047220e1aef5237d |

Поля для вставки в `data/opportunities.json`:

- `purple-comet`: organizer «Purple Comet! Math Meet», action «Собери команду со взрослым руководителем и реши задачи онлайн в окне 6–15 апреля 2027.», `deadlineZone` `local`, `deadlineAt` `null`, note «Нужен взрослый руководитель: его указывают при регистрации.»
- `european-math-cup`: organizer «Young Gifted Mathematicians “Marin Getaldić” (MNM), Хорватия», action «Найди местного организатора в Таджикистане или учителя, готового им стать, и напиши тур в окне 12–20 декабря 2026.», `deadlineZone` `local`, `deadlineAt` `null`, note «Без местного организатора участие невозможно; его роль добровольная и неоплачиваемая.»
- `cern-beamline`: organizer «CERN (с DESY и ELSA)», action «Собери команду с учителем и предложи эксперимент на пучке ускорителя.», `deadlineZone` `Europe/Zurich`, `deadlineAt` `2027-03-12T22:59:59Z`, note «Заявку подаёт тренер команды; победители едут в лабораторию за счёт организатора.»
- `sony-youth`: organizer «World Photography Organisation», action «Сними от одной до трёх фотографий на тему конкурса и подай их до 5 января 2027.», `deadlineZone` `Europe/London`, `deadlineAt` `2027-01-05T16:00:00Z`, note «»
- `bow-seat`: organizer «Bow Seat: Creative Action for Conservation», action «Сделай работу о проблемах океана: рисунок, текст, стихотворение, фильм, музыка или танец.», `deadlineZone` `America/New_York`, `deadlineAt` `2027-06-08T03:59:59Z`, note «»
- `blue-ocean`: organizer «Blue Ocean Student Entrepreneurs Corporation», action «Собери команду и запиши видео-питч стартапа по принципам blue ocean.», `deadlineZone` `local`, `deadlineAt` `null`, note «После регистрации нужно пройти бесплатный мини-курс Blue Ocean.»

Новые значения `type` (`math`, `science`, `arts`, `social`) фильтр `opportunities.html` пока не показывает: в нём три варианта — эссе, выступление, олимпиада. Файл Claude, здесь не менялся.

## Не подтверждено: нет одной фразы

Страница и сроки есть, но для включения не хватает обязательного условия. Ничего из этого не вносить, пока условие не появится на странице.

| Конкурс | Что есть | Чего нет |
|---|---|---|
| The Earth Prize 2027 | регистрация до 10.01.2027, подача до 31.01.2027, 13–19 лет, школьники мира | фразы о бесплатности нет ни на `/competition`, ни в условиях |
| World Wildlife Day Youth Art Contest 2027 (IFAW/CITES) | до 07.02.2027, 4–18 лет, мир | фразы о бесплатности нет |
| Diamond Challenge 2027 | 14.01.2027, 14–18 лет, команды 2–4, «Any Country» | фразы о бесплатности нет; год стоит только в заголовке таймлайна |
| International Linguistics Olympiad 2027 | Бангкок, 21–28.07.2027 | Таджикистана нет в списке стран; вход только через национальную сборную |
| COCI 2026/2027 | 12.12.2026, 23.01.2027, 20.02.2027; «Everyone is welcome to participate!» | ни слова о плате |
| Tournament of Towns | осенний тур 04.10.2026 и 18.10.2026 | весенний тур «To be announced later»; фразы о бесплатности на проверенных страницах нет |
| APMO | Таджикистан есть в списке стран сайта | дат 2027 и платы нет |
| USACO | расписание 2025-2026 | расписания 2026-2027 нет; фразы о плате нет |
| Technovation | «Technovation is free for every builder who joins» | страница регистрации без текста (JS), даты дедлайна нет |

## Отклонено

- **John Locke Institute Global Essay Prize** — «Entry is free», но на странице сроки 2026 года (регистрация 31.03.2026, поздняя 30.04.2026); выпуска 2027 нет.
- **Ayn Rand Institute Essay Contests** — «Open to students worldwide», от 13 лет, но на странице «Next Deadline TBD»; фразы о бесплатности нет.
- **International Zhautykov Olympiad** — даты 10–15.01.2027 есть, но на сайте указан взнос: «The participation fee for each participant and group leader is $100 USD» (в разделе прошлых выпусков). Бесплатность не заявлена.
- **Foyle Young Poets** — приём 2026 закрыт, срок 2027 не объявлен; страница правил отдаёт 403, бесплатность перепроверить не удалось.
- **Stephen Spender Prize** — только Великобритания и Ирландия.
- **ASHG DNA Day Essay Contest** — 9–12 классы, весь мир, но даты только 2026 года (закрытие 04.03.2026), о плате ни слова.
- **IYPT 2027** — есть взносы («The fees for the 2027 IYPT»).
- **Harvard International Economics Essay Contest** — взнос $35 для школьников вне США.
- **Zayed Sustainability Prize** — цикл 2026 закрыт в июне 2026, цикл 2027 не объявлен.
- **Goi Peace International Essay Contest** — организатор закрыл конкурс после 2024 года.
- **Rise for the World** — на сайте нет ни сроков, ни условий приёма.
- **Conrad Challenge, picoCTF, Advent of Code, Breakthrough Junior Challenge** — нет опубликованной даты 2027 или нет фразы о бесплатности.
- **Сайты не открылись:** `www.sbs.ox.ac.uk` (Cloudflare 403), `ichto.org` (TLS), `icho2027.org`, `ioaa2027.org`, `ijsoweb.org`, `mjdri.tj` (DNS), `conradchallenge.org`, `pluralplus.unaoc.org`, `populationeducation.org` (Cloudflare).

## Республиканские олимпиады Таджикистана

Официального источника с датами нет.

- `https://maorif.tj` (Министерство образования и науки) открывается. Расписания республиканских предметных олимпиад на 2026/2027 на доступной версии нет: на главной слово «олимп» не встречается, в разделе «Озмунҳо ва ҷоизаҳо» только три конкурса («Фурӯғи субҳи доноӣ китоб аст», «Тоҷикистон — Ватани азизи ман», «Илм — фурӯғи маърифат»), в «Эълонҳо» и «Ҳуҷҷатҳо» расписания тоже нет.
- `mjdri.tj` — сайт, указанный на странице Таджикистана у IBO, не резолвится.
- Официального сайта Республиканского центра по выявлению и развитию талантов найти не удалось: `minedu.tj`, `talent.tj`, `talanted.tj`, `istedod.tj` не резолвятся, `olimpiada.tj` — заглушка хостинга.

## Домены, ждущие «да»

| Домен | Почему можно верить |
|---|---|
| purplecomet.org | официальный сайт конкурса, проводится ежегодно с 2003 года (сказано на сайте) |
| emc.mnm.hr | домен хорватской некоммерческой ассоциации MNM, которая организует Европейский математический кубок |
| beamlineforschools.cern | домен CERN, официальная страница программы Beamline for Schools |
| www.worldphoto.org | сайт World Photography Organisation, организатора Sony World Photography Awards |
| bowseat.org | сайт Bow Seat: Creative Action for Conservation, организатора конкурса |
| blueoceancompetition.org | сайт Blue Ocean Student Entrepreneurs Corporation (501c3), организатора конкурса |

## Команды и результат

- `node --test` — 790 из 790.
- `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .` — код 0.
- `python -m tools.build` — код 0; индекс 97 326 байт по проводу, детали 76 880. Вывод сборки откачен (`data/index.json`, `data/details.json`, `data/route.json`, `data/conditions`, `feed.xml`, `sitemap.xml`, `programs`).
- `python -m tools.build` на пустом каталоге записей не упёрся в предел 96 КиБ: `data/opportunities.json` в индекс не входит.
- `tests/opportunities.test.js` не менялся: состав данных тот же, число записей то же.

## Что не проверено

- Формы нигде не отправлялись, регистрации и письма не делались.
- Английские цитаты сняты с отрендеренного текста страниц 25.11.2026; PDF-регламенты (CITES, IFAW) не открывались.
- Даты 2027 года у большинства ежегодных конкурсов ещё не опубликованы — это ограничение на стороне организаторов, а не проверки. Повторить обход в январе–марте 2027.
