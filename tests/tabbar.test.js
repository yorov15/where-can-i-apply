import test from 'node:test';
import assert from 'node:assert/strict';
import { activeTab } from '../js/tabbar.js';

test('вне каталога активен «Итог», каким бы ни был фильтр', () => {
  assert.equal(activeTab('', 'all'), 'answer');
  assert.equal(activeTab('', 'plan'), 'answer');
  assert.equal(activeTab('#programs-x', 'plan'), 'answer');
});

test('на экране маршрута активен «Маршрут»', () => {
  assert.equal(activeTab('#route', 'all'), 'route');
  assert.equal(activeTab('#route', 'plan'), 'route');
});

test('в каталоге с фильтром «В плане» активен «План»', () => {
  assert.equal(activeTab('#programs', 'plan'), 'plan');
});

test('в каталоге с любым другим фильтром активны «Программы»', () => {
  for (const bucket of ['all', 'yes', 'likely', 'check', 'no', undefined]) {
    assert.equal(activeTab('#programs', bucket), 'catalog', String(bucket));
  }
});
