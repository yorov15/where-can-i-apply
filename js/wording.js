// Тексты причин. Правила возвращают код и числа, человек читает отсюда.
// Голос и образцы — docs/superpowers/specs/2026-09-14-helpful-results-design.md, раздел 4.

const TEST = {
  IELTS: 'IELTS',
  TOEFL_IBT: 'TOEFL по старой шкале',
  TOEFL_IBT_2026: 'TOEFL по новой шкале',
  DUOLINGO: 'Duolingo',
  SAT: 'SAT',
  ACT: 'ACT',
};
export const testName = (test) => TEST[test] ?? test;

export function joinOr(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} или ${items.at(-1)}`;
}

const optionList = (options) => joinOr(options.map((o) => `${testName(o.test)} от ${o.min}`));
// Порога у SAT и ACT часто нет: тогда называем просто экзамен.
const examOptions = (options) => joinOr(options.map((o) => (o.min == null ? testName(o.test) : `${testName(o.test)} от ${o.min}`)));

const TITLE = {
  citizenship: 'Гражданство', schoolCountry: 'Страна школы', schoolYears: 'Школа',
  graduationYear: 'Год выпуска', age: 'Возраст', gpa: 'Средний балл', language: 'Язык', exam: 'Экзамен',
};
// «требование к …»
const TO = {
  citizenship: 'гражданству', schoolCountry: 'стране школы', schoolYears: 'школе',
  graduationYear: 'году выпуска', age: 'возрасту', gpa: 'баллу', language: 'языку', exam: 'экзамену',
};
// «про …»
const ABOUT = {
  citizenship: 'гражданство', schoolCountry: 'страну школы', schoolYears: 'годы школы',
  graduationYear: 'год выпуска', age: 'возраст', gpa: 'средний балл', language: 'язык', exam: 'экзамен',
};
// «указать …»
const FILL = {
  citizenship: 'гражданство', schoolCountry: 'страну школы', schoolYears: 'число лет школы',
  graduationYear: 'год выпуска', age: 'дату рождения', gpa: 'средний балл',
};

const WHY = {
  'no-dates': 'даты приёма ещё не объявлены, и к подаче тебе может стать больше',
  'cycle-guessed': 'даты приёма ещё не объявлены, и год взят по ближайшему циклу',
  'asof-unknown': 'программа не пишет, на какую дату считает возраст',
  unconfirmed: 'дата приёма ещё не подтверждена',
};

// Состояния, которые человек исправляет сам: указать поле, сдать экзамен.
export const USER_SIDE_STATES = new Set(['no-value', 'no-certificate', 'score-missing', 'other-test']);

// Состояния, где чисел не назвала сама программа. Делать человеку нечего:
// его анкета тут ни при чём, и в список дел такая строка попадать не должна.
export const PROGRAM_SIDE_STATES = new Set([
  'not-measured', 'by-institution', 'missing-rule', 'cycle-unknown', 'asof-unknown',
]);

// Жёлтый жёлтому рознь. «Сдай экзамен» и «программа не публикует порога» —
// разные ответы: первый человек закрывает сам, второй не закроет никогда.
// Свалив их в одну кучу, сайт показывал тридцать шесть дел там, где дел
// было десять.
export function programSideOnly(verdict) {
  const reasons = verdict.reasons ?? [];
  return verdict.status === 'check'
    && reasons.length > 0
    && reasons.every((r) => PROGRAM_SIDE_STATES.has(r.code.split('.')[1]));
}

// Корзина, а не цвет: «программа не публикует порога» и «сдай экзамен»
// оба жёлтые, но первое человеку делать нечего.
export const bucketOf = (verdict) => (programSideOnly(verdict) ? 'likely' : verdict.status);

// Отказы, которые могут измениться: пересдать, дождаться возраста или цикла.
const CHANGEABLE = new Set(['language.below', 'exam.below', 'gpa.below', 'age.under-min', 'graduationYear.after-cycle']);

// Подлежащее в этих строках — программа, а не человек. «Уточнить
// требование к языку» звучало как дело, которое ему поручили, и висело
// одинаковым текстом на полутора десятках карточек.
const NO_NUMBER = {
  citizenship: 'твоей страны программа прямо не называет',
  schoolCountry: 'аттестат твоей страны программа отдельно не называет',
  schoolYears: 'числа лет школы программа не называет',
  graduationYear: 'года выпуска программа не называет',
  age: 'возрастной планки программа не называет',
  gpa: 'проходного балла программа не называет',
  language: 'порога по языку программа не называет',
  exam: 'порога по SAT и ACT программа не называет',
};

function generic(field, state) {
  switch (state) {
    case 'missing-rule':
      return {
        short: `про ${ABOUT[field]} программа молчит`,
        detail: `На страницах программы про ${ABOUT[field]} ничего не нашлось. Если сомневаешься, спроси у неё.`,
      };
    case 'by-institution':
      return {
        short: `требование к ${TO[field]} ставит сам вуз`,
        detail: `Требование к ${TO[field]} ставит принимающий вуз, у каждого своё. Смотри на сайте вуза, куда подаёшь.`,
      };
    case 'not-measured':
      return {
        short: NO_NUMBER[field] ?? `числа по ${TO[field]} программа не называет`,
        detail: `Программа описывает требование к ${TO[field]} словами, а не числом: сверить не с чем.`,
      };
    case 'no-value':
      if (!FILL[field]) return null;
      return {
        short: `указать ${FILL[field]}`,
        detail: `Укажи в анкете ${FILL[field]} — иначе не проверить, подходишь ли ты.`,
      };
    default:
      return null;
  }
}

const SPECIAL = {
  'citizenship.denied': () => ({
    short: 'не принимает граждан твоей страны',
    detail: 'Программа не принимает граждан твоей страны.',
  }),
  'citizenship.not-in-list': () => ({
    short: 'твоей страны нет в списке',
    detail: 'Программа принимает граждан только из своего списка стран, твоей страны в нём нет.',
  }),
  'schoolCountry.denied': () => ({
    short: 'не принимает аттестаты твоей страны',
    detail: 'Программа не принимает аттестаты страны, где ты оканчиваешь школу.',
  }),
  'schoolCountry.not-in-list': () => ({
    short: 'аттестата твоей страны нет в списке',
    detail: 'Программа принимает аттестаты только из своего списка стран, твоей страны в нём нет.',
  }),
  'schoolYears.below-min': ({ min, mine }) => ({
    short: `нужно ${min} лет школы, у тебя ${mine}`,
    detail: `Программа принимает после ${min} лет школы, а у тебя ${mine}.`,
  }),
  'graduationYear.too-early': ({ min, mine }) => ({
    short: `берут выпускников с ${min} года`,
    detail: `Программа берёт тех, кто окончил школу в ${min} году или позже, а ты — в ${mine}.`,
  }),
  'graduationYear.cycle-unknown': () => ({
    short: 'крайний год выпуска пока не посчитать',
    detail: 'Школу нужно окончить к году подачи, но даты приёма ещё не объявлены, поэтому крайний год пока не посчитать.',
  }),
  'graduationYear.after-cycle': ({ max, mine }) => ({
    short: `нужно окончить школу к ${max}, у тебя ${mine}`,
    detail: `Программа берёт тех, кто оканчивает школу к году подачи — к ${max}. Ты оканчиваешь в ${mine}, так что подать сможешь в следующем цикле.`,
  }),
  'graduationYear.too-late': ({ max, mine }) => ({
    short: `берут выпускников до ${max} года`,
    detail: `Программа берёт тех, кто оканчивает школу не позже ${max} года, а ты — в ${mine}.`,
  }),
  'age.asof-unknown': () => ({
    short: 'на какую дату считают возраст, не сказано',
    detail: 'У программы есть ограничение по возрасту, но не сказано, на какую дату его считают.',
  }),
  'age.near-max': ({ age, limit, why }) => ({
    short: `сверить возраст: около ${age} при пределе ${limit}`,
    detail: `К дате приёма тебе будет около ${age}, а программа берёт до ${limit}. Точно сказать нельзя: ${WHY[why]}. Проверь на сайте программы.`,
  }),
  'age.over-max': ({ age, max, maxExclusive }) => (maxExclusive != null
    ? {
      short: `к подаче тебе будет ${age}, берут младше ${maxExclusive}`,
      detail: `На дату приёма тебе будет ${age}, а программа берёт младше ${maxExclusive}.`,
    }
    : {
      short: `к подаче тебе будет ${age}, берут до ${max}`,
      detail: `На дату приёма тебе будет ${age}, а программа берёт до ${max} включительно.`,
    }),
  'age.near-min': ({ age, min, why }) => ({
    short: `сверить возраст: около ${age} при минимуме ${min}`,
    detail: `К дате приёма тебе будет около ${age}, а программа берёт с ${min}. Точно сказать нельзя: ${WHY[why]}. Проверь на сайте программы.`,
  }),
  'age.under-min': ({ age, min }) => ({
    short: `к подаче тебе будет ${age}, берут с ${min}`,
    detail: `На дату приёма тебе будет ${age}, а программа берёт с ${min}. Подать сможешь в одном из следующих циклов.`,
  }),
  'gpa.near-threshold': ({ mine, need }) => ({
    short: 'сверить балл с порогом',
    detail: `Твой балл — примерно ${mine}%, программе нужно ${need}%. Шкалы разные, и пересчёт приблизительный — сверь с условиями программы.`,
  }),
  'gpa.below-advisory': ({ mine, need }) => ({
    short: 'сверить балл с условиями программы',
    detail: `Твой балл — ${mine}%, программа называет ${need}%. Это не отказ: число не жёсткий порог или к нему есть обходной путь.`,
  }),
  'gpa.below': ({ mine, need }) => ({
    short: `балл ${mine}% при пороге ${need}%`,
    detail: `Твой балл — ${mine}%, программе нужно ${need}%. Решает итоговый балл аттестата: если он окажется выше, ответ изменится.`,
  }),
  // Порог стоит в самой строке: человек с отмеченным, но не вписанным
  // экзаменом видел на трёх десятках карточек одинаковое «вписать балл
  // экзамена» и не мог отличить программу с 6.0 от программы с 7.5, не
  // раскрыв каждую.
  'language.score-missing': ({ options, advisory, marked = [] }) => {
    const need = options.find((option) => marked.includes(option.test)) ?? options[0];
    return {
      short: `вписать балл ${testName(need.test)} (${advisory ? 'рекомендуют' : 'нужно'} от ${need.min})`,
      detail: `Ты отметил экзамен, но не вписал балл. ${advisory ? 'Программа советует' : 'Нужен'} ${optionList(options)}.`,
    };
  },
  'language.parts-unknown': ({ test, min }) => ({
    short: 'сверить баллы по частям экзамена',
    detail: `Общий балл подходит: ${testName(test)} от ${min}. Но программа требует ещё и минимумы по отдельным частям — сверь с ними свои.`,
  }),
  'exam.score-missing': ({ options, marked = [] }) => {
    const need = options.find((option) => marked.includes(option.test)) ?? options[0];
    return {
      short: `вписать балл ${testName(need.test)}${need.min == null ? '' : ` (нужно от ${need.min})`}`,
      detail: `Ты отметил экзамен, но не вписал балл. Нужен ${examOptions(options)}.`,
    };
  },
  'exam.below-advisory': ({ options }) => ({
    short: 'балл ниже ориентира программы',
    detail: `Программа называет ${examOptions(options)}, твой результат ниже. Это ориентир, а не порог подачи: решает отбор.`,
  }),
  'exam.below': ({ options }) => ({
    short: 'результат SAT или ACT ниже порога',
    detail: `Программе нужен ${examOptions(options)}, твой результат ниже. Экзамен можно пересдать.`,
  }),
  'exam.no-certificate': ({ options }) => ({
    short: `сдать ${joinOr(options.map((o) => testName(o.test)))}`,
    detail: `Программа требует результат экзамена: ${examOptions(options)}. Экзамена в анкете нет — сдать ещё можно.`,
  }),
  'language.below-advisory': ({ options }) => ({
    short: 'балл ниже рекомендованного',
    detail: `Программа называет ${optionList(options)}, твой результат ниже. Это не отказ: такой балл она считает рекомендацией или условием после приёма, а не порогом подачи.`,
  }),
  'language.below': ({ options }) => ({
    short: 'результат экзамена ниже порога',
    detail: `Программе нужен ${optionList(options)}, твой результат ниже. Экзамен можно пересдать.`,
  }),
  'language.other-test': ({ tests, options, advisory }) => ({
    short: 'уточнить, примут ли твой экзамен',
    detail: `Твой ${joinOr(tests.map(testName))} программа не называет — она ${advisory ? 'советует' : 'требует'} ${optionList(options)}. Спроси у программы, примут ли твой экзамен.`,
  }),
  'language.no-certificate': ({ options, advisory }) => {
    const first = `${testName(options[0].test)} от ${options[0].min}`;
    return advisory
      ? {
        short: `сдать английский (желательно ${first})`,
        detail: `Программа советует ${optionList(options)}, но это не порог — решает отбор. Сертификат всё равно понадобится.`,
      }
      : {
        short: `сдать английский (${first})`,
        detail: `Нужен сертификат: ${optionList(options)}. Сертификата пока нет — сдать ещё успеешь.`,
      };
  },
};

export function reasonText(reason) {
  const [field, state] = reason.code.split('.');
  const text = SPECIAL[reason.code] ? SPECIAL[reason.code](reason.params ?? {}) : generic(field, state);
  if (!text) throw new Error(`Нет текста для причины ${reason.code}`);
  return { title: TITLE[field] ?? field, ...text, changeable: CHANGEABLE.has(reason.code) };
}

const stateOf = (reason) => reason.code.split('.')[1];

// В заголовок попадает первая причина, поэтому строки, где человеку
// делать нечего, уходят в конец: иначе «Можно, но сначала» открывалось
// молчанием программы, а настоящее дело пряталось за «и ещё 1».
export function orderReasons(reasons) {
  const rank = (r) => {
    if (r.status === 'fail') return 0;
    if (USER_SIDE_STATES.has(stateOf(r))) return 1;
    return PROGRAM_SIDE_STATES.has(stateOf(r)) ? 3 : 2;
  };
  return [...reasons].sort((a, b) => rank(a) - rank(b));
}

export function headline(verdict, program) {
  // Не «можно подавать»: это читалось как «рекомендуем», а сайт проверяет
  // только совпадение с названными условиями допуска.
  if (verdict.status === 'yes') return 'Подходишь по условиям';
  const ordered = orderReasons(verdict.reasons);
  const first = ordered[0];
  const text = reasonText(first);
  if (verdict.status === 'no') {
    // Обходной путь и есть то самое «пока»: «Нельзя … есть обходной путь»
    // в одной строке противоречит само себе.
    const hasWay = (program.workaroundFields ?? []).includes(first.field);
    const way = hasWay ? ' · есть обходной путь' : '';
    return `${text.changeable || hasWay ? 'Пока нельзя' : 'Нельзя'}: ${text.short}${way}`;
  }
  const more = ordered.length - 1;
  const tail = more > 0 ? ` и ещё ${more}` : '';
  const lead = programSideOnly(verdict) ? 'Похоже, можно' : 'Можно, но сначала';
  return `${lead}: ${text.short}${tail}`;
}
