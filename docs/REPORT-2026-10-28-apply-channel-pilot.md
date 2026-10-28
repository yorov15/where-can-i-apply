# Пилот «Как подавать»: 30 программ

28.10.2026, только `redesign-v2`. Проверены **30 программ из 18 стран**: подтверждён канал у **26**, у **4** поле не внесено. Сохранены **36 маршрутов/этапов**; один вуз может иметь несколько вариантов. «Закрыто» означает, что источник прямо называет канал для этой записи, с сохранёнными ограничениями; это не обещает, что все варианты подходят каждому человеку.

## Сначала схема

До начала сбора и внесения была показана `APPLY-CHANNEL-SCHEMA.md` и изменены `tools/schema.py` / `tools/validate.py`. Каноническое поле:

```json
{"applyChannel":{"routes":[{"type":"university","name":"Название канала","url":"https://example.edu/apply","note":"Этап или условие","evidence":"Дословная цитата","source":{"url":"https://example.edu/admissions","lastVerified":"2026-10-28","contentHash":"sha256:<64 hex>"}}]}}
```

Типы: `university`, `platform`, `government`, `embassy`, `school`, `agent`. Неизвестный канал — отсутствие поля/null, без строки на экране. У подтверждённого поля — 1–6 маршрутов. URL HTTP(S) сохраняется из исходной ссылки; источник — HTTPS. Для офлайн-подачи, номинации, персональной ссылки или меняющегося адресата допустим null с обязательным пояснением. Цитаты и SHA-256 остаются в каноне; лёгкие детали для браузера получают названия, адреса, пояснения, URL и дату источника. На экране — одна строка с названиями и ссылками; кнопка «Порядок и условия» открывает пояснения, источники и даты с переносом фокуса. Индекс и фильтры не расширены.

## Охват типов

| Тип | Программ, где он подтверждён | Маршрутов |
| --- | ---: | ---: |
| Сам вуз | 21 | 21 |
| Общая платформа | 4 | 5 |
| Государственный портал | 3 | 3 |
| Посольство | 2 | 2 |
| Номинация школой | 2 | 2 |
| Авторизованный агент | 3 | 3 |

Посольство и номинация школой рассматривались как одна группа из условия задачи: в выборке четыре таких кандидата (MEXT, CSC, Pearson, UBC). Для агентов было четыре кандидата, подтверждены три; Melbourne оставлен без поля. Общие платформы подтверждены у Harvard, Cambridge, Duke и на этапе VPD у TU Berlin. Вместо предварительно просмотренного Bilkent в итоговую выборку включён Duke для третьего примера общей платформы; данные Bilkent не менялись.

## Время

Сбор, проверка доказательств, подпись и внесение: **21.2 мин**, в среднем **42.4 с (0.71 мин) на программу**. Начало: `2026-10-28T13:44:56.840903+00:00`, окончание: `2026-10-28T14:06:09.566328+00:00`. Это календарное время партии / 30, с параллельными загрузками, включая неудачные обращения и предварительный просмотр Bilkent; не индивидуальный секундомер ручной работы. Разработка схемы/интерфейса, тесты, отчёт и превью в эту среднюю не входят. Повторно использованы некоторые исходные байты официальных страниц, сохранённые в этот же день в ходе проверки взносов; извлечение ссылок и проверка выполнены заново.

## Все 30 программ

| Программа | Страна | Результат |
| --- | --- | --- |
| KAIST — приём иностранцев на бакалавриат (`kaist`) | KR | KAIST Apply Online |
| Токийский международный университет (TIU) — E-Track на английском (`tiu-japan`) | JP | My TIU Page |
| Гонконгский университет (HKU) — приём иностранцев и стипендии за успехи (`hku`) | HK | HKU Online Application |
| HKUST, Гонконг — приём по международным аттестатам (`hkust`) | HK | HKUST Online Application |
| Гарвардский колледж — помощь по достатку семьи (`harvard-college`) | US | Common App |
| University of Oxford (Великобритания): приём иностранцев на бакалавриат (`oxford`) | GB | Не указано — Локальное скачивание и браузер возвращают 403. Поисковое описание UCAS не заменяет сохранённый снимок официальной страницы; поле оставлено пустым. |
| University of Cambridge (Кембриджский университет) — приём иностранцев на бакалавриат (`cambridge`) | GB | UCAS; My Cambridge Application |
| Technische Universität Berlin (Германия) — бакалавриат для иностранцев (`tu-berlin`) | DE | tuPORT; My assist / uni-assist |
| Global Korea Scholarship — государственная стипендия Кореи (`gks-korea`) | KR | Study in Korea; Вуз-участник GKS |
| UNIST (Ulsan National Institute of Science and Technology, Ульсан) — научно-технический вуз; всем новым студентам покрывают вступительный взнос и плату за обучение на 100% (`unist`) | KR | Study in Korea |
| Квота Правительства России (`russia-quota`) | RU | Не указано — Страницы портала отдали только оболочку JavaScript, браузер не дождался содержимого. Догадка по названию портала и прежнему applyUrl не использована. |
| Türkiye Bursları — государственная стипендия Турции (`turkiye-burslari`) | TR | TBBS |
| MEXT — государственная стипендия Японии (`mext-japan`) | JP | Посольство Японии; Рекомендующий японский вуз |
| Стипендия правительства Китая (CSC) — через посольство КНР в Таджикистане (`csc-china`) | CN | Отбор посольства Китая |
| Стипендия Пирсона, Университет Торонто (`utoronto-pearson`) | CA | Номинация школой; Персональная заявка Pearson |
| UBC International Scholars, Ванкувер (`ubc-scholars`) | CA | Номинация школой; UBC International Scholars |
| Adelaide University (Австралия): приём иностранцев на бакалавриат (`adelaide`) | AU | Adelaide International Application System; Авторизованный агент Adelaide |
| Monash University (Австралия): приём иностранцев на бакалавриат (`monash`) | AU | Прямая подача Monash; Авторизованный агент Monash |
| University of Melbourne (Австралия): приём иностранцев на бакалавриат (`melbourne`) | AU | Не указано — Официальная страница прочитана через web, но curl и браузер возвращают 403, повторное извлечение текста не удалось. Проверяемый UTF-8 снимок не сохранён, поэтому поле не внесено. |
| UNSW Sydney (Австралия) — приём иностранцев на бакалавриат (`unsw`) | AU | UNSW Applicant Portal; Авторизованный агент UNSW |
| Дьюк — помощь по достатку семьи (`duke-university`) | US | Common App; QuestBridge |
| Будапештский университет технологии и экономики (BME, Венгрия) — бакалавриат (`bme-budapest`) | HU | BME e-admission |
| Болонский университет (Италия) — приём иностранцев на бакалавриат (`bologna-italy`) | IT | Studenti Online |
| Карлов университет (Чехия) — приём иностранцев на бакалавриат (`charles-university`) | CZ | Не указано — Проверенная общая страница не называет способ отправки заявки. Каналы отдельных факультетов не обобщались на весь университет. |
| Международный университет Акиты (AIU) — приём иностранцев на английском (`aiu-japan`) | JP | AIU Online Application |
| Constructor University (Бремен) — стипендии, в том числе полная от JetBrains (`constructor-university`) | DE | Constructor Application Portal |
| Назарбаев Университет, Астана (`nazarbayev`) | KZ | NU Admissions |
| Американский университет в Центральной Азии (AUCA), Бишкек (`auca`) | KG | AUCA Online Application |
| New Uzbekistan University (Ташкент) — приём иностранцев на бакалавриат (`newuu`) | UZ | NewUU International Admissions |
| Американский университет Шарджи (AUS, ОАЭ) — приём иностранцев (`aus-uae`) | AE | AUS Online Application |

## Пропуски

- **melbourne** — Официальная страница прочитана через web, но curl и браузер возвращают 403, повторное извлечение текста не удалось. Проверяемый UTF-8 снимок не сохранён, поэтому поле не внесено. [Кандидат-страница](https://study.unimelb.edu.au/how-to-apply/undergraduate-study/international-applications/entry-requirements)
- **oxford** — Локальное скачивание и браузер возвращают 403. Поисковое описание UCAS не заменяет сохранённый снимок официальной страницы; поле оставлено пустым. [Кандидат-страница](https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/ucas-application)
- **russia-quota** — Страницы портала отдали только оболочку JavaScript, браузер не дождался содержимого. Догадка по названию портала и прежнему applyUrl не использована. [Кандидат-страница](https://education-in-russia.com/how-to-proceed/admission-process)
- **charles-university** — Проверенная общая страница не называет способ отправки заявки. Каналы отдельных факультетов не обобщались на весь университет. [Кандидат-страница](https://cuni.cz/uken-329.html)

## Доказательства внесённых значений

Цитаты ниже дословны. Каждый SHA-256 рассчитан по фактическим байтам указанного UTF-8 файла, без U+FFFD. До создания предложения и повторно до канонического внесения проверены точное вхождение цитаты, ссылка и хеш. Для HTML сохранены извлечённые href, для PDF — URI-аннотации. Для Monash сохранён фрагмент официальной страницы, автоматически полученный web-инструментом; прямой curl/браузер возвращал 403. Ни снимки, ни поля не восстановлены по общим знаниям.

### kaist

- Сам вуз: [KAIST Apply Online](https://admission.kaist.ac.kr/intl-undergraduate/application/apply).
  - Цитата: Apply Online
  - [Источник](https://admission.kaist.ac.kr/intl-undergraduate/before/sub02), проверено 2026-10-28; `sha256:7a895c95ed0c0fc24b33d53f817e6d7051b9c8501727f672f26e080365852f94`.
  - Снимок: `raw/apply-channels/2026-10-28/kaist-ffb8182ec634.txt`.

### tiu-japan

- Сам вуз: [My TIU Page](http://www.tiu.ac.jp/apply/bachelor). Онлайн-заявка и документы почтой — обе части обязательны.
  - Цитата: Register My TIU Page account (online).
  - [Источник](https://www.tiu.ac.jp/etrack/wp-content/uploads/application_guideline_for_first_year.pdf), проверено 2026-10-28; `sha256:a25a1f1aebb7512e4bc2942e84b27bb40b9b151a195d2173fdcaad27f0f6e310`.
  - Снимок: `raw/apply-channels/2026-10-28/tiu-japan-f82f9c08dacb.txt`.

### hku

- Сам вуз: [HKU Online Application](https://ug.hku.hk/hku-applicant/hku/index/login.xhtml). Международные квалификации.
  - Цитата: Applicants must input all their academic results, including both predicted and actual results, into the application system
  - [Источник](https://admissions.hku.hk/apply/international-qualifications), проверено 2026-10-28; `sha256:22a922a90a7b2301fd05163726c1383f514e386592c28fa3b280fe2183475d21`.
  - Снимок: `raw/apply-channels/2026-10-28/hku-fae46dee1b3b.txt`.

### hkust

- Сам вуз: [HKUST Online Application](https://join.hkust.edu.hk/apply/).
  - Цитата: submit their applications directly to the University via the online application system
  - [Источник](https://join.hkust.edu.hk/admissions/international-qualifications?general_requirement=46180), проверено 2026-10-28; `sha256:0e48d53ff70175ade12fef5c3428f413d192b1586b3c22d51decad3bee0983ed`.
  - Снимок: `raw/apply-channels/2026-10-28/hkust-94bb0cbf7a01.txt`.

### harvard-college

- Общая платформа: [Common App](https://www.commonapp.org/explore/harvard-university). Первый курс.
  - Цитата: We accept the Common Application
  - [Источник](https://college.harvard.edu/admissions/apply/application-requirements), проверено 2026-10-28; `sha256:8a971ebfd488cb4c7ec09fd0e590c464ddcec32a1acdcca5548f8c69cec1c59c`.
  - Снимок: `raw/apply-channels/2026-10-28/harvard-college-e32e72d7e359.txt`.

### cambridge

- Общая платформа: [UCAS](https://accounts.ucas.com/account/login). Сначала основная заявка.
  - Цитата: You must apply to Cambridge through UCAS
  - [Источник](https://www.undergraduate.study.cam.ac.uk/apply/how), проверено 2026-10-28; `sha256:ac47f15a3a146ac915564dff0731c72d328bf6f4715c87f92afe0027692f289f`.
  - Снимок: `raw/apply-channels/2026-10-28/cambridge-89712f558ccc.txt`.
- Сам вуз: My Cambridge Application. После UCAS для большинства курсов; ссылка приходит по email.
  - Цитата: you'll get an email from us within 48 hours with instructions and a link to your My Cambridge Application.
  - [Источник](https://www.undergraduate.study.cam.ac.uk/apply/how/cambridge-application), проверено 2026-10-28; `sha256:d6d22e47064c7ee55e2fac80c3a9b1747cce405dd6d6bff89ca1c5403459655f`.
  - Снимок: `raw/apply-channels/2026-10-28/cambridge-86ea046a53c0.txt`.

### tu-berlin

- Сам вуз: [tuPORT](https://tuport.sap.tu-berlin.de/). Заявка в TU Berlin; предварительно может требоваться VPD.
  - Цитата: required documents via the application portal of TU Berlin
  - [Источник](https://www.tu.berlin/en/studierendensekretariat/bachelors-application-enrollment/prospective-students-with-an-international-higher-education-entrance-qualification/application/group-c), проверено 2026-10-28; `sha256:a97337ca500215441b9991d8e5d20e2bfad44ee2937a1079a390f701ecebfdfc`.
  - Снимок: `raw/apply-channels/2026-10-28/tu-berlin-681ba995ab99.txt`.
- Общая платформа: [My assist / uni-assist](https://www.uni-assist.de/en/). Предварительная проверка VPD для иностранных документов; это не заявка в TU Berlin.
  - Цитата: online portal My assist
  - [Источник](https://www.tu.berlin/en/studierendensekretariat/bachelors-application-enrollment/prospective-students-with-an-international-higher-education-entrance-qualification/admission-requirements), проверено 2026-10-28; `sha256:6785c73ca56e35a18464366367e635cb855013d7fdedff6be6bd33f9596616df`.
  - Снимок: `raw/apply-channels/2026-10-28/tu-berlin-6fe45323cce6.txt`.

### gks-korea

- Государственный портал: [Study in Korea](https://www.studyinkorea.go.kr/ko/receipt/OnlineReceipt11.do). Embassy track: онлайн-заявка, затем отбор посольством.
  - Цитата: Embassy Track Apply online through Study in Korea
  - [Источник](https://www.studyinkorea.go.kr/en/plan/scholarship.do), проверено 2026-10-28; `sha256:82ca5786d887e7be52bc72744e30537b6ef3748363149fba5511d60ecf4339bc`.
  - Снимок: `raw/apply-channels/2026-10-28/gks-korea-4aeec3f2b065.txt`.
- Сам вуз: Вуз-участник GKS. University track: подать напрямую в выбранный вуз GKS; следовать его правилам.
  - Цитата: University Track Apply directly to a GKS university
  - [Источник](https://www.studyinkorea.go.kr/en/plan/scholarship.do), проверено 2026-10-28; `sha256:82ca5786d887e7be52bc72744e30537b6ef3748363149fba5511d60ecf4339bc`.
  - Снимок: `raw/apply-channels/2026-10-28/gks-korea-4aeec3f2b065.txt`.

### unist

- Государственный портал: [Study in Korea](https://studyinkorea.go.kr/). Бакалавриат, осень 2027.
  - Цитата: Online Application Website ▶ https://studyinkorea.go.kr/
  - [Источник](https://admu-intl.unist.ac.kr/admission-eng/admissions/admissions.do?articleNo=306812&attachNo=591437&mode=download), проверено 2026-10-28; `sha256:b1d0fca31d3a2d07e018a70be79efe2c4cfa1985866294223efae478f6dd76d4`.
  - Снимок: `raw/apply-channels/2026-10-28/unist-d81b68be9239.txt`.

### turkiye-burslari

- Государственный портал: [TBBS](https://tbbs.turkiyeburslari.gov.tr). Türkiye Scholarships.
  - Цитата: For applications made online through the Türkiye Scholarships Application System (TBBS)
  - [Источник](https://turkiyeburslari.gov.tr/applysteps), проверено 2026-10-28; `sha256:a92a0b74d196983c0754f162cf599834f9c1e63cd3b6e5c6275e7921379f7298`.
  - Снимок: `raw/apply-channels/2026-10-28/turkiye-burslari-343749be0671.txt`.

### mext-japan

- Посольство: Посольство Японии. Embassy recommendation: уточнить открытые направления в посольстве своей страны.
  - Цитата: scholarship recipients are recruited and initially screened by a Japanese embassy
  - [Источник](https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/), проверено 2026-10-28; `sha256:9757581c09f7eafc8e55175126bbf89e3d72e8698da2eba40457e68824013708`.
  - Снимок: `raw/apply-channels/2026-10-28/mext-japan-3361ea527426.txt`.
- Сам вуз: Рекомендующий японский вуз. University recommendation: отдельный путь по партнёрскому обмену и доступным вузу квотам.
  - Цитата: University recommendation is a scheme in which Japanese universities etc. recruit scholarship candidates based on their student-exchange agreements with schools overseas
  - [Источник](https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/), проверено 2026-10-28; `sha256:9757581c09f7eafc8e55175126bbf89e3d72e8698da2eba40457e68824013708`.
  - Снимок: `raw/apply-channels/2026-10-28/mext-japan-3361ea527426.txt`.

### csc-china

- Посольство: [Отбор посольства Китая](https://p8wravkip3kb63mw.mikecrm.com/9DYduDW). Объявление для Таджикистана, набор 2026: сначала электронные материалы; дальнейшая ссылка объявляется рекомендованным кандидатам.
  - Цитата: 本次选拔及申报工作由中国驻塔吉克斯坦大使馆负责
  - [Источник](https://tj.china-embassy.gov.cn/sgzc/202511/t20251124_11759137.htm), проверено 2026-10-28; `sha256:71c91848cbabe4fc8cc9ee7ca6ef74ae7f823e26a8a2b11987b92b78d95ba049`.
  - Снимок: `raw/apply-channels/2026-10-28/csc-china-97e469c23c84.txt`.

### utoronto-pearson

- Номинация школой: Номинация школой. Сначала номинация школой; отдельно нужна заявка на поступление в U of T.
  - Цитата: Your high school nominates you
  - [Источник](https://future.utoronto.ca/pearson-scholarships), проверено 2026-10-28; `sha256:5a083c1c45b9457a071be87e359f424ff9ee5fbf1564dfbe25b40596b15c389b`.
  - Снимок: `raw/apply-channels/2026-10-28/utoronto-pearson-8258fe4c3187.txt`.
- Сам вуз: Персональная заявка Pearson. Ссылка приходит после номинации; форму можно завершить после заявки на поступление.
  - Цитата: You will receive a private link to the Lester B. Pearson International Student Scholarship application when you have been nominated by your school.
  - [Источник](https://future.utoronto.ca/pearson-scholarships), проверено 2026-10-28; `sha256:5a083c1c45b9457a071be87e359f424ff9ee5fbf1564dfbe25b40596b15c389b`.
  - Снимок: `raw/apply-channels/2026-10-28/utoronto-pearson-8258fe4c3187.txt`.

### ubc-scholars

- Номинация школой: Номинация школой. Нужны номинатор и рекомендация учителя; в названных вузом случаях возможна номинация образовательной некоммерческой организацией.
  - Цитата: Late September: Discuss the nomination with your school
  - [Источник](https://you.ubc.ca/financial-planning/scholarships-awards-international-students/international-scholars/), проверено 2026-10-28; `sha256:e3e4742ff0f376c96a55549fdea28b717c696c9e890966c9db934c2e73ceacc9`.
  - Снимок: `raw/apply-channels/2026-10-28/ubc-scholars-fce726ac77d2.txt`.
- Сам вуз: [UBC International Scholars](https://undergraduatescholarships.ubc.ca/prog/2027_international_scholars_program_application/). Стипендиальная заявка; отдельно нужна заявка на поступление в UBC.
  - Цитата: start your award application by creating an account
  - [Источник](https://you.ubc.ca/financial-planning/scholarships-awards-international-students/international-scholars/), проверено 2026-10-28; `sha256:e3e4742ff0f376c96a55549fdea28b717c696c9e890966c9db934c2e73ceacc9`.
  - Снимок: `raw/apply-channels/2026-10-28/ubc-scholars-fce726ac77d2.txt`.

### adelaide

- Сам вуз: [Adelaide International Application System](https://student-adelaideuni.studylink.com/index.cfm?event=security.showLogin&brand=ADELAIDEUNI&custInstID=ADELAIDEUNI). Прямой путь, если вуз не требует агента для твоего гражданства.
  - Цитата: If you don't need to apply via an Education Agent, you can submit your application directly through our International Application System.
  - [Источник](https://adelaide.edu.au/study/international-students/how-to-apply/), проверено 2026-10-28; `sha256:6def3fa968d841b4a60fabd1c80c559435fa097c3b4690eacd125b86067223e0`.
  - Снимок: `raw/apply-channels/2026-10-28/adelaide-86c71d88c22a.txt`.
- Авторизованный агент: [Авторизованный агент Adelaide](https://adelaide.edu.au/study/international-students/find-an-education-agent/). Для перечисленных вузом стран/регионов агент обязателен; список — в источнике.
  - Цитата: Some students must apply through an Adelaide University authorised Education Agent.
  - [Источник](https://adelaide.edu.au/study/international-students/how-to-apply/), проверено 2026-10-28; `sha256:6def3fa968d841b4a60fabd1c80c559435fa097c3b4690eacd125b86067223e0`.
  - Снимок: `raw/apply-channels/2026-10-28/adelaide-86c71d88c22a.txt`.

### monash

- Сам вуз: [Прямая подача Monash](https://www.monash.edu/admissions/apply/international-ug). Страница начала прямой подачи; проверь условия своего пути.
  - Цитата: Undergraduate direct application
  - [Источник](https://www.monash.edu/study/how-to-apply/application-process/international-students), проверено 2026-10-28; `sha256:0998f7ed3c35cde7cc88dc7c78067d5615cb248c1bc2143a7237bf92d2d2f494`.
  - Снимок: `raw/apply-channels/2026-10-28/monash-9594e3308ef0.txt`.
- Авторизованный агент: [Авторизованный агент Monash](https://www.monash.edu/study/how-to-apply/application-process/international-students/applying-through-an-education-agent). Допустимый альтернативный путь; используй только авторизованного агента.
  - Цитата: Apply through a Monash Education Agent
  - [Источник](https://www.monash.edu/study/how-to-apply/application-process/international-students), проверено 2026-10-28; `sha256:0998f7ed3c35cde7cc88dc7c78067d5615cb248c1bc2143a7237bf92d2d2f494`.
  - Снимок: `raw/apply-channels/2026-10-28/monash-9594e3308ef0.txt`.

### unsw

- Сам вуз: [UNSW Applicant Portal](https://apply.unsw.edu.au/). Прямая заявка.
  - Цитата: Applying is easy via the UNSW Applicant Portal
  - [Источник](https://www.unsw.edu.au/study/how-to-apply/international), проверено 2026-10-28; `sha256:27d82850122abcdcfae7771e14f018e8d695b6d3ed36b53edf09cf21dc733b5a`.
  - Снимок: `raw/apply-channels/2026-10-28/unsw-d866e0b36e14.txt`.
- Авторизованный агент: [Авторизованный агент UNSW](https://www.unsw.edu.au/study/how-to-apply/international/find-a-agent). Альтернатива прямой подаче.
  - Цитата: Alternatively, you can find a local UNSW agent in your region
  - [Источник](https://www.unsw.edu.au/study/how-to-apply/international), проверено 2026-10-28; `sha256:27d82850122abcdcfae7771e14f018e8d695b6d3ed36b53edf09cf21dc733b5a`.
  - Снимок: `raw/apply-channels/2026-10-28/unsw-d866e0b36e14.txt`.

### bme-budapest

- Сам вуз: [BME e-admission](http://e-admission.bme.hu/). Для платного пути; стипендиальные программы имеют отдельные процедуры.
  - Цитата: you have to fill our online application form
  - [Источник](https://www.bme.hu/en/application_and_admission), проверено 2026-10-28; `sha256:da41d4777b436d3e2ff5d5866e3a73477055fe4d12e8ad9cbc92e25e8ce681ff`.
  - Снимок: `raw/apply-channels/2026-10-28/bme-budapest-a987070240fd.txt`.

### bologna-italy

- Сам вуз: [Studenti Online](https://studenti.unibo.it/sol/welcome.htm?siteLanguage=en). Заявка на отбор; предзачисление для визы через Universitaly — отдельный этап.
  - Цитата: Access Studenti Online with your institutional credentials, enter "Application for admission - Participate in the selection" and complete the application.
  - [Источник](https://www.unibo.it/en/study/enrolment-fees-and-other-procedures/degree-programmes/enrolling-in-first-cycle-and-single-cycle-degree-programmes/enrolling-in-a-first-cycle-or-single-cycle-degree-programme-if-you-come-from-a-non-eu-country), проверено 2026-10-28; `sha256:a67883ef529992bd1ba8ec9ed02e8009a6cf9b3222d0a278394d834f978ef481`.
  - Снимок: `raw/apply-channels/2026-10-28/bologna-italy-51bf747d09fc.txt`.

### aiu-japan

- Сам вуз: [AIU Online Application](https://e-apply.jp/ds/aiu/). Онлайн-регистрация и оплата, затем распечатать форму и отправить документы почтой.
  - Цитата: After registering your application information on the online application website and paying the application fee, please print out the downloadable documents
  - [Источник](https://admission.aiu.ac.jp/en/ug/application/), проверено 2026-10-28; `sha256:013e947267785ca78801e3cea0ef72432467b881aa1ab67f3307c80da4423d93`.
  - Снимок: `raw/apply-channels/2026-10-28/aiu-japan-99d8766ba493.txt`.

### constructor-university

- Сам вуз: [Constructor Application Portal](https://apply.constructor.university/).
  - Цитата: Application portal
  - [Источник](https://constructor.university/admission-aid/application-information-undergraduate), проверено 2026-10-28; `sha256:46073cf5446409e539713ea952362f8c40e331cd47a09e77665498d5fa8d2140`.
  - Снимок: `raw/apply-channels/2026-10-28/constructor-university-27ef22cda6e2.txt`.

### nazarbayev

- Сам вуз: [NU Admissions](https://admissions.nu.edu.kz/wps/portal). Личный кабинет; выбрать Undergraduate program.
  - Цитата: The applicant should go to the admissions.nu.edu.kz portal, press the "Sign Up" button
  - [Источник](https://nu.edu.kz/admissions/how-to-apply/foundation-undergraduate/regular-admissions/), проверено 2026-10-28; `sha256:237b45f9d9af36216699c3ca054c33c065d99520effa09095f9fe18c3aa97401`.
  - Снимок: `raw/apply-channels/2026-10-28/nazarbayev-74a89e094167.txt`.

### auca

- Сам вуз: [AUCA Online Application](http://applyonline.auca.kg/). Альтернатива: отправить форму и документы в приёмную комиссию.
  - Цитата: Fill out the ONLINE APPLICATION or send the AUCA Admission Application Form and supporting documents to: AUCA Office of Admissions
  - [Источник](https://www.auca.kg/en/freshman_applicants/), проверено 2026-10-28; `sha256:f840753c2422baf8310b864b35a607d7385b83552ff9757c71a62518fb99534d`.
  - Снимок: `raw/apply-channels/2026-10-28/auca-50fa1229491d.txt`.

### newuu

- Сам вуз: [NewUU International Admissions](https://admission.newuu.uz/international/auth/login). Иностранные абитуриенты.
  - Цитата: Apply now
  - [Источник](https://newuu.uz/en/menu/entry-requirements), проверено 2026-10-28; `sha256:d9b0509c23e4371a0008de7f6804ca7b9fc1a373fe08998eb2db75966931d41d`.
  - Снимок: `raw/apply-channels/2026-10-28/newuu-3c5a8206540a.txt`.

### aus-uae

- Сам вуз: [AUS Online Application](https://aus.elluciancrmrecruit.com/Apply/Account/Login?ReturnUrl=%2fApply).
  - Цитата: Applicants are required to submit an online application on apply.aus.edu
  - [Источник](https://www.aus.edu/admissions/bachelors-degrees/application-requirements), проверено 2026-10-28; `sha256:0e7bae8b2bd1e0be3304d86063e087f519bfb388f060dc3493e2880eee978d8a`.
  - Снимок: `raw/apply-channels/2026-10-28/aus-uae-e04e95482dd4.txt`.

### duke-university

- Общая платформа: [Common App](https://www.commonapp.org/). Первый курс; QuestBridge — отдельный путь для соответствующих его правилам студентов.
  - Цитата: First-year applicants may apply using the Common Application
  - [Источник](https://admissions.duke.edu/apply/), проверено 2026-10-28; `sha256:c0d062532d2ee79fc9f002d62a76f8b2108ad6158b269cfa783ff8f4c56fe2e4`.
  - Снимок: `raw/apply-channels/2026-10-28/duke-university-b33d74638529.txt`.
- Общая платформа: [QuestBridge](https://www.questbridge.org/college-partners/duke-university). Только для подходящих под правила QuestBridge; Coalition в этом источнике относится к переводу, а не первому курсу.
  - Цитата: QuestBridge Application for eligible students
  - [Источник](https://admissions.duke.edu/apply/), проверено 2026-10-28; `sha256:c0d062532d2ee79fc9f002d62a76f8b2108ad6158b269cfa783ff8f4c56fe2e4`.
  - Снимок: `raw/apply-channels/2026-10-28/duke-university-b33d74638529.txt`.

## Важные различия

- TU Berlin: uni-assist — предварительная проверка VPD, а сама заявка — в tuPORT; это не две взаимозаменяемые заявки.
- Cambridge: UCAS и затем персональная My Cambridge Application для большинства курсов.
- Pearson и UBC: номинация и стипендиальная форма — отдельные этапы; поступление в университет оформляется отдельно. Персональные ссылки не выдуманы.
- GKS: Embassy track — онлайн через Study in Korea; University track — напрямую в вуз-участник. MEXT — отдельные Embassy/University recommendation с оговорками.
- CSC: сохранён именно порядок объявления для Таджикистана на набор 2026, включая форму предварительных материалов. CampusChina не назван универсальным каналом заявки только потому, что ссылка ведёт к каталогу.
- Adelaide/Monash/UNSW: агент — только прямо разрешённый вузом путь; обязательность по категориям и прямой путь не скрыты. Ссылка Monash на прямую подачу ведёт к официальной странице начала подачи, а не к придуманному адресу формы.
- AIU, TIU и AUCA: источник называет также почтовые/бумажные документы или альтернативу онлайн-форме; это сохранено в пояснении. Отсутствие конкретного публичного URL не превращено в неизвестный тип, если сам канал прямо назван.

## Стоит ли размечать все 323

Пилот поддерживает продолжение небольшими партиями: канал обычно удаётся назвать по официальной странице, но одних ссылок «Apply» недостаточно для понимания этапов и исключений. Список маршрутов оказался нужен для номинаций, рекомендаций и альтернатив агенту. Временную оценку нельзя линейно переносить на оставшиеся 293: здесь были готовые кандидат-страницы и часть снимков того же дня; сложные страницы, факультетские правила и закрытые порталы потребуют больше времени. Разумный следующий шаг — ещё одна партия с тем же отчётом о пропусках, прежде чем обещать срок на весь каталог.

## Проверки, коммиты и превью

- `node --test`: 579 тестов, все прошли.
- `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .`: 493 теста, все прошли.
- `python -m tools.build`: 323 программы; сборка прошла. Шесть прежних предупреждений о прошедших дедлайнах сохранены.
- CSS: 47 272 Б при лимите 51 200 Б. Индекс остался побайтно прежним после нормализации переводов строк: gzip 97 329 Б при лимите 98 304 Б; детали — 75 647 Б при лимите 196 608 Б.
- Браузер: 375 и 1280 px, светлая и тёмная темы. Проверены все 26 записей и 36 маршрутов/этапов, ссылки и даты источников, отсутствие строки у четырёх пропусков и контрольной неразмеченной программы, появление канала до ленивых условий, Tab/стрелки в селекте, открытие условий клавишей Enter и перенос фокуса. Просмотрены 16 снимков блока фактов; ошибок консоли и горизонтальной прокрутки нет. Окно возвращено к 1280 px. Фильтр бесплатной подачи по-прежнему показывает 12; фильтра по каналу нет.
- После коммита повторно проверены байтовые хеши и цитаты пилота: 2 теста прошли.

Код, схема, данные и снимки: [`0d950d8`](https://github.com/yorov15/where-can-i-apply/commit/0d950d88298ef5c370d44a7b4a0a810c135f3977).
[Превью](https://where-can-i-apply-j8aaayhs0-ym-2559.vercel.app) готово (`READY`, окружение `preview`), требует входа Vercel. HTML проверен; детали, индекс, код экрана, код фильтра и CSS побайтно совпадают с экспортом коммита. В опубликованных деталях 26 программ с 36 маршрутами, у четырёх пропусков поле отсутствует.

Изменения отправлены только в `redesign-v2`. Локальная `main` осталась на `93395149c25c63c490ab3a5e00cd20bbfa37cb23`; в `main` не отправлял изменений и в production не выкладывал. `tools/sources.toml` не менялся; заявки, формы и сообщения вузам не отправлялись.
