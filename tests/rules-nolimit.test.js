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
import { evaluate } from '../js/verdict.js';

// Правило, которым человек ручается: требования на странице нет.
// Значений в нём быть не может — только подпись.
const absent = {
  noLimit: true,
  evidence: null,
  checkedBy: 'human',
  checkedAt: '2026-09-03',
  note: 'На утверждённых страницах требования нет',
};

const ctx = { deadline: { opens: null, closes: null, confidence: 'expected' } };

test('все семь правил пропускают отсутствие ограничения', () => {
  const empty = {};
  for (const check of [
    checkCitizenship,
    checkSchoolCountry,
    checkSchoolYears,
    checkGraduationYear,
    checkAge,
    checkGpa,
    checkLanguage,
  ]) {
    assert.equal(check(empty, absent, ctx).status, 'pass', check.name);
  }
});

test('возраст не требует даты рождения, если ограничения нет', () => {
  // До правки checkAge спотыкался тут об отсутствующий asOf и выдавал
  // unknown — правило без ограничения превращалось в жёлтое.
  assert.equal(checkAge({}, absent, ctx).status, 'pass');
});

test('пустое сообщение, как у любого pass', () => {
  assert.equal(checkGpa({}, absent, ctx).message, '');
});

test('noLimit без true работает как обычное правило', () => {
  const sneaky = { noLimit: false, min: 12, evidence: 'x' };
  assert.equal(checkSchoolYears({ schoolYears: 11 }, sneaky, ctx).status, 'fail');
});

test('вердикт зелёный, а поля перечислены отдельно', () => {
  const me = {
    citizenship: 'TJ',
    schoolCountry: 'TJ',
    schoolYears: 11,
    graduationYear: 2027,
    birthDate: '2008-08-09',
    gpa: { value: 4.8, scale: 'TJ_5' },
    languageTests: [],
  };
  const program = {
    deadline: { opens: null, closes: null, confidence: 'expected' },
    eligibility: {
      citizenship: { allow: ['TJ'], deny: [], evidence: 'x' },
      schoolCountry: { allow: '*', deny: [], evidence: 'x' },
      schoolYears: { min: 11, evidence: 'x' },
      graduationYear: { min: null, max: null, evidence: 'x' },
      age: absent,
      gpa: absent,
      language: absent,
    },
  };
  const got = evaluate(me, program);
  assert.equal(got.status, 'yes');
  assert.deepEqual(got.reasons, []);
  assert.deepEqual(got.attested, ['age', 'gpa', 'language']);
});

test('поля с настоящим требованием в attested не попадают', () => {
  const program = {
    deadline: { opens: null, closes: null, confidence: 'expected' },
    eligibility: { schoolYears: { min: 11, evidence: 'x' } },
  };
  assert.deepEqual(evaluate({ schoolYears: 11 }, program).attested, []);
});
