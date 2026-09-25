import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreProblem, gpaProblem, graduationYearProblem, birthDateProblem } from '../js/lib/limits.js';

test('IELTS: от 1 до 9 с шагом 0,5', () => {
  assert.equal(scoreProblem('IELTS', 6.5), null);
  assert.equal(scoreProblem('IELTS', 9), null);
  assert.match(scoreProblem('IELTS', 10), /от 1 до 9/);
  assert.match(scoreProblem('IELTS', 45), /от 1 до 9/);
  assert.match(scoreProblem('IELTS', 0), /от 1 до 9/);
  assert.match(scoreProblem('IELTS', 6.3), /шагом 0,5/);
});

test('TOEFL iBT старой шкалы: целые от 0 до 120', () => {
  assert.equal(scoreProblem('TOEFL_IBT', 100), null);
  assert.match(scoreProblem('TOEFL_IBT', 121), /от 0 до 120/);
  assert.match(scoreProblem('TOEFL_IBT', 99.5), /шагом 1/);
});

test('TOEFL iBT новой шкалы: от 1 до 6 с шагом 0,5', () => {
  assert.equal(scoreProblem('TOEFL_IBT_2026', 4.5), null);
  assert.match(scoreProblem('TOEFL_IBT_2026', 7), /от 1 до 6/);
  assert.match(scoreProblem('TOEFL_IBT_2026', 100), /от 1 до 6/);
});

test('Duolingo: от 10 до 160 с шагом 5', () => {
  assert.equal(scoreProblem('DUOLINGO', 120), null);
  assert.match(scoreProblem('DUOLINGO', 165), /от 10 до 160/);
  assert.match(scoreProblem('DUOLINGO', 5), /от 10 до 160/);
  assert.match(scoreProblem('DUOLINGO', 121), /шагом 5/);
});

test('пустой балл — не ошибка', () => {
  assert.equal(scoreProblem('IELTS', null), null);
  assert.equal(scoreProblem('IELTS', ''), null);
  assert.equal(gpaProblem(null, 'TJ_5'), null);
});

test('средний балл проверяется по своей шкале', () => {
  assert.equal(gpaProblem(4.85, 'TJ_5'), null);
  assert.match(gpaProblem(6, 'TJ_5'), /от 1 до 5/);
  assert.equal(gpaProblem(8.6, 'TJ_10'), null);
  assert.match(gpaProblem(11, 'TJ_10'), /от 1 до 10/);
  assert.match(gpaProblem(4.6, 'GPA_4_5'), /от 0 до 4,5/);
  assert.match(gpaProblem(101, 'PERCENT'), /от 1 до 100/);
  assert.match(gpaProblem(-1, 'GPA_4'), /от 0 до 4/);
});

test('год выпуска: целое от 2020 до 2035', () => {
  assert.equal(graduationYearProblem(2027), null);
  assert.match(graduationYearProblem(1999), /2020/);
  assert.match(graduationYearProblem(2050), /2035/);
  assert.match(graduationYearProblem(2027.5), /2020/);
});

test('дата рождения: не раньше 1985 и не моложе десяти лет', () => {
  assert.equal(birthDateProblem('2009-03-14', '2026-09-26'), null);
  assert.match(birthDateProblem('1970-01-01', '2026-09-26'), /от 1985 до 2016/);
  assert.match(birthDateProblem('2024-01-01', '2026-09-26'), /от 1985 до 2016/);
  assert.equal(birthDateProblem('', '2026-09-26'), null);
});
