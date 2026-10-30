import test from 'node:test';
import assert from 'node:assert/strict';
import { statusOf, isGoalStatus, isSent, goalProgress, progressLine } from '../js/goal-status.js';

test('status defaults to thinking; only the four human choices are valid', () => {
  for (const state of [null, {}, { statuses: { a: { status: 'unknown' } } }]) {
    assert.deepEqual(statusOf(state, 'a'), { status: 'thinking', since: null });
  }
  const entry = { status: 'preparing', since: '2026-10-28' };
  assert.deepEqual(statusOf({ statuses: { a: entry } }, 'a'), entry);
  for (const status of ['thinking', 'preparing', 'submitted', 'answered']) assert.equal(isGoalStatus(status), true);
  for (const status of [null, '', 'sent']) assert.equal(isGoalStatus(status), false);
});

test('only submitted and answered stop the countdown', () => {
  for (const status of ['submitted', 'answered']) assert.equal(isSent(status), true);
  for (const status of ['thinking', 'preparing', undefined, 'unknown']) assert.equal(isSent(status), false);
});

test('progress counts shared work in every goal and sorts missing work by due date then order', () => {
  const long = 'Запросить документ. ' + 'Подробности для приёмной комиссии '.repeat(8);
  const route = { steps: [
    { id: 'undated', title: long, programIds: ['a'], done: false },
    { id: 'later', title: 'Эссе', due: '2027-01-02', programIds: ['a'], done: false },
    { id: 'shared', title: 'IELTS', due: '2026-12-01', programIds: ['a', 'b'], done: false },
    { id: 'tie', title: 'Паспорт', due: '2026-12-01', programIds: ['a'], done: false },
    { id: 'done', title: 'Табель', programIds: ['a', 'b'], done: true },
    { id: 'other', title: 'Чужое дело', programIds: ['c'], done: false },
  ] };
  const a = goalProgress(route, 'a');
  assert.equal(a.total, 5);
  assert.equal(a.done, 1);
  assert.deepEqual(a.missing.map(item => item.id), ['shared', 'tie', 'later', 'undated']);
  assert.ok(a.missing[3].title.length <= 111);
  assert.deepEqual(goalProgress(route, 'b').missing.map(item => item.id), ['shared']);
  assert.deepEqual(goalProgress(null, 'a'), { total: 0, done: 0, missing: [] });
  assert.equal(route.steps[0].title, long, 'source is not shortened or reordered');
});

test('progress line covers sent, answered, empty, complete and missing work', () => {
  const empty = { total: 0, done: 0, missing: [] };
  assert.match(progressLine(empty, { status: 'submitted', since: '2026-10-28' }), /Заявка подана.*28.*Дальше — ответ вуза/);
  assert.equal(progressLine(empty, { status: 'answered', since: null }), 'Ответ получен.');
  assert.match(progressLine(empty, { status: 'answered', since: '2026-10-28' }), /Ответ получен.*28/);
  assert.match(progressLine(empty, { status: 'thinking', since: null }), /дел в маршруте пока нет/);
  assert.equal(progressLine({ total: 2, done: 2, missing: [] }, { status: 'preparing' }), '2 из 2 дел: всё отмечено.');
  const progress = { total: 4, done: 1, missing: [
    { title: 'IELTS', due: '2026-12-01' }, { title: 'Паспорт', due: null }, { title: 'Эссе', due: null },
  ] };
  const line = progressLine(progress, { status: 'preparing' });
  assert.match(line, /1 из 4 дел · не хватает: IELTS \(до .*\); Паспорт и ещё 1$/);
  assert.doesNotMatch(line, /Эссе/);
  assert.doesNotMatch(progressLine({ ...progress, missing: progress.missing.slice(0, 2) }, { status: 'thinking' }), /и ещё/);
});
