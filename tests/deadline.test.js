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

test('следующий набор: при известном начале приёма оценка — по месяцу открытия', () => {
  // ITU: приём шёл 24.04–26.06.2026 → откроется ≈ в апреле 2027.
  assert.deepEqual(nextIntake(d('2026-04-24', '2026-06-26'), TODAY), { year: 2027, month: 4 });
  // Начало в прошлом календарном году: СПбГУ 12.11.2025–06.02.2026 → ноябрь 2026, текущий месяц ещё считается.
  assert.deepEqual(nextIntake(d('2025-11-12', '2026-02-06'), TODAY), { year: 2026, month: 11 });
  // Месяц открытия через год уже прошёл, а срок ещё впереди — оценка по сроку.
  assert.deepEqual(nextIntake(d('2025-10-01', '2026-01-15'), TODAY), { year: 2027, month: 1 });
  // Прошли оба месяца — данные устарели, не угадываем.
  assert.equal(nextIntake(d('2025-03-01', '2025-05-01'), TODAY), null);
});

test('следующий набор: срок не прошёл или даты нет — оценки нет', () => {
  assert.equal(nextIntake(d('2026-10-01', '2026-12-15'), TODAY), null);
  assert.equal(nextIntake(d('2026-12-01', '2027-02-01'), TODAY), null);
  assert.equal(nextIntake(d(null, TODAY), TODAY), null);
  assert.equal(nextIntake(d('2026-01-01', null), TODAY), null);
  assert.equal(nextIntake(null, TODAY), null);
  assert.equal(nextIntake({ opens: '2026-01-01', closes: '2026-03-01', recurring: null }, TODAY), null);
});
