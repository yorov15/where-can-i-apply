import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, plural, timeLeft, joinAnd, deadlineLine, coverageLine } from '../js/lib/format.js';

test('дата словами, месяц в родительном падеже', () => {
  assert.equal(formatDate('2027-01-01'), '1 января 2027');
  assert.equal(formatDate('2026-10-09'), '9 октября 2026');
});

test('падежи после числа', () => {
  const p = (n) => plural(n, 'программа', 'программы', 'программ');
  assert.deepEqual([1, 2, 5, 11, 21, 22, 112].map(p), [
    'программа', 'программы', 'программ', 'программ', 'программа', 'программы', 'программ',
  ]);
});

test('сколько осталось: дни, недели, месяцы', () => {
  const t = '2026-09-14';
  assert.equal(timeLeft(t, '2026-09-14'), 'сегодня последний день');
  assert.equal(timeLeft(t, '2026-09-15'), 'остался 1 день');
  assert.equal(timeLeft(t, '2026-09-17'), 'осталось 3 дня');
  assert.equal(timeLeft(t, '2026-09-27'), 'осталось 13 дней');
  assert.equal(timeLeft(t, '2026-09-28'), 'осталось 2 недели');
  assert.equal(timeLeft(t, '2026-11-13'), 'осталось 8 недель');
  assert.equal(timeLeft(t, '2026-11-14'), 'осталось 2 месяца');
  assert.equal(timeLeft(t, '2026-11-28'), 'осталось 2,5 месяца');
  assert.equal(timeLeft(t, '2027-02-11'), 'осталось 5 месяцев');
  assert.equal(timeLeft(t, '2026-09-13'), null);
});

test('перечисление через запятую и «и»', () => {
  assert.equal(joinAnd(['учёбу']), 'учёбу');
  assert.equal(joinAnd(['жильё', 'перелёт']), 'жильё и перелёт');
  assert.equal(joinAnd(['учёбу', 'жильё', 'перелёт']), 'учёбу, жильё и перелёт');
});

test('строка срока для каждого состояния приёма', () => {
  const t = '2026-09-14';
  assert.equal(deadlineLine(null, t), 'Сроки программа не объявила');
  assert.equal(
    deadlineLine({ closes: '2026-10-09', confidence: 'confirmed' }, t),
    'Подать до 9 октября 2026 · осталось 3 недели',
  );
  assert.equal(
    deadlineLine({ opens: '2026-09-01', closes: '2027-01-01', confidence: 'expected' }, t),
    'Подать до 1 января 2027 · осталось 3,5 месяца (ожидаемая дата)',
  );
  assert.equal(
    deadlineLine({ opens: '2027-01-10', closes: '2027-02-20', confidence: 'confirmed' }, t),
    'Приём с 10 января 2027, до 20 февраля 2027',
  );
  assert.equal(
    deadlineLine({ closes: '2026-09-01', recurring: 'annual', confidence: 'expected' }, t),
    'Приём закрыт 1 сентября 2026, обычно повторяется каждый год',
  );
});

test('строка покрытия', () => {
  assert.equal(coverageLine({ tuition: true, living: true, travel: true }), 'Покрывает учёбу, жильё и перелёт');
  assert.equal(coverageLine({ tuition: true, living: false, travel: false }), 'Покрывает учёбу; жильё и перелёт — за свой счёт');
  assert.equal(coverageLine({ tuition: null, living: false, travel: false }), 'Жильё и перелёт — за свой счёт');
  assert.equal(coverageLine({ tuition: true, living: null, travel: null }), 'Покрывает учёбу');
  assert.equal(coverageLine({ tuition: null, living: null, travel: null }), 'Что покрывает — в подробностях');
  assert.equal(coverageLine(undefined), 'Что покрывает — в подробностях');
});

test('в строках нет дат в машинном виде', () => {
  const t = '2026-09-14';
  for (const d of [{ closes: '2026-10-09' }, { opens: '2027-01-10', closes: '2027-02-20' }, { closes: '2026-01-01' }]) {
    assert.doesNotMatch(deadlineLine(d, t), /\d{4}-\d{2}-\d{2}/);
  }
});
