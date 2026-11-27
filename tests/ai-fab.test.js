import test from 'node:test';
import assert from 'node:assert/strict';
import { fabShown, fabMode, explainState, mentorState } from '../js/lib/ai-fab.js';

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

test('режим по умолчанию: на программе «Объяснить», в «Моём пути» и на «Сегодня» — «Наставник»', () => {
  assert.equal(fabMode('program'), 'explain');
  assert.equal(fabMode('answer'), 'explain');
  assert.equal(fabMode('today'), 'mentor');
  assert.equal(fabMode('route'), 'mentor');
});

test('«Объяснить» вне программы ведёт в каталог, у гостя — в анкету', () => {
  assert.equal(explainState({ program: false }), 'catalog');
  assert.equal(explainState({ program: true, block: null }), 'profile');
});

test('«Объяснить» на программе запускает кнопку страницы, готовый ответ только показывает', () => {
  assert.equal(explainState({ program: true, block: { button: true, disabled: false, answer: false } }), 'run');
  assert.equal(explainState({ program: true, block: { button: false, answer: true } }), 'shown');
  assert.equal(explainState({ program: true, block: { button: true, disabled: true, answer: false } }), 'shown');
});

test('«Наставник»: из «Моего пути» ведёт на «Сегодня», там жмёт «Спросить наставника»', () => {
  assert.equal(mentorState({ screen: 'route' }), 'go');
  assert.equal(mentorState({ screen: 'today', block: { button: true, disabled: false, answer: false } }), 'run');
  assert.equal(mentorState({ screen: 'today', block: { button: true, disabled: false, answer: true } }), 'shown');
  assert.equal(mentorState({ screen: 'today', block: { button: true, disabled: true, answer: false } }), 'shown');
  assert.equal(mentorState({ screen: 'today', block: null }), 'empty');
  assert.equal(mentorState({ screen: 'program' }), 'today');
  assert.equal(mentorState({ screen: 'today', on: false }), 'off');
});
