import test from 'node:test';
import assert from 'node:assert/strict';
import { safeHttpUrl } from '../js/lib/url.js';

test('обычные https- и http-ссылки проходят как есть', () => {
  assert.equal(safeHttpUrl('https://example.org/apply?x=1'), 'https://example.org/apply?x=1');
  assert.equal(safeHttpUrl('http://example.org/'), 'http://example.org/');
});

// Ссылки в карточках приходят из data/. Сегодня там только https, но
// одна ошибка в данных не должна превращаться в исполняемый код.
test('чужие схемы отбрасываются', () => {
  assert.equal(safeHttpUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpUrl('JaVaScRiPt:alert(1)'), null);
  assert.equal(safeHttpUrl('data:text/html,<script>1</script>'), null);
  assert.equal(safeHttpUrl('vbscript:x'), null);
  assert.equal(safeHttpUrl('file:///etc/passwd'), null);
});

test('обходы через пробелы и переводы строк не работают', () => {
  assert.equal(safeHttpUrl('  javascript:alert(1)'), null);
  assert.equal(safeHttpUrl('java\nscript:alert(1)'), null);
  assert.equal(safeHttpUrl('\tjavascript:alert(1)'), null);
});

test('относительные, пустые и нестроковые значения — не ссылка', () => {
  assert.equal(safeHttpUrl('/relative/path'), null);
  assert.equal(safeHttpUrl('//evil.example/x'), null);
  assert.equal(safeHttpUrl(''), null);
  assert.equal(safeHttpUrl(null), null);
  assert.equal(safeHttpUrl(undefined), null);
  assert.equal(safeHttpUrl({ toString: () => 'https://a.b' }), null);
});
