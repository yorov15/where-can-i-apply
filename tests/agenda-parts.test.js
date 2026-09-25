import test from 'node:test';
import assert from 'node:assert/strict';
import { agendaParts } from '../js/render.js';
import { formatDate, timeLeft } from '../js/lib/format.js';

test('срок известен: дата и остаток идут раздельно', () => {
  const parts = agendaParts('2026-12-01', '2026-11-20');
  assert.equal(parts.when, `до ${formatDate('2026-12-01')}`);
  assert.equal(parts.left, timeLeft('2026-11-20', '2026-12-01'));
  assert.ok(parts.left);
});

test('срока нет: остатка нет, дата не выдумывается', () => {
  assert.deepEqual(agendaParts(undefined, '2026-11-20'), { when: 'дату программа не назвала', left: null });
});

test('срок прошёл: остатка нет', () => {
  assert.equal(agendaParts('2026-11-01', '2026-11-20').left, null);
});
