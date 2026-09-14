import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reasonText, orderReasons, headline, joinOr } from '../js/wording.js';

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
  { field: 'language', status: 'unknown', code: 'language.score-missing', params: { options: opts, advisory: false } },
  { field: 'language', status: 'unknown', code: 'language.score-missing', params: { options: opts, advisory: true } },
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
  assert.equal(headline(verdict, { workaroundFields: ['schoolYears'] }), 'Нельзя: нужно 12 лет школы, у тебя 11 · есть обходной путь');
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
