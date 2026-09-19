import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reasonText, orderReasons, headline, joinOr, programSideOnly } from '../js/wording.js';

const FIELDS = ['citizenship', 'schoolCountry', 'schoolYears', 'graduationYear', 'age', 'gpa', 'language'];
const opts = [{ test: 'IELTS', min: 6.5 }, { test: 'TOEFL_IBT', min: 90 }, { test: 'DUOLINGO', min: 125 }];

// Каждый код, который умеет выдавать движок, с правдоподобными числами.
const SAMPLES = [
  ...FIELDS.flatMap((f) => ['missing-rule', 'by-institution', 'not-measured'].map((s) => ({ field: f, status: 'unknown', code: `${f}.${s}`, params: {} }))),
  ...['citizenship', 'schoolCountry', 'schoolYears', 'graduationYear', 'age', 'gpa'].map((f) => ({ field: f, status: 'unknown', code: `${f}.no-value`, params: {} })),
  { field: 'citizenship', status: 'fail', code: 'citizenship.denied', params: {} },
  { field: 'citizenship', status: 'fail', code: 'citizenship.not-in-list', params: {} },
  { field: 'schoolCountry', status: 'fail', code: 'schoolCountry.denied', params: {} },
  { field: 'schoolCountry', status: 'fail', code: 'schoolCountry.not-in-list', params: {} },
  { field: 'schoolYears', status: 'fail', code: 'schoolYears.below-min', params: { min: 12, mine: 11 } },
  { field: 'graduationYear', status: 'fail', code: 'graduationYear.too-early', params: { min: 2025, mine: 2024 } },
  { field: 'graduationYear', status: 'unknown', code: 'graduationYear.cycle-unknown', params: {} },
  { field: 'graduationYear', status: 'fail', code: 'graduationYear.after-cycle', params: { max: 2027, mine: 2028 } },
  { field: 'graduationYear', status: 'fail', code: 'graduationYear.too-late', params: { max: 2026, mine: 2027 } },
  { field: 'age', status: 'unknown', code: 'age.asof-unknown', params: {} },
  ...['no-dates', 'cycle-guessed', 'asof-unknown', 'unconfirmed'].map((why) => ({ field: 'age', status: 'unknown', code: 'age.near-max', params: { age: 20, limit: 20, why } })),
  { field: 'age', status: 'fail', code: 'age.over-max', params: { age: 21, maxExclusive: 21 } },
  { field: 'age', status: 'fail', code: 'age.over-max', params: { age: 26, max: 25 } },
  { field: 'age', status: 'unknown', code: 'age.near-min', params: { age: 17, min: 18, why: 'unconfirmed' } },
  { field: 'age', status: 'fail', code: 'age.under-min', params: { age: 15, min: 18 } },
  { field: 'gpa', status: 'unknown', code: 'gpa.near-threshold', params: { mine: 72, need: 70 } },
  { field: 'gpa', status: 'unknown', code: 'gpa.below-advisory', params: { mine: 88, need: 90 } },
  { field: 'gpa', status: 'fail', code: 'gpa.below', params: { mine: 60, need: 70 } },
  { field: 'language', status: 'unknown', code: 'language.score-missing', params: { options: opts, advisory: false, marked: ['IELTS'] } },
  { field: 'language', status: 'unknown', code: 'language.score-missing', params: { options: opts, advisory: true, marked: ['TOEFL_IBT'] } },
  { field: 'language', status: 'unknown', code: 'language.score-missing', params: { options: opts, advisory: false } },
  { field: 'language', status: 'unknown', code: 'language.parts-unknown', params: { test: 'IELTS', min: 6 } },
  { field: 'language', status: 'unknown', code: 'language.below-advisory', params: { options: opts } },
  { field: 'language', status: 'fail', code: 'language.below', params: { options: opts } },
  { field: 'language', status: 'unknown', code: 'language.other-test', params: { tests: ['TOEFL_IBT_2026'], options: opts, advisory: false } },
  { field: 'language', status: 'unknown', code: 'language.no-certificate', params: { options: opts, advisory: false } },
  { field: 'language', status: 'unknown', code: 'language.no-certificate', params: { options: opts, advisory: true } },
];

test('у каждого кода есть заголовок, объяснение и короткая форма', () => {
  for (const reason of SAMPLES) {
    const t = reasonText(reason);
    for (const key of ['title', 'detail', 'short']) {
      assert.ok(t[key] && t[key].length > 3, `${reason.code}: пустой ${key}`);
    }
  }
});

test('тексты не говорят про внутренности', () => {
  for (const reason of SAMPLES) {
    const t = reasonText(reason);
    const all = `${t.title} ${t.detail} ${t.short}`;
    assert.doesNotMatch(all, /инструмент|не считает|правил|undefined|NaN|\d{4}-\d{2}-\d{2}/, reason.code);
    for (const f of FIELDS) assert.ok(!all.includes(f), `${reason.code}: имя поля ${f} в тексте`);
    assert.doesNotMatch(all, /TOEFL_IBT|DUOLINGO/, reason.code);
  }
});

test('короткая форма помещается в заголовок карточки', () => {
  for (const reason of SAMPLES) assert.ok(reasonText(reason).short.length <= 60, reason.code);
});

test('незнакомый код — ошибка, а не пустая строка', () => {
  assert.throws(() => reasonText({ field: 'age', status: 'unknown', code: 'age.whatever', params: {} }));
});

test('образцы из спецификации', () => {
  const years = reasonText({ field: 'schoolYears', status: 'fail', code: 'schoolYears.below-min', params: { min: 12, mine: 11 } });
  assert.equal(years.title, 'Школа');
  assert.equal(years.short, 'нужно 12 лет школы, у тебя 11');
  assert.equal(years.detail, 'Программа принимает после 12 лет школы, а у тебя 11.');
  assert.equal(years.changeable, false);

  const cert = reasonText({ field: 'language', status: 'unknown', code: 'language.no-certificate', params: { options: opts, advisory: false } });
  assert.equal(cert.short, 'сдать английский (IELTS от 6.5)');
  assert.equal(cert.detail, 'Нужен сертификат: IELTS от 6.5, TOEFL по старой шкале от 90 или Duolingo от 125. Сертификата пока нет — сдать ещё успеешь.');

  const lang = reasonText({ field: 'language', status: 'fail', code: 'language.below', params: { options: opts } });
  assert.equal(lang.changeable, true);
});

// Человек отметил IELTS и не вписал балл — и тридцать карточек говорили
// ему одно и то же «вписать балл экзамена», молча пряча главное: где 6.0,
// а где 7.5. Порог должен стоять в самой строке.
test('заголовок называет экзамен и нужный балл', () => {
  const marked = reasonText({ field: 'language', status: 'unknown', code: 'language.score-missing', params: { options: opts, advisory: false, marked: ['IELTS'] } });
  assert.equal(marked.short, 'вписать балл IELTS (нужно от 6.5)');

  const toefl = reasonText({ field: 'language', status: 'unknown', code: 'language.score-missing', params: { options: opts, advisory: true, marked: ['TOEFL_IBT'] } });
  assert.equal(toefl.short, 'вписать балл TOEFL по старой шкале (рекомендуют от 90)');

  // Старые профили и чужие данные могут не назвать отмеченный экзамен.
  const any = reasonText({ field: 'language', status: 'unknown', code: 'language.score-missing', params: { options: opts, advisory: false } });
  assert.equal(any.short, 'вписать балл IELTS (нужно от 6.5)');
});

test('минимумы по частям: общий балл не выдаётся за готовый ответ', () => {
  const t = reasonText({ field: 'language', status: 'unknown', code: 'language.parts-unknown', params: { test: 'IELTS', min: 6 } });
  assert.equal(t.short, 'сверить баллы по частям экзамена');
  assert.match(t.detail, /Общий балл подходит: IELTS от 6/);
  assert.match(t.detail, /по отдельным частям/);
});

test('рекомендованный балл не выдаётся за порог', () => {
  const t = reasonText({ field: 'gpa', status: 'unknown', code: 'gpa.below-advisory', params: { mine: 88, need: 90 } });
  assert.match(t.detail, /не отказ/);
  const l = reasonText({ field: 'language', status: 'unknown', code: 'language.below-advisory', params: { options: opts } });
  assert.match(l.detail, /не отказ/);
});

test('экзамены по-человечески', () => {
  const t = reasonText({ field: 'language', status: 'unknown', code: 'language.other-test', params: { tests: ['TOEFL_IBT_2026'], options: [{ test: 'IELTS', min: 6 }], advisory: false } });
  assert.match(t.detail, /TOEFL по новой шкале/);
  assert.match(t.detail, /IELTS от 6/);
});

test('перечисление через «или»', () => {
  assert.equal(joinOr(['a']), 'a');
  assert.equal(joinOr(['a', 'b', 'c']), 'a, b или c');
});

test('сначала отказы, среди остального — то, что делает сам человек', () => {
  const program = { code: 'schoolYears.not-measured', field: 'schoolYears', status: 'unknown', params: {} };
  const cert = { code: 'language.no-certificate', field: 'language', status: 'unknown', params: { options: opts } };
  const fail = { code: 'gpa.below', field: 'gpa', status: 'fail', params: { mine: 60, need: 70 } };
  assert.deepEqual(orderReasons([program, cert, fail]).map((r) => r.code), ['gpa.below', 'language.no-certificate', 'schoolYears.not-measured']);
});

test('заголовок: можно', () => {
  assert.equal(headline({ status: 'yes', reasons: [] }, {}), 'Можно подавать');
});

test('заголовок: нельзя насовсем, но с обходным путём', () => {
  const verdict = { status: 'no', reasons: [{ field: 'schoolYears', status: 'fail', code: 'schoolYears.below-min', params: { min: 12, mine: 11 } }] };
  // Обходной путь и есть то самое «пока»: у Политеха Милана его закрывает
  // подготовительный курс, и «Нельзя … есть обходной путь» в одной строке
  // противоречило само себе.
  assert.equal(headline(verdict, { workaroundFields: ['schoolYears'] }), 'Пока нельзя: нужно 12 лет школы, у тебя 11 · есть обходной путь');
  assert.equal(headline(verdict, {}), 'Нельзя: нужно 12 лет школы, у тебя 11');
});

test('заголовок: пока нельзя, если человек может это изменить', () => {
  const verdict = { status: 'no', reasons: [{ field: 'language', status: 'fail', code: 'language.below', params: { options: opts } }] };
  assert.equal(headline(verdict, {}), 'Пока нельзя: результат экзамена ниже порога');
});

test('заголовок: можно, но сначала — и сколько ещё', () => {
  const verdict = {
    status: 'check',
    reasons: [
      { field: 'schoolYears', status: 'unknown', code: 'schoolYears.not-measured', params: {} },
      { field: 'language', status: 'unknown', code: 'language.no-certificate', params: { options: opts } },
    ],
  };
  assert.equal(headline(verdict, {}), 'Можно, но сначала: сдать английский (IELTS от 6.5) и ещё 1');
});

// Пятнадцать карточек говорили «уточнить требование к языку» — одинаково
// и ни о чём. Человеку слышалось поручение, хотя поручать нечего:
// программа просто не публикует порога.
test('когда чисел нет у программы, подлежащее — программа, а не человек', () => {
  const vague = (field, state) => reasonText({ field, status: 'unknown', code: `${field}.${state}`, params: {} }).short;
  assert.equal(vague('language', 'not-measured'), 'порога по языку программа не называет');
  assert.equal(vague('gpa', 'not-measured'), 'проходного балла программа не называет');
  assert.equal(vague('schoolYears', 'missing-rule'), 'про годы школы программа молчит');
  assert.equal(vague('gpa', 'by-institution'), 'требование к баллу ставит сам вуз');
  for (const state of ['not-measured', 'missing-rule', 'by-institution']) {
    for (const field of FIELDS) {
      assert.doesNotMatch(vague(field, state), /^(уточни|узнай|уточнить|узнать|вписать|сдать|сверить)/, `${field}.${state}`);
    }
  }
});

test('заголовок: похоже, можно — когда чисел не назвала программа', () => {
  const only = {
    status: 'check',
    reasons: [
      { field: 'schoolYears', status: 'unknown', code: 'schoolYears.not-measured', params: {} },
      { field: 'gpa', status: 'unknown', code: 'gpa.by-institution', params: {} },
    ],
  };
  assert.equal(headline(only, {}), 'Похоже, можно: числа лет школы программа не называет и ещё 1');
});

test('заголовок: одно дело человека возвращает «можно, но сначала»', () => {
  const mixed = {
    status: 'check',
    reasons: [
      { field: 'schoolYears', status: 'unknown', code: 'schoolYears.not-measured', params: {} },
      { field: 'gpa', status: 'unknown', code: 'gpa.no-value', params: {} },
    ],
  };
  assert.equal(headline(mixed, {}), 'Можно, но сначала: указать средний балл и ещё 1');
});

test('«похоже, можно» не подменяет собой ни зелёный ответ, ни отказ', () => {
  assert.equal(programSideOnly({ status: 'yes', reasons: [] }), false);
  assert.equal(programSideOnly({ status: 'check', reasons: [] }), false);
  assert.equal(
    programSideOnly({ status: 'no', reasons: [{ field: 'gpa', status: 'fail', code: 'gpa.below', params: {} }] }),
    false,
  );
});

// «Можно, но сначала: числа лет школы программа не называет и ещё 1» —
// дело человека пряталось за «и ещё 1», а в заголовок шло то, с чем он
// всё равно ничего не сделает.
test('в заголовок идёт дело человека, а не молчание программы', () => {
  const verdict = {
    status: 'check',
    reasons: [
      { field: 'schoolYears', status: 'unknown', code: 'schoolYears.not-measured', params: {} },
      { field: 'language', status: 'unknown', code: 'language.below-advisory', params: { options: opts } },
    ],
  };
  assert.equal(headline(verdict, {}), 'Можно, но сначала: балл ниже рекомендованного и ещё 1');
  assert.deepEqual(orderReasons(verdict.reasons).map((r) => r.code), ['language.below-advisory', 'schoolYears.not-measured']);
});
