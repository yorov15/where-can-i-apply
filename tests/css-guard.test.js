import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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

test('шрифт свой, с этого же сайта: нет адресов из сети, есть системный запасной', () => {
  assert.doesNotMatch(css, /url\(\s*['"]?(?:https?:|\/\/)/i);
  const urls = [...css.matchAll(/url\(\s*["']?([^"')]+)/g)].map((m) => m[1]).filter((u) => /\.woff2$/.test(u));
  assert.ok(urls.length >= 2, 'нужны кириллица и латиница');
  for (const url of urls) {
    assert.match(url, /^\.\.\/fonts\/[a-z-]+\.woff2$/, url);
    assert.ok(existsSync(join(root, 'css', url)), `нет файла ${url}`);
  }
  assert.match(css, /font:[^;]*Onest, system-ui/);
});

test('CSP разрешает шрифты только с этого же сайта', () => {
  for (const page of PAGES) {
    assert.match(read(page), /Content-Security-Policy" content="[^"]*font-src 'self';/, page);
  }
});

test('есть видимый фокус и отключение движения', () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('CSS не больше 36 КБ', () => {
  assert.ok(Buffer.byteLength(css) <= 36 * 1024, `размер ${Buffer.byteLength(css)} байт`);
});

test('в разметке нет атрибутов style (CSP их не пустит)', () => {
  for (const page of PAGES) {
    assert.doesNotMatch(read(page), /\sstyle\s*=/, page);
  }
  for (const file of readdirSync(join(root, 'js')).filter((name) => name.endsWith('.js'))) {
    assert.doesNotMatch(read(`js/${file}`), /setAttribute\(\s*['"]style['"]/, file);
  }
});

test('в CSS нет чисто чёрного и чисто белого', () => {
  assert.doesNotMatch(css, /#(?:000|000000|fff|ffffff)\b/i);
});

test('палитра: токены поверхностей заданы, вердикты сохранены в обеих темах', () => {
  for (const token of ['--bg', '--surface', '--soft', '--line', '--fg', '--muted', '--ink', '--on-ink']) {
    assert.match(css, new RegExp(`${token}:`), token);
  }
  for (const verdict of ['yes', 'likely', 'check', 'no']) {
    const count = css.split(`--${verdict}:`).length - 1;
    // светлая, тёмная по системе, тёмная по ручному выбору
    assert.equal(count, 3, `--${verdict} должен быть в светлой и в обеих тёмных записях`);
  }
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /:root\[data-theme="dark"\]/);
});

test('на каждой странице есть ссылка «к содержимому» и main с id', () => {
  for (const page of PAGES) {
    const html = read(page);
    assert.match(html, /<body>\s*<a class="skip-link" href="#main">К содержимому<\/a>/, `${page}: skip-link`);
    assert.match(html, /<main[^>]*\sid="main"/, `${page}: main#main`);
  }
});
