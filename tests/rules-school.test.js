import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSchoolYears, checkGraduationYear } from '../js/rules.js';

const me = { schoolYears: 11, graduationYear: 2027 };

test('одиннадцати лет не хватает там, где нужно двенадцать', () => {
  const got = checkSchoolYears(me, { min: 12, evidence: 'x' });
  assert.equal(got.status, 'fail');
  assert.match(got.message, /12/);
  assert.match(got.message, /11/);
});

test('одиннадцати лет хватает там, где нужно одиннадцать', () => {
  assert.equal(checkSchoolYears(me, { min: 11, evidence: 'x' }).status, 'pass');
});

test('явное «ограничения нет» даёт pass, а не unknown', () => {
  assert.equal(checkSchoolYears(me, { min: null, evidence: 'No minimum' }).status, 'pass');
});

test('отсутствие правила даёт unknown', () => {
  assert.equal(checkSchoolYears(me, null).status, 'unknown');
});

test('незаполненное поле профиля даёт unknown', () => {
  assert.equal(checkSchoolYears({}, { min: 12, evidence: 'x' }).status, 'unknown');
});

test('выпуск раньше нижней границы — отказ', () => {
  const got = checkGraduationYear(me, { min: 2028, max: null, evidence: 'x' });
  assert.equal(got.status, 'fail');
  assert.match(got.message, /2028/);
});

test('выпуск позже верхней границы — отказ', () => {
  assert.equal(checkGraduationYear(me, { min: null, max: 2026, evidence: 'x' }).status, 'fail');
});

test('выпуск внутри границ — проходит', () => {
  assert.equal(checkGraduationYear(me, { min: 2025, max: 2027, evidence: 'x' }).status, 'pass');
});
