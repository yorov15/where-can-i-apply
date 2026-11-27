import test from 'node:test';
import assert from 'node:assert/strict';
import { fabShown, quickActions, explainState, weekState } from '../js/lib/ai-fab.js';

test('кнопки нет на анкете, на первом экране и на вводном старте', () => {
  assert.equal(fabShown({ screen: 'profile' }), false);
  assert.equal(fabShown({ screen: 'start' }), false);
  assert.equal(fabShown({ screen: 'today', landing: true }), false);
  assert.equal(fabShown({ screen: undefined }), false);
});

test('кнопка есть в каталоге, на программе, на «Сегодня» и в «Моём пути»', () => {
  for (const screen of ['answer', 'program', 'today', 'route']) assert.equal(fabShown({ screen }), true, screen);
});

test('без адреса функции кнопки нет нигде', () => {
  assert.equal(fabShown({ screen: 'program', enabled: false }), false);
});

test('быстрые кнопки: на программе «Объясни», на «Сегодня» и в «Моём пути» — «Разложи неделю»', () => {
  assert.deepEqual(quickActions({ screen: 'program', program: true }), ['explain']);
  assert.deepEqual(quickActions({ screen: 'today' }), ['week']);
  assert.deepEqual(quickActions({ screen: 'route' }), ['week']);
  // Список стран живёт на экране программы, но объяснять там нечего.
  assert.deepEqual(quickActions({ screen: 'program', program: false }), []);
  assert.deepEqual(quickActions({ screen: 'answer' }), []);
});

test('без наставника недели «Разложи неделю» не предлагаем', () => {
  assert.deepEqual(quickActions({ screen: 'today', mentorOn: false }), []);
  assert.deepEqual(quickActions({ screen: 'program', program: true, mentorOn: false }), ['explain']);
});

test('«Объясни» вне программы не работает, у гостя ведёт в анкету', () => {
  assert.equal(explainState({ program: false }), 'catalog');
  assert.equal(explainState({ program: true, block: null }), 'profile');
});

test('«Объясни» на программе запускает кнопку страницы, готовый ответ только показывает', () => {
  assert.equal(explainState({ program: true, block: { button: true, disabled: false, answer: false } }), 'run');
  assert.equal(explainState({ program: true, block: { button: false, answer: true } }), 'shown');
  assert.equal(explainState({ program: true, block: { button: true, disabled: true, answer: false } }), 'shown');
});

test('«Разложи неделю»: жмёт «Спросить Nero», готовый ответ заново не спрашивает', () => {
  assert.equal(weekState(null), 'wait');
  assert.equal(weekState({ button: true, disabled: false, answer: false }), 'run');
  assert.equal(weekState({ button: true, disabled: false, answer: true }), 'show');
  assert.equal(weekState({ button: true, disabled: true, answer: false }), 'show');
  // Нет кнопки (нет дел или наставник выключен) — только показываем блок.
  assert.equal(weekState({ button: false, disabled: false, answer: false }), 'show');
});
