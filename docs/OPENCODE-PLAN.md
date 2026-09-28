# План для OpenCode: вузы по одному (с 28.09.2026)

Кто читает: агент в OpenCode, который продолжает работу вместо Claude.
Сначала прочитай `README.md` и `docs/HANDOFF.md` (только разделы, которые нужны задаче, не весь файл подряд).

## Где мы

- Ветка `asia-europe-universities`, последний коммит `c6d5c39` (Hanyang), запушен.
- Конвейер одной программы: `tools/sources.toml` (домен и страницы) → `python -m tools.fetch <id>` (снимок в `raw/`)
  → черновик `proposed/<id>.json` по снимку → `python -m tools.look <id> <слово>` для цитат
  → `python -m tools.review <id> --by-assistant` → `python -m tools.build`.
- Образец свежей записи: `data/programs/hanyang.json` и `data/conditions/hanyang.json`.

## Жёсткие правила (нарушил — запись удаляется)

1. **Ничего по памяти модели.** Каждое поле — дословная цитата из снимка в `raw/`. Нет в тексте — `null` / `notMeasured`, не догадка.
2. **Домен вуза одобряет только Мурод.** Не одобренный домен в `sources.toml` не пишешь. Сначала список — потом его «да».
3. Нет даты на странице — у срока `closes: null`. Дату соседнего пути (лотерея, ЕС-граждане, обмен) в срок не ставить.
4. Перед правилом смотри заголовок таблицы над цитатой: какой путь, бакалавриат ли, какой цикл. Порог платного пути ≠ порог пути с помощью.
5. Школа в Таджикистане 11 лет: если вуз требует 12 — это условие «спроси приёмную комиссию», не отказ.
6. Тип `kind` у новой программы вписать руками, иначе `build` остановится.
7. `git add` только явные пути. Никогда `git add -A`. **Не коммитить** `.agent-bridge/`, `.mcp.json`, `opencode.jsonc`, `package.json`, `package-lock.json`, `.gitignore` — это не часть задачи.
8. Тесты зелёные перед коммитом: `node --test` и `PYTHONUTF8=1 python -m unittest discover -s tools/tests -t .`
9. Пуш: `git fetch && git rebase origin/main`, потом пуш. Force push запрещён. Пуш рвётся — порциями по ~5 коммитов с повтором.
10. Один вуз = один коммит. Сообщение по-русски, как в `git log`.

## Экономия токенов (главное, из-за этого и переезд)

- **Один вуз — одна сессия.** Закончил вуз, закоммитил — `/new`. Не тащи историю прошлого вуза.
- Снимки `raw/` целиком не читать: только `tools.look <id> <слово>` или `grep`.
- `data/details.json`, `data/index.json`, `node_modules/` не открывать — их пишет `build`.
- Страница не читается (скан PDF, JavaScript-каркас, 403) — **не бороться дольше 10 минут**: записать вуз в «Не добавлены» ниже с причиной и идти дальше.

## Очередь

**Решение Мурода 28.09.2026: не «топ-1000 по рейтингу», а партия из 50 вузов по пользе.**
Топ-1000 отвергнут: ~900 сессий, 900 одобрений доменов, ежегодная перепроверка, и большинство
вузов топ-1000 таджикскому школьнику недоступны (платно, без помощи иностранцам).

Вуз входит в партию, если ОБА условия:
- берёт иностранцев на бакалавриат, есть англоязычная страница приёма;
- даёт помощь/скидку иностранцам, ИЛИ учёба бесплатная/дешёвая.
Регионы по приоритету: Центральная Азия, Турция, Россия, Малайзия, Китай, Корея, Япония, Германия/Чехия/Венгрия/Польша, затем остальное.

**Шаг 0 (один раз, параллельно):** запусти 4–5 подагентов (`task`, тип `general`) — каждый на свою
группу стран, каждому одно и то же задание: найти кандидатов по критериям и вернуть строки
`id — вуз — страна — домен (Wikidata P856) — страница приёма иностранцев — чем полезен (деньги/цена)`.
Подагенты только ищут, файлов не трогают. Сам сведи в один список из 50, убери то, что уже есть
(`ls data/programs`), и покажи Муроду таблицей. Жди «да» (можно частичное: список id).

**Шаги 1…50:** по одному вузу из одобренного списка, по конвейеру выше, одна сессия на вуз.
Параллелить сборку вузов НЕЛЬЗЯ: `build` и `data/changelog.json` общие, коммиты подерутся.
Параллелить можно только поиск и чтение.
После 50 — остановиться и отчитаться Муроду: сколько вышло, сколько не удалось, сколько времени на вуз.

### Одобренный список (50) — Мурод сказал «да» 28.09.2026

Порядок = приоритет регионов. `id — вуз — страна — домен — страница приёма — полезность`.
1. kimep — KIMEP University — Казахстан — kimep.kz — https://www.kimep.kz/prospective-students/en/admission — стипендии/финпомощь иностранцам
2. sdu — Suleyman Demirel University — Казахстан — sdu.edu.kz — https://sdu.edu.kz/en/international-admissions — гранты/скидки 15–100%, от ~$2000/сем
3. kbtu — Kazakh-British Technical University — Казахстан — kbtu.edu.kz — https://kbtu.edu.kz/en/internationalization/international-admissions-internationalization — гранты/скидки для СНГ, стипендия ~52 тыс. тг/мес
4. narxoz — Narxoz University — Казахстан — narxoz.kz — https://en.narxoz.kz/global/en/international/students/apply — гранты 100% по олимпиаде
5. manas — Kyrgyz-Turkish Manas University — Кыргызстан — manas.edu.kg — https://manas.edu.kg/en/students/admission — бесплатно + merit-стипендии и общежитие
6. alatoo — Ala-Too International University — Кыргызстан — alatoo.edu.kg — https://alatoo.edu.kg/en/scholarship — скидки 50/75/100%
7. inha-tashkent — INHA University in Tashkent — Узбекистан — inha.uz — https://inha.uz/prospective-students/admissions — стипендии до 100% по IELTS
8. tiu — Tashkent International University — Узбекистан — tiu.uz — https://tiu.uz/en/admissions/apply-international — merit до 50%, Excellence Scholarship
9. kiut — Kimyo International University — Узбекистан — kiut.uz — https://kiut.uz/en/admissions/international-admission — скидка до 50% на 1-й год
10. newuu — New Uzbekistan University — Узбекистан — newuu.uz — https://newuu.uz/en/menu/entry-requirements — 4-летние стипендии 100%
11. cau — Central Asian University — Узбекистан — centralasian.uz — https://centralasian.uz/internationalstudents — merit до 100%, скидки для ЦА
12. khazar — Khazar University — Азербайджан — khazar.org — https://international.khazar.org/en/page/how-to-apply — merit 25–75% + грант Гейдара Алиева
13. bhos — Baku Higher Oil School — Азербайджан — bhos.edu.az — https://bhos.edu.az/en/page/216/Application — грант: бесплатно + жильё
14. wcu — Western Caspian University — Азербайджан — wcu.edu.az — https://wcu.edu.az/en/page/xarici-telebeler-uchun-qebul-qaydalari — полные 100% и частичные 30–50%
15. koc-university — Koç University — Турция — ku.edu.tr — https://international.ku.edu.tr/undergraduate-programs/how-to-apply/ — merit 25–100% автоматически
16. sabanci-university — Sabancı University — Турция — sabanciuniv.edu — https://iro.sabanciuniv.edu/en/how-to-apply — авто-оценка на скидку/полное покрытие
17. ozyegin-university — Özyeğin University — Турция — ozyegin.edu.tr — https://admissions.ozyegin.edu.tr/en/tuition-fees-and-scholarship/ — скидки до 60%
18. istanbul-bilgi — Istanbul Bilgi University — Турция — bilgi.edu.tr — https://www.bilgi.edu.tr/en/international/international-admissions/admission-requirements/ — merit/need-стипендии
19. hse — HSE University — Россия — hse.ru — https://admissions.hse.ru/en/undergraduate-apply — полные стипендии, квота РФ
20. rudn — RUDN University — Россия — rudn.ru — https://international.rudn.ru/undergraduate — квота РФ (бесплатно+стипендия), дёшево
21. usm — Universiti Sains Malaysia — Малайзия — usm.my — https://admission.usm.my/undergraduate/undergraduate-international/how-to-apply-international — дёшево: от $1562/сем
22. upm — Universiti Putra Malaysia — Малайзия — upm.edu.my — https://akademik.upm.edu.my/international_student_admission-3955 — дёшево + стипендии
23. utm — Universiti Teknologi Malaysia — Малайзия — utm.my — https://admission.utm.my/undergraduate-international/ — $13–18 тыс. за 4 года
24. sjtu — Shanghai Jiao Tong University — Китай — sjtu.edu.cn — https://global.sjtu.edu.cn/en/study-sjtu/prospective/degree-programs/278 — стипендии 25/50/100% + 2500 ¥/мес
25. zhejiang-university — Zhejiang University — Китай — zju.edu.cn — https://iczu.zju.edu.cn/admissionsen/2024/1030/c68988a2981659/page.htm — стипендии 5–30 тыс. ¥
26. fudan-university — Fudan University — Китай — fudan.edu.cn — https://iso.fudan.edu.cn/isoenglish/16199/list.htm — англ. бакалавриат, стипендия по успеваемости
27. wuhan-university — Wuhan University — Китай — whu.edu.cn — https://admission.whu.edu.cn/info/1121/5802.htm — Freshman 4000 ¥ + госстипендии
28. harbin-institute-of-technology — Harbin Institute of Technology — Китай — hit.edu.cn — https://studyathit.hit.edu.cn/18338/list.htm — HIT Scholarship 20–100%
29. tianjin-university — Tianjin University — Китай — tju.edu.cn — https://sie.tju.edu.cn/en/xwxm/UNDERGRADUATE/202510/t20251013_324445.html — покрытие обучения 6–20 тыс. ¥ + 1400–2500 ¥/мес
30. xian-jiaotong-university — Xi'an Jiaotong University — Китай — xjtu.edu.cn — http://sie.xjtu.edu.cn/en/info/1119/2943.htm — Freshman 10/25/50/75/100% + Belt&Road
31. seoultech — SeoulTech — Южная Корея — seoultech.ac.kr — https://global.seoultech.ac.kr/apply/undergraduate — скидка 30–100%, общежитие
32. cau-korea — Chung-Ang University — Южная Корея — cau.ac.kr — https://oia.cau.ac.kr/ — скидка 30–100% по TOPIK
33. kookmin — Kookmin University — Южная Корея — kookmin.ac.kr — https://english.kookmin.ac.kr/admissions/undergraduate — KIBS на англ., скидка 20–100%
34. sogang — Sogang University — Южная Корея — sogang.ac.kr — https://oisa-admission.sogang.ac.kr/new/html/guide/guide.asp — Global Scholarship 1/6–100%
35. jbnu — Jeonbuk National University — Южная Корея — jbnu.ac.kr — https://www.jbnu.ac.kr/en/admission/undergradute/scholarships.do — госвуз, освобождение 15–100%
36. knu — Kyungpook National University — Южная Корея — knu.ac.kr — https://en.knu.ac.kr/admission/foreign01.htm — стипендия 16–100%, общежитие
37. inu — Incheon National University — Южная Корея — inu.ac.kr — https://www.inu.ac.kr/inuengl/8528/subview — скидка 30–70%, до 100% за GPA
38. handong — Handong Global University — Южная Корея — handong.edu — https://www.handong.edu/eng/admission/undergraduate/scholarship/ — 50% за англ., полное содержание
39. utokyo-peak — University of Tokyo (PEAK) — Япония — u-tokyo.ac.jp — https://www.peak.c.u-tokyo.ac.jp/ — стипендия: взнос+обучение+126 тыс. ¥/мес
40. science-tokyo — Institute of Science Tokyo (GSEP) — Япония — isct.ac.jp — https://admissions.isct.ac.jp/en/013/undergraduate/programs/gsep — MEXT или полное/половинное обучение
41. kyushu — Kyushu University — Япония — kyushu-u.ac.jp — https://www.kyushu-u.ac.jp/en/admission/faculty/foreign/foreign10/ — половина обучения + 60 тыс. ¥/мес
42. tmu-japan — Tokyo Metropolitan University — Япония — tmu.ac.jp — https://www.tmu.ac.jp/english/study_at_tmu.html — Global Futures: 100 тыс. ¥/мес + половина
43. aiu-japan — Akita International University — Япония — aiu.ac.jp — https://admission.aiu.ac.jp/en/ — всё на англ., стипендии + JASSO
44. ritsumeikan — Ritsumeikan University — Япония — ritsumei.ac.jp — https://en.ritsumei.ac.jp/e-ug/ — скидка 20/50/100%, JASSO
45. tiu-japan — Tokyo International University — Япония — tiu.ac.jp — https://www.tiu.ac.jp/etrack/admissions/ — скидка 30–100% на 4 года
46. nucb — NUCB Undergraduate School — Япония — nucba.ac.jp — https://www.nucba.ac.jp/en/admission.html — скидка до 900 тыс. ¥/год
47. tu-berlin — Technische Universität Berlin — Германия — tu.berlin — https://www.tu.berlin/en/studierendensekretariat/bachelors-application-enrollment/prospective-students-with-an-international-higher-education-entrance-qualification — обучения нет, только сбор ~€320
48. rwth-aachen — RWTH Aachen University — Германия — rwth-aachen.de — https://www.rwth-aachen.de/go/id/dswt/lidx/1 — с не-ЕС доплат нет, только сбор
49. charles-university — Charles University — Чехия — cuni.cz — https://www.mff.cuni.cz/en/admissions/admission-requirements-for-bachelor-s-programmes-in-english — англ. бакалавриат; на чешском бесплатно
50. masaryk-university — Masaryk University — Чехия — muni.cz — https://www.muni.cz/en/admissions/bachelors-and-masters-studies — на чешском бесплатно, на англ. ~76 тыс. CZK/год

Резерв на замену (не входят в 50): fu-berlin, uni-due, palacky-university, university-of-debrecen, bme-budapest, university-of-szeged, university-of-warsaw, jagiellonian-university, warsaw-university-of-technology, comenius-university, slovak-university-of-technology, university-of-economics-bratislava, cuhk-hongkong, cityu-hongkong, polyu-hongkong, hkbu-hongkong, nus-singapore, bologna-italy, sapienza-italy, polito-italy, lund-sweden, aalto-finland, tartu-estonia, uaeu-uae, aus-uae, ubbcluj-romania, ljubljana-slovenia.

### Сделано
(дописывай сюда строку после каждого коммита: `id — коммит — что дала карточка`)
Собрано 28.09.2026, НЕ закоммичено (жду команду Мурода):
- sdu — Suleyman Demirel University (Казахстан): приём иностранцев, IELTS 5.5 или внутренний Placement Test, сбор 200 USD, срок 30.11.2026; помощи иностранцу нет (стипендии привязаны к Казахстану)
- kbtu — Kazakh-British Technical University (Казахстан): тест по английскому, внутренние гранты/скидки для стран СНГ (Таджикистан в списке), стипендия Bolashak, сбор 50 000 тенге
- manas — Кыргызско-Турецкий университет «Манас»: обучение бесплатное, иностранцы всех стран кроме Кыргызстана и Турции, средний балл аттестата ≥ 4/5
- khazar — Университет Хазар (Азербайджан): $5000/год (Early Bird $4500), авто-скидки 25/50/75%, английский по желанию
- newuu — New Uzbekistan University: IELTS 5.5/TOEFL 46, вступительный экзамен, 4-летние стипендии 100% (или освобождение от экзамена за SAT/IB/A-Levels Math)
- cau — Central Asian University (Ташкент): льготная цена для Центральной Азии (от $4000/год), стипендии 25/50/100% для граждан Таджикистана, вступительный экзамен, сбор $10/предмет
- tiu — Tashkent International University: бесплатная подача, IELTS 5.5+/TOEFL 65+, merit-стипендии до 50% автоматом, англоязычные программы 25 млн сум/год
- kiut — Kimyo International University in Tashkent: $2000/год (медицина $3500), стипендия до 50% на 1-й год, 10 грантов на программу с 2026, приём по собеседованию, депозит 50%
- bhos — Baku Higher Oil School (Азербайджан): IELTS 5.0/TOEFL 45–54, приём май–август, цена не опубликована, грант Гейдара Алиева; межправительственная без Таджикистана
- wcu — Western Caspian University (Азербайджан): 2500–4000 манат/год, оплата полностью до приезда, стипендий иностранцам нет (только Erasmus)
- sabanci-university — Sabancı University (Турция): $36 500/год, скидки 25–75% всем автоматически, сбор $30, аттестат Таджикистана ≥70%, SAT не обязателен
- ozyegin-university — Özyeğin University (Турция): $25 000/год, авто-скидки (пример 40–60%), предоплата $1000, свой экзамен по английскому (IELTS не берут)
- istanbul-bilgi — Istanbul Bilgi University (Турция): аттестат Таджикистана ≥50%, TOEFL 75 / внутренний BILET, иначе подготовительный год $12 000, скидки need/merit по форме
- hse — НИУ ВШЭ (Россия): 3 трека полной стипендии (квота РФ, олимпиады, экзамены HSE), платно от 200 000 ₽/год, возрастных ограничений нет, общежитие по квоте, обязательна медстраховка
- rudn — РУДН (Россия): платно 20.06–10.08, испытание-интервью ≥30/100 + портфолио, квота РФ через Россотрудничество, олимпиада РУДН даёт квоту/скидку
- utm/usm/upm — Малайзия: UTM (IELTS 5.5/TOEFL 46, RM55–76 тыс. за программу, помощи нет), USM (сбор RM100, цены только в PDF), UPM (сбор USD100, английский можно донести)
- tiu-japan — TIU E-Track: IELTS 6.0/TOEFL 72/Duolingo 115, 1,67–1,97 млн иен за 1-й год, стипендия 30–100%; 11-летняя школа Таджикистана MEXT не признаёт
- nucb — NUCB Global BBA: 4 года 4,72–4,87 млн иен, merit до 900 тыс. иен/год без заявки, 12 лет школы
- jbnu — JBNU (Корея): TOPIK 2/IELTS 5.5/TOEFL 71, 2,0–2,7 млн вон/семестр, скидки до 100% за TOPIK 6/IELTS 8, апостиль
- inu — INU (Корея): 2,56–3,55 млн вон/семестр, скидки за TOPIK/IELTS 30–70%; приёмный гид не отдался — язык пуст
- kyungpook — KNU (Корея): TOPIK 3/IELTS 5.5/TOEFL 59, оба родителя не-корейцы, GED не признают, заявка с 12 октября
- seoultech — SeoulTech (Корея): TOPIK 3/IELTS 5.5/TOEFL 71, ОДА-стипендия для Таджикистана (полное обучение + 500 000 вон/мес), скидки за TOPIK/TOEFL
- ritsumeikan — Ritsumeikan (Япония): 5 англопрограмм, IELTS 5.5–6.5, скидки 20/50/100%, MEXT; 11-летний список MEXT без Таджикистана
- kyushu — Kyushu (Япония): половина платы покрыта всем, стипендия 60 000 иен/мес (до 10 мест), MEXT 117 000 иен/мес, общежитие 1,5 года
- aiu-japan — AIU (Япония): 896 000 иен/год, документы + интервью, Eiken Pre-1 или 3 года на английском
- chung-ang — Chung-Ang (Корея): TOPIK 4 (для искусств 3), English Track TOEFL 60/IELTS 5.5, 4 приёма в год, сбор до 200 000 вон
- tmu-japan — TMU (Япония): англопрограмма Biological Sciences, 520 800 иен/год, Global Futures 100 000 иен/мес + половина платы (до 10 мест)
- charles-university — Карлов университет (Чехия): англопрограммы €0–14 000/год, чешские бесплатны, госстипендия для развивающихся стран
- masaryk-university — Масарик (Чехия): англопрограммы от €3000/год, чешские бесплатны, нужен английский B2, стипендия на жильё

### Не добавлены
(дописывай: `id — причина`)
- kimep — сайт отдаёт сборщику казахскую версию (qTranslate), английские страницы сборщику недоступны; сервер нестабилен (таймауты)
- inha-tashkent — дубль уже собранной программы `inha` (Inha University in Tashkent); отдельная карточка не нужна
- alatoo — сайт alatoo.edu.kg отдаёт сборщику 403
- narxoz — en.narxoz.kz не резолвится, narxoz.kz/en/ отдаёт пустую страницу (JavaScript-каркас)
- koc-university — international.ku.edu.tr отдаёт сборщику 403
- tokyo-peak — программа PEAK закрывается: сентябрь 2026 был последним набором, приём завершён
- inu: язык приёма — приёмный гид только PDF по JS-кнопке, порог цитатой не подтверждается (в карточке пусто)
- science-tokyo — isct.ac.jp обрывает TLS у сборщика (нет промежуточного сертификата), ни certifi, ни системный набор не помогают
