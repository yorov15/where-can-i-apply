# DS-10: цитаты по снимкам 25—28.11.2026

Ветка `deepseek/quote-fixes`, от `origin/main` (`63fb2e9a`). Рабочий список — вывод `tools.validate`
от 28.11: 11 программ, 40 записей.

## Числа

| Что | Сколько |
|---|---|
| Заменено по смыслу, слова другие (1) | 20 |
| Факт изменился (2) | 12 |
| Условий удалено (3) | 8 |
| Осталось (4) | 0 |

`PYTHONUTF8=1 python -m tools.validate` → `проверено 323, с ошибками 0`.

## Факты изменились (12)

Цитаты в таблице сокращены многоточием для читаемости; в файлах они дословные и целиком.

| id | где | было | стало | цитата | ссылка |
|---|---|---|---|---|---|
| fudan-university | условие 4 | стипендия декана — студентам «UIPE program … based on the academic performance» | «UIPE **and UIPI** programs … based **mainly** on the academic performance»; ru про UIPE и UIPI | `Fudan School of Economics Dean's Scholarship It is awarded to the top international students of the UIPE and UIPI programs at the end of each academic year based mainly on the academic performance.` | https://econ.fudan.edu.cn/uipe/info/1122/1432.htm |
| hkbu-hongkong | условие 6 | BA Music: «required to submit their music qualifications and/or examination results» | названы классы: Practical Grade 8+, Theory Grade 5+; ru переписан | `Applicants must attain ABRSM (or equivalent) Practical grade / performance grade - Grade 8 or above, and ABRSM (or equivalent) Theory - Grade 5 or above.` | https://admissions.hkbu.edu.hk/admissions/international-qualifications.html |
| ntu-singapore | условие 8 | SAT «Reading and Writing - 60» | «Reading and Writing - 600»; ru: чтение и письмо от 600 | `Pearson Test of English (PTE) Academic Overall score - 55 … SAT Total score - 1250 Reading and Writing - 600 … English Score - 220` | https://www.ntu.edu.sg/admissions/undergraduate/admission-guide/international-qualifications |
| polimi | eligibility.gpa | требования «могут касаться» лет школы, **итогового балла аттестата**, suitability test | пункт про балл аттестата со страницы убран: остались годы школы и suitability test | `These requirements may relate to: the total number of years of schooling the successful passing an academic suitability test` | https://www.polimi.it/en/prospective-students/how-to-apply/admission-to-laurea-programmes/students-with-a-foreign-degree |
| polimi | eligibility.language | итальянский **B2**, сертификат **CLIQ** | «adequate proficiency» языка программы; сертификат из списка либо гражданство страны языка / школа на языке программы. B2 и CLIQ на семи страницах снимка не встречаются | `To enrol in a programme taught in Italian , you must demonstrate adequate Italian-language proficiency; to enrol in a programme taught in English , you must demonstrate adequate English-language proficiency.` | там же |
| polimi | условие 2 | три возможных требования, включая балл аттестата | два: годы школы и suitability test; ru переписан | `These requirements may relate to: the total number of years of schooling the successful passing an academic suitability test` | там же |
| polimi | условие 3 | на итальянском — B2 и сертификат CLIQ, альтернатива — аттестат на итальянском | сертификат языка программы; альтернатива — гражданство страны языка или школа на языке программы, язык должен быть указан в документах; уровни не названы | `To enrol in a programme taught in Italian … Alternatively, the requirement is considered met if: … you obtained a secondary school qualification after completing a course of study taught in the language of the programme` (848 знаков, целиком в файле) | там же |
| polimi | условие 4 | «какой балл нужен, страница прячет в раскрывающийся блок» | баллы эти страницы не называют, список сертификатов — на отдельной странице; ru переписан без раскрывающегося блока | `to enrol in a programme taught in English , you must demonstrate adequate English-language proficiency.` | там же |
| polimi | условие 18 | «итальянский B2 от CLIQ или признанный сертификат английского» | признанный сертификат языка программы, загрузка в Online Services при регистрации на тест или при зачислении | `You can demonstrate that you meet this requirement by uploading one of the accepted language certificates to Politecnico di Milano's Online Services, either during the test registration process or when you enrol.` | там же |
| tianjin-university | условие 14 | паспорт действителен «after September 1st, 2026» | «after September 1st, 202 7» (так на странице); ru: 2027 | `Photocopy of passport within the validity period after September 1st, 202 7 .` | https://sie.tju.edu.cn/en/xwxm/UNDERGRADUATE/202609/t20260930_324729.html |
| tianjin-university | условие 22 | 18 лет «as of September 1st, 202 6» | «September 1st, 202 7»; ru: 2027 | `A pplicants who are still under the age of 18 as of September 1st, 202 7 must submit the original guardian certificate .` | там же |
| utwente | language.anyOf, TOEFL_IBT_2026 | общий балл «4,5» | «4.5» и «For speaking a minimum score of 4 is required»; добавлен `parts: true`, `min` 4.5 не изменился | `TOEFL iBT (internet-based) certificate (after January 2026) not older than two years, with an overall score of 4.5, and a minimum score of 4.5 on reading, listening and writing. For speaking a minimum score of 4 is required.` | https://www.utwente.nl/en/education/bachelor/how-to-apply/language-requirements/ |

Заменено по смыслу без правки ru (20): cornell 7; hkbu 8; ntu language, 7, 13, 17; polimi citizenship,
schoolYears, 1, 5, 6, 7, 8, 14, 15, 16; vanderbilt 6; vassar 6, 13, 16.
Одна оговорка: у vassar 13 платформа теперь называется «Apply Coalition with Scoir application» — в ru
осталось прежнее «Coalition Application», смысл и путь подачи те же.

## Удалённые условия (8)

| id | условие | его ru | почему |
|---|---|---|---|
| auca | 3 | ближайший вступительный экзамен 7 ноября 2026, регистрация до 3 ноября 2026, 17:00 | на всех 8 страницах снимка нет ни «November», ни дат экзамена |
| fudan-university | 1 | список программ англоязычного бакалавриата (IOGG, MBBS, UIPE, GBF, UIPDB) | строки «2026 List of English-taught Undergraduate Programs» нет; PDF 2027 отсылает к отдельному списку, которого в снимке нет |
| hkbu-hongkong | 7 | BA Music: портфолио, возможны тест, интервью, прослушивание | у BA Music этого текста нет; в FAQ только общая фраза про интервью у части программ |
| hkbu-hongkong | 9 | BM Creative Industries: портфолио через онлайн-систему | текста нет ни на одной странице снимка |
| nazarbayev | 2 | сроки категории NUET «объявит позже» | сроки объявлены (см. ниже); новые даты не вносил |
| nazarbayev | 3 | сроки SAT/ACT и иностранной категории «объявят позже» | то же |
| polimi | 9 | даты тестов лежат за раскрывающимися блоками | текста «When to register for the tests» на страницах нет |
| polimi | 17 | удостоверение личности в Online Services, по нему проверяют гражданство | на страницах снимка такого текста нет |

Поле `eligibility` не удалял и не чистил.

## Что осталось и почему

Ошибок validate нет. Ниже — то, что Claude стоит знать при вливании.

- **auca и nazarbayev: хеши и дата проверки в `source` не обновлены, `reverify --write` не запускал.**
  `--write` тянет за собой файлы вне моих: `data/prep/docs/application.json` и `photo.json`,
  `data/prep/auca.json` (эссе) ссылаются на хеши страниц auca, `data/prep/nazarbayev.json`
  (`perPart` IELTS) — на хеш страницы финпомощи. После `--write` падают три python-теста.
  У auca вдобавок удалено условие 3 — решать Claude.
- **`data/interview.json` устарел** после удаления условия 7 HKBU: это вывод сборки, коммитить его мне
  запрещено. С откатанным файлом `node --test` даёт 1 падение («каждая цитата собеседования дословно
  лежит в условиях своей программы»), со свежим `tools.build` — 974/0.
- **fudan:** в снимке есть PDF «2027 Undergraduate Admission Information for English-taught Programs»,
  но списка программ 2027 в нём нет — только отсылка. Если список нужен, его адрес придётся добавить
  в `sources.toml` и снять отдельно.
- **hkbu:** портфолио и прослушивание для BA Music могли переехать на страницы самих программ; их в
  `sources.toml` нет.
- **polimi:** страница документов переехала на
  `/students-with-non-italian-qualification/documents`; адрес добавлен в `sources.toml`, снимок
  `raw/polimi/2026-11-28/` (7 страниц). Требования к языку на новых страницах описаны без B2 и CLIQ.
- **vassar:** в ru условия 13 платформа названа по-старому (см. выше).

## Домены, ждущие «да»

Нет. Новый адрес — на уже одобренном `polimi.it`.

## Новые даты, которые видел и не вносил

- **nazarbayev,** финпомощь 2027/28: категория NUET — до 11 декабря 2026 (IELTS/TOEFL — до 8 декабря
  2026); остальные категории — до 2 февраля 2027. Общий приём 2027/28: октябрь 2026 — август 2027 для
  стран с визой по прибытии, для визовых стран «To be announced later». Результаты IELTS/TOEFL — до
  1 июня 2027 (всё с `financial-aid-end-scholarships` и `regular-admissions`).
- **fudan,** PDF: Round 1 — 1 декабря 2026 — 26 февраля 2027, Round 2 — 1—15 апреля 2027; результаты
  Round 1 — конец апреля 2027, Round 2 — конец июня 2027; стипендии — с июля 2027.
- **polimi,** страница документов: 2027/28 — итоговый аттестат до 9 сентября 2027, документы о
  признании и подлинности до 31 октября 2027 (для 2026/27 — 10 сентября 2026 и 31 октября 2026).
- **hkbu:** в FAQ — предложения по раннему кругу с конца декабря 2026.
- **ntu:** строка «Open 15 Oct 2026 - 20 Jan 2027» — уже стоит в условии 11.

## Команды и результат

| Команда | Результат |
|---|---|
| `PYTHONUTF8=1 python -m tools.validate` (до) | 11 программ, 40 записей |
| `PYTHONUTF8=1 python -m tools.validate` (после) | проверено 323, с ошибками 0 |
| `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .` | 547 тестов, OK |
| `node --test` | 974 pass / 0 fail (со свежим выводом сборки; без него — 1 падение, см. выше) |
| `PYTHONUTF8=1 python -m tools.build` | прошла; вывод откатан |
| `python -m tools.fetch polimi` | 7 страниц, `raw/polimi/2026-11-28/` |
| `python -m tools.reverify <id> --write` | 9 программ (все, кроме auca и nazarbayev) |

Коммиты ветки `deepseek/quote-fixes`: `a436c6d2` (auca, cornell, fudan), `2f27fed4` (hkbu, nazarbayev,
ntu), `6e7449a9` (polimi, tianjin, utwente), `4c283423` (vanderbilt, vassar), последний — с этим отчётом.
