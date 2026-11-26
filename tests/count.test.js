import test from 'node:test';
import assert from 'node:assert/strict';
import { countStep, COUNT_KEY } from '../js/lib/count.js';

const memory = (initial = {}) => {
  const data = { ...initial };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
};

test('a step is sent once per device as a page view with an /event/ address', () => {
  const storage = memory();
  const sent = [];
  const send = (...args) => sent.push(args);
  assert.equal(countStep('check-done', { storage, send }), true);
  assert.equal(countStep('check-done', { storage, send }), false, 'second time is not counted');
  assert.deepEqual(sent, [['pageview', { route: '/event/check-done', path: '/event/check-done' }]]);
  assert.deepEqual(JSON.parse(storage.data[COUNT_KEY]), ['check-done']);
  assert.equal(countStep('plan-added', { storage, send }), true, 'other steps are separate');
});

test('unknown steps and missing analytics send nothing', () => {
  const storage = memory();
  const sent = [];
  assert.equal(countStep('profile-answers', { storage, send: (...a) => sent.push(a) }), false);
  assert.equal(countStep('check-done', { storage, send: undefined }), false);
  assert.equal(sent.length, 0);
  assert.equal(storage.data[COUNT_KEY], undefined, 'nothing is marked if nothing was sent');
});

test('broken mark or blocked storage never throws', () => {
  const sent = [];
  const send = (...a) => sent.push(a);
  assert.equal(countStep('check-done', { storage: memory({ [COUNT_KEY]: '{oops' }), send }), false);
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(countStep('check-done', { storage: blocked, send }), false);
  assert.equal(sent.length, 0);
});
