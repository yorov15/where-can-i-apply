# План для OpenCode: вузы по одному (с 28.09.2026)

Кто читает: агент в OpenCode, который продолжает работу вместо Claude.
Сначала прочитай `README.md` и `docs/HANDOFF.md` (только разделы, которые нужны задаче, не весь файл подряд).

## Где мы

- Ветка `asia-europe-universities`. **Партия 1 (50 вузов по пользе) закрыта 29.09.2026:** 43 вуза
  закрыты карточками, 7 — в «Не добавлены». Последний коммит `b930d35` (резерв), запушен.
- Актуальная очередь — «Партия 2: top-50/100 вузов мира» (см. ниже). Партия 1 — история.
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

**Статус: партия 1 (50 вузов) отработана 29.09.2026. Раздел ниже оставлен как история.**
**Текущая очередь — «Партия 2: top-50/100 вузов мира» в конце раздела «Очередь».**

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

## Партия 2: top-50/100 вузов мира (решение Мурода 29.09.2026)

Новая цель: добавить верх **мирового** рейтинга, а не ещё один регион. Это меняет решение
от 28.09.2026 (тогда «топ-1000 по рейтингу» был отвергнут как неподъёмный). Теперь берём не
весь список, а только верхние **50 или 100** — число финально подтверждает Мурод. По умолчанию
считаем **100**, из них после дедупликации и отсева ждём ~50 новых карточек.

Правила партии 2:
1. **Рейтинг-источник:** QS World University Rankings, актуальный выпуск на дату сбора (версию
   года зафиксировать в списке); спорные места сверять с THE и ARWU. Не смешивать выпуски.
2. **Сначала дедупликация.** В `data/programs` уже **193** записи, и почти весь верх США и
   Британии собран (Harvard, MIT, Stanford, Princeton, Yale, Columbia, Penn, Cornell, Brown,
   Dartmouth, JHU, Duke, Rice, Vanderbilt, Northwestern, Tufts, плюс десятки колледжей).
   В партию 2 идут **только те, кого в базе нет** — сверять с `ls data/programs`.
3. **Фильтр полезности партии 1 — второй экран, а не отказ.** Платный вуз без помощи для
   таджикского школьника всё равно заводим: сайт показывает и отказы, и «почему нельзя».
   Но карточка должна честно говорить, есть ли помощь и сколько стоит.
4. Обязательства те же: для карточки нужна англоязычная страница приёма; домен одобряет Мурод.

**Шаг 0 партии 2 (делать на `opencode-go/deepseek-v4.1-flash`):** 4–5 подагентов (`task`, тип
`general`) по блокам рейтинга (1–20, 21–40, 41–60, 61–80, 81–100), каждому одно задание —
вернуть строки:
`место — вуз — страна — домен (Wikidata P856) — страница приёма иностранцев — уже в базе? (id / нет) — чем полезен (деньги/цена)`.
Подагенты только ищут, файлов не трогают. Свести в одну таблицу, вычеркнуть дубли по
`data/programs`, показать Муроду. Ждать «да» (можно частичное: список мест/стран).

**Шаги 1…N партии 2:** тот же конвейер, что в «Где мы»: один вуз — одна сессия, потом `/new`.
Сборку вузов НЕ параллелить (`tools.build` и `data/changelog.json` общие, коммиты подерутся).

#### Источники и съём (партия 2) — важно, выяснено 29.09.2026

- В `sources.toml` у 62 вузов партии 2 стояла **одна страница-хаб** приёма; данных для карточки
  в ней нет (Cambridge и Edinburgh: только меню и «подавайте через UCAS»). Imperial — исключение,
  у него сразу было 7 страниц. **Решение Мурода 29.09.2026: под-страницы внутри уже одобренного
  домена ассистент добавляет сам** (требования, принимаемые квалификации, английский, плата,
  финпомощь, сроки) — по навигации самого сайта.
- С 29.09.2026 файервол **McAfee** на машине перестал пускать `python.exe` в сеть (даже
  `example.com` — таймаут по TCP), при этом `curl` проходит за доли секунды. Поэтому `tools.fetch`
  по сети не работает. Обход — как у Sejong/Sogang (`manual/README.md`): страницы снимаются
  `curl` в `manual/<id>/*.html`, в `sources.toml` пишется `files = [...]` (origin=manual).
  Сделано для cambridge и ucl. **Позже в тот же день сеть у Python снова заработала** —
  `tools.fetch` качает напрямую (проверено на Edinburgh: 9 страниц, origin=web), обход
  `files=` больше не нужен, пока блок не вернётся.
- Edinburgh — страницы приёма были одним хабом без данных; под-страницы внутри одобренного
  домена `ed.ac.uk` добавлены ассистентом (требования по регионам с Таджикистаном, английский,
  плата, подача, сроки, фонд), всего 12 страниц.
- KCL — сайт `kcl.ac.uk` не открывается с этой машины **ничем** из конвейера: `curl`, `python` и
  `Invoke-WebRequest` дают connect-timeout (другие вузы при этом открываются), помогает только
  читающий сервис `webfetch`. Поэтому страницы сняты через него и лежат в `manual/kcl/*.html`
  (`origin=manual`), а в `sources.toml` стоит `files=`. Всего 9 страниц (регион ЦА, требования,
  английский, подача, сроки, плата, фонд, International Foundation).
- Manchester — сайт `manchester.ac.uk` сборщику доступен (в отличие от KCL), у одного адреса требований
  данных нет; под-страницы внутри домена добавлены ассистентом (процесс подачи, английский, плата,
  фонд, стипендии Global Futures/Humanitarian, сроки), всего 10 страниц, `origin=web`.
- **Oxford** — сайт ox.ac.uk целиком за Cloudflare-челленджем (`Cf-Mitigated: challenge`): 403
  отдают fetch, curl (и с браузерным UA), webfetch и читающий прокси r.jina.ai; archive.org с машины
  недоступен. Без браузера не снять. **UCL** — ложная тревога: 403 не было, одобренный адрес просто
  умер (404); рабочие страницы найдены по навигации и сняты curl.

### Кандидаты партии 2 (QS 2027 топ-100, дедуплицировано по `data/programs`)

Статус: список собран 29.09.2026, домены ещё не подтверждены (у каждого — `?`, тянем при сборе).
Уже есть в базе и потому вычеркнуты: MIT, Stanford, Harvard, UPenn, Cornell, Yale, JHU, TUM,
Fudan, Princeton, HKUST, SJTU, SNU, Yonsei, Columbia, Northwestern, Zhejiang, Korea University,
LMU, Kyoto, KAIST, Brown, Duke, Lund, Osaka, Heidelberg, Politecnico di Milano, HKU, NTU.
Плюс уже закрыты как нерабочие: NUS, CUHK, CityU (JS/TLS), Tokyo (PEAK закрыт),
Science Tokyo (TLS).
Отдельные карточки уже есть, но это узкие программы, не вуз целиком — считаем кандидатами:
Oxford (`oxford-reach`), Toronto (`utoronto-pearson`), UBC (`ubc-scholars`),
Nottingham (`nottingham-ningbo`), NYU (`nyuad`/`nyu-shanghai`).

Формат: `id — вуз — страна — домен(? проверить)`.

- Великобритания: imperial-college-london — Imperial College London; oxford — University of Oxford;
  cambridge — University of Cambridge; ucl — UCL; edinburgh — University of Edinburgh;
  kcl — King's College London; manchester — University of Manchester; bristol — University of Bristol;
  lse — LSE; warwick — University of Warwick; birmingham — University of Birmingham;
  leeds — University of Leeds; glasgow — University of Glasgow; sheffield — University of Sheffield;
  durham — Durham University; nottingham — University of Nottingham
- США: caltech — Caltech; uc-berkeley — UC Berkeley; uchicago — University of Chicago;
  ucla — UCLA; michigan — University of Michigan; cmu — Carnegie Mellon;
  nyu — New York University; ut-austin — UT Austin; uiuc — UIUC; ucsd — UC San Diego;
  penn-state — Penn State; uwashington — University of Washington; boston-university — Boston University
- Европа/прочее: eth-zurich — ETH Zurich; epfl — EPFL; psl — Université PSL;
  institut-polytechnique-paris — Institut Polytechnique de Paris; sorbonne — Sorbonne University;
  paris-saclay — Université Paris-Saclay; tudelft — TU Delft; ku-leuven — KU Leuven;
  uva-amsterdam — University of Amsterdam; uppsala — Uppsala University; kth — KTH;
  copenhagen — University of Copenhagen; zurich — University of Zurich; uba — Universidad de Buenos Aires
- Азия/Океания/Канада/Ближний Восток: peking-university — Peking University;
  tsinghua-university — Tsinghua University; unsw — UNSW Sydney; melbourne — University of Melbourne;
  sydney — University of Sydney; anu — ANU; monash — Monash University; toronto — University of Toronto;
  mcgill — McGill; ubc — University of British Columbia; tokyo — University of Tokyo;
  ntu-taiwan — National Taiwan University; um-malaya — Universiti Malaya; auckland — University of Auckland;
  uwa — University of Western Australia; adelaide — Adelaide University; uts — UTS;
  nanjing — Nanjing University; alberta — University of Alberta; kfupm — KF UPM

Итого ~63 кандидата. Мурод одобряет список (можно частично: список `id`), домены тянутся и
подтверждаются по каждому вузу перед `fetch`.

### Сделано (партия 2)

(дописывай строку после каждого коммита: `id — коммит — что дала карточка`)
- imperial-college-london — Imperial College London (Великобритания): таджикского аттестата в таблице
  принимаемых квалификаций нет (нужны A-level AAA–A*A*, IB 38–42), IELTS 6.5/7.0 или PTE/TOEFL,
  overseas-плата только на страницах курсов, из стипендий для иностранцев — лишь IB Excellence £5 000/год
- cambridge — University of Cambridge (Великобритания): Таджикистана нет в списке стран/квалификаций
  (вуз: не включённые национальные квалификации, скорее всего, не принимаются), путь — A-level/IB
  (IB 41–42 + 776 HL); IELTS 7.5 (не ниже 7.0 по частям), для собеседования 6.5; плата £30 798–£70 554/год
  плюс сбор Колледжу, помощь иностранцам ограничена и по нужде; подача £60, срок 15.10.2026 (UCAS)
  и 22.10.2026 (My Cambridge Application)
- ucl — UCL (Великобритания): одобренный адрес был мёртв (404), страницы найдены по навигации и сняты curl;
  принимает разные национальные квалификации (эквивалент по стране — в проспектусе курса), Таджикистана
  в снимке нет, кому квалификацию не принимают — подготовительный год UPC; три A-level, предложения
  A*A*A–ABB; английский пятью уровнями, низший IELTS 6.5 (6.0 по частям), высший 8.0 (8.0); платы на
  страницах нет (только Student Finances), стипендии через scholarships finder; срок большинства курсов
  14.01.2026, медицины 15.10.2025 (цикл 2026, новые не объявлены)
- edinburgh — University of Edinburgh (Великобритания): аттестат о среднем образовании Таджикистана
  (Certificate of Secondary Education) прямого доступа не даёт — вуз обычно требует сперва
  подготовительный год International Foundation Programme; путь вне аттестата — A-level/IB/SAT, в
  Колледже науки и инженерии есть исключения по странам, но Таджикистана там нет; английский у
  каждого курса свой (пять уровней, порог назван только на странице курса в degree finder), сертификат
  IELTS/TOEFL действителен 2 года; плата фиксированная по годам, но суммы только в degree finder;
  помощь иностранцам-бакалаврам узкая (Rosedale OSSD £10 000 одному студенту, остальное — под
  убежище/олимпиады/математику/ветеринарию); подача через UCAS, цикл 2027: открытие 01.09.2026,
  равное рассмотрение 13.01.2027, медицина/ветеринария 15.10.2026
- kcl — King's College London (Великобритания): гражданство и страна школы не ограничены, но национальные
  квалификации, не принятые напрямую, ведут на International Foundation (сторонние non-UK foundation
  вуз не принимает); баллы UCAS Tariff не используют, смотрят квалификации и оценки (три A-level);
  английский по «бэндам»: Band D — IELTS 6.5 (6.0 по частям), Band B — 7.0 (6.5), сертификат
  действителен 2 года; плата — только на странице курса (домашняя ставка £9 790, таджик платит
  иностранную), стипендий для иностранцев-бакалавров на страницах нет (только поисковая база);
  подача через UCAS, срок 13.01.2027 (медицина/стоматология 15.10.2026), доп. взноса вуза нет,
  иностранцам обычно нужен депозит после firm-choice
- manchester — The University of Manchester (Великобритания): гражданство и страна школы не ограничены,
  требования к квалификации по странам (страницы по странам; Таджикистана в списке нет — эквивалент
  уточнять); английский по курсам, обычно IELTS 6.0–7.0 (5.5 для foundation), сертификат 2 года,
  часть вариантов IELTS (Home/Online/Indicator) не принимают; плата только на странице курса (рост
  до 7%/год); merit-стипендии есть, но Global Futures открыта только для списка стран без Таджикистана,
  Humanitarian закрыта; подача через UCAS (код M20 MANU), срок равного рассмотрения 13.01.2027,
  общий 30.06.2027 (медицина/стоматология 15.10.2026)
- bristol — University of Bristol (Великобритания): гражданство и страна школы не ограничены, требования
  к квалификации по странам (Таджикистана в списке нет, страница Узбекистана как ориентир по ЦА —
  эквивалент уточнять); английский по шести языковым профилям курса, на страницах порогов нет,
  сертификат действует 2 года; плата по курсам 2026/27 (£25 500 гуманитарные/соц., £31 300–33 400
  наука/инженерия, £45 800 медицина, £49 700 стоматология, £41 900 ветеринария); помощь частичная —
  Think Big £6 500/£13 000 до 4 лет открыта иностранцам, приём на 2026 закрыт; подача через UCAS
  (код BRISL B78), срок равного рассмотрения 13.01.2027, медицина/стоматология/ветеринария 15.10.2026;
  путь при 11-летнем аттестате — International Foundation Programme
- lse — LSE (Великобритания): гражданство и страна школы не ограничены; таджикский аттестат
  (Certificate of Completed Secondary Education) напрямую не принимают — путь через AP (5 предметов),
  International Foundation Programme британского вуза или год бакалавриата; уровень выражают в A-level/IB
  (IB 37–39), для отдельных программ LNAT (юристы) и TMUA (экономика); английский IELTS 7.0 (7.0 по
  частям), TOEFL 100 (по новой шкале 5.5), PTE 70, сертификат 2 года и только с одного сеанса; ставку
  иностранца страницы не называют (только на страницах программ), плата фиксируется по году поступления;
  помощь — LSE Undergraduate Support Scheme £15 000–25 000/год (денег меньше заявок); подача только
  через UCAS (Extra/Clearing не участвует), срок равного рассмотрения 13.01.2027
- warwick — University of Warwick (Великобритания): гражданство не ограничено, школьный аттестат
  Таджикистана прямого входа не даёт — нужен Warwick International Foundation Programme либо IB/A-Levels/AP
  или два года бакалавриата; английский по бэндам курса (Band A IELTS 6.0, B 6.5, C 7.0), One skill
  Retake не принимают, сертификат 2 года 1 месяц; плата по бэндам и годам (Band 1 2027/28 £29 260,
  Band 2 £37 310); помощь частичная — IFP-стипендии £2 000–3 500, bursary до £2 500; подача через UCAS
  (код W20); срок на странице опубликован только для приёма 2026 (14.01.2026), для 2027 не обновлён

#### Не добавлены (партия 2)

- oxford — сайт ox.ac.uk целиком за Cloudflare-челленджем: 403 отдают сборщик, curl, webfetch и
  читающий прокси r.jina.ai; archive.org с машины недоступен. Без браузера не снять — нужен ручной
  снимок Мурода.

---

## Партия 1 — итог

### Сделано
(дописывай сюда строку после каждого коммита: `id — коммит — что дала карточка`)
Собрано 28–29.09.2026, **закоммичено** (`2e734ff` … `b930d35`): 43 вуза закрыты карточками,
7 — в «Не добавлены» ниже.
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
- sjtu — SJTU (Китай): англоязычный Engineering Cluster, IELTS 6.0/TOEFL 90/Duolingo 120, SAT 1390–1500, плата 150 тыс. ¥/год, стипендия First — полное покрытие + 2500 ¥/мес, HSK4 для выпуска
- zhejiang-university — Zhejiang (Китай): возраст до 25, англобакалавриат, CSCA, сбор 800 ¥; CSC/провинциальная стипендии — только китайскоязычным
- fudan-university — Fudan (Китай): англопрограммы IOGG/MBBS/UIPE/GBF/UIPDB, стипендии CSC и Фуданя (цены не в тексте, только в материалах программ)
- wuhan-university — Wuhan (Китай): возраст 18–30, IELTS 6.0/TOEFL 80, англоплата 23–40 тыс. ¥/год, стипендии CSC
- harbin-institute-of-technology — HIT (Китай): возраст до 30, IELTS >6.0/TOEFL >80, плата 20/26 тыс. ¥, стипендия HIT до 100%, CSC
- tianjin-university — Tianjin (Китай): возраст до 25, IELTS 6.0/TOEFL 80, плата 16,6/20/26 тыс. ¥, CSC только китайскоязычным, Qiushi
- xian-jiaotong-university — XJTU (Китай): возраст до 25, IELTS 6.0/TOEFL 80, англоплата 40 тыс. ¥ (электротехника 180 тыс.), Freshman Scholarship 10–100%, CSC
- fu-berlin — FU Berlin (Германия): обучения нет, только сбор €376,80, своих стипендий вуз не даёт
- uni-due — Uni Duisburg-Essen (Германия): платы нет, немецкий DSH-2, подача через uni-assist
- palacky-university — Palacký (Чехия): программы на англ. и чешском, обязательны признание и легализация документов (цен в снимке нет)
- university-of-debrecen — Debrecen (Венгрия): 6–10 тыс. $/год, B2, Stipendium Hungaricum, скидка до 20% за GPA
- bme-budapest — BME (Венгрия): не-ЕС 3200–3500 €/семестр, сбор 150 €, вступительный экзамен, 18 лет
- university-of-szeged — Szeged (Венгрия): DreamApply + экзамен, стипендии SH/Start (цен в снимке нет)
- slovak-university-of-technology — STUBA (Словакия): словацкий бесплатно, английский до 4000 €
- university-of-economics-bratislava — EUBA (Словакия): англобакалавриат 1500 €/год
- university-of-warsaw — UW (Польша): сбор 85/100 злотых, цены англопрограмм в PDF
- jagiellonian-university — UJ (Польша): все платно, англ. от 16 тыс. злотых до 15 500 €, NAWA освобождает
- warsaw-university-of-technology — PW (Польша): GPA ≥70%, сбор 85 злотых, экзамен + признание NAWA, заявка до 21.07.2026
- polyu-hongkong — PolyU (Гонконг): не-местным 240 тыс. HK$/год, сбор 600, стипендии автоматом, Cultural Ambassador до 60 тыс.
- hkbu-hongkong — HKBU (Гонконг): IELTS 6.0, не-местным 190 тыс. HK$/год, стипендии при поступлении
- bologna-italy — Болонья (Италия): плата по доходу (ISEE), для визы нужно ~€10 180
- sapienza-italy — Сапиенца (Италия): плата по ISEE, Foundation Year, суммы 2026/27 ещё не опубликованы
- polito-italy — Polito (Италия): английский B2, тест TIL, TOPoliTO 8000 €/год, 14 стипендий для афганцев
- lund-sweden — Lund (Швеция): English 6, цена по программам, Global Scholarship (110 стипендий)
- aalto-finland — Aalto (Финляндия): приём 7–22.01.2027, сбор €100, Excellence Scholarship
- uaeu-uae — UAEU (ОАЭ): возраст ≤35, IELTS 5.5/TOEFL 70, GPA от 85%, Chancellor's 75–100%
- aus-uae — AUS (ОАЭ): GPA ≥85%, IELTS 6.5/TOEFL 80, 110 876 AED/год, эквивалентность Минобра ОАЭ
- ubbcluj-romania — UBB (Румыния): оплата частями, плата для не-ЕС в валюте, подготовительный год румынского
- ljubljana-slovenia — Любляна (Словения): не-ЕС без двустороннего соглашения платят (Таджикистана в списке нет)
- tu-berlin — TU Berlin (Германия): платы за обучение нет, только семестровый сбор; своих стипендий бакалавру не даёт
- rwth — RWTH Aachen (Германия): платы за обучение в Северном Рейне-Вестфалии нет, только семестровый сбор (сумма — в личном кабинете), стипендий бакалавру не даёт

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
- comenius-university — uniba.sk обрывает TLS-рукопожатие (SSLV3_ALERT_HANDSHAKE_FAILURE)
- cuhk-hongkong — cuhk.edu.hk обрывает TLS у сборщика (нет промежуточного сертификата)
- cityu-hongkong — cityu.edu.hk отдаёт пустой JavaScript-каркас (0 символов текста)
- nus-singapore — nus.edu.sg отдаёт пустой JavaScript-каркас (0 символов текста)
- tartu-estonia — ut.ee отдаёт сборщику 403
