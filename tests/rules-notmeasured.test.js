import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkCitizenship,
  checkSchoolCountry,
  checkSchoolYears,
  checkGraduationYear,
  checkAge,
  checkGpa,
  checkLanguage,
} from '../js/rules.js';

// Пятое состояние: требование названо в источнике, но инструмент его не
// считает — итальянский B2 у Полимеха, «все пятёрки» у UBC.
//
// До него такие поля оставляли пустыми, и карточка говорила «программа
// не указывает требование к языку». Полимех указывает, и очень громко.
// Человек читал «не указывает» и делал ровно неверный вывод.

const nm = { notMeasured: true, evidence: 'x' };
const me = {
  citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11, graduationYear: 2027,
  birthDate: '2008-08-09', gpa: { value: 4.8, scale: 'TJ_5' },
  languageTests: [{ test: 'IELTS', score: 7 }],
};
const ctx = { deadline: null, today: '2026-09-08' };

const checks = [
  ['citizenship', checkCitizenship],
  ['schoolCountry', checkSchoolCountry],
  ['schoolYears', checkSchoolYears],
  ['graduationYear', checkGraduationYear],
  ['age', checkAge],
  ['gpa', checkGpa],
  ['language', checkLanguage],
];

for (const [name, fn] of checks) {
  test(`${name}: требование есть — это жёлтый, а не зелёный`, () => {
    assert.equal(fn(me, nm, ctx).status, 'unknown');
  });

  test(`${name}: не говорит «программа не указывает»`, () => {
    const got = fn(me, nm, ctx);
    assert.doesNotMatch(got.message, /не указывает/);
    assert.match(got.message, /Требование .* есть/);
  });

  test(`${name}: отсылает к условиям, где написано какое именно`, () => {
    assert.match(fn(me, nm, ctx).message, /условия/);
  });
}

test('пустое поле по-прежнему говорит «не указывает» — это другое', () => {
  assert.match(checkLanguage(me, null, ctx).message, /не указывает/);
});

test('обычное правило пометка не ломает', () => {
  const real = { anyOf: [{ test: 'IELTS', min: 6.5 }], evidence: 'x' };
  assert.equal(checkLanguage(me, real, ctx).status, 'pass');
});
