# Взнос UCAS для 11 британских программ

Проверено 28.11.2026 на ветке `deepseek/fees-ucas`. Задача DS-3 UCAS: сумма взноса за подачу для `birmingham`, `bristol`, `durham`, `edinburgh`, `glasgow`, `imperial-college-london`, `kcl`, `leeds`, `lse`, `manchester`, `sheffield`. Пройдено 11 из 11: все 11 подаются только через UCAS, сумма нашлась одна на всех.

Папка снимка названа по дате поручения (`2026-11-26-ucas`, путь закреплён в `docs/WORK-SPLIT.md`); страница скачана 28.11.2026.

## Источник

- Страница: [Filling in your application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application)
- Путь по меню сайта: Applying → Applying to university → Filling in your application. Старый адрес меню `/applying/applying-university/filling-your-ucas-undergraduate-application` отдаёт 301 на этот же адрес.
- HTTP 200, 188 327 байт HTML. Cloudflare, капчи и пустой оболочки не было, текст пришёл в HTML.
- На всей странице одно денежное значение — `£34.50`; суммы для 2026 года на ней нет.

Цитата:

> For 2027 entry, the application fee is £34.50 for up to five choices.

Выдержка страницы: `raw/application-fees/2026-11-26-ucas/ucas.txt` (7 строк вокруг цитаты, UTF-8, LF). Цитата входит в неё буквально.

## Предложение

Все 11 программ — бакалавриат, подача только через UCAS. Сумма одна и та же.

| id | сумма | валюта | цитата | ссылка |
| --- | --- | --- | --- | --- |
| `birmingham` | 34.50 | GBP | For 2027 entry, the application fee is £34.50 for up to five choices. | [Filling in your application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application) |
| `bristol` | 34.50 | GBP | For 2027 entry, the application fee is £34.50 for up to five choices. | [Filling in your application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application) |
| `durham` | 34.50 | GBP | For 2027 entry, the application fee is £34.50 for up to five choices. | [Filling in your application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application) |
| `edinburgh` | 34.50 | GBP | For 2027 entry, the application fee is £34.50 for up to five choices. | [Filling in your application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application) |
| `glasgow` | 34.50 | GBP | For 2027 entry, the application fee is £34.50 for up to five choices. | [Filling in your application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application) |
| `imperial-college-london` | 34.50 | GBP | For 2027 entry, the application fee is £34.50 for up to five choices. | [Filling in your application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application) |
| `kcl` | 34.50 | GBP | For 2027 entry, the application fee is £34.50 for up to five choices. | [Filling in your application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application) |
| `leeds` | 34.50 | GBP | For 2027 entry, the application fee is £34.50 for up to five choices. | [Filling in your application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application) |
| `lse` | 34.50 | GBP | For 2027 entry, the application fee is £34.50 for up to five choices. | [Filling in your application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application) |
| `manchester` | 34.50 | GBP | For 2027 entry, the application fee is £34.50 for up to five choices. | [Filling in your application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application) |
| `sheffield` | 34.50 | GBP | For 2027 entry, the application fee is £34.50 for up to five choices. | [Filling in your application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application) |

## Условия суммы

- Платится один раз за заявку, а не за каждую программу: «for up to five choices». Тот же смысл у Nottingham: «You pay this whether you apply to a single course or use all five choices». Порядок записи в `data/programs/` у Nottingham — `34.5 GBP`; предложение совпадает с ним, чтобы фильтр «Без взноса за подачу» не считал британские программы платными пять раз.
- Сумма названа для набора 2027. Даты обновления цены на странице нет; это цена на день снимка.
- Снятие взноса существует, но по условиям, а не по умолчанию. На той же странице, в другом разделе (в выдержку не входит): «For 2027 entry onwards, students who are care leavers may also be eligible to have the application fee waived.» Отдельная страница сайта — `Free school meals application fee waiver`. Ни одна из 11 программ в этих условиях не упомянута, поэтому ноль не предлагаю.
- KCL: сверх UCAS вузовского взноса нет. В записи `kcl` шаг `kind=money`: «UCAS charges a small fee to apply, but King's will not charge UCAS applicants an additional application fee for your application to be considered.» Дополнительную сумму к 34.50 не добавлять.
- Manchester: в записи шаг `kind=money` — «Please note that UCAS charges an application fee.» Суммы на странице вуза нет, берётся сумма UCAS.

## Домены

- `ucas.com` — официальный сервис заявок в вузы Великобритании. Мурод дал «да» 26.11.2026. Новых доменов не предлагаю.
- В `AGENTS.md` (строка 18) `ucas.com` ещё числится в ожидании решения, а в `docs/REPORT-2026-11-25-application-fees-batch4.md` — в разделе «Домены, ждущие „да“». Оба файла не мои; поправить строку должен Claude.

## Что не сделано намеренно

- `data/programs/<id>.json` не менял: ни `fee`, ни `source.pages`, ни `applyChannel` у 11 программ.
- `tools/sources.toml` не менял: адрес ucas.com не вносил.
- `data/changelog.json`, подпись `tools.review`, схему и валидаторы не трогал.
- У всех 11 программ поля `fee` сейчас нет. Схема требует, чтобы страница-источник была прописана в `source.pages` записи программы; как привязать ucas.com — решает Claude при внесении.

## Проверки

- `node --test`: 974 теста, все прошли.
- `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .`: 547 тестов, OK.
- `PYTHONUTF8=1 python -m tools.validate`: exit 0, 11 ошибок в чужих программах (vassar-college и другие). Данных я не менял, ошибки были в `origin/main` до этой задачи.
- `PYTHONUTF8=1 python -m tools.build`: exit 0, 323 программы, индекс 97 229 Б по проводу при пределе 98 304 Б. Вывод сборки откачен (`data/index.json`, `data/details.json`, `data/route.json`, `data/interview.json`, `data/conditions`, `feed.xml`, `sitemap.xml`, `programs/`, `countries/`, `topics/`).
- Цитата сверена с выдержкой поиском по точной строке: 1 совпадение. Байты цитаты — `c2 a3` перед `34.50`, то есть `£` в UTF-8, не подмена.

## Ветка

- `deepseek/fees-ucas` от `origin/main` (`aab2aa10`). Выдержка — коммит `0e792b90`, отчёт — следующим коммитом. В `main` не влито, PR не открывался, на Vercel не выкладывалось.
