import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCombinedRoute } from '../js/route-combined.js';
import { loadRouteState, toggleStep, reconcileProgress } from '../js/route-state.js';
import { taskKey } from '../js/plan.js';
const today = '2026-10-27';
const profile = { citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11, graduationYear: 2027,
  birthDate: '2008-08-09', gpa: { value: 4.8, scale: 'TJ_5' }, languageTests: [{ test: 'IELTS', score: 6 }], exams: [] };
const track = code => ({ code, name: code });
const tracks = { ielts: track('ielts'), toefl: track('toefl') };
const empty = () => loadRouteState();
const context = (id, options = [{ test: 'IELTS', min: 6.5 }], closes = '2027-01-14') => ({
  program: { id, name: { ru: id }, deadline: { closes, confidence: 'confirmed' },
    eligibility: { citizenship: { noLimit: true }, schoolCountry: { noLimit: true }, schoolYears: { noLimit: true },
      graduationYear: { noLimit: true }, age: { noLimit: true }, gpa: { noLimit: true }, exam: { noLimit: true }, language: { anyOf: options } } },
  conditions: [{ kind: 'documents', doc: 'transcript', ru: `Подготовить табель для ${id}` }],
  prepared: { tests: ['ielts', 'toefl'] },
});
const build = (contexts, state = empty()) => buildCombinedRoute({ contexts, state, profile, today, tracks });

test('three goals share one IELTS with the largest threshold and one common document', () => {
  const contexts = [context('kaist'), context('gist', [{ test: 'IELTS', min: 7 }]),
    context('nu', [{ test: 'IELTS', min: 6.5, parts: true }], '2026-12-01')];
  const route = build(contexts);
  const ielts = route.steps.filter(step => step.id === 'test:ielts');
  assert.equal(ielts.length, 1);
  assert.deepEqual(ielts[0].programIds, ['kaist', 'gist', 'nu']);
  assert.deepEqual(ielts[0].target, { test: 'IELTS', min: 7, parts: true });
  assert.match(ielts[0].title, /7/);
  assert.equal(route.steps.filter(step => step.id === 'doc:transcript').length, 1);
  assert.equal(route.steps.filter(step => step.kind === 'apply').length, 3);
  assert.equal(route.goal.deadline.closes, '2026-12-01');
  const checked = build(contexts, toggleStep(empty(), 'doc:transcript', today));
  assert.equal(checked.steps.find(step => step.id === 'doc:transcript').done, true);
  assert.equal(checked.week.some(step => step.id === 'doc:transcript'), false);
});

test('alternative order does not force both IELTS and TOEFL when one exam covers every goal', () => {
  const route = build([context('a', [{ test: 'TOEFL_IBT_2026', min: 4.5 }, { test: 'IELTS', min: 6.5 }]),
    context('b', [{ test: 'IELTS', min: 7 }, { test: 'TOEFL_IBT_2026', min: 5 }])]);
  const tests = route.steps.filter(step => step.kind === 'test');
  assert.equal(tests.length, 1);
  assert.equal(tests[0].id, 'test:ielts');
  assert.equal(tests[0].target.min, 7);
});

test('incompatible accepted exams stay separate and old and new TOEFL scales are never maximized together', () => {
  const route = build([context('a'), context('b', [{ test: 'TOEFL_IBT_2026', min: 4.5 }]),
    context('c', [{ test: 'TOEFL_IBT', min: 83 }])]);
  const tests = route.steps.filter(step => step.kind === 'test');
  assert.deepEqual(tests.map(step => step.id).sort(), ['test:ielts', 'test:toefl', 'test:toefl-legacy']);
  assert.equal(tests.find(step => step.id === 'test:toefl').target.min, 4.5);
});

test('old plan checklist aliases migrate to a shared document, and unmatched progress remains', () => {
  const contexts = [context('kaist'), context('gist')];
  const old = taskKey('gist', contexts[1].conditions[0].ru);
  const state = { ...empty(), done: { [old]: null, 'unknown#old': null } };
  const route = build(contexts, state);
  assert.equal(route.steps.find(step => step.id === 'doc:transcript').done, true);
  const next = reconcileProgress(state, route.steps);
  assert.equal(next.done['doc:transcript'], null);
  assert.equal(Object.hasOwn(next.done, old), false);
  assert.equal(next.done['unknown#old'], null);
});

test('unrelated generic standardized tests are never merged merely because both lack a track', () => {
  const a = context('a');
  const b = context('b');
  a.conditions = [{ kind: 'documents', ru: 'SAT или национальный экзамен.', test: { group: 'standard', title: 'Выбрать результат для A' } }];
  b.conditions = [{ kind: 'documents', ru: 'Квалификация по предметам программы B.', test: { group: 'standard', title: 'Выбрать результат для B' } }];
  const tests = build([a, b]).steps.filter(step => step.testGroup === 'standard');
  assert.equal(tests.length, 2);
});

test('a failed condition request cannot become a complete route; goals and retries remain available', () => {
  const a = { ...context('a'), conditions: null };
  const b = context('b');
  const route = build([a, b]);
  assert.equal(route.conditionsLoaded, false);
  assert.equal(route.goals.length, 2);
  assert.equal(route.goals[0].conditionsLoaded, false);
});

test('a nearby deadline in the second goal never pulls a distant first-goal application into this week', () => {
  const route = build([context('later', undefined, '2027-01-14'), context('soon', undefined, '2026-11-03')]);
  assert.deepEqual(route.week.filter(step => step.kind === 'apply').map(step => step.id), ['apply:soon']);
  assert.equal(route.goal.deadline.closes, '2026-11-03');
});

test('UNIST never turns an unconfirmed test reference into mandatory IELTS or TOPIK', () => {
  const program = JSON.parse(readFileSync(new URL('../data/programs/unist.json', import.meta.url), 'utf8'));
  const prepared = JSON.parse(readFileSync(new URL('../data/prep/unist.json', import.meta.url), 'utf8'));
  const route = build([{ program, prepared, conditions: program.textConditions }]);
  assert.equal(route.steps.filter(step => step.kind === 'test').length, 0);
  assert.match(route.goals[0].note, /не подтверждены/);
});

test('unverified preparation references remain separate from confirmed shared exam requirements', () => {
  const a = context('confirmed');
  const b = context('reference');
  b.program.eligibility.language = { notMeasured: true };
  b.conditions = [];
  b.prepared.tests = ['ielts'];
  const route = build([a, b]);
  assert.deepEqual(route.steps.find(step => step.id === 'test:ielts').programIds, ['confirmed']);
  assert.ok(route.steps.some(step => step.referenceOnly && step.programIds.includes('reference')));
});

test('a recommended score never raises a hard minimum for another goal', () => {
  const recommended = context('advisory', [{ test: 'IELTS', min: 7.5 }]);
  recommended.program.eligibility.language.advisory = true;
  const route = build([recommended, context('required', [{ test: 'IELTS', min: 6.5 }])]);
  const exam = route.steps.find(step => step.id === 'test:ielts');
  assert.equal(exam.target.min, 6.5);
  assert.equal(exam.target.recommendedMin, 7.5);
  assert.match(exam.title, /от 6.5/);
});

test('an already sufficient accepted certificate is preferred over a lower score in another test', () => {
  const contexts = [context('a', [{ test: 'IELTS', min: 6.5 }, { test: 'TOEFL_IBT_2026', min: 4.5 }]),
    context('b', [{ test: 'IELTS', min: 7 }, { test: 'TOEFL_IBT_2026', min: 5 }])];
  // Certificate upload requirements still produce a step when a score is sufficient.
  for (const ctx of contexts) ctx.conditions.push({ kind: 'documents', ru: 'Нужен сертификат.', test: { group: 'english', title: 'Подготовить сертификат' } });
  const route = buildCombinedRoute({ contexts, today, tracks, state: empty(),
    profile: { ...profile, languageTests: [{ test: 'IELTS', score: 5 }, { test: 'TOEFL_IBT_2026', score: 5 }] } });
  assert.equal(route.steps.find(step => step.kind === 'test').id, 'test:toefl');
});
