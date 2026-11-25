import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRouteState, exportState, importState } from '../js/route-state.js';
import { saveExperience, answerSurvey, normalizePortfolio, portfolioOf } from '../js/portfolio.js';
import { INVENTORY, nextQuestion, surveyProgress, recordStatus, inventoryOf } from '../js/portfolio-inventory.js';
import { portfolioStep, PORTFOLIO_STEPS } from '../js/portfolio-steps-view.js';

const TODAY = '2026-11-25';
const empty = () => loadRouteState({ getItem: () => null });
const draft = { id:'exp-d', title:'Учу младших математике', kind:'community', period:'2025 — сейчас', role:'Объясняю', proof:'person', goals:[] };

test('survey answers are stored, survive export and can be reset', () => {
  let state = answerSurvey(empty(), 'teach', 'yes');
  state = answerSurvey(state, 'family', 'no');
  assert.deepEqual(portfolioOf(state).survey, { teach:'yes', family:'no' });
  assert.deepEqual(importState(exportState(state)).portfolio.survey, { teach:'yes', family:'no' });
  const reset = answerSurvey(state, null);
  assert.equal(portfolioOf(reset).survey, undefined);
});

test('survey rejects unknown answers and broken ids', () => {
  assert.equal(answerSurvey(empty(), 'teach', 'maybe'), null);
  assert.equal(answerSurvey(empty(), '', 'yes'), null);
  assert.equal(normalizePortfolio({ version:1, experiences:[], survey:{ teach:'maybe' } }), null);
  assert.equal(normalizePortfolio({ version:1, experiences:[], survey:[] }), null);
});

test('proof kind is optional and must be known', () => {
  const saved = saveExperience(empty(), draft, TODAY);
  assert.equal(portfolioOf(saved).experiences[0].proof, 'person');
  const noProof = saveExperience(empty(), { ...draft, proof:'' }, TODAY);
  assert.equal(portfolioOf(noProof).experiences[0].proof, undefined);
  assert.equal(saveExperience(empty(), { ...draft, proof:'diploma' }, TODAY), null);
});

test('next question skips answered and postponed ones', () => {
  assert.equal(nextQuestion(undefined).id, 'teach');
  const portfolio = { survey:{ teach:'yes', family:'no' } };
  assert.equal(nextQuestion(portfolio).id, 'made');
  assert.equal(nextQuestion(portfolio, new Set(['made'])).id, 'award');
  const all = Object.fromEntries(INVENTORY.map(item => [item.id, 'no']));
  assert.equal(nextQuestion({ survey:all }), null);
  assert.deepEqual(surveyProgress(portfolio), { answered:2, total:INVENTORY.length });
});

test('inventory questions have unique ids and known kinds', () => {
  assert.equal(new Set(INVENTORY.map(item => item.id)).size, INVENTORY.length);
  for (const item of INVENTORY) {
    const saved = saveExperience(empty(), { ...draft, id:`exp-${item.id}`, kind:item.kind }, TODAY);
    assert.ok(saved, item.id);
  }
});

test('record status tells drafts and proof apart', () => {
  assert.deepEqual(recordStatus({ title:'x', proof:'none' }), { draft:true, proof:false });
  assert.deepEqual(recordStatus({ title:'x', result:'Сделал' }), { draft:false, proof:false });
  assert.deepEqual(recordStatus({ title:'x', url:'https://example.org' }), { draft:true, proof:true });
  assert.deepEqual(recordStatus({ title:'x', proof:'certificate' }), { draft:true, proof:true });
  const { records } = inventoryOf(saveExperience(empty(), draft, TODAY));
  assert.equal(records.length, 1);
  assert.equal(records[0].proof, true);
});

test('portfolio step follows the address', () => {
  assert.equal(portfolioStep('#route'), 'have');
  assert.equal(portfolioStep('#route/needs'), 'needs');
  assert.equal(portfolioStep('#route/gaps'), 'gaps');
  assert.equal(portfolioStep('#route/work'), 'work');
  assert.equal(portfolioStep('#route/new'), 'work');
  assert.equal(portfolioStep('#route', 'exp-1'), 'work');
  assert.equal(portfolioStep('#route/unknown'), 'have');
  assert.equal(PORTFOLIO_STEPS.length, 4);
});
