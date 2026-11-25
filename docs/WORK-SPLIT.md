# Кто какие файлы трогает

25.11.2026. Одновременно работают: несколько чатов DeepSeek (задачи DS-1…DS-6), новый чат Claude (редизайн) и этот чат Claude (архитектура, приёмка, вливание). Правило одно: два работника никогда не пишут в один файл. Ниже — чей какой.

## Ветки и папки

| Кто | Ветка | Папка worktree |
|---|---|---|
| DS-1 материалы, партия 1 | `deepseek/materials-1` | `C:\Users\ORYX\dev\nerio-ds1` |
| DS-2 конкурсы | `deepseek/opportunities` | `C:\Users\ORYX\dev\nerio-ds2` |
| DS-3 взносы, партия 4 | `deepseek/fees-4` | `C:\Users\ORYX\dev\nerio-ds3` |
| DS-4 applyChannel, партия 2 | `deepseek/apply-channel-2` | `C:\Users\ORYX\dev\nerio-ds4` |
| DS-5 истёкшие сроки | `deepseek/deadlines` | `C:\Users\ORYX\dev\nerio-ds5` |
| DS-6 вымышленные ученики | `deepseek/test-students` | `C:\Users\ORYX\dev\nerio-ds6` |
| DS-10 цитаты без снимков | `deepseek/quote-fixes` от `origin/claude/quote-fixes` | `C:\Users\ORYX\dev\nerio-ds10` |
| Claude, редизайн | `claude/redesign-portfolio` | своя, от origin/main |
| Claude, архитектура | `claude/<задача>` | `C:\Users\ORYX\dev\nerio-portfolio` и другие |

Все ветки — от свежего `origin/main`. Основная копия `C:\Users\ORYX\dev\eligibility-ui` только для `git fetch` и `git worktree add`: в ней никто не работает.

## Файлы

| Файлы | Владелец |
|---|---|
| `data/materials/*.json` | DS-1 (только программы своей партии) |
| `raw/<id>/<дата>/` новых снимков | DS-1 для программ своей партии |
| секции `[<id>]` в `tools/sources.toml` | DS-1 для своей партии: только адрес на уже одобренном домене |
| `data/opportunities.json`, `raw/opportunities/` | DS-2 |
| поле `fee` в `data/programs/<id>.json` | DS-3, только программы своей партии |
| `raw/application-fees/<дата>-batch4/` | DS-3 |
| поле `applyChannel` в `data/programs/<id>.json` | DS-4, только программы своей партии |
| `raw/apply-channels/<дата>/` | DS-4 |
| `docs/deadline-review-<дата>.json`, `raw/deadline-review/` | DS-5 (`data/programs/` не трогает) |
| `tests/fixtures/students/`, `tests/students.test.js` | DS-6 |
| `evidence`/`ru` условий и `eligibility` в `data/programs/<id>.json` 11 программ из `docs/QUOTE-FIXES-2026-11-25.md` (кроме `deadline`, `fee`, `applyChannel`); их `raw/<id>/<дата>/` | DS-10 |
| `css/`, `index.html`, `*-view.js`, `js/portfolio*.js`, новые экраны | Claude, редизайн |
| `tools/*.py`, схемы `docs/*-SCHEMA.md`, `js/materials-plan.js`, `js/formats/` | Claude, архитектура (A2 может перейти в чат редизайна — тогда строку здесь меняет он) |
| `AGENTS.md`, `docs/WORK-SPLIT.md`, `docs/DEEPSEEK-TASKS.md` | Claude, архитектура |
| `docs/REPORT-<дата>-<задача>.md` | тот, чья задача |

Партии DS-1, DS-3 и DS-4 не пересекаются по программам: списки в промтах, ни одна программа не стоит в двух.

## Общие файлы, где конфликт ожидаем

- **Вывод сборки** (`data/index.json`, `data/details.json`, `data/route.json`, `data/conditions/`, `feed.xml`, `sitemap.xml`, `programs/`). Никто из DeepSeek его не коммитит. При конфликте берём версию main и заново запускаем `python -m tools.build`.
- **`data/changelog.json`** дописывают DS-3 и DS-4 через `tools.review`. При вливании оставляем записи обеих веток.
- **`tools/sources.toml`**: DS-1 добавляет адреса в разные секции. Конфликт решается руками, обе строки остаются.
- **Индекс близок к пределу**: 97 326 из 98 304 байт по проводу на 25.11. Взносы и каналы подачи его увеличивают. Если сборка упрётся в предел — работа останавливается и решает Claude, чужие данные не ужимаются.
- **CSS**: около 49 746 из 50 КБ. Это бюджет редизайна, другие чаты CSS не трогают.

## Порядок вливания (делает Claude, только по «да» Мурода)

1. Ветка проверена: тесты, сборка, выборочная сверка с источником.
2. `git rebase origin/main`, конфликты по правилам выше.
3. Сборка заново, вывод коммитится одним коммитом «Сборка: …».
4. Строка статуса в `AGENTS.md`.
5. Выкладка — отдельным «да» Мурода.

Ветки данных вливаются по одной, редизайн — когда готов. Если редизайн и данные готовы одновременно, сначала данные: редизайну проще пересобрать вывод, чем данным — экран.
