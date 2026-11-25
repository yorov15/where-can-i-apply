# Каналы подачи, партия 2: 30 программ

25.11.2026, ветка `deepseek/apply-channel-2` от `origin/main` (`b3d5974`). В `main` не влито, на Vercel не выложено, PR не открыт.

Проверено **30 программ**; поле `applyChannel` внесено у **28**; всего **36 маршрутов**. Типы: общая платформа — 26, портал вуза — 9, государственный портал — 1. Страны: США — 19, Япония — 3, Китай, Финляндия, Италия, Малайзия, Сингапур, Тайвань — по 1.

У `gist-korea` и `uchicago` источник не открылся, поле оставлено пустым, причины ниже. В 28 файлах программ изменено только поле `applyChannel`: в диффе одни добавления, удалений нет.

## Как собрано и чем это ограничено

Прямой HTTP с этой машины не работает: `curl` и `urllib` получают таймаут на любом домене, включая `example.com` и `github.com` (git при этом работает). Доступен только web-инструмент, а он отдаёт выдержку из страницы, а не байты.

Поэтому снимок в `raw/apply-channels/2026-11-25/` — **фрагмент, полученный web-инструментом**, а не полный текст страницы: так в пилоте был сделан Monash. Цитаты запрашивались дословно, но посимвольное совпадение с исходным HTML может гарантировать только сам инструмент. Это ограничение партии, а не проверенного значения: цитата, ссылка и хеш сходятся с сохранённым файлом, но сам файл — выдержка.

Снимки записаны одной строкой, как в пилоте: при `core.autocrlf=true` переводы строк превратились бы в CRLF при клонировании и сломали бы хеши. Проверено на свежем клоне ветки.

`python -m tools.review <id> --by-assistant` не запускался: review переписывает `source.lastVerified` и `source.pages` (дату и хеши всех страниц источника), а задача разрешает менять только `applyChannel`. Цитаты, ссылки и хеши проверены тем же кодом, что в `tools/tests/test_apply_channel_audit.py`, и прямым вызовом `_check_apply_channel`.

`python -m tools.validate` в этой ветке не имеет точки входа: в `tools/validate.py` нет `main`, команда молча ничего не делает. Вместо неё — прямой вызов `_check_apply_channel` по 28 программам: 0 ошибок.

## Таблица

| id | канал | цитата | ссылка | пропуск и причина |
|---|---|---|---|---|
| `nyu-shanghai` | Common Application | «Step 1: Start and Complete the Common Application Online.» | https://apply.commonapp.org/Login | — |
| `aalto-finland` | Studyinfo.fi | «filling out the application form in the Studyinfo.fi service.» | https://www.aalto.fi/en/admission-services/apply-to-bachelors-programmes-in-english | — |
| `bocconi` | Bocconi online application | «Apply now» | https://apply.unibocconi.it/ | — |
| `osaka-iudp` | Application Registration website | «Applicants should visit the Application Registration website» | https://e-apply.jp/n/osaka-u-inter | — |
| `tohoku-gateway-college` | TAO | «How to submit your application via TAO» | https://admissions-office.net/en/portal | — |
| `waseda-sils` | Online Application System | «Online Application System» | https://admissions-office.net/en/portal | — |
| `um-malaya` | APPLY NOW | «APPLY NOW» | https://apply.um.edu.my | — |
| `ntu-singapore` | NTU application portal | «Select the portal that corresponds to the qualifications you will be applying to NTU with:» | https://wis.ntu.edu.sg/pls/webexe/adm_fore_appl.login | — |
| `ntu-taiwan` | NTU online application system | «Create an account in our online application system.» | https://oiasystem.ntu.edu.tw/globaladmission/foreign/index/index/id/xa24yoi5De3z?lang=en | — |
| `bates` | Common Application; Coalition Application, Powered by Scoir | «Bates uses the Common Application and the Coalition Application, Powered by Scoir.» | https://apply.commonapp.org/Login?ma=29; https://app.scoir.com/signin | — |
| `bowdoin-college` | Common Application, Coalition on Scoir, QuestBridge | «Bowdoin accepts the Common Application, the Coalition on Scoir application, and is a QuestBridge partner.» | https://www.bowdoin.edu/admissions/apply/index.html | — |
| `colgate-university` | Common Application, Coalition Application on Scoir, QuestBridge | «Colgate accepts the Common Application, Coalition Application on Scoir, and QuestBridge Application.» | https://www.colgate.edu/admission-aid/apply | — |
| `davidson-college` | Common App; Coalition; QuestBridge | «Common App» / «Coalition» / «QuestBridge» | https://www.commonapp.org/explore/davidson-college; https://www.coalitionforcollegeaccess.org/; https://www.questbridge.org/college-partners/davidson-college/ | — |
| `denison-university` | Common Application | «must submit an application through the Common Application or the Coalition Application.» | https://apply.commonapp.org/Login?ma=77&tref=W1002 | — |
| `grinnell-college` | Common Application, QuestBridge | «a Common Application and QuestBridge School with no fee to apply and no required supplement.» | https://www.grinnell.edu/admission/apply | — |
| `haverford` | Common Application, QuestBridge, Apply Coalition with Scoir | «we accept the Common Application, Questbridge Application, or the Apply Coalition with Scoir» | https://www.commonapp.org/ | — |
| `mit` | MIT application portal | «The first-year application is open in the MIT application portal.» | https://apply.mitadmissions.org/portal/apply | — |
| `mount-holyoke-college` | Common Application; Coalition Application on Scoir | «Common Application or Coalition Application on Scoir. Please only submit one application.» | https://apply.commonapp.org/Login?ma=171; https://app.scoir.com/app/signup/1100323 | — |
| `northwestern-university` | Common Application, Apply Coalition with Scoir | «Common Application or Apply Coalition with Scoir*» | https://admissions.northwestern.edu/apply/index.html | — |
| `oberlin` | Common App; Coalition/Scoir Application | «You can apply to Oberlin College through the Common App or the Coalition/Scoir Application.» | https://apply.commonapp.org/Login?ma=187; http://app.scoir.com/app/signup/2800096 | — |
| `rice-university` | Common App | «Common App and Rice writing supplement.» | https://www.commonapp.org/explore/rice-university | — |
| `smith-college` | Common Application; Coalition Application | «Smith accepts two applications for first-year admission—the Coalition Application and the Common Application.» | https://apply.commonapp.org/Login?ma=247; http://app.scoir.com/app/signup/1100103 | — |
| `soka` | Soka Application | «you can apply at soka.edu/apply using the Soka Application or the Common Application.» | https://admissions.soka.edu/portal/apply | — |
| `swarthmore-college` | Common Application, Coalition on Scoir, QuestBridge | «First-year applicants may apply to Swarthmore via the Common Application, Coalition on Scoir Application, or QuestBridge» | https://www.swarthmore.edu/admissions-aid/apply-a-first-year-student | — |
| `upenn` | Common App, Coalition Application | «Penn accepts applications from the Common App and Coalition Application.» | https://www.commonapp.org/ | — |
| `washu` | Common Application, Coalition Application | «To apply, use either the Common Application or Coalition Application.» | https://www.commonapp.org/ | — |
| `wellesley-college` | Common Application, QuestBridge, Coalition Application | «Wellesley accepts the Common Application, the QuestBridge Application, and the Coalition Application.» | https://www.wellesley.edu/admission-aid/apply | — |
| `williams-college` | Common App; Coalition on Scoir; QuestBridge Application | «First-year and transfer students can apply using the Common App.» / «First-year students can also apply using Coalition on Scoir» / «QuestBridge is an option for high-achieving students from low-income backgrounds applying as first-year students.» | https://www.commonapp.org/explore/williams-college; https://www.coalitionforcollegeaccess.org/apply-coalition-on-scoir; https://www.questbridge.org/partners/college-partners/williams-college | — |
| `gist-korea` | — | — | — | Сайт `gist.ac.kr` не открылся: web-инструмент получил Connect Timeout по всем адресам (IPv4 и IPv6); прямой сети на машине нет. Снимка нет, поле не внесено. |
| `uchicago` | — | — | — | Страницы `collegeadmissions.uchicago.edu` отдают web-инструменту только заголовок «Application / College Admissions»; текст о платформах не извлекается. Снимка нет, поле не внесено. |

## Пропуски

- **gist-korea** — `https://www.gist.ac.kr/iuadm/html/sub02/0201.html` и `0202.html` не открылись: Connect Timeout по всем адресам. Поле не заполнено по памяти.
- **uchicago** — `https://collegeadmissions.uchicago.edu/apply/application/` и соседние страницы отдают только заголовок. Поле не заполнено.

## Домены

Новых доменов нет: все 28 адресов источников уже есть в `tools/sources.toml` и в источниках этих программ. Один адрес сменил хозяина: `admissions.wustl.edu` отвечает 301 на `admissions.washu.edu`; в данных оставлен прежний утверждённый домен `admissions.wustl.edu`, редирект отмечен в снимке. Если нужен новый домен — ждёт «да» Мурода.

`tools/sources.toml` не менялся.

## Проверки

- `node --test`: 790 тестов, все прошли.
- `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .`: 532 теста, OK.
- `python -m tools.build`: 323 программы; индекс 97 326 Б по проводу при лимите 98 304 Б, детали 78 235 Б. Вывод сборки откатан: `data/index.json`, `data/details.json`, `data/route.json`, `data/conditions`, `feed.xml`, `sitemap.xml`, `programs/`.
- `tools.tests.test_apply_channel_audit`: 2 теста OK (строгий UTF-8, отсутствие U+FFFD, вхождение цитат и ссылок, байтовые SHA-256, совпадение с `data/programs`, отсутствие поля в индексе и его наличие в деталях).
- `_check_apply_channel` по 28 программам: 0 ошибок.
- Повторная проверка на свежем клоне ветки: снимки без CRLF, аудит проходит.

## Коммит

Ветка `deepseek/apply-channel-2`. Данные, снимки, `manifest.json`, `reviews.json` и `data/changelog.json` — коммит `8132c51`.
