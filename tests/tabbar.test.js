import test from 'node:test';
import assert from 'node:assert/strict';
import { activeTab } from '../js/tabbar.js';

test('«Куда можно» активна на итоге и в каталоге', () => {
  assert.equal(activeTab(''), 'answer');
  assert.equal(activeTab('#programs'), 'answer');
  assert.equal(activeTab('#programs-x'), 'answer');
});

test('на экране маршрута активен «Мой путь»', () => {
  assert.equal(activeTab('#route'), 'route');
});

test('на экране «Сегодня» активна «Сегодня»', () => {
  assert.equal(activeTab('#today'), 'today');
});
