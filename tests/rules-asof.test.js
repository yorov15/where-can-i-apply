import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAge } from '../js/rules.js';

// Настоящий случай из венгерского «Call for Applications»:
// «Applicants born after 31 August 2008 (= applicants under 18 years old
// as of 31 August 2026)». Дата привязана к циклу: в следующем это будет
// 31 августа 2027.
const august31 = { relativeTo: 'applicationYear', monthDay: '08-31' };

const deadline = (closes, confidence = 'confirmed') => ({
  deadline: { opens: null, closes, confidence },
  today: '2026-09-04',
});

test('дата считается из года приёма, а не берётся числом', () => {
  // Родился 1 сентября 2008: на 31 августа 2026 ему ещё 17.
  const me = { birthDate: '2008-09-01' };
  const rule = { min: 18, asOf: august31, evidence: 'x' };
  const got = checkAge(me, rule, deadline('2026-01-15'));
  assert.equal(got.status, 'fail');
  assert.match(got.message, /17/);
});

test('тот же человек в следующем цикле проходит', () => {
  // Ради этого правило и сделано относительным: записанная числом дата
  // 2026-08-31 отсеивала бы его вечно.
  const me = { birthDate: '2008-09-01' };
  const rule = { min: 18, asOf: august31, evidence: 'x' };
  assert.equal(checkAge(me, rule, deadline('2027-01-15')).status, 'pass');
});

test('родившийся на день раньше проходит уже сейчас', () => {
  const me = { birthDate: '2008-08-31' };
  const rule = { min: 18, asOf: august31, evidence: 'x' };
  assert.equal(checkAge(me, rule, deadline('2026-01-15')).status, 'pass');
});

test('без даты приёма относительную дату не посчитать', () => {
  const me = { birthDate: '2008-09-01' };
  const rule = { min: 18, asOf: august31, evidence: 'x' };
  const got = checkAge(me, rule, deadline(null, 'expected'));
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /неизвестна/);
});

test('на неподтверждённом приёме пограничный возраст даёт сомнение', () => {
  const me = { birthDate: '2008-09-01' };
  const rule = { maxExclusive: 19, asOf: august31, evidence: 'x' };
  assert.equal(checkAge(me, rule, deadline('2026-01-15', 'expected')).status, 'unknown');
});

test('явная дата строкой работает по-прежнему', () => {
  const me = { birthDate: '2008-08-09' };
  const rule = { min: 18, asOf: '2026-08-31', evidence: 'x' };
  assert.equal(checkAge(me, rule, deadline('2026-01-15')).status, 'pass');
});
