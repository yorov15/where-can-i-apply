import test from 'node:test';
import assert from 'node:assert/strict';
import { stepView, firstMissing, STEP_REQUIRED } from '../js/steps.js';
import { profileReady, emptyProfile } from '../js/profile.js';

test('на первом шаге назад нет, дальше есть, «показать» нет', () => {
  assert.deepEqual(stepView(0, 4), { progressText: 'Шаг 1 из 4', showBack: false, showNext: true, showFinish: false });
});

test('на среднем шаге есть и назад, и дальше', () => {
  assert.deepEqual(stepView(2, 4), { progressText: 'Шаг 3 из 4', showBack: true, showNext: true, showFinish: false });
});

test('на последнем шаге вместо «дальше» — «показать»', () => {
  assert.deepEqual(stepView(3, 4), { progressText: 'Шаг 4 из 4', showBack: true, showNext: false, showFinish: true });
});

test('первый шаг просит гражданство, страну и годы школы по порядку', () => {
  assert.equal(firstMissing(0, {}), 'citizenship');
  assert.equal(firstMissing(0, { citizenship: 'TJ' }), 'schoolCountry');
  assert.equal(firstMissing(0, { citizenship: 'TJ', schoolCountry: 'TJ' }), 'schoolYears');
  assert.equal(firstMissing(0, { citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: '11' }), null);
});

test('пустая строка — тоже «не заполнено»', () => {
  assert.equal(firstMissing(1, { graduationYear: '' }), 'graduationYear');
  assert.equal(firstMissing(1, { graduationYear: '2027' }), null);
});

test('баллы и экзамены можно пропустить: без них ответ всё равно считается', () => {
  assert.equal(firstMissing(2, {}), null);
  assert.equal(firstMissing(3, {}), null);
});

// Шаги обязаны просить ровно то, без чего profileReady не пустит к ответу:
// иначе человек прошёл бы мастер и увидел бы пустую анкету.
test('обязательное на шагах совпадает с profileReady', () => {
  const asked = new Set(STEP_REQUIRED.flat());
  assert.deepEqual(
    [...asked].sort(),
    ['citizenship', 'graduationYear', 'schoolCountry', 'schoolYears'],
  );
  const full = { ...emptyProfile(), citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11, graduationYear: 2027 };
  assert.equal(profileReady(full), true);
  for (const name of asked) assert.equal(profileReady({ ...full, [name]: null }), false, name);
});
