import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deadlineState, deadlineWindow, nextIntake } from '../js/lib/deadline.js';

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

test('без даты открытия не утверждает, что приём идёт', () => {
  // Известен только срок. Открылась ли подача, неизвестно: у HKUST в
  // сентябре срок стоял в будущем, а система подачи ещё не работала.
  assert.equal(deadlineState(d(null, '2027-02-20'), '2027-01-15'), 'due');
});

test('без даты открытия прошедший срок — всё равно «закрыт»', () => {
  assert.equal(deadlineState(d(null, '2027-02-20'), '2027-03-01'), 'closed');
});

// Фиксированная дата: фильтр «идёт / скоро» не должен зависеть от дня запуска тестов.
const TODAY = '2026-11-04';

test('окно срока: «идёт» только с известным началом, «скоро» — до 30 дней включительно', () => {
  assert.deepEqual(deadlineWindow(d('2026-10-01', '2026-11-20'), TODAY), { open: true, soon: true });
  assert.deepEqual(deadlineWindow(d('2026-10-01', '2027-01-15'), TODAY), { open: true, soon: false });
  // Начало не названо — «идёт» не утверждаем, но близкий срок видно.
  assert.deepEqual(deadlineWindow(d(null, '2026-12-04'), TODAY), { open: false, soon: true });
  assert.deepEqual(deadlineWindow(d(null, '2026-12-05'), TODAY), { open: false, soon: false });
  assert.deepEqual(deadlineWindow(d(null, TODAY), TODAY), { open: false, soon: true });
  assert.deepEqual(deadlineWindow(d(null, '2026-11-03'), TODAY), { open: false, soon: false });
  assert.deepEqual(deadlineWindow(d(null, null), TODAY), { open: false, soon: false });
  assert.deepEqual(deadlineWindow(null, TODAY), { open: false, soon: false });
});

test('следующий набор: тот же месяц через год, только у прошедшего ежегодного срока', () => {
  assert.deepEqual(nextIntake(d(null, '2026-06-30'), TODAY), { year: 2027, month: 6 });
  assert.deepEqual(nextIntake(d(null, '2025-11-30'), TODAY), { year: 2026, month: 11 });
  assert.equal(nextIntake(d(null, '2025-10-31'), TODAY), null);
  assert.equal(nextIntake(d(null, '2027-01-15'), TODAY), null);
  assert.equal(nextIntake({ closes: '2026-06-30', recurring: null }, TODAY), null);
  assert.equal(nextIntake(d(null, null), TODAY), null);
});
