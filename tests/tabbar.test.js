import test from 'node:test';
import assert from 'node:assert/strict';
import { activeTab } from '../js/tabbar.js';

test('вне каталога активен «Итог», каким бы ни был фильтр', () => {
  assert.equal(activeTab(false, 'all'), 'answer');
  assert.equal(activeTab(false, 'plan'), 'answer');
});

test('в каталоге с фильтром «В плане» активен «План»', () => {
  assert.equal(activeTab(true, 'plan'), 'plan');
});

test('в каталоге с любым другим фильтром активны «Программы»', () => {
  for (const bucket of ['all', 'yes', 'likely', 'check', 'no', undefined]) {
    assert.equal(activeTab(true, bucket), 'catalog', String(bucket));
  }
});
