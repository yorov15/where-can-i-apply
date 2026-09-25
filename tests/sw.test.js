import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

// Воркер грузится в песочнице с поддельными self, caches и fetch.
function load({ cached = null, fetchImpl }) {
  const handlers = {};
  const stored = new Map();
  const cache = { put: async (req, res) => { stored.set(req.url, res); } };
  const context = {
    self: {
      location: { origin: 'https://site.test' },
      addEventListener: (type, fn) => { handlers[type] = fn; },
      skipWaiting: () => {},
      clients: { claim: async () => {} },
    },
    caches: {
      match: async () => cached,
      open: async () => cache,
      keys: async () => ['old', 'kuda-podat-v1'],
      delete: async (key) => { stored.set(`deleted:${key}`, true); return true; },
    },
    fetch: fetchImpl,
    URL,
    Promise,
    Error,
    setTimeout,
  };
  vm.runInNewContext(source, context);
  return { handlers, stored };
}

const response = (body, ok = true) => ({ ok, body, clone() { return { ...this }; } });
const request = (url, method = 'GET') => ({ url, method });
const ask = async (handlers, req) => {
  let answer;
  handlers.fetch({ request: req, respondWith: (p) => { answer = p; } });
  return answer === undefined ? undefined : answer;
};

test('живая сеть отвечает всегда, копия уходит в кэш', async () => {
  const { handlers, stored } = load({ cached: response('старое'), fetchImpl: async () => response('свежее') });
  const out = await ask(handlers, request('https://site.test/data/details.json'));
  assert.equal(out.body, 'свежее');
  await new Promise((r) => setImmediate(r));
  assert.equal(stored.get('https://site.test/data/details.json').body, 'свежее');
});

test('сети нет — отвечает копия из кэша', async () => {
  const { handlers } = load({ cached: response('старое'), fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal((await ask(handlers, request('https://site.test/'))).body, 'старое');
});

test('сети нет и копии нет — ошибка, как без воркера', async () => {
  const { handlers } = load({ fetchImpl: async () => { throw new Error('offline'); } });
  await assert.rejects(ask(handlers, request('https://site.test/')), /offline/);
});

test('сервер ответил ошибкой, а копия есть — берём копию; копии нет — отдаём ошибку сервера', async () => {
  const bad = async () => response('502', false);
  assert.equal((await ask(load({ cached: response('старое'), fetchImpl: bad }).handlers, request('https://site.test/x'))).body, 'старое');
  assert.equal((await ask(load({ fetchImpl: bad }).handlers, request('https://site.test/x'))).body, '502');
});

test('чужие адреса и не-GET воркер не трогает', async () => {
  const { handlers } = load({ fetchImpl: async () => response('x') });
  assert.equal(await ask(handlers, request('https://where-can-i-apply.vercel.app/api/explain')), undefined);
  assert.equal(await ask(handlers, request('https://site.test/api', 'POST')), undefined);
});

test('при активации чистятся чужие кэши, свой остаётся', async () => {
  const { handlers, stored } = load({ fetchImpl: async () => response('x') });
  let done;
  handlers.activate({ waitUntil: (p) => { done = p; } });
  await done;
  assert.equal(stored.get('deleted:old'), true);
  assert.equal(stored.has('deleted:kuda-podat-v1'), false);
});
