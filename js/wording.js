// Тексты причин. Правила возвращают код и числа, человек читает отсюда.
// Голос и образцы — docs/superpowers/specs/2026-09-14-helpful-results-design.md, раздел 4.

const TEST = {
  IELTS: 'IELTS',
  TOEFL_IBT: 'TOEFL по старой шкале',
  TOEFL_IBT_2026: 'TOEFL по новой шкале',
  DUOLINGO: 'Duolingo',
};
export const testName = (test) => TEST[test] ?? test;

export function joinOr(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} или ${items.at(-1)}`;
}

const optionList = (options) => joinOr(options.map((o) => `${testName(o.test)} от ${o.min}`));

const TITLE = {
  citizenship: 'Гражданство', schoolCountry: 'Страна школы', schoolYears: 'Школа',
  graduationYear: 'Год выпуска', age: 'Возраст', gpa: 'Средний балл', language: 'Язык',
};
// «требование к …»
const TO = {
  citizenship: 'гражданству', schoolCountry: 'стране школы', schoolYears: 'школе',
  graduationYear: 'году выпуска', age: 'возрасту', gpa: 'баллу', language: 'языку',
};
// «про …»
const ABOUT = {
  citizenship: 'гражданство', schoolCountry: 'страну школы', schoolYears: 'годы школы',
  graduationYear: 'год выпуска', age: 'возраст', gpa: 'средний балл', language: 'язык',
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

// Отказы, которые могут измениться: пересдать, дождаться возраста или цикла.
const CHANGEABLE = new Set(['language.below', 'gpa.below', 'age.under-min', 'graduationYear.after-cycle']);

function generic(field, state) {
  switch (state) {
    case 'missing-rule':
      return {
        short: `уточнить требования к ${TO[field]}`,
        detail: `На страницах программы про ${ABOUT[field]} ничего не нашлось. Если сомневаешься, спроси у неё.`,
      };
    case 'by-institution':
      return {
        short: `узнать требование к ${TO[field]} в вузе`,
        detail: `Требование к ${TO[field]} ставит принимающий вуз, у каждого своё. Смотри на сайте вуза, куда подаёшь.`,
      };
    case 'not-measured':
      return {
        short: `уточнить требование к ${TO[field]}`,
        detail: `Программа описывает требование к ${TO[field]} словами, а не числом.`,
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
    short: 'уточнить, к какому году окончить школу',
    detail: 'Школу нужно окончить к году подачи, но даты приёма ещё не объявлены, поэтому крайний год пока не посчитать.',
  }),
  'graduationYear.after-cycle': ({ max, mine }) => ({
    short: `нужно окончить школу к ${max}, у тебя ${mine}`,
    detail: `Программа берёт тех, кто оканчивает школу к году подачи — к ${max}. Ты оканчиваешь в ${mine}, так что подать сможешь в следующем цикле.`,
  }),
  'graduationYear.too-late': ({ max, mine }) => ({
    short: `берют выпускников до ${max} года`,
    detail: `Программа берёт тех, кто оканчивает школу не позже ${max} года, а ты — в ${mine}.`,
  }),
  'age.asof-unknown': () => ({
    short: 'уточнить, на какую дату считают возраст',
    detail: 'У программы есть ограничение по возрасту, но не сказано, на какую дату его считают.',
  }),
  'age.near-max': ({ age, limit, why }) => ({
    short: `сверить возраст: около ${age} при пределе ${limit}`,
    detail: `К дате приёма тебе будет около ${age}, а программа берёт до ${limit}. Точно сказать нельзя: ${WHY[why]}. Проверь на сайте программы.`,
  }),
  'age.over-max': ({ age, max, maxExclusive }) => (maxExclusive != null
    ? {
      short: `к подаче тебе будет ${age}, берют младше ${maxExclusive}`,
      detail: `На дату приёма тебе будет ${age}, а программа берёт младше ${maxExclusive}.`,
    }
    : {
      short: `к подаче тебе будет ${age}, берют до ${max}`,
      detail: `На дату приёма тебе будет ${age}, а программа берёт до ${max} включительно.`,
    }),
  'age.near-min': ({ age, min, why }) => ({
    short: `сверить возраст: около ${age} при минимуме ${min}`,
    detail: `К дате приёма тебе будет около ${age}, а программа берёт с ${min}. Точно сказать нельзя: ${WHY[why]}. Проверь на сайте программы.`,
  }),
  'age.under-min': ({ age, min }) => ({
    short: `к подаче тебе будет ${age}, берют с ${min}`,
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
  'language.score-missing': ({ options, advisory }) => ({
    short: 'вписать балл экзамена',
    detail: `Ты отметил экзамен, но не вписал балл. ${advisory ? 'Программа советует' : 'Нужен'} ${optionList(options)}.`,
  }),
  'language.below-advisory': ({ options }) => ({
    short: 'балл ниже рекомендованного',
    detail: `Программа советует ${optionList(options)}, твой результат ниже. Это не отказ: программа называет балл рекомендацией, решает отбор.`,
  }),
  'language.below': ({ options }) => ({
    short: 'результат экзамена ниже порога',
    detail: `Программе нужен ${optionList(options)}, твой результат ниже. Экзамен можно пересдать.`,
  }),
  'language.other-test': ({ tests, options, advisory }) => ({
    short: 'уточнить, примят ли твой экзамен',
    detail: `Твой ${joinOr(tests.map(testName))} программа не называет — она ${advisory ? 'советует' : 'требует'} ${optionList(options)}. Спроси у программы, примят ли твой экзамен.`,
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

export function orderReasons(reasons) {
  const rank = (r) => (r.status === 'fail' ? 0 : USER_SIDE_STATES.has(stateOf(r)) ? 1 : 2);
  return [...reasons].sort((a, b) => rank(a) - rank(b));
}

export function headline(verdict, program) {
  if (verdict.status === 'yes') return 'Можно подавать';
  const ordered = orderReasons(verdict.reasons);
  const first = ordered[0];
  const text = reasonText(first);
  if (verdict.status === 'no') {
    const way = (program.workaroundFields ?? []).includes(first.field) ? ' · есть обходной путь' : '';
    return `${text.changeable ? 'Пока нельзя' : 'Нельзя'}: ${text.short}${way}`;
  }
  const more = ordered.length - 1;
  return `Можно, но сначала: ${text.short}${more > 0 ? ` и ещё ${more}` : ''}`;
}
