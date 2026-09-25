import test from 'node:test';
import assert from 'node:assert/strict';
import { stepView, progressWithTitle } from '../js/steps.js';

test('подпись шага: номер, всего и название', () => {
  assert.equal(progressWithTitle(stepView(1, 4), 'Выпуск и возраст'), 'Шаг 2 из 4 · Выпуск и возраст');
});

test('подпись первого шага', () => {
  assert.equal(progressWithTitle(stepView(0, 4), 'Кто ты'), 'Шаг 1 из 4 · Кто ты');
});
