import test from 'node:test';
import assert from 'node:assert/strict';
import { countStep, countReturn, COUNT_KEY, COUNT_SINCE_KEY } from '../js/lib/count.js';

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

test('first check stores only its date next to the count mark', () => {
  const storage = memory();
  countStep('check-done', { storage, send: () => {}, today: '2026-11-27' });
  assert.equal(storage.data[COUNT_SINCE_KEY], '2026-11-27');
  countStep('check-done', { storage, send: () => {}, today: '2026-12-10' });
  assert.equal(storage.data[COUNT_SINCE_KEY], '2026-11-27', 'second check does not move the date');
});

test('returned-7d is sent once, only 7+ days after the first check', () => {
  const sent = [];
  const send = (...a) => sent.push(a);
  const storage = memory({ [COUNT_KEY]: '["check-done"]', [COUNT_SINCE_KEY]: '2026-11-27' });
  assert.equal(countReturn({ storage, send, today: '2026-11-27' }), false, 'same day');
  assert.equal(countReturn({ storage, send, today: '2026-12-03' }), false, 'six days');
  assert.equal(countReturn({ storage, send, today: '2026-12-04' }), true, 'seven days');
  assert.equal(countReturn({ storage, send, today: '2026-12-20' }), false, 'once per device');
  assert.deepEqual(sent, [['pageview', { route: '/event/returned-7d', path: '/event/returned-7d' }]]);
});

test('no check, no return; an old mark without a date starts the week today', () => {
  const sent = [];
  const send = (...a) => sent.push(a);
  const fresh = memory();
  assert.equal(countReturn({ storage: fresh, send, today: '2026-12-04' }), false);
  assert.equal(fresh.data[COUNT_SINCE_KEY], undefined, 'nothing stored before the first check');
  const old = memory({ [COUNT_KEY]: '["check-done"]' });
  assert.equal(countReturn({ storage: old, send, today: '2026-12-04' }), false);
  assert.equal(old.data[COUNT_SINCE_KEY], '2026-12-04');
  assert.equal(countReturn({ storage: old, send, today: '2026-12-11' }), true);
  assert.equal(sent.length, 1);
});

test('broken date, bad today or blocked storage never throws', () => {
  const send = () => {};
  assert.equal(countReturn({ storage: memory({ [COUNT_KEY]: '["check-done"]', [COUNT_SINCE_KEY]: 'oops' }), send, today: '2026-12-04' }), false);
  assert.equal(countReturn({ storage: memory({ [COUNT_KEY]: '["check-done"]' }), send, today: 'вчера' }), false);
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(countReturn({ storage: blocked, send, today: '2026-12-04' }), false);
});
