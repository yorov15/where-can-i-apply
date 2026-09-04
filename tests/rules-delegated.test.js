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

// Настоящий случай из венгерского «Call for Applications»:
// «Students shall have a level of proficiency in the language of education
// as required by the Host Institution». Требование есть, но его
// устанавливает вуз, а не программа.
const byInstitution = {
  definedBy: 'institution',
  evidence: 'as required by the Host Institution',
};

const ctx = { deadline: { opens: null, closes: null, confidence: 'expected' }, today: '2026-09-04' };

test('все семь правил отвечают «решает вуз», а не «не указано»', () => {
  const me = {
    citizenship: 'TJ',
    schoolCountry: 'TJ',
    schoolYears: 11,
    graduationYear: 2027,
    birthDate: '2008-08-09',
    gpa: { value: 4.8, scale: 'TJ_5' },
    languageTests: [],
  };
  for (const check of [
    checkCitizenship,
    checkSchoolCountry,
    checkSchoolYears,
    checkGraduationYear,
    checkAge,
    checkGpa,
    checkLanguage,
  ]) {
    const got = check(me, byInstitution, ctx);
    assert.equal(got.status, 'unknown', check.name);
    assert.match(got.message, /вуз/, check.name);
  }
});

test('текст не говорит «программа не указывает» — это было бы неправдой', () => {
  const got = checkLanguage({ languageTests: [] }, byInstitution, ctx);
  assert.doesNotMatch(got.message, /не указыва/);
});

test('обычное правило по-прежнему считается', () => {
  const rule = { anyOf: [{ test: 'IELTS', min: 6.0 }], evidence: 'x' };
  const me = { languageTests: [{ test: 'IELTS', score: 7 }] };
  assert.equal(checkLanguage(me, rule, ctx).status, 'pass');
});

test('definedBy с другим значением не считается делегированием', () => {
  const sneaky = { definedBy: 'nobody', min: 12, evidence: 'x' };
  assert.equal(checkSchoolYears({ schoolYears: 11 }, sneaky, ctx).status, 'fail');
});
