import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAJORS, MAJOR_LABEL, CHOSEN_MAJORS, majorLabel, hasMajor, coversAnyMajor } from '../js/lib/majors.js';

const schema = readFileSync(new URL('../tools/schema.py', import.meta.url), 'utf8');

test('список направлений совпадает со схемой сборки', () => {
  const line = schema.split('\n').find((row) => row.startsWith('MAJORS ='));
  const inPython = [...line.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(MAJORS, inPython);
});

test('у каждого направления есть подпись, и наоборот', () => {
  assert.deepEqual(Object.keys(MAJOR_LABEL).sort(), [...MAJORS].sort());
  for (const key of MAJORS) assert.ok(majorLabel(key), key);
  assert.equal(majorLabel('нет-такого'), null);
});

test('«любое направление» — признак записи, а не выбор человека', () => {
  assert.ok(MAJORS.includes('any'));
  assert.ok(!CHOSEN_MAJORS.includes('any'));
  assert.equal(CHOSEN_MAJORS.length, MAJORS.length - 1);
});

test('названное направление находится, «любое» — нет', () => {
  assert.equal(hasMajor(['cs', 'natural'], 'cs'), true);
  assert.equal(hasMajor(['any'], 'cs'), false);
  assert.equal(hasMajor([], 'cs'), false);
  assert.equal(hasMajor(['cs'], null), false);
  assert.equal(coversAnyMajor(['any']), true);
  assert.equal(coversAnyMajor(['cs']), false);
});
