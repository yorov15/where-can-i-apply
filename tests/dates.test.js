import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageAt, daysSince, isStale, STALE_DAYS } from '../js/lib/dates.js';

test('в день рождения возраст уже полный', () => {
  assert.equal(ageAt('2008-08-09', '2026-08-09'), 18);
});

test('за день до дня рождения на год меньше', () => {
  assert.equal(ageAt('2008-08-09', '2026-08-08'), 17);
});

test('родившийся 29 февраля до 1 марта ещё не постарел', () => {
  assert.equal(ageAt('2008-02-29', '2027-02-28'), 18);
});

test('родившийся 29 февраля с 1 марта постарел', () => {
  assert.equal(ageAt('2008-02-29', '2027-03-01'), 19);
});

test('daysSince считает календарные дни, в том числе через границу года и високосный день', () => {
  assert.equal(daysSince('2026-09-24', '2026-09-26'), 2);
  assert.equal(daysSince('2026-12-31', '2027-01-01'), 1);
  assert.equal(daysSince('2028-02-28', '2028-03-01'), 2);
});

test('давними считаются данные старше 60 дней, ровно 60 — ещё свежие', () => {
  assert.equal(STALE_DAYS, 60);
  assert.equal(isStale('2026-09-24', '2026-11-23'), false);
  assert.equal(isStale('2026-09-24', '2026-11-24'), true);
  assert.equal(isStale(undefined, '2026-11-24'), false);
});
