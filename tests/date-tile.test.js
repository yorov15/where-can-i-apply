import test from 'node:test';
import assert from 'node:assert/strict';
import { dateTile } from '../js/lib/format.js';

test('плитка даты: число и короткий месяц', () => {
  assert.deepEqual(dateTile('2026-10-09'), { day: '9', month: 'окт' });
  assert.deepEqual(dateTile('2027-01-31'), { day: '31', month: 'янв' });
  assert.deepEqual(dateTile('2026-05-01'), { day: '1', month: 'мая' });
});
