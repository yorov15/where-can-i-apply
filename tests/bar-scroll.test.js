import test from 'node:test';
import assert from 'node:assert/strict';
import { nextBarState } from '../js/barscroll.js';

const H = 120;

test('у самого верха панель всегда на месте', () => {
  assert.deepEqual(nextBarState({ away: true, last: 500 }, 40, H), { away: false, last: 40 });
});

test('прокрутка вниз прячет панель', () => {
  assert.deepEqual(nextBarState({ away: false, last: 300 }, 340, H), { away: true, last: 340 });
});

test('первое движение вверх возвращает панель', () => {
  assert.deepEqual(nextBarState({ away: true, last: 340 }, 320, H), { away: false, last: 320 });
});

test('дрожь меньше шага ничего не меняет и не сдвигает точку отсчёта', () => {
  assert.deepEqual(nextBarState({ away: true, last: 340 }, 343, H), { away: true, last: 340 });
  assert.deepEqual(nextBarState({ away: false, last: 340 }, 337, H), { away: false, last: 340 });
});

test('медленная прокрутка набирает шаг и прячет панель', () => {
  let state = { away: false, last: 300 };
  for (const y of [302, 304, 307]) state = nextBarState(state, y, H);
  assert.equal(state.away, true);
});
