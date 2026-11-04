# Платформы подготовки и портфолио: разбор через REA — 04.11.2026

Задача: разобрать публичные страницы 8–12 платформ, которых нет в `docs/PLATFORMS.md`, инструментом REA
([github.com/morluto/rea](https://github.com/morluto/rea)) и взять идеи для «Сегодня», «Куда можно»,
«Мой путь» и портфолио. Код сайта не менялся.

## Главное

- **REA установилась и работает**, но **ни одну страницу платформ открыть не смогла**: сеть облачной
  песочницы отклонила все 12 доменов. WebFetch упёрся в ту же политику. Подробности —
  `docs/rea/network-blocked.json`.
- Поэтому всё ниже о платформах взято **из поисковой выдачи** (WebSearch, только официальные домены
  платформ): заголовки страниц, ссылки и сводка поисковика. Это источник второго уровня: дословных цитат
  нет, страница глазами не просмотрена.
- **Не проверено ни у одной платформы:** что видно за 5 секунд на первом экране, число кликов до
  результата, вид на 375 px, технические решения (фреймворк, офлайн, хранение, аналитика). В таблицах
  такие ячейки помечены «не проверено».
- Чтобы закрыть пробелы, нужно разрешить домены из `docs/rea/network-blocked.json` в настройках сети
  окружения (Network access → Allowed domains) и повторить запуск REA — команды в конце отчёта.

## 1. REA: что сделано

| Шаг | Результат |
|---|---|
| README, [гайд по браузеру](https://github.com/morluto/rea/blob/main/docs/browser-observation.md) | Сайты REA разбирает через Chrome DevTools Protocol: `inspect-web-page`, `analyze-web-bundle`, `capture-web-screenshot`, `capture-browser-scenario` (Playwright). Нативные движки не нужны |
| `npm install --global rea-agents` | rea 6.8.0, Node v22.23.4, без ошибок |
| `rea --help`, `rea doctor` | 175 CLI-команд, 229 MCP-инструментов; регистрация в Claude Code не выполнена (не требовалась — работал через CLI) |
| Chromium с `--remote-debugging-port=9222` | поднят, REA видит цели |
| Страницы платформ | **не открылись**: прокси песочницы, `connect_rejected` (403 на CONNECT) для всех 12 хостов |
| Контрольный прогон на локальной копии Nerio (`http://127.0.0.1:8765/`, main `e90deeb`) | три отчёта с Evidence ID, сводка — `docs/rea/nerio-local.json` |

Что REA увидела на Nerio (для сравнения с платформами, когда их откроем):

- 56 скриптов-модулей, 0 ошибок разбора, маршрутов-фреймворков и отпечатков библиотек не найдено
  (`analyze_web_bundle`, `ev_1b1980d6…`).
- Хранение: только `localStorage`, ключи `eligibility-plan`, `eligibility-profile`, `eligibility-route`;
  IndexedDB, Cache Storage и воркеров нет — значит, офлайн-кеша нет (`inspect_web_page`, `ev_1e25e03c…`).
- Кандидаты сетевых адресов (низкая уверенность): `nerio-essay-check` — серверная проверка эссе, которая по
  решению Мурода выключена.
- Скриншот получился 500×669, а не 375: headless Chromium не сузил окно. Для проверки телефона нужен
  `capture-browser-scenario` с явным viewport.

## 2. Платформы

Исключены как уже разобранные в `docs/PLATFORMS.md`: Common App, UCAS, Scoir, Duolingo English Test как
экзамен. DET prep взят отдельно — как подготовка, а не экзамен.

«Заголовок» — название страницы в поисковой выдаче; это ближайшее к «ценности за 5 секунд», что удалось
получить.

### Исследования и проекты

| | Polygence | Pioneer Academics | Schoolhouse.world |
|---|---|---|---|
| Заголовок | «Research Mentorship for High School Students» ([polygence.org](https://polygence.org)) | «Pioneer Academics» ([admission](https://pioneeracademics.com/pioneer-research-institute/admission/)) | «Free SAT® Tutoring» ([sat-bootcamp](https://schoolhouse.world/sat-bootcamp)) |
| Первый шаг | Подбор ментора; на первой встрече — конкретный исследовательский вопрос ([блог](https://www.polygence.org/blog/how-to-publish-research-paper-journal), [FAQ](https://www.polygence.org/faq)) | Инфосессия (рекомендована, даёт приоритетный срок) → онлайн-заявка ([admission](https://pioneeracademics.com/pioneer-research-institute/admission/)) | Запись в группу; дата экзамена не нужна; начинать за ~8 недель до экзамена ([help](https://intercom.schoolhouse.world/en/articles/9959332-what-bootcamp-details-should-i-know-before-signing-up-as-a-learner)) |
| Онбординг | не проверено | Анкета, внеучебное, короткие и длинные эссе, до 4 областей; аттестат и отзыв учителя — до 2 недель **после** подачи; затем отбор, видеоинтервью и 10-минутный письменный тест ([FAQ](https://pioneeracademics.com/frequently-asked-questions/)) | Фильтр по уровню: для тех, у кого 400–690 в разделе SAT ([help](https://intercom.schoolhouse.world/en/articles/9961183-what-are-the-schoolhouse-sat-bootcamps)) |
| Прогресс / что дальше | ~10 встреч за 3–6 мес. — по сторонней сводке ([Immerse](https://www.immerse.education/knowledge-base/polygence-complete-guide-2026)), на сайте Polygence не подтверждено | Этапы отбора; срок 6–8 или 6–10 недель — страницы расходятся | 4 недели, 2 занятия по 75 мин в неделю, до 10 учеников на тьютора |
| Портфолио | Итог — статья, приложение, роман и т. п. (сторонняя сводка [Immerse](https://www.immerse.education/knowledge-base/polygence-complete-guide-2026)); симпозиум и архив работ для Core ([showcasing](https://www.polygence.org/showcasing-opportunities)); Pods: 6 недель, 2–5 человек, заранее заданный итог, например анализ акции на 1–3 с. + презентация ([pods/stocks](https://www.polygence.org/pods/stocks)) | Итог — исследовательская работа (детали оформления не найдены) | Тьюторам: часы волонтёрства в трекере и портфолио, которое, по словам сайта, признают 50+ вузов ([sat-bootcamp/tutor](https://schoolhouse.world/sat-bootcamp/tutor)) |
| Цена | Около $2 895 — только сторонняя сводка | Залог после условного зачисления; сумма не найдена | Бесплатно, некоммерческая организация |
| 375 px, клики, техника | не проверено | не проверено | не проверено |

### Школьные платформы профориентации (покупает школа)

| | Unifrog | BridgeU | Cialfo | MaiaLearning |
|---|---|---|---|---|
| Заголовок | «Unifrog for UK schools and colleges» ([uk-schools](https://www.unifrog.org/uk-schools)) | «Intelligent Matching» ([matching](https://bridge-u.com/platform-overview/matching/)) | «AI-Powered College Counselling Platform for Schools» ([cialfo.co](https://www.cialfo.co/)) | «Personalizing Every Student's College and Career Journey» ([блог](https://www.maialearning.com/blog/personalizing-every-students-college-and-career-journey)) |
| Первый шаг | не проверено (вход через школу) | Profile Builder из 4 разделов: основное, учёба, интересы по предметам, предпочтения ([journey](https://bridge-u.com/resources/your-students-bridgeu-journey-exploration-to-application/)) | не проверено (вход через школу) | Выбор пути → консультант создаёт задачи ([блог](https://www.maialearning.com/blog/personalizing-every-students-college-and-career-journey)) |
| Прогресс / что дальше | Locker: всё по развитию и заявкам в одном месте ([international](https://www.unifrog.org/international-schools)) | Списки Added → Shortlisted → Applying; кнопки Shortlist / Discard на карточке ([shortlist](https://bridge-u.com/resources/how-to-help-your-students-shortlist-universities-to-find-their-best-fit/)) | Главная: задачи от консультанта, встречи, ближайшие сроки, сводка заявок ([home page](https://help.cialfo.co/en/articles/5620267-the-new-student-dashboard)); списки Longlist / Shortlist / Applying ([app](https://help.cialfo.co/en/articles/14828527-cialfo-mobile-app)) | Задачи по шаблону для ученика, класса или округа; прогресс против требований штата |
| Портфолио | Activities — «чем горжусь»; Competencies — опыт по навыкам (самостоятельность, лидерство), потом примеры подтягиваются в личное заявление ([Manchester GS](https://www.unifrog.org/case-studies/manchester-grammar-school), [Robert Napier](https://www.unifrog.org/case-studies/robert-napier-academy)); заявление: 3 вопроса, минимум 350 знаков на вопрос, всего 4 000, совместная правка с версиями ([St Paul's](https://www.unifrog.org/case-studies/st-pauls-school-for-girls)) | Помощь с эссе — через консультанта ([essays](https://bridge-u.com/resources/how-to-improve-your-students-university-application-essays-with-bridgeu/)) | не найдено | Spotlight: подборка свидетельств и размышления под выпускной проект или CAS; резюме растёт по мере записей ([Minnesota](https://maialearning.com/states/minnesota)) |
| Подбор | — | Reach / Match / Safety | likely fit / target / reach | — |
| Телефон | не проверено | не проверено | Приложение из 5 разделов: Home, Universities, Bookmarks, Applications, Account ([app](https://help.cialfo.co/en/articles/14828527-cialfo-mobile-app)); 375 px не проверено | не проверено |
| Техника | не проверено | не проверено | не проверено | не проверено |

### Экзамены, собеседования, сообщество

| | Road to IELTS / IELTS Ready | DET prep | Kira Talent | ZeeMee |
|---|---|---|---|---|
| Заголовок | «IELTS Ready: Free IELTS Preparation & Practice Tests» ([prepare/road-to-ielts](https://takeielts.britishcouncil.org/prepare/road-to-ielts/)) | «Test Readiness — Duolingo English Test» ([readiness](https://englishtest.duolingo.com/readiness)) | Справка для поступающих ([support](https://support.kiratalent.com/article/199-can-i-practice-before-my-kira-assessment-or-live-interview)) | «ZeeMee App: Find Your College Community & Future Friends» ([zeemee.com](https://zeemee.com/)) |
| Первый шаг | Бесплатный мини-пробник 25 или 50 мин с ИИ-отзывом ([prepare](https://takeielts.britishcouncil.org/prepare)) | Бесплатный пробник, без ограничения попыток, адаптивный ([блог](https://blog.englishtest.duolingo.com/duolingo-unlimited-practice-test-study/)) | Check-In: проверка камеры, микрофона, сети → пробный шаг ([tips](https://support.kiratalent.com/article/95-nine-tips-to-prepare-for-kira)) | Скачать приложение, профиль: имя, фото, специальность, хобби ([FAQ](https://zeemee.com/college-student-community-app-faqs-and-support/)) |
| Прогресс | «My Progress» — цели и учёт подготовки (региональная страница, [Caribbean](https://caribbean.britishcouncil.org/exam/ielts/prepare/road-to-ielts)); числа тестов расходятся между страницами | Официальный гид, пробник, видео; подготовка к условиям дома: вторая камера, осмотр комнаты ([setup](https://blog.englishtest.duolingo.com/duolingo-english-test-setup-secondary-camera-room-scan/)) | Проба: можно переснять и пересмотреть, записи видит только сам; в настоящем — одна попытка; на каждый вопрос время на подготовку и на ответ ([types](https://support.kiratalent.com/article/137-type-of-questions-in-kira-async)) | — |
| Портфолио | — | — | — | Короткое видео-представление; подбор соседа по анкете |
| Платно | Premium бесплатен при записи на экзамен через British Council | Пробник бесплатен | Платит вуз | Цен не нашёл; вузам продают панель вовлечённости ([colleges](https://colleges.zeemee.com/)) |
| 375 px, техника | не проверено | пробник есть на компьютере и телефоне (по блогу DET); 375 px не проверено | не проверено | не проверено |

## 3. Топ-10 идей для Nerio

Проверено по коду: у записей опыта нет навыков (`js/portfolio.js`), анкета уже разбита на 5 разделов
(`index.html`), списка «отложено» и шага проверки техники перед экзаменом нет.

| # | Экран | Что сделать | Откуда | Размер |
|---|---|---|---|---|
| 1 | Портфолио | Добавить к записи опыта 1–3 навыка из короткого списка и на экране эссе показывать «примеры по навыку» из своих записей | [Unifrog Competencies](https://www.unifrog.org/case-studies/robert-napier-academy) | M |
| 2 | Портфолио | При создании работы спрашивать формат итога (текст, приложение, расчёт, выступление) и показывать его как цель в карточке | [Polygence Pods](https://www.polygence.org/pods/stocks), [Core](https://www.polygence.org/core-program) | S |
| 3 | Портфолио | Собрать «подборку под цель»: выбрать 3–5 записей для одной программы и выгрузить их одной страницей | [MaiaLearning Spotlight](https://maialearning.com/states/minnesota) | M |
| 4 | Портфолио / эссе | Счётчик знаков на каждый вопрос эссе с границами из данных программы (только где лимит есть в источнике) | [Unifrog personal statement](https://www.unifrog.org/case-studies/st-pauls-school-for-girls) | S |
| 5 | Сегодня | Режим «репетиция»: вопрос программы, время на обдумывание и на ответ, можно переписать, сохраняется только у себя | [Kira practice](https://support.kiratalent.com/article/199-can-i-practice-before-my-kira-assessment-or-live-interview) | M |
| 6 | Сегодня | За неделю до домашнего экзамена (DET) — шаг «проверь технику и комнату» с пунктами из официальной страницы | [DET setup](https://blog.englishtest.duolingo.com/duolingo-english-test-setup-secondary-camera-room-scan/), [Kira Check-In](https://support.kiratalent.com/article/95-nine-tips-to-prepare-for-kira) | S |
| 7 | Сегодня / Мой путь | Делить документы цели на «нужно к сроку подачи» и «можно прислать после», если программа это пишет | [Pioneer FAQ](https://pioneeracademics.com/frequently-asked-questions/) | L (нужны данные по программам) |
| 8 | Куда можно | Кнопка «Не моё» на карточке: программа уходит в свёрнутый список «Отложено», её можно вернуть | [BridgeU Shortlist / Discard](https://bridge-u.com/resources/how-to-help-your-students-shortlist-universities-to-find-their-best-fit/) | S |
| 9 | Куда можно | В анкете показывать «Раздел 2 из 5» и название следующего раздела | [BridgeU Profile Builder](https://bridge-u.com/resources/your-students-bridgeu-journey-exploration-to-application/) | S |
| 10 | Мой путь (трек SAT) | Если уровень ученика в диапазоне 400–690, предлагать бесплатную группу Schoolhouse с точкой старта «за 8 недель до экзамена» | [Schoolhouse SAT Bootcamp](https://intercom.schoolhouse.world/en/articles/9961183-what-are-the-schoolhouse-sat-bootcamps) | S (нужен «да» Мурода на домен) |

Перед внедрением каждую идею сверить с самой страницей: сейчас они опираются на поисковую сводку.

## 4. Анти-паттерны

1. **Ценность заперта за школой и консультантом.** Unifrog, BridgeU, Cialfo, MaiaLearning продаются школам;
   задачи ставит консультант ([Cialfo](https://help.cialfo.co/en/articles/5620267-the-new-student-dashboard),
   [MaiaLearning](https://www.maialearning.com/blog/personalizing-every-students-college-and-career-journey)).
   Ученик без такой школы остаётся ни с чем. Nerio: всё работает без аккаунта и без взрослого.
2. **Ярлыки шансов.** BridgeU — Reach / Match / Safety ([matching](https://bridge-u.com/platform-overview/matching/)),
   Cialfo — likely fit / target / reach ([app](https://help.cialfo.co/en/articles/14828527-cialfo-mobile-app)).
   Это оценка шансов в другой упаковке. Nerio: только «можно подать / не хватает / уточни».
3. **Цифры без проверки и разнобой.** Polygence: «60 % публикуют работы» — собственная оценка без метода
   (сводка поиска по polygence.org, страницу с цифрой открыть не удалось); ZeeMee: 3 000+ или 300+ вузов на
   разных страницах ([zeemee.com](https://zeemee.com/)); British Council: число пробников разное на разных
   страницах ([prepare](https://takeielts.britishcouncil.org/prepare)). Nerio: число — только с источником и
   датой, одно на весь сайт.

## 5. Как повторить с открытой сетью

```bash
/opt/pw-browsers/chromium --headless=new --no-sandbox --remote-debugging-port=9222 \
  --user-data-dir=/tmp/rea-profile --proxy-server="$HTTPS_PROXY" about:blank &
curl -s -X PUT "http://127.0.0.1:9222/json/new?https://www.polygence.org/"
rea list-browser-targets http://127.0.0.1:9222 --format json
rea inspect-web-page http://127.0.0.1:9222 <TARGET_ID> --observation-ms 5000 --include-storage-keys --format json
rea analyze-web-bundle http://127.0.0.1:9222 <TARGET_ID> --format json
```

Для 375 px и подсчёта кликов — `rea capture-browser-scenario` с viewport 375×667 и шагами от главной до
первого результата. Без входа в аккаунт и без обхода платного доступа.

## 6. Сверка с живыми страницами — 04.11.2026

Проверены только девять оставшихся платформ; восемь ранее сверенных повторно не проверялись. Заголовки и первые фразы приведены по тексту выбранных страниц. Подтверждение относится только к указанному утверждению, остальные детали требуют отдельной проверки.

| Платформа и страница | Заголовок; первая фраза | Первый призыв и адрес | Сверка утверждений |
|---|---|---|---|
| [Pioneer Academics: приём](https://pioneeracademics.com/pioneer-research-institute/admission/) | Главный заголовок в ответе веб-инструмента не отображён; первая фраза: «The application window for the 2027 cycle is now open.» | «Info Session» → [запись на встречу](https://apply.pioneeracademics.com/portal/online-session). | **Подтверждено частично:** [FAQ](https://pioneeracademics.com/frequently-asked-questions/) рекомендует встречу и указывает «an unofficial transcript» в заявке, затем официальный transcript и оценку учителя. Срок в две недели после подачи на открытой странице не найден. |
| [MaiaLearning: статья](https://www.maialearning.com/blog/personalizing-every-students-college-and-career-journey) | «Personalizing Every Student’s College and Career Journey»; «Every student has a different vision for life after high school, but are we helping them build a plan to get there?» | «University Sign Up» → [регистрация вуза](https://app.maialearning.com/v3/user-login/sign-up). | **Подтверждено частично:** [Spotlight](https://maialearning.com/states/minnesota): «students curate and reflect on evidence»; подборку можно распечатать. Статья говорит о задачах школ и округов, но не устанавливает точный порядок действий ученика или создание задач именно консультантом. |
| [Kira Talent: справка](https://support.kiratalent.com/article/199-can-i-practice-before-my-kira-assessment-or-live-interview) | «Can I practice before my Kira assessment or live interview?»; «You may have a Practice step on your Check-In page, depending on how the school has set up your assessment or interview.» | Кнопка призыва в тексте страницы не обнаружена. | **Подтверждено с оговоркой:** «you can redo questions»; записи практики доступны только самому кандидату, в настоящем испытании одна попытка. Практический этап есть не всегда: это зависит от школы. |
| [ZeeMee](https://zeemee.com/) | «Find your college community»; «The social app for students choosing a college.» | «Download» → раздел скачивания на той же странице; там ссылки на iOS и Android. Точный адрес кнопки веб-инструмент не показал. | **Подтверждено частично:** «Find the perfect roommate» и подбор по интересам и образу жизни. Состав анкеты и видео-представление не подтверждены: [FAQ](https://zeemee.com/college-student-community-app-faqs-and-support/) не открылся, тайм-аут (400). |
| [Going Merry](https://www.goingmerry.com/) | Не открылось: 502 Bad Gateway. | Не открылось: 502. | **Не открылось:** главная и [справка о начале работы](https://support.goingmerry.com/en/articles/2384752-students-how-do-i-get-started-on-going-merry) вернули 502. Профиль и пакеты эссе не сверены. |
| [Scholarships360: поиск](https://scholarships360.org/scholarships/search/) | «Explore vetted scholarships for your grade level, state, background, major and more»; «Explore thousands of vetted scholarships for all types of students.» | «Get Started» → [приложение Scholarships360](https://app.scholarships360.org/). | **Подтверждено частично:** «create an account for personalized matching»; база поиска открывается без входа. [FAQ](https://scholarships360.org/faq/) допускает аккаунты учеников, родителей и педагогов. Фраза «100% Free. No Spam» и порядок выбора роли на странице поиска не подтверждены. |
| [Niche: стипендии](https://www.niche.com/colleges/scholarships/) | «Find College Scholarships»; «Search lists of scholarships by choosing a category or get matched to college scholarships you are eligible for.» | «get matched to college scholarships» — кнопка; адрес назначения в ответе веб-инструмента не указан. | **Подтверждено частично:** у одного No Essay-розыгрыша «The winner will be selected by random drawing». Вход для персонального подбора и противоречие статусов конкретного розыгрыша по этой странице не проверены. |
| [Unibuddy](https://unibuddy.com/) | «Student-to-student marketing is the future»; «You share the facts. Let your students share the experience, and boost yield with Unibuddy.» | «Book a demo» → [запись на демонстрацию](https://unibuddy.com/book-a-demo/). | **Подтверждено для Radboud:** [страница университета](https://www.ru.nl/en/education/studying-at-radboud-university/chat-with-a-student) говорит «search by programme or country» и просит зарегистрироваться через Unibuddy перед чатом. Отбор послов и модерация здесь не проверены. |
| [EducationUSA: пять шагов](https://educationusa.state.gov/your-5-steps-us-study) | «Take the First Step»; «Whether you plan to pursue a short-term or full degree program in the United States, EducationUSA has the resources you need in 'Your Five Steps to U.S. Study'.» | «Start Your Journey Now» → [Research Your Options](https://educationusa.state.gov/your-5-steps-us-study/research-your-options). | **Подтверждено:** страница перечисляет пять шагов, включая «Apply for Your Student Visa» и «Prepare for Your Departure». Рекомендация начать за 12–18 месяцев и бесплатность всех консультаций на этой странице не подтверждены. |

**Идеи топ-10, основанные на опровергнутых утверждениях:** среди девяти проверенных платформ прямых опровержений не найдено. Это не подтверждает все идеи: сроки документов Pioneer в идее 7 первого отчёта и пакеты эссе Going Merry в идее 6 второго остаются непроверенными. Восемь ранее сверенных платформ в этот вывод не входят.
