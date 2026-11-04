import test from 'node:test';
import assert from 'node:assert/strict';
import { stepView, progressLine } from '../js/steps.js';

test('подпись раздела: номер, всего и следующий раздел', () => {
  assert.equal(progressLine(stepView(1, 5), 'Оценки'), 'Раздел 2 из 5. Дальше: Оценки');
});

test('подпись первого раздела', () => {
  assert.equal(progressLine(stepView(0, 5), 'Выпуск и возраст'), 'Раздел 1 из 5. Дальше: Выпуск и возраст');
});

test('последний раздел говорит, что он последний', () => {
  assert.equal(progressLine(stepView(4, 5)), 'Раздел 5 из 5. Это последний раздел');
});

test('названия разделов в анкете есть у каждого шага: из них берётся «Дальше»', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const form = html.slice(html.indexOf('<form id="profile"'), html.indexOf('</form>'));
  const steps = form.split('<fieldset class="step').slice(1);
  assert.equal(steps.length, 5);
  for (const step of steps) assert.match(step, /^[^>]*>\s*<legend>[^<]+<\/legend>/);
});
