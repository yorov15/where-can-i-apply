import { test } from 'node:test';
import assert from 'node:assert/strict';
import { examLadder, summaryLines } from '../js/summary.js';

const today = '2026-09-14';
const me = {
  citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11, graduationYear: 2027,
  birthDate: '2009-03-01', gpa: { value: 4.8, scale: 'TJ_5' }, languageTests: [],
};
const open = (closes) => ({ closes, confidence: 'confirmed' });
const ok = { allow: '*', deny: [], evidence: 'x' };
const free = { noLimit: true, evidence: null, checkedBy: 'assistant', checkedAt: '2026-09-13', note: 'нет' };
const program = (id, over = {}) => ({
  id,
  name: { ru: `Программа ${id}` },
  deadline: open('2027-01-01'),
  eligibility: {
    citizenship: ok, schoolCountry: ok, schoolYears: free, graduationYear: free,
    age: free, gpa: free, language: free, ...over,
  },
});
const ielts = (min) => ({ anyOf: [{ test: 'IELTS', min }], evidence: 'x' });

test('лестница: сколько программ откроет каждый балл', () => {
  const programs = [
    program('a'),
    program('b', { language: ielts(6) }),
    program('c', { language: ielts(6.5) }),
    program('d', { language: ielts(6.5) }),
    program('e', { language: ielts(7) }),
  ];
  assert.deepEqual(examLadder(me, programs, today), {
    test: 'IELTS',
    steps: [{ score: 6, gained: 1 }, { score: 6.5, gained: 2 }, { score: 7, gained: 1 }],
  });
});

test('лестница берёт отмеченный экзамен и пропускает баллы не выше текущего', () => {
  const mine = { ...me, languageTests: [{ test: 'DUOLINGO', score: 115 }] };
  const programs = [
    program('a', { language: { anyOf: [{ test: 'DUOLINGO', min: 110 }], evidence: 'x' } }),
    program('b', { language: { anyOf: [{ test: 'DUOLINGO', min: 120 }], evidence: 'x' } }),
  ];
  assert.deepEqual(examLadder(mine, programs, today), { test: 'DUOLINGO', steps: [{ score: 120, gained: 1 }] });
});

test('лестница не обещает программу, которую держит другое требование', () => {
  const programs = [program('a', { language: ielts(6), schoolYears: { min: 12, evidence: 'x' } })];
  assert.deepEqual(examLadder(me, programs, today).steps, []);
});

test('сводка: сколько можно, ближайший срок, лестница', () => {
  const programs = [
    { ...program('a'), deadline: open('2027-01-01') },
    { ...program('b'), deadline: open('2026-10-09') },
    program('c', { language: ielts(6.5) }),
  ];
  assert.deepEqual(summaryLines(me, programs, today), [
    'Можешь подать в 2 программы. Ближайший срок — 9 октября 2026, Программа b.',
    'Наберёшь IELTS 6.5 — можно будет подавать ещё в 1 программу.',
  ]);
});

test('сводка без открытых программ говорит, что делать', () => {
  const programs = [program('a', { language: ielts(6.5) })];
  assert.equal(summaryLines(me, programs, today)[0], 'Прямо сейчас подать некуда — ниже видно, что поменять.');
});

test('сводка просит заполнить поле, которого не хватает чаще всего', () => {
  const noBirth = { ...me, birthDate: null };
  const programs = [program('a', { age: { max: 25, evidence: 'x' } }), program('b', { age: { max: 21, evidence: 'x' } })];
  assert.ok(summaryLines(noBirth, programs, today).includes('Укажи дату рождения — без этого не проверить 2 программы.'));
});

test('сводка называет главную преграду и обходные пути', () => {
  const years = { schoolYears: { min: 12, evidence: 'x' } };
  const programs = [
    { ...program('a', years), workaroundFields: ['schoolYears'] },
    program('b', years),
  ];
  assert.ok(summaryLines(me, programs, today).includes('Число лет школы закрывает 2 программы, у 1 из них есть обходной путь.'));
});

test('программы с закрытым приёмом в сводке не считаются', () => {
  const programs = [{ ...program('a'), deadline: open('2026-09-01') }];
  assert.equal(summaryLines(me, programs, today)[0], 'Прямо сейчас подать некуда — ниже видно, что поменять.');
});

// Сводка обещала «можно подать в 17», а ниже человек видел 36 жёлтых
// карточек и читал их как очередь дел.
test('сводка отделяет программы без чисел от списка дел', () => {
  const programs = [
    program('green'),
    program('vague', { gpa: { notMeasured: true, evidence: 'смотрим аттестат целиком' } }),
    program('vague2', { schoolYears: { notMeasured: true, evidence: 'смотрим аттестат целиком' } }),
    program('todo', { language: ielts(6.5) }),
  ];
  const lines = summaryLines(me, programs, today);
  assert.ok(lines.some((l) => /Ещё 2 программы — похоже, можно/.test(l)), lines.join(' | '));
  assert.ok(lines.some((l) => /^Можешь подать в 1 программу/.test(l)), lines.join(' | '));
});

test('без таких программ строки нет', () => {
  const lines = summaryLines(me, [program('green')], today);
  assert.ok(!lines.some((l) => /похоже, можно/.test(l)), lines.join(' | '));
});
