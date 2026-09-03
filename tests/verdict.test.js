import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../js/verdict.js';

const me = {
  citizenship: 'TJ',
  schoolCountry: 'TJ',
  schoolYears: 11,
  graduationYear: 2027,
  birthDate: '2008-08-09',
  gpa: { value: 4.8, scale: 'TJ_5' },
  languageTests: [{ test: 'IELTS', score: 7.0 }],
};

const full = {
  deadline: { opens: '2027-01-10', closes: '2027-02-20', confidence: 'confirmed' },
  eligibility: {
    citizenship: { allow: '*', deny: [], evidence: 'x' },
    schoolCountry: { allow: '*', deny: [], evidence: 'x' },
    schoolYears: { min: 11, evidence: 'x' },
    graduationYear: { min: 2025, max: 2028, evidence: 'x' },
    age: { min: null, max: 25, asOf: 'deadline', evidence: 'x' },
    gpa: { min: 70, scale: 'PERCENT', evidence: 'x' },
    language: { anyOf: [{ test: 'IELTS', min: 6.0 }], evidence: 'x' },
  },
};

test('все правила проходят — зелёный без причин', () => {
  const got = evaluate(me, full);
  assert.equal(got.status, 'yes');
  assert.deepEqual(got.reasons, []);
});

test('одно правило отказало — красный', () => {
  const p = structuredClone(full);
  p.eligibility.schoolYears = { min: 12, evidence: 'x' };
  const got = evaluate(me, p);
  assert.equal(got.status, 'no');
  assert.equal(got.reasons[0].field, 'schoolYears');
});

test('отказ перевешивает неизвестность', () => {
  const p = structuredClone(full);
  p.eligibility.schoolYears = { min: 12, evidence: 'x' };
  p.eligibility.language = null;
  const got = evaluate(me, p);
  assert.equal(got.status, 'no');
  assert.equal(got.reasons[0].status, 'fail');
  assert.equal(got.reasons[1].status, 'unknown');
});

test('только неизвестность — жёлтый', () => {
  const p = structuredClone(full);
  p.eligibility.gpa = null;
  const got = evaluate(me, p);
  assert.equal(got.status, 'check');
  assert.equal(got.reasons.length, 1);
});

test('отсутствие блока eligibility целиком даёт жёлтый по всем семи полям', () => {
  const got = evaluate(me, { deadline: full.deadline });
  assert.equal(got.status, 'check');
  assert.equal(got.reasons.length, 7);
});

test('текстовые условия на цвет не влияют', () => {
  const p = structuredClone(full);
  p.textConditions = [{ ru: 'Нельзя, если уже учишься в стране программы', evidence: 'x' }];
  assert.equal(evaluate(me, p).status, 'yes');
});
