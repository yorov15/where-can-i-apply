import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readySummary, summaryLines } from '../js/summary.js';

const today = '2026-09-14';
const me = {
  citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11, graduationYear: 2027,
  birthDate: '2009-03-01', gpa: { value: 4.8, scale: 'TJ_5' }, languageTests: [],
};
const open = (closes) => ({ closes, confidence: 'confirmed' });
const ok = { allow: '*', deny: [], evidence: 'x' };
const free = { noLimit: true, evidence: null, checkedBy: 'assistant', checkedAt: '2026-09-13', note: 'нет' };
const program = (id, over = {}, deadline = open('2027-01-01')) => ({
  id,
  name: { ru: `Программа ${id}` },
  deadline,
  eligibility: {
    citizenship: ok, schoolCountry: ok, schoolYears: free, graduationYear: free,
    age: free, gpa: free, language: free, ...over,
  },
});
const ielts = (min) => ({ anyOf: [{ test: 'IELTS', min }], evidence: 'x' });

test('readySummary: сколько подходит и какой срок ближайший', () => {
  const programs = [
    program('a', {}, open('2027-01-01')),
    program('b', {}, open('2026-10-09')),
    program('c', { language: ielts(6.5) }),
  ];
  assert.deepEqual(readySummary(me, programs, today), {
    count: 2,
    next: { date: '2026-10-09', name: 'Программа b' },
  });
});

test('readySummary: срока ни у кого нет — next пустой, а число остаётся', () => {
  const programs = [program('a', {}, { closes: null, confidence: 'unknown' })];
  assert.deepEqual(readySummary(me, programs, today), { count: 1, next: null });
});

test('readySummary: подходящих нет', () => {
  assert.deepEqual(readySummary(me, [program('a', { language: ielts(6.5) })], today), { count: 0, next: null });
});

test('число в readySummary совпадает с первой строкой сводки', () => {
  const programs = [program('a'), program('b')];
  const { count } = readySummary(me, programs, today);
  assert.match(summaryLines(me, programs, today)[0], new RegExp(`к ${count} программам`));
});
