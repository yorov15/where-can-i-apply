import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { graduationExample, gpaExample } from '../js/form.js';
import { tipFor, readSeen, markSeen, TIPS } from '../js/screen-tips.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('graduation example follows the school year', () => {
  assert.match(graduationExample('2026-11-26'), /11 классе — пиши 2027, в 10-м — 2028/);
  assert.match(graduationExample('2027-03-10'), /пиши 2027/);
  assert.match(graduationExample('2027-08-01'), /пиши 2028/);
});

test('gpa example shows the arithmetic on the five-point scale', () => {
  assert.match(gpaExample('TJ_5', '4.8'), /5, 5, 4, 5, 4 → впиши 4\.6/);
  assert.match(gpaExample('PERCENT', '85'), /Например: 85\./);
});

test('every wizard step shows an example outside the field', () => {
  const steps = html.split('<fieldset class="step').slice(1).map((part) => part.split('</fieldset>')[0]);
  assert.equal(steps.length, 5);
  steps.forEach((step, i) => assert.match(step, /Пример|id="grad-example"|id="gpa-example"/, `шаг ${i + 1}`));
  for (const name of ['graduationYear', 'gpaValue']) {
    const tag = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))[0];
    assert.doesNotMatch(tag, /placeholder="\d/, `${name}: число внутри поля похоже на ответ`);
  }
});

test('tips appear once, only where needed, never over the guided hint', () => {
  const seen = new Set();
  assert.equal(tipFor('answer', { hasPlan: false, guided: false, seen }), 'answer');
  assert.equal(tipFor('answer', { hasPlan: false, guided: true, seen }), null);
  assert.equal(tipFor('today', { hasPlan: false, guided: false, seen }), null, 'first screen explains itself');
  assert.equal(tipFor('today', { hasPlan: true, guided: false, seen }), 'path');
  assert.equal(tipFor('answer', { hasPlan: false, guided: false, seen: new Set(['answer']) }), null);
  assert.equal(Object.keys(TIPS).length, 3);
});

test('seen tips survive broken storage', () => {
  const data = {};
  const storage = { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
  markSeen('answer', storage);
  assert.deepEqual([...readSeen(storage)], ['answer']);
  assert.deepEqual([...readSeen({ getItem: () => '{bad' })], []);
  assert.doesNotThrow(() => markSeen('x', { getItem: () => null, setItem() { throw new Error('no'); } }));
});
