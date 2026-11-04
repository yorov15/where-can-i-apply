// Словарь терминов приёма: английское слово, как его пишут вузы, русский
// вариант и пояснение в одну-две фразы. Это общие объяснения Nerio, а не
// условия программы: фактов о конкретных вузах здесь нет. Модуль чистый —
// без DOM, поэтому поиск и разметку проверяют тесты (tests/glossary.test.js).
//
// match — формы слова, по которым термин находят в тексте карточки и
// «Моего пути». Только английские формы и редкие русские кальки
// (апостиль, легализация, транскрипт): обычные русские слова не подсвечиваем.

export const GROUPS = [
  ['dates', 'Сроки и решения'],
  ['docs', 'Документы'],
  ['essays', 'Эссе, письма, собеседование'],
  ['money', 'Деньги'],
  ['apply', 'Подача и учёба'],
];

export const TERMS = [
  {
    id: 'early-decision', group: 'dates', en: 'Early Decision', ru: 'раннее решение с обязательством',
    match: ['early decision(?: (?:ii?|1|2))?'],
    text: 'Подаёшь раньше основного срока и обещаешь пойти именно сюда, если примут. Так подают только в один вуз, поэтому сначала убедись, что хватит денег: срок и правила у каждого вуза свои — смотри условие программы.',
  },
  {
    id: 'early-action', group: 'dates', en: 'Early Action', ru: 'ранняя подача без обязательств',
    match: ['early action'],
    text: 'Подаёшь раньше и раньше узнаёшь ответ, но соглашаться не обязан. Обычно так можно подать сразу в несколько вузов, если сам вуз не запрещает.',
  },
  {
    id: 'restrictive-early-action', group: 'dates', en: 'Restrictive Early Action', ru: 'ранняя подача с ограничением',
    match: ['restrictive early action', 'single[- ]choice early action'],
    text: 'Ответ ни к чему не обязывает, но одновременно подавать раньше срока в другие вузы нельзя. Какие исключения разрешены, вуз пишет у себя — прочитай до подачи.',
  },
  {
    id: 'regular-decision', group: 'dates', en: 'Regular Decision', ru: 'основной срок подачи',
    match: ['regular decision'],
    text: 'Обычный срок подачи; ответ приходит позже, чем при ранней подаче. Ни к чему не обязывает: можно подать в несколько вузов и потом выбрать.',
  },
  {
    id: 'rolling-admission', group: 'dates', en: 'Rolling admission', ru: 'приём по мере поступления заявок',
    match: ['rolling (?:admissions?|basis|deadlines?)'],
    text: 'Заявки рассматривают по очереди, пока есть места. Подавай пораньше: ближе к концу срока мест может не остаться.',
  },
  {
    id: 'waitlist', group: 'dates', en: 'Waitlist', ru: 'лист ожидания',
    match: ['wait[- ]?list(?:ed|s)?', 'waiting lists?'],
    text: 'Тебя не приняли и не отказали: возьмут, если освободится место. Подтверди, что хочешь остаться в списке, и не отказывайся от других предложений, пока ждёшь.',
  },
  {
    id: 'deferral', group: 'dates', en: 'Deferral', ru: 'отсрочка',
    match: ['(?<!tuition )deferrals?', 'deferred (?:to|entry|admission|enrol?lment|start)', 'defer(?:red)? (?:your |an |the |their )?(?:offers?|admissions?|entry|enrol?lment|places?)'],
    text: 'Два смысла. Решение по ранней заявке перенесли и примут вместе с обычными — или ты просишь начать учёбу на год позже; второе разрешают не везде, спроси в приёмной.',
  },
  {
    id: 'conditional-offer', group: 'dates', en: 'Conditional offer', ru: 'условное зачисление',
    match: ['(?:un)?conditional (?:offers?|admissions?|acceptances?)'],
    text: 'Тебя примут, если до срока выполнишь условия из письма — например, получишь аттестат или нужный балл. Unconditional offer — зачисление без условий.',
  },
  {
    id: 'enrollment-deposit', group: 'dates', en: 'Enrollment deposit', ru: 'взнос за подтверждение места',
    match: ['(?:enrol?lment|advance tuition|tuition|admissions?|acceptance|confirmation|matriculation) deposits?', 'deposits? to (?:confirm|secure|reserve)'],
    text: 'Деньги, которые платят после зачисления, чтобы закрепить место. Часто их не возвращают, поэтому плати, когда точно решил; сумму и срок пишет вуз.',
  },
  {
    id: 'transcript', group: 'docs', en: 'Transcript', ru: 'выписка оценок',
    match: ['(?:academic |official |school )?transcripts?(?: of records)?', 'транскрипт\\p{L}*'],
    text: 'Официальный список твоих оценок по предметам за старшие классы, с печатью школы. Попроси его в школе заранее; часто нужен заверенный перевод — какой именно, пишет вуз.',
  },
  {
    id: 'gpa', group: 'docs', en: 'GPA', ru: 'средний балл',
    match: ['c?gpa', 'grade point average'],
    text: 'Среднее по твоим оценкам. Обычно пишут балл в своей школьной шкале и указывают шкалу; если вуз просит пересчитать, он сам пишет как.',
  },
  {
    id: 'predicted-grades', group: 'docs', en: 'Predicted grades', ru: 'прогноз оценок',
    match: ['predicted (?:grades?|scores?|results?)'],
    text: 'Оценки, которые школа ожидает у тебя в конце года. Их просят, когда подаёшь до выпуска; попроси школу оформить их официально.',
  },
  {
    id: 'school-certificate', group: 'docs', en: 'High school diploma', ru: 'аттестат о среднем образовании',
    match: ['(?:high|secondary) school (?:leaving )?(?:diploma|certificate)s?', 'school[- ]leaving certificates?'],
    text: 'Так вузы называют школьный аттестат. Если подаёшь до выпуска, вместо него часто просят справку из школы, что ты учишься и когда закончишь.',
  },
  {
    id: 'certified-copy', group: 'docs', en: 'Certified copy / translation', ru: 'заверенная копия или перевод',
    match: ['(?:certified|notari[sz]ed|sworn|attested) (?:true )?(?:cop(?:y|ies)|translations?)', 'notari[sz](?:ed|ation)'],
    text: 'Копия или перевод, верность которых подтвердил нотариус, присяжный переводчик или сама школа. Кто именно должен заверить, у каждого вуза своё — смотри условие программы.',
  },
  {
    id: 'apostille', group: 'docs', en: 'Apostille', ru: 'апостиль',
    match: ['apostill(?:e[sd]?)', 'апостил\\p{L}*'],
    text: 'Штамп, который подтверждает, что документ настоящий, для стран Гаагской конвенции. Ставит государственный орган, а не школа; это занимает время — уточни заранее.',
  },
  {
    id: 'legalization', group: 'docs', en: 'Legalization', ru: 'консульская легализация',
    match: ['(?:consular )?legali[sz](?:ation|ed|e)', 'легализаци\\p{L}*'],
    text: 'Подтверждение документа для стран, где апостиль не принимают: обычно его заверяют в министерстве и в посольстве страны вуза. Это дольше апостиля — начинай заранее.',
  },
  {
    id: 'cv', group: 'docs', en: 'CV / résumé', ru: 'резюме',
    match: ['cv', 'curriculum vitae', 'r[eé]sum[eé]s?'],
    text: 'Короткий список того, что ты делал: учёба, олимпиады, кружки, работа, волонтёрство — с датами. Обычно одна-две страницы.',
  },
  {
    id: 'proof-of-funds', group: 'docs', en: 'Proof of funds', ru: 'подтверждение денег',
    match: ['proof of (?:funds|financial (?:support|means|resources))', 'bank statements?', 'financial (?:guarantee|statement)s?', 'sufficient funds'],
    text: 'Документ о том, что у тебя или семьи есть деньги на учёбу и жизнь: выписка из банка, письмо спонсора или стипендии. Сумму и срок выписки пишет вуз или посольство.',
  },
  {
    id: 'personal-statement', group: 'essays', en: 'Personal statement', ru: 'личное эссе',
    match: ['personal statements?'],
    text: 'Текст о тебе: кто ты, что тебя сформировало и чего хочешь. Пиши своими словами, не списком наград; вопрос и лимит слов пишет вуз или портал.',
  },
  {
    id: 'motivation-letter', group: 'essays', en: 'Motivation letter', ru: 'мотивационное письмо',
    match: ['motivation(?:al)? letters?', 'letters? of motivation', 'statements? of purpose'],
    text: 'Письмо о том, почему ты выбрал эту программу и что будешь делать после. Statement of purpose — почти то же, только больше о целях учёбы. Пиши под каждую программу отдельно.',
  },
  {
    id: 'supplemental-essay', group: 'essays', en: 'Supplemental essay', ru: 'дополнительное эссе вуза',
    match: ['supplement(?:al|ary)? (?:essays?|questions?)', 'writing supplements?'],
    text: 'Короткие ответы на вопросы конкретного вуза сверх основного эссе. Пиши про эту программу, а не общие слова, которые подойдут любому вузу.',
  },
  {
    id: 'recommendation', group: 'essays', en: 'Recommendation / reference', ru: 'рекомендательное письмо',
    match: ['(?:letters? of )?recommendations?(?: letters?)?', '(?:reference|referee) letters?', 'letters? of reference', 'referees?'],
    text: 'Письмо от учителя или другого взрослого, который хорошо тебя знает. Попроси за несколько недель до срока; кто пишет и сколько писем нужно — у каждого вуза свои правила.',
  },
  {
    id: 'counselor', group: 'essays', en: 'School counselor', ru: 'школьный консультант',
    match: ['(?:school |college |guidance )?counsell?ors?'],
    text: 'В американских заявках — сотрудник школы, который отправляет школьные документы и пишет отзыв. Если такой должности нет, эту роль обычно берёт завуч, классный руководитель или директор.',
  },
  {
    id: 'portfolio', group: 'essays', en: 'Portfolio', ru: 'портфолио',
    match: ['portfolios?'],
    text: 'Подборка твоих работ: рисунки, проекты, код, тексты — то, что показывает умение на деле. Что и в каком виде прислать, пишет программа.',
  },
  {
    id: 'interview', group: 'essays', en: 'Interview', ru: 'собеседование',
    match: ['interview(?:s|ed)?'],
    text: 'Разговор с представителем вуза, часто онлайн. Обычно спрашивают о тебе и о выборе программы; потренируйся отвечать вслух.',
  },
  {
    id: 'application-fee', group: 'money', en: 'Application fee', ru: 'взнос за подачу',
    match: ['application (?:fee|charge)s?', 'processing fees?'],
    text: 'Плата за рассмотрение заявки; её не возвращают даже при отказе. Проверь, можно ли от неё освободиться (fee waiver).',
  },
  {
    id: 'fee-waiver', group: 'money', en: 'Fee waiver', ru: 'освобождение от взноса',
    match: ['(?:application )?fee waivers?', 'waive[sd]? (?:the )?(?:application )?fees?'],
    text: 'Разрешение подать заявку бесплатно, обычно когда семье трудно заплатить. Как попросить, пишет вуз или портал: иногда нужна справка о доходах или письмо школы.',
  },
  {
    id: 'financial-aid', group: 'money', en: 'Financial aid', ru: 'финансовая помощь',
    match: ['financial aid', 'need[- ]based (?:aid|scholarships?|grants?)'],
    text: 'Деньги от вуза на учёбу и жизнь: скидка на оплату, грант, иногда работа в кампусе. Для иностранцев правила часто другие — смотри условие программы.',
  },
  {
    id: 'need-blind', group: 'money', en: 'Need-blind / need-aware', ru: 'с оглядкой на деньги или без',
    match: ['need[- ](?:blind|aware|sensitive)'],
    text: 'Need-blind — вуз решает о зачислении, не глядя, нужна ли тебе помощь. Need-aware — смотрит, и просьба о помощи может повлиять на решение; для иностранцев правило бывает своё.',
  },
  {
    id: 'css-profile', group: 'money', en: 'CSS Profile', ru: 'анкета о доходах семьи',
    match: ['css profile'],
    text: 'Онлайн-анкета College Board о доходах и расходах семьи: по ней часть вузов США считает финансовую помощь. Обычно она платная, но бывает освобождение; нужна ли она, пишет вуз.',
  },
  {
    id: 'merit-scholarship', group: 'money', en: 'Merit scholarship', ru: 'стипендия за успехи',
    match: ['merit[- ]based (?:scholarships?|aid|awards?)', 'merit (?:scholarships?|aid|awards?)'],
    text: 'Деньги за оценки, олимпиады или таланты, а не за доход семьи. Иногда её дают сами при подаче, иногда нужна отдельная заявка — смотри условие программы.',
  },
  {
    id: 'full-scholarship', group: 'money', en: 'Full scholarship', ru: 'полная стипендия',
    match: ['fully[- ]funded', 'full[- ]ride', 'full (?:tuition )?scholarships?'],
    text: 'Покрывает плату за учёбу, а иногда ещё жильё, еду и перелёт. Что именно входит, смотри в строке «Что покрывает» у программы.',
  },
  {
    id: 'tuition-waiver', group: 'money', en: 'Tuition waiver', ru: 'освобождение от платы за учёбу',
    match: ['tuition(?: fee)? (?:waivers?|exemptions?|remission)', 'tuition[- ]free', 'waive[sd]? (?:the )?tuition'],
    text: 'Учёба бесплатная или со скидкой, но жильё и еду обычно оплачиваешь сам. Посчитай, хватит ли денег на жизнь.',
  },
  {
    id: 'stipend', group: 'money', en: 'Stipend', ru: 'ежемесячное пособие',
    match: ['stipends?', '(?:monthly|living) allowances?'],
    text: 'Деньги, которые стипендия платит каждый месяц на еду, транспорт и мелкие расходы. Сравни сумму с ценами в городе: её не всегда хватает на всё.',
  },
  {
    id: 'application-portal', group: 'apply', en: 'Application portal', ru: 'сайт для подачи заявки',
    match: ['(?:online |application |applicant )?portals?', 'online application system'],
    text: 'Сайт, где создаёшь аккаунт и подаёшь заявку: анкета, файлы, статус. Сохрани логин и пароль и проверяй почту, к которой привязан аккаунт.',
  },
  {
    id: 'common-app', group: 'apply', en: 'Common App', ru: 'общая заявка в вузы США',
    match: ['common app(?:lication)?'],
    text: 'Общий сайт, через который подают заявки во многие вузы США и некоторые другие. Одна анкета и одно эссе уходят в несколько вузов; дополнительные вопросы у каждого свои.',
  },
  {
    id: 'test-optional', group: 'apply', en: 'Test-optional', ru: 'экзамен по желанию',
    match: ['test[- ](?:optional|flexible|blind)'],
    text: 'Вуз не требует SAT или ACT: можно подать без них. Хороший балл можно приложить, невысокий — не присылать.',
  },
  {
    id: 'foundation-year', group: 'apply', en: 'Foundation year', ru: 'подготовительный год',
    match: ['foundation (?:years?|programm?es?|courses?|studies)', '(?:university )?preparatory (?:years?|courses?|programm?es?)', 'pre-?university (?:programm?es?|courses?)'],
    text: 'Год учёбы перед бакалавриатом: язык и основные предметы. Его часто предлагают тем, у кого 11 лет школы или не хватает уровня; после него идёшь на первый курс.',
  },
  {
    id: 'credit-transfer', group: 'apply', en: 'Credit transfer', ru: 'перезачёт предметов',
    match: ['transfer(?:red)? credits?', 'credit transfers?', 'transfer (?:students?|applicants?|admissions?)'],
    text: 'Вуз засчитывает курсы, пройденные в другом вузе, и их не надо проходить снова. Transfer student — студент, который переходит из одного вуза в другой.',
  },
  {
    id: 'student-visa', group: 'apply', en: 'Student visa', ru: 'студенческая виза',
    match: ['(?:student |study |f-1 |j-1 |d-2 |national )?visas?', 'study permits?'],
    text: 'Разрешение въехать в страну для учёбы; F-1 — студенческая виза США. Её оформляют после зачисления, обычно с письмом вуза и подтверждением денег; правила пишет посольство.',
  },
];

export const NOTE = 'Простые объяснения Nerio, не условия программы.';

export const termHref = (id) => `glossary.html#${id}`;

const byId = new Map(TERMS.map((term) => [term.id, term]));
export const termById = (id) => byId.get(id) ?? null;

// Слово целиком: перед и после не буква и не цифра. \b в JS понимает только
// латиницу, поэтому границы — через классы Unicode. Кусок адреса или почты
// (portal.edu.az, cv@…) термином не считается.
const compiled = TERMS.map((term) => ({
  id: term.id,
  pattern: new RegExp(`(?<![\\p{L}\\p{N}./@_-])(?:${term.match.join('|')})(?![\\p{L}\\p{N}_]|[./@-][\\p{L}\\p{N}])`, 'giu'),
}));

// Все места, где в тексте встречаются термины, которых ещё нет в seen.
// Возвращает непересекающиеся куски по порядку: при наложении выигрывает
// тот, что начался раньше, при равном начале — более длинный
// («Restrictive Early Action» вместо «Early Action»). seen пополняется:
// так подсказка достаётся только первому вхождению в блоке.
export function findTerms(text, seen = new Set()) {
  const hits = [];
  for (const { id, pattern } of compiled) {
    if (seen.has(id)) continue;
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) hits.push({ id, start: match.index, end: match.index + match[0].length });
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  let edge = 0;
  for (const hit of hits) {
    if (hit.start < edge) continue;
    kept.push(hit);
    edge = hit.end;
  }
  // Термин, проигравший наложение, остаётся «не встреченным» и может
  // получить подсказку дальше в этом же блоке.
  kept.forEach((hit) => seen.add(hit.id));
  return kept;
}

// Текст, разрезанный на куски: { text } и { text, id } для термина.
// Склейка всех text всегда равна исходной строке — цитата не меняется.
export function segmentText(text, seen = new Set()) {
  const out = [];
  let at = 0;
  for (const hit of findTerms(text, seen)) {
    if (hit.start > at) out.push({ text: text.slice(at, hit.start) });
    out.push({ text: text.slice(hit.start, hit.end), id: hit.id });
    at = hit.end;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

export const normalize = (value) => String(value ?? '').toLowerCase().replace(/ё/g, 'е')
  .replace(/[-‐–—/().,«»"]+/g, ' ').replace(/\s+/g, ' ').trim();

const haystacks = TERMS.map((term) => ({
  term,
  title: normalize(`${term.en} ${term.ru}`),
  all: normalize(`${term.en} ${term.ru} ${term.match.join(' ').replace(/[^\p{L}\p{N} -]+/gu, ' ')} ${term.text}`),
}));

// Поиск по английскому и русскому: каждое слово запроса должно найтись.
// Сначала совпадения в названии, потом в объяснении; внутри — порядок словаря.
export function searchTerms(query) {
  const words = normalize(query).split(' ').filter(Boolean);
  if (!words.length) return TERMS.slice();
  const ranked = [];
  haystacks.forEach(({ term, title, all }, order) => {
    if (!words.every((word) => all.includes(word))) return;
    const rank = title.startsWith(words.join(' ')) ? 0 : words.every((word) => title.includes(word)) ? 1 : 2;
    ranked.push({ term, rank, order });
  });
  return ranked.sort((a, b) => a.rank - b.rank || a.order - b.order).map((item) => item.term);
}
