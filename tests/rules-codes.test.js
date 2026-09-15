import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkCitizenship, checkSchoolCountry, checkSchoolYears, checkGraduationYear,
  checkAge, checkGpa, checkLanguage,
} from '../js/rules.js';
import { reasonText } from '../js/wording.js';

const deadline = { closes: '2027-02-20', confidence: 'confirmed' };
const ctx = { deadline, today: '2026-09-14' };
const lang = { anyOf: [{ test: 'IELTS', min: 6, evidence: 'x' }], evidence: 'x' };
const advisoryLang = { ...lang, advisory: true };

// [функция, профиль, правило, контекст, ожидаемый код]
const CASES = [
  ...[
    [checkCitizenship, 'citizenship', { citizenship: 'TJ' }],
    [checkSchoolCountry, 'schoolCountry', { schoolCountry: 'TJ' }],
  ].flatMap(([fn, f, me]) => [
    [fn, me, null, ctx, `${f}.missing-rule`],
    [fn, me, { definedBy: 'institution', evidence: 'x' }, ctx, `${f}.by-institution`],
    [fn, me, { notMeasured: true, evidence: 'x' }, ctx, `${f}.not-measured`],
    [fn, {}, { allow: '*', deny: [], evidence: 'x' }, ctx, `${f}.no-value`],
    [fn, me, { allow: '*', deny: ['TJ'], evidence: 'x' }, ctx, `${f}.denied`],
    [fn, me, { allow: ['UZ'], evidence: 'x' }, ctx, `${f}.not-in-list`],
  ]),
  [checkSchoolYears, { schoolYears: 11 }, null, ctx, 'schoolYears.missing-rule'],
  [checkSchoolYears, { schoolYears: 11 }, { definedBy: 'institution', evidence: 'x' }, ctx, 'schoolYears.by-institution'],
  [checkSchoolYears, { schoolYears: 11 }, { notMeasured: true, evidence: 'x' }, ctx, 'schoolYears.not-measured'],
  [checkSchoolYears, {}, { min: 12, evidence: 'x' }, ctx, 'schoolYears.no-value'],
  [checkSchoolYears, { schoolYears: 11 }, { min: 12, evidence: 'x' }, ctx, 'schoolYears.below-min'],
  [checkGraduationYear, { graduationYear: 2027 }, null, ctx, 'graduationYear.missing-rule'],
  [checkGraduationYear, { graduationYear: 2027 }, { definedBy: 'institution', evidence: 'x' }, ctx, 'graduationYear.by-institution'],
  [checkGraduationYear, { graduationYear: 2027 }, { notMeasured: true, evidence: 'x' }, ctx, 'graduationYear.not-measured'],
  [checkGraduationYear, {}, { min: 2025, evidence: 'x' }, ctx, 'graduationYear.no-value'],
  [checkGraduationYear, { graduationYear: 2024 }, { min: 2025, evidence: 'x' }, ctx, 'graduationYear.too-early'],
  [checkGraduationYear, { graduationYear: 2027 }, { maxRelative: 'applicationYear', evidence: 'x' }, { deadline: null }, 'graduationYear.cycle-unknown'],
  [checkGraduationYear, { graduationYear: 2028 }, { maxRelative: 'applicationYear', evidence: 'x' }, ctx, 'graduationYear.after-cycle'],
  [checkGraduationYear, { graduationYear: 2027 }, { max: 2026, evidence: 'x' }, ctx, 'graduationYear.too-late'],
  [checkAge, { birthDate: '2008-01-01' }, null, ctx, 'age.missing-rule'],
  [checkAge, { birthDate: '2008-01-01' }, { definedBy: 'institution', evidence: 'x' }, ctx, 'age.by-institution'],
  [checkAge, { birthDate: '2008-01-01' }, { notMeasured: true, evidence: 'x' }, ctx, 'age.not-measured'],
  [checkAge, {}, { max: 25, evidence: 'x' }, ctx, 'age.no-value'],
  [checkAge, { birthDate: '2008-01-01' }, { max: 25, asOf: { relativeTo: 'applicationYear', monthDay: '08-31' }, evidence: 'x' }, { deadline: null, today: null }, 'age.asof-unknown'],
  [checkAge, { birthDate: '2006-06-01' }, { maxExclusive: 21, evidence: 'x' }, ctx, 'age.near-max'],
  [checkAge, { birthDate: '2000-01-01' }, { max: 25, asOf: '2027-02-20', evidence: 'x' }, ctx, 'age.over-max'],
  [checkAge, { birthDate: '2009-06-01' }, { min: 18, evidence: 'x' }, ctx, 'age.near-min'],
  [checkAge, { birthDate: '2012-01-01' }, { min: 18, asOf: '2027-02-20', evidence: 'x' }, ctx, 'age.under-min'],
  [checkGpa, { gpa: { value: 4.8, scale: 'TJ_5' } }, null, ctx, 'gpa.missing-rule'],
  [checkGpa, { gpa: { value: 4.8, scale: 'TJ_5' } }, { definedBy: 'institution', evidence: 'x' }, ctx, 'gpa.by-institution'],
  [checkGpa, { gpa: { value: 4.8, scale: 'TJ_5' } }, { notMeasured: true, evidence: 'x' }, ctx, 'gpa.not-measured'],
  [checkGpa, { gpa: { value: null, scale: 'TJ_5' } }, { min: 70, scale: 'PERCENT', evidence: 'x' }, ctx, 'gpa.no-value'],
  [checkGpa, { gpa: { value: 3.6, scale: 'TJ_5' } }, { min: 70, scale: 'PERCENT', evidence: 'x' }, ctx, 'gpa.near-threshold'],
  [checkGpa, { gpa: { value: 60, scale: 'PERCENT' } }, { min: 70, scale: 'PERCENT', advisory: true, evidence: 'x' }, ctx, 'gpa.below-advisory'],
  [checkGpa, { gpa: { value: 60, scale: 'PERCENT' } }, { min: 70, scale: 'PERCENT', evidence: 'x' }, ctx, 'gpa.below'],
  [checkLanguage, { languageTests: [] }, null, ctx, 'language.missing-rule'],
  [checkLanguage, { languageTests: [] }, { definedBy: 'institution', evidence: 'x' }, ctx, 'language.by-institution'],
  [checkLanguage, { languageTests: [] }, { notMeasured: true, evidence: 'x' }, ctx, 'language.not-measured'],
  [checkLanguage, { languageTests: [{ test: 'IELTS', score: null }] }, lang, ctx, 'language.score-missing'],
  [checkLanguage, { languageTests: [{ test: 'IELTS', score: 5 }] }, advisoryLang, ctx, 'language.below-advisory'],
  [checkLanguage, { languageTests: [{ test: 'IELTS', score: 5 }] }, lang, ctx, 'language.below'],
  [checkLanguage, { languageTests: [{ test: 'DUOLINGO', score: 120 }] }, lang, ctx, 'language.other-test'],
  [checkLanguage, { languageTests: [] }, lang, ctx, 'language.no-certificate'],
];

test('каждое состояние правил отдаёт свой код', () => {
  for (const [fn, me, rule, c, code] of CASES) {
    assert.equal(fn(me, rule, c).code, code, `${fn.name} → ${code}`);
  }
});

test('каждый код, который отдают правила, можно прочитать человеку', () => {
  for (const [fn, me, rule, c] of CASES) {
    const got = fn(me, rule, c);
    const field = got.code.split('.')[0];
    assert.doesNotThrow(() => reasonText({ field, ...got }), got.code);
  }
});

test('у прохода нет кода и параметров', () => {
  assert.deepEqual(checkSchoolYears({ schoolYears: 12 }, { min: 12, evidence: 'x' }, ctx), { status: 'pass', code: null, params: {} });
});

test('в параметрах числа, а не текст', () => {
  assert.deepEqual(checkSchoolYears({ schoolYears: 11 }, { min: 12, evidence: 'x' }, ctx).params, { min: 12, mine: 11 });
  assert.deepEqual(checkGpa({ gpa: { value: 60, scale: 'PERCENT' } }, { min: 70, scale: 'PERCENT', evidence: 'x' }, ctx).params, { mine: 60, need: 70 });
  assert.deepEqual(checkLanguage({ languageTests: [] }, lang, ctx).params, { options: [{ test: 'IELTS', min: 6 }], advisory: false });
  assert.deepEqual(checkAge({ birthDate: '2006-06-01' }, { maxExclusive: 21, evidence: 'x' }, ctx).params, { age: 20, limit: 20, why: 'asof-unknown' });
});
