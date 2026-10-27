import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadRouteState, saveRouteState, setGoals, toggleStep, clearProgress, exportState, importState,
  reconcileProgress, isDone, MAX_GOALS } from '../js/route-state.js';
const TODAY = '2026-10-27';
const storage = values => {
  const map = new Map(Object.entries(values ?? {}).map(([key, value]) => [key, JSON.stringify(value)]));
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
};
const empty = () => loadRouteState(storage());

test('v1 snapshot merges plan and checklist; old completion dates stay unknown', () => {
  const v1 = JSON.parse(readFileSync(new URL('./fixtures/route-state-v1.json', import.meta.url)));
  const state = loadRouteState(storage({ 'eligibility-route': v1,
    'eligibility-plan': ['gist-korea', 'kaist'], 'eligibility-plan-done': ['gist-korea#old-document'] }));
  assert.equal(state.version, 2);
  assert.deepEqual(state.goals, ['kaist', 'gist-korea']);
  for (const key of [...v1.done, 'gist-korea#old-document']) assert.equal(state.done[key], null);
  const steps = [{ id: 'doc:transcript', legacyIds: [v1.done[0], 'gist-korea#old-document'] }];
  const migrated = reconcileProgress(state, steps);
  assert.equal(isDone(migrated, 'doc:transcript'), true);
  assert.equal(migrated.done['doc:transcript'], null);
  assert.equal(Object.hasOwn(migrated.done, v1.done[0]), false);
  assert.equal(isDone(migrated, v1.done[1]), true, 'unmatched marks remain available for later mapping');
  assert.deepEqual(importState(exportState(migrated)), migrated);
});

test('saving v2 is idempotent and does not resurrect old checklist marks', () => {
  const store = storage({ 'eligibility-plan-done': ['old#mark'] });
  let state = loadRouteState(store);
  state = clearProgress(setGoals(state, ['kaist']));
  saveRouteState(state, store);
  assert.deepEqual(loadRouteState(store), state);
  assert.deepEqual(JSON.parse(store.getItem('eligibility-plan')), ['kaist']);
});

test('v2 preserves goals, score history, exam dates, weekly choices and completion dates', () => {
  const state = { ...empty(), goals: ['kaist', 'gist-korea'], hoursPerWeek: 6,
    scores: { ielts: [{ date: TODAY, overall: 6, parts: { L: 6.5, R: 6, W: 5.5, S: 6 }, mock: true }] },
    examDates: { ielts: '2027-01-02' }, done: { 'doc:passport': TODAY },
    weekPlan: { '2026-W44': [{ taskId: 'ielts:writing:1', day: '2026-10-28', done: true }] }, lastReview: TODAY };
  const store = storage();
  saveRouteState(state, store);
  assert.deepEqual(loadRouteState(store), state);
  assert.deepEqual(importState(exportState(state)), state);
});

test('corrupted import is rejected without replacing current progress', () => {
  const state = toggleStep(setGoals(empty(), ['kaist']), 'doc:passport', TODAY);
  for (const text of ['x', 'null', '[]', '{"version":99}', '{"version":2,"goals":[],"done":[]}',
    '{"version":1,"goal":5,"done":[]}', 'x'.repeat(500_001)]) assert.equal(importState(text), null);
  assert.deepEqual(state.goals, ['kaist']);
  assert.equal(state.done['doc:passport'], TODAY);
});

test('invalid dates, nonfinite scores and prototype keys never enter saved state', () => {
  const state = importState('{"version":2,"goals":["kaist","__proto__"],"done":{"doc:bad":"2026-02-31","__proto__":null},"scores":{"constructor":[],"ielts":[{"date":"2026-02-31","overall":6},{"date":"2026-10-27","overall":1e999}]},"examDates":{"ielts":"2026-02-31"}}');
  assert.deepEqual(state.goals, ['kaist']);
  assert.deepEqual(state.done, {});
  assert.deepEqual(state.scores, { ielts: [] });
  assert.deepEqual(state.examDates, {});
  assert.equal({}.polluted, undefined);
});

test('toggling a migrated checkbox removes every old alias and does not mutate input', () => {
  const state = { ...empty(), done: { 'old#mark': null } };
  const unchecked = toggleStep(state, 'doc:passport', TODAY, ['old#mark']);
  assert.deepEqual(unchecked.done, {});
  assert.equal(state.done['old#mark'], null);
  const checked = toggleStep(unchecked, 'doc:passport', TODAY);
  assert.equal(checked.done['doc:passport'], TODAY);
  assert.deepEqual(toggleStep(checked, 'doc:passport', TODAY).done, {});
  assert.deepEqual(toggleStep(checked, 'doc:passport', '2026-02-31'), checked);
});

test('new goals stop at eight; a longer migrated plan is preserved and can be reduced', () => {
  const ids = Array.from({ length: MAX_GOALS + 1 }, (_, i) => `goal-${i}`);
  const full = setGoals(empty(), ids.slice(0, MAX_GOALS));
  assert.deepEqual(setGoals(full, ids).goals, full.goals);
  const migrated = loadRouteState(storage({ 'eligibility-plan': ids }));
  assert.deepEqual(migrated.goals, ids);
  assert.deepEqual(setGoals(migrated, ids.slice(1)).goals, ids.slice(1));
});

test('reset preserves goals and score history but clears weekly checkboxes', () => {
  const state = { ...empty(), goals: ['kaist'], done: { x: TODAY }, scores: { ielts: [{ date: TODAY, overall: 6, mock: true }] },
    weekPlan: { '2026-W44': [{ taskId: 'practice', done: true }] } };
  const reset = clearProgress(state);
  assert.deepEqual(reset.goals, state.goals);
  assert.deepEqual(reset.scores, state.scores);
  assert.deepEqual(reset.done, {});
  assert.equal(reset.weekPlan['2026-W44'][0].done, false);
  assert.equal(state.weekPlan['2026-W44'][0].done, true);
});

test('unavailable storage does not crash load or save', () => {
  const unavailable = { getItem() { throw Error('private'); }, setItem() { throw Error('quota'); } };
  assert.deepEqual(loadRouteState(unavailable), empty());
  assert.doesNotThrow(() => saveRouteState(empty(), unavailable));
});
