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
  assert.match(got.message, /можно сдать/);
});

test('сертификат отмечен без результата — надо проверить', () => {
  const me = { languageTests: [{ test: 'IELTS', score: null }] };
  const got = checkLanguage(me, need);
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /без результата/);
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
  assert.match(got.message, /не отказ/);
});

test('рекомендованный балл: перебор всё равно проходит', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 7.0 }] };
  assert.equal(checkLanguage(me, advisory).status, 'pass');
});

test('рекомендованный балл: без сертификата это проверка', () => {
  const got = checkLanguage({ languageTests: [] }, advisory);
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /Сертификат нужен/);
});

test('обычный порог по-прежнему отказ, флаг ничего не ломает', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 5.0 }] };
  assert.equal(checkLanguage(me, need).status, 'fail');
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
  assert.match(got.message, /не называет/);
  assert.match(got.message, /старая шкала 0–120/);
});

test('сданный экзамен, которого программа не называет, — не «сертификата нет»', () => {
  const onlyIelts = { anyOf: [{ test: 'IELTS', min: 6.0 }], evidence: 'x' };
  const got = checkLanguage({ languageTests: [{ test: 'TOEFL_IBT_2026', score: 5 }] }, onlyIelts);
  assert.equal(got.status, 'unknown');
  assert.doesNotMatch(got.message, /пока нет/);
});

test('в сообщении экзамены названы по-человечески', () => {
  const got = checkLanguage({ languageTests: [] }, toefl);
  assert.match(got.message, /TOEFL iBT \(новая шкала 1–6\) 4\.5/);
  assert.doesNotMatch(got.message, /TOEFL_IBT/);
});

// Duolingo сдают из дома и он дешевле остальных — для наших
// абитуриентов это часто единственный доступный экзамен.
const det = { anyOf: [{ test: 'IELTS', min: 7 }, { test: 'DUOLINGO', min: 120 }], evidence: 'x' };

test('Duolingo сравнивается со своим порогом', () => {
  assert.equal(checkLanguage({ languageTests: [{ test: 'DUOLINGO', score: 125 }] }, det).status, 'pass');
  assert.equal(checkLanguage({ languageTests: [{ test: 'DUOLINGO', score: 110 }] }, det).status, 'fail');
});

test('Duolingo назван по-человечески', () => {
  const got = checkLanguage({ languageTests: [] }, det);
  assert.match(got.message, /Duolingo \(DET\) 120/);
});

test('рекомендованный балл: экзамен отмечен без результата — тоже рекомендация', () => {
  const me = { languageTests: [{ test: 'IELTS', score: null }] };
  const got = checkLanguage(me, advisory);
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /Рекомендовано/);
});
