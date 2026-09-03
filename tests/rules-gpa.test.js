import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkGpa } from '../js/rules.js';

const me = (value, scale = 'TJ_5') => ({ gpa: { value, scale } });
const need = (min, scale = 'PERCENT') => ({ min, scale, evidence: 'x' });

test('балл заметно выше порога — проходит', () => {
  assert.equal(checkGpa(me(4.8), need(70)).status, 'pass');
});

test('балл заметно ниже порога — отказ', () => {
  const got = checkGpa(me(3.0), need(85));
  assert.equal(got.status, 'fail');
});

test('балл внутри полосы неопределённости — надо проверить', () => {
  // 4.8 по пятибалльной — это 96%, порог 94% отличается на 2 пункта
  const got = checkGpa(me(4.8), need(94));
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /проверь/);
});

test('ровно на границе полосы — ещё надо проверить', () => {
  // 96% против порога 91% — ровно 5 пунктов
  assert.equal(checkGpa(me(4.8), need(91)).status, 'unknown');
});

test('шкалы приводятся к одной, а не сравниваются как числа', () => {
  // 3.6 по четырёхбалльной это 90%, порог 3.0 по пятибалльной это 60%
  assert.equal(checkGpa(me(3.6, 'GPA_4'), need(3.0, 'TJ_5')).status, 'pass');
});

test('явное «порога нет» даёт pass', () => {
  assert.equal(checkGpa(me(4.8), need(null)).status, 'pass');
});

test('отсутствие правила даёт unknown', () => {
  assert.equal(checkGpa(me(4.8), null).status, 'unknown');
});

test('незаполненный балл даёт unknown', () => {
  assert.equal(checkGpa({}, need(70)).status, 'unknown');
});
