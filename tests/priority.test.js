import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priorityRank, orderByPriority, hasPriorities } from '../js/lib/priority.js';

const prog = (id, hostCountry, majors) => ({ id, hostCountry, majors });
const ids = (rows) => rows.map((row) => row.program.id);

const mit = prog('mit', 'US', ['any']);
const tum = prog('tum', 'DE', ['any']);
const keio = prog('keio', 'JP', ['business']);
const seoul = prog('seoul', 'KR', ['cs']);
const hokkaido = prog('hokkaido', 'JP', ['natural']);

test('страна весит больше направления: сначала все программы первой страны', () => {
  const rows = [mit, tum, seoul, keio].map((program) => ({ program }));
  const ordered = orderByPriority(rows, { countries: ['KR', 'DE'], majors: ['business'] });
  // KR — первая страна, DE — вторая. Дальше решает направление: keio хоть и
  // не в выбранных странах, но назвал business, а mit не назвал ничего.
  assert.deepEqual(ids(ordered), ['seoul', 'tum', 'keio', 'mit']);
});

test('без выбранных стран порядок задаёт направление', () => {
  const rows = [mit, keio, seoul].map((program) => ({ program }));
  assert.deepEqual(ids(orderByPriority(rows, { majors: ['cs', 'business'] })), ['seoul', 'keio', 'mit']);
});

test('«любое направление» идёт за названным, но впереди чужого', () => {
  // mit размечен «any»: направление там выбирается внутри, значит и это
  // тоже. Но выше keio, который назвал другое направление, его ставить не
  // за что — иначе выбор «Информатика и IT» ничего бы не менял.
  const rows = [mit, keio, seoul].map((program) => ({ program }));
  assert.deepEqual(ids(orderByPriority(rows, { majors: ['cs'] })), ['seoul', 'mit', 'keio']);
  assert.equal(priorityRank(mit, { majors: ['cs'] }).major, 1);
  assert.equal(priorityRank(keio, { majors: ['cs'] }).major, Infinity);
});

test('равные приоритеты сохраняют исходный порядок', () => {
  const rows = [mit, tum].map((program) => ({ program }));
  // Ничего не выбрано — список не должен переставляться сам.
  assert.deepEqual(ids(orderByPriority(rows, {})), ['mit', 'tum']);
  assert.deepEqual(ids(orderByPriority(rows, { countries: ['JP'] })), ['mit', 'tum']);
});

test('направление берётся по первому выбранному, которое у записи есть', () => {
  const row = { program: hokkaido };
  assert.equal(priorityRank(row.program, { majors: ['cs', 'natural'] }).major, 1);
  assert.equal(priorityRank(row.program, { majors: ['natural', 'cs'] }).major, 0);
});

test('пустые приоритеты — это «человек ничего не выбирал»', () => {
  assert.equal(hasPriorities({}), false);
  assert.equal(hasPriorities({ countries: [], majors: [] }), false);
  assert.equal(hasPriorities({ countries: ['DE'] }), true);
  assert.equal(hasPriorities({ majors: ['cs'] }), true);
});
