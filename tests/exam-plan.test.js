import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { examPlan } from '../js/exam-plan.js';
import { loadRouteState, setExamPlan, exportState, importState } from '../js/route-state.js';
const track = code => JSON.parse(readFileSync(new URL(`../data/prep/exams/${code}.json`, import.meta.url), 'utf8'));
const state = () => loadRouteState();
const build = (overrides = {}) => examPlan({ step: { id: 'test:ielts', track: 'ielts', target: { test: 'IELTS', min: 6.5 } }, track: track('ielts'), state: state(), profile: { languageTests: [{ test: 'IELTS', score: 6 }] }, today: '2026-10-27', deadline: { closes: '2027-01-14', confidence: 'confirmed' }, ...overrides });

test('computer and paper use their sourced upper waiting bounds and chosen reserve', () => {
  assert.equal(build().lastDate, '2027-01-12');
  const paper = setExamPlan(state(), 'ielts', { format: 'paper' });
  assert.equal(build({ state: paper }).lastDate, '2027-01-01');
  const reserve = setExamPlan(state(), 'ielts', { bufferDays: 14 });
  const result = build({ state: reserve });
  assert.equal(result.lastDate, '2026-12-29');
  assert.equal(result.canReserveRetake, true);
  assert.equal(build().canReserveRetake, false);
  assert.equal(result.current, 6);
  assert.equal(result.gap, .5);
});

test('expired deadline, past bound, unknown time and invalid day never produce a usable exam date', () => {
  assert.equal(build({ today: '2027-01-15' }).lastDate, null);
  assert.equal(build({ today: '2027-01-13' }).hasTime, false);
  assert.equal(build({ deadline: { closes: '2027-02-30' } }).lastDate, null);
  assert.equal(build({ track: track('mext') }).lastDate, null);
  assert.equal(build({ deadline: {} }).lastDate, null);
});

test('booked date flags late results and date changes survive export/import', () => {
  const planned = setExamPlan(state(), 'ielts', { date: '2027-01-13', format: 'paper', bufferDays: 14 });
  assert.deepEqual(importState(exportState(planned)), planned);
  assert.equal(build({ state: planned }).resultDate, '2027-01-26');
  assert.equal(build({ state: planned }).tooLate, true);
  assert.equal(build({ state: setExamPlan(planned, 'ielts', { date: '' }) }).booked, null);
  assert.deepEqual(setExamPlan(planned, 'ielts', { date: '2027-02-30', bufferDays: -1, format: 'fake' }), planned);
});

test('SAT uses real sessions sorted by date, and does not invent one for an arbitrary booking', () => {
  const sat = track('sat');
  const step = { id: 'test:sat', track: 'sat', target: { test: 'SAT', min: 1300 } };
  const result = build({ step, track: { ...sat, sessions: [...sat.sessions].reverse() } });
  assert.equal(result.lastDate, '2026-12-05');
  assert.equal(build({ step, track: sat, state: setExamPlan(state(), 'sat', { date: '2026-12-05' }) }).resultDate, '2026-12-18');
  assert.equal(build({ step, track: sat, state: setExamPlan(state(), 'sat', { date: '2026-12-06' }) }).resultDate, null);
  assert.equal(build({ step, track: sat, today: '2026-12-06' }).lastDate, null);
});

test('TOEFL includes the PDF delay and never compares histories from different scales', () => {
  const step = { id: 'test:toefl', track: 'toefl', target: { test: 'TOEFL_IBT_2026', min: 5 } };
  const scores = { toefl: [{ date: '2026-10-25', overall: 100, test: 'TOEFL_IBT' }, { date: '2026-10-24', overall: 4, test: 'TOEFL_IBT_2026', mock: true }] };
  const result = build({ step, track: track('toefl'), state: { ...state(), scores } });
  assert.equal(result.lastDate, '2027-01-09');
  assert.equal(result.current, 4);
  assert.equal(result.gap, 1);
  assert.equal(build({ step: { id: 'test:toefl-legacy', track:'toefl', target:{ test:'TOEFL_IBT',min:90 } }, track:track('toefl') }).lastDate, null);
});

test('recommended targets remain recommendations and future self-reports do not override current scores', () => {
  const result = build({ step: { id: 'test:ielts', track: 'ielts', target: { test: 'IELTS', min: null, recommendedMin: 6.5 } }, state: { ...state(), scores: { ielts: [{ date: '2027-01-01', overall: 9 }] } } });
  assert.equal(result.recommended, true);
  assert.equal(result.current, 6);
});
