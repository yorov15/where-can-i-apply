import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageAt } from '../js/lib/dates.js';

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
