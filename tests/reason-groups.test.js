import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reasonGroups, reasonLine, bestChange, summaryLines, REASON_GROUPS_MAX } from '../js/summary.js';

const today = '2026-09-14';
const me = {
  citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11, graduationYear: 2027,
  birthDate: '2009-03-01', gpa: { value: 4.8, scale: 'TJ_5' }, languageTests: [{ test: 'IELTS', score: 6 }],
};
const ok = { allow: '*', deny: [], evidence: 'x' };
const free = { noLimit: true, evidence: null, checkedBy: 'assistant', checkedAt: '2026-09-13', note: 'нет' };
const program = (id, over = {}, extra = {}) => ({
  id,
  name: { ru: `Программа ${id}` },
  deadline: { closes: '2027-01-01', confidence: 'confirmed' },
  eligibility: {
    citizenship: ok, schoolCountry: ok, schoolYears: free, graduationYear: free,
    age: free, gpa: free, language: free, ...over,
  },
  ...extra,
});
const ielts = (min) => ({ anyOf: [{ test: 'IELTS', min }], evidence: 'x' });
const years = (min) => ({ min, evidence: 'x' });
const notTj = { allow: ['KZ'], deny: [], evidence: 'x' };
const ageMax = (max) => ({ max, asOf: '2027-01-01', evidence: 'x' });
const many = (n, prefix, over, extra) => Array.from({ length: n }, (_, i) => program(`${prefix}${i}`, over, extra));

test('группы по полю, по убыванию числа программ, с общим порогом', () => {
  const programs = [
    ...many(3, 'l', { language: ielts(6.5) }),
    ...many(2, 'y', { schoolYears: years(12) }),
    ...many(1, 'c', { citizenship: notTj }),
  ];
  assert.deepEqual(reasonGroups(me, programs, today).map(reasonLine), [
    'IELTS ниже 6.5 — 3 программы',
    'Нужно 12 лет школы — 2 программы',
    'Гражданство — 1 программа',
  ]);
});

test('разный порог в группе не называется числом', () => {
  const programs = [program('a', { language: ielts(6.5) }), program('b', { language: ielts(7) })];
  assert.deepEqual(reasonGroups(me, programs, today), [{ field: 'language', count: 2, workarounds: 0, threshold: 'IELTS ниже порога' }]);
  const age = [program('a', { age: ageMax(15) }), program('b', { age: ageMax(16) })];
  assert.equal(reasonLine(reasonGroups(me, age, today)[0]), 'Возраст — 2 программы');
});

test('разные экзамены в группе — только поле', () => {
  const both = { ...me, languageTests: [{ test: 'IELTS', score: 6 }, { test: 'TOEFL_IBT', score: 70 }] };
  const programs = [
    program('a', { language: ielts(6.5) }),
    program('b', { language: { anyOf: [{ test: 'IELTS', min: 6.5 }, { test: 'TOEFL_IBT', min: 80 }], evidence: 'x' } }),
  ];
  assert.equal(reasonLine(reasonGroups(both, programs, today)[0]), 'Результат экзамена — 2 программы');
});

test('одна программа попадает в несколько групп; числа не складываются', () => {
  const both = program('both', { language: ielts(7), age: ageMax(15) });
  const groups = reasonGroups(me, [both], today);
  assert.deepEqual(groups.map((g) => [g.field, g.count]), [['age', 1], ['language', 1]]);
  assert.equal(groups[0].threshold, 'Возраст: берут до 15');
});

test('при равном числе порядок — как у полей анкеты', () => {
  const programs = [program('l', { language: ielts(7) }), program('c', { citizenship: notTj })];
  assert.deepEqual(reasonGroups(me, programs, today).map((g) => g.field), ['citizenship', 'language']);
});

test('не больше пяти групп', () => {
  const programs = [
    program('c', { citizenship: notTj }),
    program('s', { schoolCountry: notTj }),
    program('y', { schoolYears: years(12) }),
    program('g', { graduationYear: { min: 2028, evidence: 'x' } }),
    program('a', { age: ageMax(15) }),
    program('p', { gpa: { min: 99, scale: 'PERCENT', evidence: 'x' } }),
    program('l', { language: ielts(7) }),
  ];
  const groups = reasonGroups(me, programs, today);
  assert.equal(REASON_GROUPS_MAX, 5);
  assert.equal(groups.length, 5);
  assert.deepEqual(groups.map((g) => g.field), ['citizenship', 'schoolCountry', 'schoolYears', 'graduationYear', 'age']);
});

test('закрытый приём и обходные пути', () => {
  const programs = [
    program('open', { schoolYears: years(12) }, { workaroundFields: ['schoolYears'] }),
    program('closed', { schoolYears: years(12) }, { deadline: { closes: '2026-09-01', confidence: 'confirmed' } }),
  ];
  assert.deepEqual(reasonGroups(me, programs, today).map(reasonLine), ['Нужно 12 лет школы — 1 программа, у 1 из них есть обходной путь']);
});

test('«проверь» не считается отказом', () => {
  const noScore = { ...me, languageTests: [] };
  assert.deepEqual(reasonGroups(noScore, [program('a', { language: ielts(7) })], today), []);
});

test('лучшее изменение не советует число лет школы: его не поменять', () => {
  const programs = [...many(3, 'y', { schoolYears: years(12) }), program('l', { language: ielts(6.5) })];
  const lines = summaryLines(me, programs, today);
  assert.ok(!lines.some((l) => l.startsWith('Больше всего программ откроет')), lines.join('\n'));
  assert.ok(lines.some((l) => l.startsWith('Наберёшь IELTS 6.5')), lines.join('\n'));
});

test('лучшее изменение уже названо лестницей — строки нет', () => {
  const programs = [...many(3, 'l', { language: ielts(6.5) }), program('y', { schoolYears: years(12) })];
  assert.equal(bestChange(me, programs, today), null);
  assert.ok(!summaryLines(me, programs, today).some((l) => l.startsWith('Больше всего')));
});

test('лучшее изменение не повторяет сдачу SAT или ACT', () => {
  const sat = { anyOf: [{ test: 'SAT', min: null }], evidence: 'x' };
  const programs = [...many(2, 's', { exam: sat }), program('y', { schoolYears: years(12) })];
  assert.equal(bestChange(me, programs, today), null);
});

test('лучшее изменение не считает то, что держит другое требование', () => {
  const programs = [program('y', { schoolYears: years(12), citizenship: notTj })];
  assert.equal(bestChange(me, programs, today), null);
});

test('лучшее изменение: средний балл в шкале человека', () => {
  const low = { ...me, gpa: { value: 3, scale: 'TJ_5' } };
  const programs = many(2, 'g', { gpa: { min: 4, scale: 'TJ_5', evidence: 'x' } });
  assert.deepEqual(bestChange(low, programs, today), { what: 'средний балл 4', gained: 2 });
});

test('лучшее изменение: балл SAT', () => {
  const withSat = { ...me, exams: [{ test: 'SAT', score: 1200 }] };
  const programs = many(2, 'e', { exam: { anyOf: [{ test: 'SAT', min: 1400 }], evidence: 'x' } });
  assert.deepEqual(bestChange(withSat, programs, today), { what: 'SAT 1400', gained: 2 });
  assert.deepEqual(reasonGroups(withSat, programs, today).map(reasonLine), ['SAT ниже 1400 — 2 программы']);
});
