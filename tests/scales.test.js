import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPercent } from '../js/lib/scales.js';

test('таджикская пятибалльная переводится в проценты', () => {
  assert.equal(toPercent(4.8, 'TJ_5'), 96);
});

test('проценты остаются процентами', () => {
  assert.equal(toPercent(70, 'PERCENT'), 70);
});

test('американская четырёхбалльная переводится в проценты', () => {
  assert.equal(toPercent(3.5, 'GPA_4'), 87.5);
});

test('корейская шкала 4.5 переводится в проценты', () => {
  assert.equal(toPercent(4.5, 'GPA_4_5'), 100);
});

test('неизвестная шкала — это ошибка, а не молчаливый ноль', () => {
  assert.throws(() => toPercent(4, 'ABRAKADABRA'), /Неизвестная шкала/);
});
