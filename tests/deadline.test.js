import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deadlineState } from '../js/lib/deadline.js';

const d = (opens, closes) => ({ opens, closes, recurring: 'annual', confidence: 'confirmed' });

test('приём идёт, если сегодня между датами', () => {
  assert.equal(deadlineState(d('2027-01-10', '2027-02-20'), '2027-01-15'), 'open');
});

test('приём ещё не начался', () => {
  assert.equal(deadlineState(d('2027-01-10', '2027-02-20'), '2026-12-31'), 'upcoming');
});

test('приём закрыт', () => {
  assert.equal(deadlineState(d('2027-01-10', '2027-02-20'), '2027-03-01'), 'closed');
});

test('день закрытия ещё считается открытым', () => {
  assert.equal(deadlineState(d('2027-01-10', '2027-02-20'), '2027-02-20'), 'open');
});

test('без даты закрытия состояние неизвестно', () => {
  assert.equal(deadlineState(d('2027-01-10', null), '2027-01-15'), 'unknown');
});

test('без объекта дедлайна состояние неизвестно', () => {
  assert.equal(deadlineState(null, '2027-01-15'), 'unknown');
});

test('без даты открытия приём считается идущим', () => {
  assert.equal(deadlineState(d(null, '2027-02-20'), '2027-01-15'), 'open');
});
