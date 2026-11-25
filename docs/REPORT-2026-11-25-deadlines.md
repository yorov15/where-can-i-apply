# Проверка сроков Nerio — 25.11.2026

40 программ с истёкшим `deadline.closes` проверены по официальным страницам. Пять программ попали в очередь впервые: `ozyegin-university`, `ubc-scholars`, `polyu-hongkong`, `nagoya-g30`, `hokkaido-isp`. Данные каталога не изменены: это очередь решений для сверки цитат владельцем.

Цитаты с пометкой «WebFetch» или «reader» получены не прямой загрузкой: сайт не открывался напрямую. Их дословность нужно сверить вручную; в JSON у таких источников `freshFetch` и `exactQuoteMatched` равны `false`.

## Что изменилось с 05.11.2026

- `bit` — было «2026»; опубликован набор 2027 — бакалавриат до 01.06.2027, стипендии до 01.05.2027.
- `bnu` — было «2026»; опубликован набор 2027 — 15.11.2026–15.03.2027, бумажные документы до 31.03.2027.
- `harbin-institute-of-technology` — противоречие страниц снято: self-financed до 31.05.2027, стипендия HIT до 20.04.2027.
- `renmin` — вместо 01.01–31.05.2026 новое окно 05.11.2026–30.04.2027 17:00 (Beijing).
- `obuda` — вместо 31.05.2026 срок 03.05.2027; страница обновлена 18.11.2026.
- `fu-berlin` — вместо «Further Information will follow» опубликованы даты лета 2027.
- `ibn-haldun` — опубликован календарь 2027/28: приём иностранцев 07.04–01.09.2027.
- `spbu` — страница открылась через reader-прокси: бюджетный приём 02.11.2026–05.02.2027.
- `wuhan-university` — страница открылась: весна 2027 — октябрь–декабрь 2026, без точного дня.
- `sysu` — страница открылась: действующий guide всё ещё 2026, нового набора нет.
- `csc-china` — после 05.11 объявления 2027 у посольства не появилось; даты 22.11–19.12.2026 остаются переносом.
- `ubc-scholars` — срок продлён с 15.11.2026 до 02.12.2026 12:00 PT — программа ещё открыта.
- `polyu-hongkong` — вместо 17.11.2026 на странице Sept 2027 entry со сроком 11.02.2027.
- `nagoya-g30` — в наборе 2027 обнаружен второй тур 05.01–21.01.2027.
- `zhejiang-university` — страница теперь отдаёт форму входа; проверить объявление не удалось.

## Очередь решений

| Программа | В данных сейчас | Результат | Предложение / оговорка |
|---|---|---|---|
| `spbu` | 2025-11-12 → 2026-02-06 (expected) | новый цикл | Заменить на 02.11.2026–05.02.2027 (бюджетная основа). |
| `zhejiang-university` | — → 2026-02-28 (expected) | источник недоступен | Оставить как есть; повторить, когда страница откроется без входа. |
| `bnu` | — → 2026-03-15 (expected) | новый цикл | Заменить на 2027: 15.11.2026–15.03.2027; крайний срок бумажных документов 31.03.2027. |
| `tongji` | 2026-01-10 → 2026-03-31 (expected) | новый цикл | Заменить на 10.12.2026–31.03.2027. |
| `xmu` | 2025-12-01 → 2026-04-10 (expected) | новый цикл | Заменить на 01.12.2026–31.05.2027; стипендии — отдельными сроками. |
| `sysu` | 2026-01-01 → 2026-04-30 (expected) | новый цикл не найден | Оставить как есть до объявления 2027. |
| `islamic-university-madinah` | 2026-04-19 → 2026-05-21 (expected) | закрыт корректно | Оставить как есть; нового объявления нет. |
| `scu` | 2026-01-01 → 2026-05-30 (expected) | новый цикл | Поставить четыре окна; общий closes 30.05.2027. |
| `obuda` | — → 2026-05-31 (expected) | новый цикл | Заменить на 03.05.2027; год в источнике указан. |
| `renmin` | 2026-01-01 → 2026-05-31 (expected) | новый цикл | Заменить на 05.11.2026–30.04.2027 17:00 (Beijing). |
| `bit` | — → 2026-06-01 (expected) | новый цикл | Заменить на 2027: приём до 01.06.2027; стипендии — до 01.05.2027. |
| `ecnu` | — → 2026-06-01 (expected) | новый цикл | Заменить на 2027: self-funded до 01.06.2027, Shanghai scholarship до 30.04.2027, language teachers до 15.05.2027. |
| `itu` | 2026-04-24 → 2026-06-26 (expected) | ошибка пути приёма | Убрать graduate-даты; поставить последний бакалаврский раунд 21–26.08.2026 или null до объявления 2027/28. |
| `beihang` | 2025-11-01 → 2026-06-30 (expected) | новый цикл | Заменить на цикл 2027: общий приём 01.11.2026–30.05.2027, стипендии до 30.04.2027. |
| `nankai` | — → 2026-06-30 (expected) | новый цикл | Заменить на 20.10.2026–04.06.2027; стипендия — до 30.05.2027. |
| `wuhan-university` | — → 2026-06-30 (expected) | новый цикл без точного дня | Добавить окно spring 2027 с null вместо дат или текстом «October 2026 to December 2026»; день не выдумывать. |
| `xian-jiaotong-university` | — → 2026-06-30 (expected) | новый цикл | Поставить два раунда 2027; общий closes 30.06.2027. |
| `mate` | — → 2026-07-03 (expected) | новый цикл | Заменить на 01.02–30.04.2027, CET. |
| `mephi` | 2026-06-20 → 2026-07-10 (expected) | только ежегодные окна | Оставить ежегодные окна без года; не ставить 2027. |
| `mipt` | 2026-06-20 → 2026-07-10 (expected) | источник недоступен | Оставить как есть до появления правил 2027. |
| `fu-berlin` | — → 2026-07-15 (expected) | новый цикл (лето 2027) | Добавить окна лета 2027; основной срок оставить пустым до объявления зимы 2027/28. |
| `harbin-institute-of-technology` | — → 2026-07-15 (expected) | новый цикл | Заменить на 2027: 01.11.2026–31.05.2027; стипендия — до 20.04.2027. Противоречие прежних страниц снято. |
| `warsaw-university-of-technology` | — → 2026-07-21 (expected) | новый цикл без точного дня | Оставить null; 01.10.2027 — начало занятий, не срок подачи. |
| `uni-due` | — → 2026-07-31 (expected) | только ежегодные окна | Оставить ежегодные окна без года. |
| `ibn-haldun` | 2026-04-08 → 2026-08-31 (expected) | новый цикл | Заменить на 07.04.2027–01.09.2027 по календарю 2027/28. |
| `king-abdulaziz` | 2026-09-16 → 2026-10-06 (confirmed) | закрыт корректно | Оставить как есть. |
| `study-in-saudi` | 2026-09-16 → 2026-10-06 (confirmed) | закрыт корректно | Оставить как есть. |
| `utoronto-pearson` | 2026-07-06 → 2026-10-09 (confirmed) | закрыт корректно | Оставить как есть. |
| `cambridge` | — → 2026-10-15 (confirmed) | закрыт корректно | Оставить как есть; новый цикл 2028 не объявлен. |
| `oxford-reach` | — → 2026-10-15 (confirmed) | закрыт корректно | Оставить как есть. |
| `od` | 2026-08-20 → 2026-11-01 (confirmed) | закрыт корректно | Оставить как есть. |
| `urfu` | 2026-08-20 → 2026-11-01 (expected) | закрыт корректно | Оставить как есть. |
| `ritsumeikan` | — → 2026-11-02 (expected) | следующий тур | Добавить два тура только для GLA/GS/CRPS; не показывать их всем программам. |
| `hokkaido-mjsp` | 2026-10-27 → 2026-11-04 (confirmed) | следующий тур | Добавить второй тур 02.02–09.02.2027 (JST 10:00–17:00). |
| `tsukuba-ide` | 2026-10-01 → 2026-11-04 (confirmed) | закрыт корректно | Оставить как есть. |
| `ozyegin-university` | — → 2026-11-15 (expected) | закрыт корректно | Поднять confidence до confirmed; новый цикл не объявлен. |
| `ubc-scholars` | — → 2026-11-15 (confirmed) | срок продлён | Заменить closes на 02.12.2026 (12:00 Pacific Time). |
| `polyu-hongkong` | — → 2026-11-17 (expected) | новый цикл | Заменить closes на 11.02.2027 (Sept 2027 entry), confidence confirmed. |
| `nagoya-g30` | 2026-11-02 → 2026-11-19 (confirmed) | следующий тур | Поставить второй тур 05.01–21.01.2027 (JST) или добавить его окном. |
| `hokkaido-isp` | 2026-11-12 → 2026-11-20 (confirmed) | закрыт корректно | Оставить как есть; следующий набор не объявлен. |
| `csc-china` | 2026-11-22 → 2026-12-19 (expected) | объявление 2027 не найдено | Убрать перенесённые даты 2026 или оставить null до объявления 2027. |

## Источники и даты для сверки

Выдержки страниц лежат в `raw/deadline-review/2026-11-25/<id>.txt`. Для прямых загрузок там же указан sha256 ответа. Где стоит «WebFetch» или «reader», снимок не сохранялся: цитата требует ручной сверки.

### spbu

Бюджетный приём иностранцев: 02.11.2026–05.02.2027.

- budget: 2026-11-02 → 2027-02-05; пояс/время не указаны.

- [Официальный источник](https://abiturient.spbu.ru/reception-foreign/) — текст через reader-прокси, дословность сверить вручную. «Бюджетная основа обучения 02.11.2026 – 05.02.2027»

### zhejiang-university

Страница отдаёт форму входа (用户名/密码/验证码); новое объявление не проверено.

- Новых окон нет.

- [Официальный источник](https://iczu.zju.edu.cn/admissionsen/2024/1030/c68988a2981659/page.htm) — текст через reader-прокси, дословность сверить вручную. «用户名»

### bnu

Опубликован набор 2027: онлайн 15.11.2026–15.03.2027, бумажные документы до 31.03.2027.

- online application: 2026-11-15 → 2027-03-15; пояс/время не указаны.
- paper documents: 2026-11-15 → 2027-03-31; пояс/время не указаны.

- [Официальный источник](https://admission-is.bnu.edu.cn/english/admissionprogram/bachelordegreeprogram/admissionbrochure/index.html) — прямая загрузка успешна, цитата найдена дословно. «November 15, 2026 - March 15, 2027»
- [Официальный источник](https://admission-is.bnu.edu.cn/english/admissionprogram/bachelordegreeprogram/admissionbrochure/index.html) — прямая загрузка успешна, цитата найдена дословно. «Applicants must mail the paper application documents before March 31, 2027.»

### tongji

Осень 2027: 10.12.2026–31.03.2027 (Shanghai scholarship, self-funded).

- Shanghai scholarship and self-funded: 2026-12-10 → 2027-03-31; пояс/время не указаны.

- [Официальный источник](https://study.tongji.edu.cn/info/1010/1182.htm) — WebFetch, дословность сверить вручную. «2026年12月10日至2027年3月31日»

### xmu

2027: старт 01.12.2026; CSC-B до 20.02.2027, Fujian/XMU до 30.04.2027, self-funded до 31.05.2027.

- self-funded: 2026-12-01 → 2027-05-31; Beijing Time.
- CSC Type B: 2026-12-01 → 2027-02-20; Beijing Time.
- Fujian/XMU scholarship: 2026-12-01 → 2027-04-30; Beijing Time.

- [Официальный источник](https://admissions.xmu.edu.cn/Admissions/Undergraduate_Students.htm) — прямая загрузка успешна, цитата найдена дословно. «Dec. 1, 2026»
- [Официальный источник](https://admissions.xmu.edu.cn/Admissions/Undergraduate_Students.htm) — прямая загрузка успешна, цитата найдена дословно. «Feb. 20, 2027»
- [Официальный источник](https://admissions.xmu.edu.cn/Admissions/Undergraduate_Students.htm) — прямая загрузка успешна, цитата найдена дословно. «Apr. 30, 2027»
- [Официальный источник](https://admissions.xmu.edu.cn/Admissions/Undergraduate_Students.htm) — прямая загрузка успешна, цитата найдена дословно. «May 31, 2027»

### sysu

Действующий guide — 2026: 01.01–28.02 и 01.03–30.04.2026; 2027 не объявлен.

- Новых окон нет.

- [Официальный источник](https://iso.sysu.edu.cn/en/application/selffunded/1420575.htm) — прямая загрузка успешна, цитата найдена дословно. «First Round: January 1-February 28, 2026»
- [Официальный источник](https://iso.sysu.edu.cn/en/application/selffunded/1420575.htm) — прямая загрузка успешна, цитата найдена дословно. «Second Round: March 1-April 30, 2026»

### islamic-university-madinah

Последний набор 1448 AH: 19.04–21.05.2026; 1449 AH не объявлен.

- Новых окон нет.

- [Официальный источник](https://iu.edu.sa/%D9%82%D8%A8%D9%88%D9%84-%D8%B7%D9%84%D8%A7%D8%A8-%D8%A7%D9%84%D9%85%D9%86%D8%AD-%D8%A7%D9%84%D8%AF%D8%B1%D8%A7%D8%B3%D9%8A%D8%A9-%D8%A7%D9%84%D8%AF%D8%A7%D8%AE%D9%84%D9%8A%D8%A9-%D9%88%D8%A7%D9%84%D8%AE%D8%A7%D8%B1%D8%AC%D9%8A%D8%A9-%D9%84%D9%84%D8%B9%D8%A7%D9%85-%D8%A7%D9%84%D8%AC%D8%A7%D9%85%D8%B9%D9%8A-1448%D9%87%D9%80) — прямая загрузка успешна, цитата найдена дословно. «من 2-11-1447هـ  الموافق  19-4-2026 م»
- [Официальный источник](https://iu.edu.sa/%D9%82%D8%A8%D9%88%D9%84-%D8%B7%D9%84%D8%A7%D8%A8-%D8%A7%D9%84%D9%85%D9%86%D8%AD-%D8%A7%D9%84%D8%AF%D8%B1%D8%A7%D8%B3%D9%8A%D8%A9-%D8%A7%D9%84%D8%AF%D8%A7%D8%AE%D9%84%D9%8A%D8%A9-%D9%88%D8%A7%D9%84%D8%AE%D8%A7%D8%B1%D8%AC%D9%8A%D8%A9-%D9%84%D9%84%D8%B9%D8%A7%D9%85-%D8%A7%D9%84%D8%AC%D8%A7%D9%85%D8%B9%D9%8A-1448%D9%87%D9%80) — прямая загрузка успешна, цитата найдена дословно. «إلى 4-12-1447 هـ  الموافق 21-5-2026 م»

### scu

2027 guide: четыре batch, 01.11.2026–30.05.2027.

- batch 1: 2026-11-01 → 2026-12-15; пояс/время не указаны.
- batch 2: 2026-12-16 → 2027-02-28; пояс/время не указаны.
- batch 3: 2027-03-01 → 2027-04-23; пояс/время не указаны.
- batch 4: 2027-04-24 → 2027-05-30; пояс/время не указаны.

- [Официальный источник](https://global.scu.edu.cn/oso/article/details/7c5388ac-3600-4fc2-ae35-e802e6e09432) — прямая загрузка успешна, цитата найдена дословно. «Batch 1: November 01, 2026 to December 15, 2026»
- [Официальный источник](https://global.scu.edu.cn/oso/article/details/7c5388ac-3600-4fc2-ae35-e802e6e09432) — прямая загрузка успешна, цитата найдена дословно. «Batch 4: April 24, 2027 to May 30, 2027»

### obuda

Срок обновлён 18.11.2026: 03.05.2027 (в источнике опечатка «3st»).

- fall semester: открытие не указано → 2027-05-03; пояс/время не указаны.

- [Официальный источник](https://uni-obuda.hu/how-to-apply/) — WebFetch, дословность сверить вручную. «Application deadline: 3st May, 2027»
- [Официальный источник](https://uni-obuda.hu/how-to-apply/) — WebFetch, дословность сверить вручную. «Updated: 18.11.2026»

### renmin

Новое окно 05.11.2026–30.04.2027 17:00 (Beijing Time).

- GlobalBBA: 2026-11-05 → 2027-04-30; Beijing Time.

- [Официальный источник](http://globalbba.rmbs.ruc.edu.cn/Admissions/KeyTimelines/index.htm) — WebFetch, дословность сверить вручную. «November 5, 2026, 00:00 – April 30, 2027, 17:00 (Beijing Time).»

### bit

Опубликован набор 2027: бакалавриат до 01.06.2027, стипендии до 01.05.2027.

- general: открытие не указано → 2027-06-01; пояс/время не указаны.
- scholarships: открытие не указано → 2027-05-01; пояс/время не указаны.

- [Официальный источник](https://isc.bit.edu.cn/aboutbit/faq/70fe36ccf5f64defb9ecda409efd2b71.htm) — прямая загрузка успешна, цитата найдена дословно. «Application Deadline: June 1, 202 7»
- [Официальный источник](https://isc.bit.edu.cn/aboutbit/faq/70fe36ccf5f64defb9ecda409efd2b71.htm) — прямая загрузка успешна, цитата найдена дословно. «Application deadline: May 1, 202 7»

### ecnu

Сентябрь 2027; три срока: 30.04, 15.05 и 01.06.2027.

- self-funded: открытие не указано → 2027-06-01; пояс/время не указаны.
- Shanghai scholarship: открытие не указано → 2027-04-30; пояс/время не указаны.
- language teachers scholarship: открытие не указано → 2027-05-15; пояс/время не указаны.

- [Официальный источник](http://lxs.ecnu.edu.cn/en_admission_degree_programs_undergraduate_program/list.htm) — прямая загрузка успешна, цитата найдена дословно. «Early September 2027»
- [Официальный источник](http://lxs.ecnu.edu.cn/en_admission_degree_programs_undergraduate_program/list.htm) — прямая загрузка успешна, цитата найдена дословно. «April 30th, 2027»
- [Официальный источник](http://lxs.ecnu.edu.cn/en_admission_degree_programs_undergraduate_program/list.htm) — прямая загрузка успешна, цитата найдена дословно. «May 15th, 2027»
- [Официальный источник](http://lxs.ecnu.edu.cn/en_admission_degree_programs_undergraduate_program/list.htm) — прямая загрузка успешна, цитата найдена дословно. «June 1st, 2027»

### itu

Даты в данных — graduate (24.04–26.06.2026). Бакалаврские раунды 2026: 18.05–17.07 и 21–26.08; 2027/28 не объявлен.

- bachelor, second round: 2026-08-21 → 2026-08-26; UTC/GMT+3.

- [Официальный источник](https://www.sis.itu.edu.tr/EN/application-admission/application-admission.php) — текст через reader-прокси, дословность сверить вручную. «April 24, 2026 09:00 - June 26, 2026 17:00 (UTC/GMT+3)»
- [Официальный источник](https://www.sis.itu.edu.tr/EN/application-admission/application-admission.php) — текст через reader-прокси, дословность сверить вручную. «21 August 2026 09:00 - 26 August 2026 17:00 (UTC/GMT+3)»
- [Официальный источник](https://www.takvim.sis.itu.edu.tr/AkademikTakvim/EN/academic-calendar/AkademikTakvimTablo.php?akademikyil=854&baslangic=&bitis=&katagori=&takvimadi=17&taslak=856&ustbaslik=) — WebFetch, дословность сверить вручную. «18 May 09:00 - 17 July 2026 17:00»

### beihang

Набор сентябрь 2027; общий срок и сроки стипендий различаются.

- general: 2026-11-01 → 2027-05-30; пояс/время не указаны.
- university/Beijing scholarships: открытие не указано → 2027-04-30; пояс/время не указаны.

- [Официальный источник](https://is.buaa.edu.cn/en/lxsq/Undergraduate.htm) — прямая загрузка успешна, цитата найдена дословно. «Application Opening Date: November 1, 2026»
- [Официальный источник](https://is.buaa.edu.cn/en/lxsq/Undergraduate.htm) — прямая загрузка успешна, цитата найдена дословно. «Deadline for Online Application and Materials Submission: May 30, 2027»
- [Официальный источник](https://is.buaa.edu.cn/en/lxsq/Undergraduate.htm) — прямая загрузка успешна, цитата найдена дословно. «Application deadline: April 30, 2027»

### nankai

Набор 2027: 20.10.2026–04.06.2027; стипендия Tianjin/Study-at-NKU до 30.05.2027.

- general: 2026-10-20 → 2027-06-04; пояс/время не указаны.
- Tianjin/Study-at-NKU scholarship: открытие не указано → 2027-05-30; пояс/время не указаны.

- [Официальный источник](https://ensie.nankai.edu.cn/info/1089/1357.htm) — текст через reader-прокси, дословность сверить вручную. «Oct. 20 th, 202 6- Jun.4 th, 202 7»
- [Официальный источник](https://ensie.nankai.edu.cn/info/1089/1357.htm) — текст через reader-прокси, дословность сверить вручную. «Application Deadline: May 30, 202 7»

### wuhan-university

Весна 2027: октябрь–декабрь 2026 без точного дня; осень 2027 не объявлена.

- spring 2027: открытие не указано → точный срок не указан; пояс/время не указаны.

- [Официальный источник](https://admission.whu.edu.cn/info/1121/5802.htm) — прямая загрузка успешна, цитата найдена дословно. «The application period for spring semester 2027 runs from October 2026 to December 2026»

### xian-jiaotong-university

2027: раунд 1 01.11.2026–15.05.2027, раунд 2 16.05–30.06.2027 (Beijing Time).

- round 1: 2026-11-01 → 2027-05-15; Beijing Time.
- round 2: 2027-05-16 → 2027-06-30; Beijing Time.

- [Официальный источник](https://sie.xjtu.edu.cn/en/info/1119/3271.htm) — WebFetch, дословность сверить вручную. «Round 1: November 1, 2026 – May 15, 2027 (Beijing Time)»
- [Официальный источник](https://sie.xjtu.edu.cn/en/info/1119/3271.htm) — WebFetch, дословность сверить вручную. «Round 2: May 16, 2027 – June 30, 2027 (Beijing Time)»

### mate

Самофинансирование 2027/28: 01.02–30.04.2027 (23:59 CET).

- self-financing: 2027-02-01 → 2027-04-30; CET.

- [Официальный источник](https://en.uni-mate.hu/application-procedure-for-bsc-msc) — прямая загрузка успешна, цитата найдена дословно. «Application for academic year 2027/2028»
- [Официальный источник](https://en.uni-mate.hu/application-procedure-for-bsc-msc) — прямая загрузка успешна, цитата найдена дословно. «will open on 1 February 2027 until»
- [Официальный источник](https://en.uni-mate.hu/application-procedure-for-bsc-msc) — прямая загрузка успешна, цитата найдена дословно. «30 April 2027 (23.59 CET)»

### mephi

Годы в окнах не указаны: 20.06 / 10.07 / 25.07; 2027 не подтверждён. Open Doors — отдельный путь.

- Новых окон нет.

- [Официальный источник](https://eng.mephi.ru/academics/admissions) — прямая загрузка успешна, цитата найдена дословно. «June 20»
- [Официальный источник](https://eng.mephi.ru/academics/admissions) — прямая загрузка успешна, цитата найдена дословно. «July 10»
- [Официальный источник](https://eng.mephi.ru/academics/admissions) — прямая загрузка успешна, цитата найдена дословно. «End of document acceptance (without admission examinations)»

### mipt

Страница правил 2027 недоступна; старый адрес 2026 перенаправляет на общую страницу приёма без дат. Нового не подтверждаю.

- Новых окон нет.

- [Официальный источник](https://mipt.ru/pk) — текст через reader-прокси, дословность сверить вручную. «МФТИ — Московский физико-технический институт»

### fu-berlin

Опубликованы сроки лета 2027: 01.12.2026–15.01.2027 (с ограничением), 18.01–01.03.2027 (без ограничения). Зимний 2027/28 не объявлен; летний вход есть не у всех программ.

- summer 2027, restricted: 2026-12-01 → 2027-01-15; пояс/время не указаны.
- summer 2027, unrestricted: 2027-01-18 → 2027-03-01; пояс/время не указаны.

- [Официальный источник](https://www.fu-berlin.de/en/studium/beratung/kalender/2027sose/index.html) — WebFetch, дословность сверить вручную. «Applications for degree programs with limited admission: From December 1, 2026, through January 15, 2027»
- [Официальный источник](https://www.fu-berlin.de/en/studium/beratung/kalender/2027sose/index.html) — WebFetch, дословность сверить вручную. «Request for enrollment for degree programs with unrestricted admission: From January 18, 2027, through March 1, 2027»

### harbin-institute-of-technology

Набор 2027: self-financed 01.11.2026–31.05.2027, стипендия HIT до 20.04.2027.

- self-financed: 2026-11-01 → 2027-05-31; пояс/время не указаны.
- HIT International Students Scholarship: 2026-11-01 → 2027-04-20; пояс/время не указаны.

- [Официальный источник](https://studyathit.hit.edu.cn/18337/list.htm) — прямая загрузка успешна, цитата найдена дословно. «Self-financed: November 1 st , 2026 - May 31 st , 2027»
- [Официальный источник](https://studyathit.hit.edu.cn/18337/list.htm) — прямая загрузка успешна, цитата найдена дословно. «HIT International Students Scholarship: November 1 st , 202 6 - April 20 th , 202 7»

### warsaw-university-of-technology

October 2027 объявлен, но сроки помечены to be updated; точные даты не ставить.

- Новых окон нет.

- [Официальный источник](https://www.students.pw.edu.pl/How-to-Apply/Admission-to-B.Sc) — прямая загрузка успешна, цитата найдена дословно. «middle of July 2027 (to be updated)»

### uni-due

Года в окнах нет: зима 01.05–15.06 (NC) / 31.07 (unrestricted), лето 01.11–15.12 / 31.01. 2027 отдельно не объявлен.

- Новых окон нет.

- [Официальный источник](https://www.uni-due.de/international/international-admissions-en.php) — прямая загрузка успешна, цитата найдена дословно. «01 May – 31 July»

### ibn-haldun

Опубликован календарь 2027/28: приём иностранцев на бакалавриат 07.04–01.09.2027.

- international undergraduate: 2027-04-07 → 2027-09-01; пояс/время не указаны.

- [Официальный источник](https://oidb.ihu.edu.tr/en/2027-2028-academic-calendar) — прямая загрузка успешна, цитата найдена дословно. «Application Period for Undergraduate Programs for International Students»
- [Официальный источник](https://oidb.ihu.edu.tr/en/2027-2028-academic-calendar) — прямая загрузка успешна, цитата найдена дословно. «April 7 - September 1, 2027»

### king-abdulaziz

Окно 16.09–06.10.2026 закрыто; нового объявления нет.

- Новых окон нет.

- [Официальный источник](https://www.kau.edu.sa/en/announcement/the-date-for-opening-admission-applications-for-non-saudi-students-residing-both-inside-and-outside-the-kingdom-for-undergraduate-and-postgraduate-programs) — прямая загрузка успешна, цитата найдена дословно. «Application period: September 16–October 6, 2026»

### study-in-saudi

Под заголовком Second Semester Academic Calendar 2026 остались 16.09–06.10; 2027 не объявлен.

- Новых окон нет.

- [Официальный источник](https://studyinsaudi.sa/en) — WebFetch, дословность сверить вручную. «Second Semester Academic Calendar 2026»
- [Официальный источник](https://studyinsaudi.sa/en) — WebFetch, дословность сверить вручную. «September 16»
- [Официальный источник](https://studyinsaudi.sa/en) — WebFetch, дословность сверить вручную. «October 06»

### utoronto-pearson

Номинация 09.10.2026, OUAC 16.10.2026, стипендиальная форма 06.11.2026; 2028 не объявлен.

- Новых окон нет.

- [Официальный источник](https://future.utoronto.ca/pearson-scholarships) — прямая загрузка успешна, цитата найдена дословно. «October 9, 2026»
- [Официальный источник](https://future.utoronto.ca/pearson-scholarships) — прямая загрузка успешна, цитата найдена дословно. «October 16, 2026»
- [Официальный источник](https://future.utoronto.ca/pearson-scholarships) — прямая загрузка успешна, цитата найдена дословно. «November 6, 2026»

### cambridge

Это уже 2027 entry: UCAS закрыт 15.10.2026; 2028 не объявлен.

- Новых окон нет.

- [Официальный источник](https://www.undergraduate.study.cam.ac.uk/apply/application-dates-deadlines) — WebFetch, дословность сверить вручную. «15 October 2026»
- [Официальный источник](https://www.undergraduate.study.cam.ac.uk/apply/application-dates-deadlines) — WebFetch, дословность сверить вручную. «Deadline to submit your UCAS application (6pm UK time).»

### oxford-reach

UCAS 2027 закрыт 15.10.2026; 2028 не объявлен. Reach 26.01.2027 — после предложения места, не новый вход.

- Новых окон нет.

- [Официальный источник](https://www.ox.ac.uk/admissions/undergraduate/applying/admissions-timeline) — WebFetch, дословность сверить вручную. «Final deadline 6pm (UK time) on 15 October»

### od

Open Doors 2026/27: 20.08–01.11.2026; новый цикл 2027/28 не объявлен.

- Новых окон нет.

- [Официальный источник](https://od.globaluni.ru/rules) — WebFetch, дословность сверить вручную. «Registration for the Bachelor’s, Master’s, Doctoral, and Postdoctoral tracks is open from August 20 to November 1, 2026.»

### urfu

Open Doors 2026/27 закрыт 01.11.2026; нового не объявлено.

- Новых окон нет.

- [Официальный источник](https://urfu.ru/en/open-doors-russian-scholarship-project/) — прямая загрузка успешна, цитата найдена дословно. «Registration period: August 20 - November 1, 2026.»

### ritsumeikan

Для GLA/GS/CRPS: 02.12.2026–12.01.2027 и 17.02–09.03.2027. JD и ISSE сентябрьского набора не имеют.

- GLA/GS/CRPS round 2: 2026-12-02 → 2027-01-12; JST.
- GLA/GS/CRPS round 3: 2027-02-17 → 2027-03-09; JST.

- [Официальный источник](https://en.ritsumei.ac.jp/e-ug/apply/howto.html) — WebFetch, дословность сверить вручную. «2026/12/2 Wed - 2027/1/12 Tue»
- [Официальный источник](https://en.ritsumei.ac.jp/e-ug/apply/howto.html) — WebFetch, дословность сверить вручную. «2027/2/17 Wed - 2027/3/9 Tue»

### hokkaido-mjsp

Тот же набор 2028: второй приём 02–09.02.2027; рекомендация до 24.02.2027.

- second call: 2027-02-02 → 2027-02-09; JST.

- [Официальный источник](https://www.oia.hokudai.ac.jp/mjsp/wp-content/uploads/2026/07/MJSP-Application-Guidelines-2028-Enrollment.pdf) — прямая загрузка успешна, цитата найдена дословно. «February 2, 2027 (Tue.) at 10:00 a.m. – February 9, 2027 (Tue.) at 5:00 p.m.»

### tsukuba-ide

Подача AY2027 была 01.10–04.11.2026; нового окна нет. Сегодня страница дат не показывает (сокращённая выдача).

- Новых окон нет.

- [Официальный источник](https://www.ide.tsukuba.ac.jp/application-information) — текст через reader-прокси, дословность сверить вручную. «University of Tsukuba - Application Information»

### ozyegin-university

Срок 15.11.2026 закрыт; нового набора 2027 не объявлено.

- Новых окон нет.

- [Официальный источник](https://admissions.ozyegin.edu.tr/en/admission-process-draft/) — WebFetch, дословность сверить вручную. «Fall 2026-2027 Application Deadline: November 15, 2026»

### ubc-scholars

Срок продлён до 02.12.2026 12:00 PT; в данных устаревшая дата 15.11.2026.

- International Scholars: открытие не указано → 2026-12-02; PT.

- [Официальный источник](https://you.ubc.ca/financial-planning/scholarships-awards-international-students/international-scholars/) — WebFetch, дословность сверить вручную. «We have extended the deadline to apply, and you now have until December 2nd, 2026, at 12:00PM PCT (Pacific Time)»
- [Официальный источник](https://you.ubc.ca/financial-planning/scholarships-awards-international-students/international-scholars/) — WebFetch, дословность сверить вручную. «a few days before November 15 December 2 (deadline extended)»

### polyu-hongkong

Для сентября 2027 срок 11.02.2027; прежняя дата 17.11.2026 на странице не подтверждается.

- Sept 2027 entry: открытие не указано → 2027-02-11; пояс/время не указаны.

- [Официальный источник](https://www.polyu.edu.hk/study/ug/admissions/international-other-qualifications) — WebFetch, дословность сверить вручную. «Application Deadline: 11 Feb 2027»
- [Официальный источник](https://www.polyu.edu.hk/study/ug/admissions/international-other-qualifications) — WebFetch, дословность сверить вручную. «Sept 2027 Entry»

### nagoya-g30

В наборе 2027 есть второй тур 05.01–21.01.2027; первый закрылся 19.11.2026.

- second round: 2027-01-05 → 2027-01-21; JST.

- [Официальный источник](https://admissions.g30.nagoya-u.ac.jp/upload/2027_admission_requirements_en.pdf) — прямая загрузка успешна, цитата найдена дословно. «January 5, 2027, 9:00»
- [Официальный источник](https://admissions.g30.nagoya-u.ac.jp/upload/2027_admission_requirements_en.pdf) — прямая загрузка успешна, цитата найдена дословно. «January 21, 2027, 12:00 noon»
- [Официальный источник](https://admissions.g30.nagoya-u.ac.jp/admissions/undergraduate/) — прямая загрузка успешна, цитата найдена дословно. «November 19, 2026 at 12:00 noon»

### hokkaido-isp

Подача AY2027 была 12–20.11.2026; новый набор 2028 не объявлен.

- Новых окон нет.

- [Официальный источник](https://www.oia.hokudai.ac.jp/isp/prospective-students/how-to-apply/) — прямая загрузка успешна, цитата найдена дословно. «Application Guidelines (2027 Enrollment)»
- [Официальный источник](https://www.oia.hokudai.ac.jp/isp/wp-content/uploads/2026/09/ISP-Application-Guidelines-for-2027-Enrollment.pdf) — прямая загрузка успешна, цитата найдена дословно. «November 12, 2026 (Thu.) at 10:00 a.m. – November 20, 2026 (Fri.) at 5:00 p.m.»

### csc-china

На странице посольства КНР в Таджикистане последнее профильное — уведомление о 2026 (21.11.2025); объявления 2027 нет. Даты 22.11–19.12.2026 — перенос прошлогодних, не подтверждены.

- Новых окон нет.

- [Официальный источник](https://tj.china-embassy.gov.cn/sgzc/) — прямая загрузка успешна, цитата найдена дословно. «2026年中国政府奖学金考试招生工作通知（2025-11-21）»

## CSC: отдельная проверка

Раздел «使馆之窗» посольства КНР в Таджикистане проверен 25.11.2026. Верхняя запись раздела — 23.09.2026 («2026年度中国大使奖学金»), профильное объявление о стипендии — «2026年中国政府奖学金考试招生工作通知» от 21.11.2025. Записи о наборе 2027 на странице нет.

Текущие 22.11–19.12.2026 в данных — перенос прошлогодних дат; подтверждения на 2027 нет. Предложение: убрать перенесённые даты или оставить `null` до объявления.

Выдержка: `raw/deadline-review/2026-11-25/csc-china.txt`.

## Что осталось непроверенным

- `mipt` — правила 2027 недоступны, старый адрес 2026 перенаправляет на общую страницу приёма без дат. Нового объявления не подтверждаю.
- `zhejiang-university` — страница отдаёт форму входа (用户名/密码/验证码); объявление не проверено.
- `tsukuba-ide` — страница сегодня не показывает дат; по данным 05.11 окно AY2027 закрыто 04.11.2026, нового нет.
- `nankai`, `spbu`, `itu` — текст получен через reader-прокси; цитаты требуют ручной сверки.
- Домены не подключал: все ссылки — на уже одобренные сайты вузов и посольства.

## Проверка

- `python /c/Users/ORYX/dev/ds5-scratch/gen.py --check` — 0 несовпадений: каждая цитата из JSON найдена в тексте страницы или в выдержке reader-прокси.
- JSON читается: 41 запись (40 истёкших + `csc-china`), 323 программы в каталоге не изменены.
- `node --test` — 790 тестов, 0 ошибок.
- `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .` — 532 теста, OK.
- `python -m tools.build` — код 0, 323 программы, индекс 97 326 байт по проводу (предел 98 304). Вывод сборки откатан, в коммит не вошёл.

Ветка: `deepseek/deadlines`. Последний коммит: см. `git log -1`.
