import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeMaterials, loadMaterials, forgetMaterials } from '../js/materials-data.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'data', 'materials');

const file = (over = {}) => ({
  id: 'demo', checkedAt: '2026-11-25', notStated: ['video'], note: null,
  items: [{ type: 'essay', need: 'required', count: 2, limit: { unit: 'words', max: 150 }, prompt: null, who: null,
    language: 'en', via: 'platform', ru: 'Два коротких эссе.', evidence: 'Two short essays.',
    source: { url: 'https://example.edu/apply', lastVerified: '2026-11-25', contentHash: 'sha256:00' } }],
  ...over,
});
const reply = (status, body) => async () => ({ status, ok: status >= 200 && status < 300, json: async () => body });

test('каждый файл data/materials проходит проверку формы на экране', () => {
  const names = readdirSync(dir).filter(name => name.endsWith('.json'));
  assert.ok(names.length > 0);
  for (const name of names) {
    const value = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    assert.ok(normalizeMaterials(value), name);
    assert.equal(value.id, name.replace(/\.json$/, ''), name);
  }
});

test('форма: источник ужат до url и даты, лишний тип или who у эссе — файл не годится', () => {
  const clean = normalizeMaterials(file());
  assert.deepEqual(clean.items[0].url, 'https://example.edu/apply');
  assert.equal(clean.items[0].contentHash, undefined);
  assert.equal(normalizeMaterials(file({ items: [{ ...file().items[0], type: 'diploma' }] })), null);
  assert.equal(normalizeMaterials(file({ items: [{ ...file().items[0], who: 'teacher' }] })), null);
  assert.equal(normalizeMaterials(file({ notStated: ['essay', 'passport'] })), null);
  assert.equal(normalizeMaterials(file({ items: [{ ...file().items[0], source: { url: 'javascript:alert(1)', lastVerified: '2026-11-25' } }] })), null);
});

test('404 — не проверяли, обрыв сети и битый файл — не загрузилось', async () => {
  forgetMaterials();
  const ok = await loadMaterials(['demo'], reply(200, file()));
  assert.equal(ok.get('demo').status, 'ok');
  const missing = await loadMaterials(['none'], reply(404, null));
  assert.deepEqual(missing.get('none'), { status: 'missing', file: null });
  const offline = await loadMaterials(['offline'], async () => { throw new TypeError('Failed to fetch'); });
  assert.equal(offline.get('offline').status, 'failed');
  const broken = await loadMaterials(['broken'], reply(200, { id: 'broken', items: 'x' }));
  assert.equal(broken.get('broken').status, 'failed');
  const server = await loadMaterials(['server'], reply(500, null));
  assert.equal(server.get('server').status, 'failed');
  const other = await loadMaterials(['other'], reply(200, file()));
  assert.equal(other.get('other').status, 'failed', 'файл чужой программы');
});

test('ok и missing запоминаются, failed пробуется снова', async () => {
  forgetMaterials();
  let calls = 0;
  const flaky = async () => { calls += 1; if (calls === 1) throw new TypeError('offline'); return { status: 200, ok: true, json: async () => file() }; };
  assert.equal((await loadMaterials(['demo'], flaky)).get('demo').status, 'failed');
  assert.equal((await loadMaterials(['demo'], flaky)).get('demo').status, 'ok');
  assert.equal((await loadMaterials(['demo'], flaky)).get('demo').status, 'ok');
  assert.equal(calls, 2);
  const ids = await loadMaterials(['demo', 'demo', '../x'], flaky);
  assert.deepEqual([...ids.keys()], ['demo']);
});
