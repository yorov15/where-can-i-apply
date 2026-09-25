import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const PAGES = ['index.html', 'faq.html', 'privacy.html', '404.html'];
const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('на каждой странице есть манифест, и CSP его пускает', () => {
  for (const page of PAGES) {
    const html = read(page);
    assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest">/, page);
    assert.match(html, /Content-Security-Policy" content="[^"]*manifest-src 'self';/, page);
  }
});

test('манифест указывает на существующие иконки и на корень сайта', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.start_url, '/');
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  for (const icon of manifest.icons) assert.ok(existsSync(new URL(`..${icon.src}`, import.meta.url)), icon.src);
});

test('страница 404 не ссылается на путь старого хостинга: на Vercel сайт лежит в корне', () => {
  assert.doesNotMatch(read('404.html'), /where-can-i-apply\//);
});

test('главная объявляет плашку «нет сети», скрытую по умолчанию', () => {
  assert.match(read('index.html'), /<p id="offline" class="summary-note" role="status" hidden>/);
});
