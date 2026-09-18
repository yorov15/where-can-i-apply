import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLanguage } from '../js/rules.js';

const need = { anyOf: [{ test: 'IELTS', min: 6.0 }, { test: 'TOEFL_IBT', min: 72 }], evidence: 'x' };

test('балл выше порога — проходит', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 7.0 }] };
  assert.equal(checkLanguage(me, need).status, 'pass');
});

test('хватает любого одного из перечисленных', () => {
  const me = { languageTests: [{ test: 'TOEFL_IBT', score: 90 }] };
  assert.equal(checkLanguage(me, need).status, 'pass');
});

test('сертификата нет вовсе — надо проверить, а не отказ', () => {
  const me = { languageTests: [] };
  const got = checkLanguage(me, need);
  assert.equal(got.status, 'unknown');
  assert.equal(got.code, 'language.no-certificate');
});

test('сертификат отмечен без результата — надо проверить', () => {
  const me = { languageTests: [{ test: 'IELTS', score: null }] };
  const got = checkLanguage(me, need);
  assert.equal(got.status, 'unknown');
  assert.equal(got.code, 'language.score-missing');
});

test('сертификат есть, но балл ниже — отказ', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 5.0 }] };
  assert.equal(checkLanguage(me, need).status, 'fail');
});

test('один сертификат ниже порога, другой выше — проходит', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 5.0 }, { test: 'TOEFL_IBT', score: 90 }] };
  assert.equal(checkLanguage(me, need).status, 'pass');
});

test('пустой список требований — проходит', () => {
  const me = { languageTests: [] };
  assert.equal(checkLanguage(me, { anyOf: [], evidence: 'No language requirement' }).status, 'pass');
});

test('отсутствие правила даёт unknown', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 7.0 }] };
  assert.equal(checkLanguage(me, null).status, 'unknown');
});

// KAIST публикует таблицу под заголовком «Recommended Score», а требует
// лишь сам факт сертификата. Красная карточка на таких числах запрещала
// бы подавать документы тому, кому подавать можно.
const advisory = {
  anyOf: [{ test: 'IELTS', min: 6.5 }, { test: 'TOEFL_IBT', min: 83 }],
  advisory: true,
  evidence: 'x',
};

test('рекомендованный балл: недобор не отказ, а проверка', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 6.0 }] };
  const got = checkLanguage(me, advisory);
  assert.equal(got.status, 'unknown');
  assert.equal(got.code, 'language.below-advisory');
});

test('рекомендованный балл: перебор всё равно проходит', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 7.0 }] };
  assert.equal(checkLanguage(me, advisory).status, 'pass');
});

test('рекомендованный балл: без сертификата это проверка', () => {
  const got = checkLanguage({ languageTests: [] }, advisory);
  assert.equal(got.status, 'unknown');
  assert.equal(got.code, 'language.no-certificate');
  assert.equal(got.params.advisory, true);
});

test('обычный порог по-прежнему отказ, флаг ничего не ломает', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 5.0 }] };
  assert.equal(checkLanguage(me, need).status, 'fail');
});

// У Назарбаева IELTS 6.0 — это общий балл, а письмо нужно сдать на 6.0 и
// остальные части на 5.5 каждая. Анкета частей не спрашивает, поэтому
// зелёная карточка по одному общему баллу была бы ложью: человек с
// письмом 5.5 её увидел бы и получил отказ в приёмной комиссии.
const withParts = {
  anyOf: [{ test: 'IELTS', min: 6.0, parts: true }],
  evidence: 'IELTS - 6.0; writing -6.0; reading & listening & speaking - 5.5',
};

test('общий балл подходит, но есть минимумы по частям — проверка, а не «можно»', () => {
  const got = checkLanguage({ languageTests: [{ test: 'IELTS', score: 7.0 }] }, withParts);
  assert.equal(got.status, 'unknown');
  assert.equal(got.code, 'language.parts-unknown');
  assert.deepEqual(got.params, { test: 'IELTS', min: 6.0 });
});

test('общий балл ниже — по-прежнему отказ, части ничего не меняют', () => {
  const got = checkLanguage({ languageTests: [{ test: 'IELTS', score: 5.0 }] }, withParts);
  assert.equal(got.status, 'fail');
  assert.equal(got.code, 'language.below');
});

test('другой экзамен без требований к частям проходит начисто', () => {
  const mixed = {
    anyOf: [{ test: 'IELTS', min: 6.0, parts: true }, { test: 'DUOLINGO', min: 110 }],
    evidence: 'x',
  };
  const me = { languageTests: [{ test: 'IELTS', score: 7.0 }, { test: 'DUOLINGO', score: 120 }] };
  assert.equal(checkLanguage(me, mixed).status, 'pass');
});

// С 21 января 2026 года TOEFL iBT считается по шкале 1–6. Программы
// публикуют два порога, и для движка это два разных экзамена.
const toefl = {
  anyOf: [
    { test: 'IELTS', min: 6.5 },
    { test: 'TOEFL_IBT', min: 90 },
    { test: 'TOEFL_IBT_2026', min: 4.5 },
  ],
  evidence: 'x',
};

test('TOEFL по новой шкале сравнивается с порогом новой шкалы', () => {
  const pass = { languageTests: [{ test: 'TOEFL_IBT_2026', score: 5 }] };
  const below = { languageTests: [{ test: 'TOEFL_IBT_2026', score: 4 }] };
  assert.equal(checkLanguage(pass, toefl).status, 'pass');
  assert.equal(checkLanguage(below, toefl).status, 'fail');
});

test('старая шкала не сравнивается с порогом новой', () => {
  const onlyNew = { anyOf: [{ test: 'IELTS', min: 6.5 }, { test: 'TOEFL_IBT_2026', min: 4.5 }], evidence: 'x' };
  const me = { languageTests: [{ test: 'TOEFL_IBT', score: 110 }] };
  const got = checkLanguage(me, onlyNew);
  assert.equal(got.status, 'unknown');
  assert.equal(got.code, 'language.other-test');
  assert.deepEqual(got.params.tests, ['TOEFL_IBT']);
});

test('сданный экзамен, которого программа не называет, — не «сертификата нет»', () => {
  const onlyIelts = { anyOf: [{ test: 'IELTS', min: 6.0 }], evidence: 'x' };
  const got = checkLanguage({ languageTests: [{ test: 'TOEFL_IBT_2026', score: 5 }] }, onlyIelts);
  assert.equal(got.status, 'unknown');
  assert.notEqual(got.code, 'language.no-certificate');
  assert.equal(got.code, 'language.other-test');
});

test('без сертификата вообще — тоже проверка, а не отказ', () => {
  const got = checkLanguage({ languageTests: [] }, toefl);
  assert.equal(got.status, 'unknown');
  assert.equal(got.code, 'language.no-certificate');
  assert.deepEqual(got.params.options, [
    { test: 'IELTS', min: 6.5 },
    { test: 'TOEFL_IBT', min: 90 },
    { test: 'TOEFL_IBT_2026', min: 4.5 },
  ]);
});

// Duolingo сдают из дома и он дешевле остальных — для наших
// абитуриентов это часто единственный доступный экзамен.
const det = { anyOf: [{ test: 'IELTS', min: 7 }, { test: 'DUOLINGO', min: 120 }], evidence: 'x' };

test('Duolingo сравнивается со своим порогом', () => {
  assert.equal(checkLanguage({ languageTests: [{ test: 'DUOLINGO', score: 125 }] }, det).status, 'pass');
  assert.equal(checkLanguage({ languageTests: [{ test: 'DUOLINGO', score: 110 }] }, det).status, 'fail');
});

test('Duolingo передаётся в параметрах наравне с другими экзаменами', () => {
  const got = checkLanguage({ languageTests: [] }, det);
  assert.equal(got.code, 'language.no-certificate');
  assert.deepEqual(got.params.options, [{ test: 'IELTS', min: 7 }, { test: 'DUOLINGO', min: 120 }]);
});

test('рекомендованный балл: экзамен отмечен без результата — тоже рекомендация', () => {
  const me = { languageTests: [{ test: 'IELTS', score: null }] };
  const got = checkLanguage(me, advisory);
  assert.equal(got.status, 'unknown');
  assert.equal(got.code, 'language.score-missing');
  assert.equal(got.params.advisory, true);
});
