import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const css = read('css/style.css');
const PAGES = ['index.html', 'faq.html', 'privacy.html', '404.html'];

// Обёртки, на которые опирается только JS: стиль им не нужен.
const UNSTYLED = new Set(['explain-answer']);

const isClassName = (token) => /^[a-z][a-z0-9-]*$/.test(token);

function splitClasses(value) {
  // Динамические куски вида ${model.bucket} отбрасываем целиком: их
  // значения (yes, likely, check, no) стилизуются отдельно и проверяются глазами.
  return value.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter(isClassName);
}

function classesUsed() {
  const used = new Set();
  for (const page of PAGES) {
    for (const match of read(page).matchAll(/class="([^"]+)"/g)) {
      splitClasses(match[1]).forEach((name) => used.add(name));
    }
  }
  for (const file of readdirSync(join(root, 'js')).filter((name) => name.endsWith('.js'))) {
    const source = read(`js/${file}`);
    for (const match of source.matchAll(/el\(\s*'[a-z0-9]+'\s*,\s*(?:'([^']+)'|`([^`]+)`)/g)) {
      splitClasses(match[1] ?? match[2]).forEach((name) => used.add(name));
    }
    for (const match of source.matchAll(/classList\.(?:add|toggle)\('([a-z0-9-]+)'/g)) {
      used.add(match[1]);
    }
  }
  return used;
}

test('каждому классу из HTML и JS есть правило в CSS', () => {
  const missing = [...classesUsed()].filter((name) => !UNSTYLED.has(name) && !css.includes(`.${name}`));
  assert.deepEqual(missing, []);
});

test('высота экрана задаётся не через 100vh', () => {
  assert.doesNotMatch(css, /\b100vh\b/);
});

test('шрифт системный: нет @font-face и адресов из сети', () => {
  assert.doesNotMatch(css, /@font-face/);
  assert.doesNotMatch(css, /url\(\s*['"]?https?:/i);
});

test('есть видимый фокус и отключение движения', () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('CSS не больше 30 КБ', () => {
  assert.ok(Buffer.byteLength(css) <= 30 * 1024, `размер ${Buffer.byteLength(css)} байт`);
});

test('в разметке нет атрибутов style (CSP их не пустит)', () => {
  for (const page of PAGES) {
    assert.doesNotMatch(read(page), /\sstyle\s*=/, page);
  }
  for (const file of readdirSync(join(root, 'js')).filter((name) => name.endsWith('.js'))) {
    assert.doesNotMatch(read(`js/${file}`), /setAttribute\(\s*['"]style['"]/, file);
  }
});
