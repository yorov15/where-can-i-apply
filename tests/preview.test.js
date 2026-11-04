import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewCount, previewLine, hasAnswers } from '../js/summary.js';
import { emptyProfile } from '../js/profile.js';

// Предварительное число в анкете: открытые программы без единого отказа по
// уже введённым ответам. Пустое поле — «неизвестно», не отказ.
const today = '2026-09-14';
const free = { noLimit: true, evidence: null, checkedBy: 'assistant', checkedAt: '2026-09-13', note: 'нет' };
const any = { allow: '*', deny: [], evidence: 'x' };
const program = (id, over = {}, closes = '2027-01-01') => ({
  id,
  name: { ru: id },
  deadline: { closes, confidence: 'confirmed' },
  eligibility: {
    citizenship: any, schoolCountry: any, schoolYears: free, graduationYear: free,
    age: free, gpa: free, language: free, ...over,
  },
});

const programs = [
  program('open-all'),
  program('only-uz', { citizenship: { allow: ['UZ'], deny: [], evidence: 'x' } }),
  program('no-tj', { citizenship: { allow: '*', deny: ['TJ'], evidence: 'x' } }),
  program('grad-2026', { graduationYear: { min: 2026, max: 2026, evidence: 'x' } }),
  program('ielts', { language: { anyOf: [{ test: 'IELTS', min: 6.5 }], evidence: 'x' } }),
  program('closed', {}, '2026-01-01'),
];

test('пустая анкета: в счёт идут все открытые программы, закрытые — нет', () => {
  assert.equal(previewCount(emptyProfile(), programs, today), 5);
  assert.equal(hasAnswers(emptyProfile()), false);
});

test('только гражданство: отпадают программы, где оно не подходит', () => {
  const profile = { ...emptyProfile(), citizenship: 'TJ' };
  assert.equal(previewCount(profile, programs, today), 3);
  assert.equal(hasAnswers(profile), true);
});

test('гражданство и год выпуска: отпадает и программа с другим годом', () => {
  const profile = { ...emptyProfile(), citizenship: 'TJ', graduationYear: 2027 };
  assert.equal(previewCount(profile, programs, today), 2);
});

test('не указанный экзамен не отсеивает программу с требованием IELTS', () => {
  const profile = { ...emptyProfile(), citizenship: 'TJ', graduationYear: 2027 };
  const ids = programs.filter((p) => previewCount(profile, [p], today) === 1).map((p) => p.id);
  assert.deepEqual(ids, ['open-all', 'ielts']);
});

test('строка не говорит «подходишь» и меняет хвост на последнем шаге', () => {
  assert.equal(previewLine(140), 'Пока ничего не мешает: 140 программ. Число уточнится, когда ответишь дальше.');
  assert.equal(previewLine(1, true), 'Пока ничего не мешает: 1 программа.');
  assert.equal(previewLine(3), 'Пока ничего не мешает: 3 программы. Число уточнится, когда ответишь дальше.');
  assert.match(previewLine(0), /не осталось/);
  for (const n of [0, 1, 140]) assert.doesNotMatch(previewLine(n), /подходишь|шанс|вероятн/i);
});
