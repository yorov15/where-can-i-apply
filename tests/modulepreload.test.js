import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

// Все модули, до которых main.js доходит через import, со вложенными.
function reachable(entry) {
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const match of read(file).matchAll(/(?:^|\n)\s*(?:import|export)\b[^;]*?from\s+'(\.[^']+)'/g)) {
      walk(relative(root, join(root, dirname(file), match[1])).split(sep).join('/'));
    }
  };
  walk(entry);
  return seen;
}

test('index.html заранее называет все модули: иначе они грузятся ступенями', () => {
  // Без этого браузер узнаёт о каждом следующем уровне импортов только после
  // загрузки предыдущего, и на медленной связи это четыре круга ожидания подряд.
  const html = read('index.html');
  const hinted = new Set([...html.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map((m) => m[1]));
  const needed = reachable('js/main.js');
  assert.deepEqual([...needed].filter((file) => !hinted.has(file)), [], 'не хватает modulepreload');
  assert.deepEqual([...hinted].filter((file) => !needed.has(file)), [], 'лишний modulepreload (файла нет в дереве импортов)');
});
