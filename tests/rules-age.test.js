import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAge } from '../js/rules.js';

const me = { birthDate: '2008-08-09' };
const confirmed = { deadline: { opens: '2027-01-10', closes: '2027-02-20', confidence: 'confirmed' } };
const expected = { deadline: { opens: '2027-01-10', closes: '2027-02-20', confidence: 'expected' } };
const rule = (max) => ({ min: null, max, asOf: 'deadline', evidence: 'x' });

test('проходит по возрасту с запасом', () => {
  assert.equal(checkAge(me, rule(21), confirmed).status, 'pass');
});

test('не проходит по возрасту', () => {
  const got = checkAge(me, rule(17), confirmed);
  assert.equal(got.status, 'fail');
  assert.match(got.message, /18/);
  assert.match(got.message, /17/);
});

test('ровно на пределе при подтверждённой дате — проходит', () => {
  assert.equal(checkAge(me, rule(18), confirmed).status, 'pass');
});

test('ровно на пределе при неподтверждённой дате — надо проверить', () => {
  const got = checkAge(me, rule(18), expected);
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /не подтверждена/);
});

test('далеко от предела при неподтверждённой дате — обычный ответ', () => {
  assert.equal(checkAge(me, rule(25), expected).status, 'pass');
});

test('явная дата в asOf используется вместо дедлайна', () => {
  const r = { min: null, max: 18, asOf: '2027-04-01', evidence: 'x' };
  assert.equal(checkAge(me, r, confirmed).status, 'pass');
});

test('без даты закрытия возраст посчитать не на что', () => {
  const ctx = { deadline: { opens: null, closes: null, confidence: 'expected' } };
  assert.equal(checkAge(me, rule(21), ctx).status, 'unknown');
});

test('нижняя граница возраста тоже работает', () => {
  const r = { min: 19, max: null, asOf: 'deadline', evidence: 'x' };
  assert.equal(checkAge(me, r, confirmed).status, 'fail');
});

test('незаполненная дата рождения даёт unknown', () => {
  assert.equal(checkAge({}, rule(21), confirmed).status, 'unknown');
});
