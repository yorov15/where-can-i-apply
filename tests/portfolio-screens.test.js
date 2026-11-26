import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRouteState, exportState, importState } from '../js/route-state.js';
import { saveExperience, removeExperience, setEntryOrder, portfolioOf, startPortfolioWork, savePortfolioReview } from '../js/portfolio.js';
import { WORK_REVIEW_ASKED, WORK_REVIEW_FIELDS } from '../js/portfolio-work.js';
import { loadPlan, needTone, modeLine, dueLine, gapAction, shortName } from '../js/portfolio-plan.js';
import { limitText } from '../js/portfolio-needs-view.js';
import { limitFor, packLines, counterText } from '../js/portfolio-pack-view.js';
import { portfolioStep, workView } from '../js/portfolio-steps-view.js';

const TODAY = '2026-11-26';
const empty = () => loadRouteState({ getItem: () => null });
const entry = (id, extra = {}) => ({ id, title: `Запись ${id}`, kind: 'project', role: 'Вёл', actions: 'Собрал данные', result: 'Отчёт', goals: [], ...extra });
const programs = [
  { id: 'near', name: { ru: 'Ближний вуз — бакалавриат' }, deadline: { closes: '2026-12-20' } },
  { id: 'far', name: { ru: 'Дальний вуз: программа' }, deadline: { closes: '2027-09-01' } },
  { id: 'none', name: { ru: 'Без файла' }, deadline: { closes: '2027-01-15' } },
];
const source = { evidence: 'Up to 150 characters per activity.', url: 'https://example.edu/apply', lastVerified: '2026-11-01' };
const file = items => ({ status: 'ok', file: { id: 'x', items, notStated: [] } });
const fakeLoad = async () => new Map([
  ['near', file([{ type: 'activities', need: 'required', count: null, limit: { unit: 'chars', max: 40 }, ru: 'Список активностей.', ...source },
    { type: 'recommendation', need: 'required', count: 2, limit: null, who: 'teacher', ru: 'Два письма учителей.', ...source }])],
  ['far', file([{ type: 'awards', need: 'optional', count: null, limit: null, ru: 'Награды по желанию.', ...source }])],
  ['none', { status: 'missing', file: null }],
]);

test('form fields for university forms are optional, validated and survive export', () => {
  const saved = saveExperience(empty(), entry('a', { grades: [11, 9], hoursPerWeek: 4.5, weeksPerYear: 30, level: 'national', place: '2 место', proofBy: 'Учитель физики', proof: 'person', proofLanguage: 'ru' }), TODAY);
  const [record] = portfolioOf(saved).experiences;
  assert.deepEqual(record.grades, [9, 11]);
  assert.equal(record.hoursPerWeek, 4.5);
  assert.equal(record.level, 'national');
  assert.deepEqual(importState(exportState(saved)).portfolio.experiences[0], record);
  const blank = portfolioOf(saveExperience(empty(), entry('b', { grades: [], hoursPerWeek: '', level: '' }), TODAY)).experiences[0];
  assert.equal('grades' in blank || 'hoursPerWeek' in blank || 'level' in blank, false);
  for (const bad of [{ grades: [13] }, { grades: [9, 9] }, { hoursPerWeek: 4.3 }, { hoursPerWeek: 81 }, { weeksPerYear: 53 }, { level: 'world' }, { proofLanguage: 'Russian' }])
    assert.equal(saveExperience(empty(), entry('c', bad), TODAY), null, JSON.stringify(bad));
});

test('order per goal is saved, cleared by an empty list, and drops removed records', () => {
  let state = saveExperience(saveExperience(empty(), entry('a'), TODAY), entry('b'), TODAY);
  state = setEntryOrder(state, 'near', ['b', 'a']);
  assert.deepEqual(portfolioOf(state).order, { near: ['b', 'a'] });
  assert.deepEqual(importState(exportState(state)).portfolio.order, { near: ['b', 'a'] });
  state = removeExperience(state, 'b');
  assert.deepEqual(portfolioOf(state).order, { near: ['a'] });
  state = setEntryOrder(state, 'near', []);
  assert.equal(portfolioOf(state).order, undefined);
  assert.equal(setEntryOrder(state, 'near', ['a', 'a']), null);
  assert.equal(setEntryOrder(state, '', ['a']), null);
});

test('self-check asks three questions and keeps answers to the hidden ones', () => {
  assert.equal(WORK_REVIEW_ASKED.length, 3);
  for (const [name] of WORK_REVIEW_ASKED) assert.ok(WORK_REVIEW_FIELDS.some(([field]) => field === name), name);
  let state = startPortfolioWork(empty(), { id: 'w', templateId: 'data', title: 'Данные', aim: 'Понять', expectedResult: 'Таблица', goals: [] }, TODAY);
  state = savePortfolioReview(state, 'w', { ownership: 'Я', method: 'Старый ответ', evidence: '', changes: '', limits: '', relevance: '' }, TODAY);
  state = savePortfolioReview(state, 'w', { ownership: 'Я сам', evidence: 'Ссылка', changes: 'Поправил' }, TODAY);
  const review = portfolioOf(state).experiences[0].workPlan.review;
  assert.equal(review.method, 'Старый ответ');
  assert.equal(review.ownership, 'Я сам');
});

test('loadPlan builds the table, mode and gaps from goals; missing files are unchecked', async () => {
  const routeState = { ...empty(), goals: ['near', 'far', 'none', 'gone'] };
  const plan = await loadPlan({ programs, routeState, today: TODAY }, fakeLoad);
  assert.deepEqual(plan.goals, ['near', 'far', 'none']);
  assert.equal(plan.table.cells.near.activities, 'required');
  assert.deepEqual(plan.table.unchecked.map(item => item.goalId), ['none']);
  assert.equal(plan.table.unchecked[0].url, '#program/none');
  assert.equal(plan.mode.mode, 'pack');
  assert.equal(plan.mode.goalId, 'near');
  assert.ok(plan.gaps.some(gap => gap.kind === 'recommenders' && gap.need === 2 && !gap.done));
  assert.ok(plan.gaps.some(gap => gap.kind === 'unchecked'));
});

test('labels: need tone, mode line, due line, gap action', () => {
  assert.equal(needTone('required'), 'tag need-required');
  assert.equal(needTone('notStated'), 'tag tag-draft');
  assert.equal(shortName(programs[0]), 'Ближний вуз');
  assert.equal(shortName(programs[1]), 'Дальний вуз');
  const line = modeLine({ mode: 'pack', goalId: 'near', closes: '2026-12-20', days: 24 }, programs);
  assert.equal(line.lead, '24 дня до срока Ближний вуз');
  assert.match(line.text, /упаковывать/);
  assert.equal(modeLine(null, programs), null);
  assert.equal(dueLine({ done: true }, TODAY), 'Готово');
  assert.equal(dueLine({ due: '2026-12-01', closes: '2026-12-20' }, TODAY), 'Успеть до 1 декабря 2026 · 5 дней');
  assert.match(dueLine({ closes: '2026-11-01' }, TODAY), /^Срок цели прошёл/);
  assert.match(dueLine({ due: '2026-10-12', closes: '2026-12-20' }, TODAY), /^Опаздываем: успеть надо было до 12 октября 2026/);
  assert.equal(dueLine({}, TODAY), '');
  assert.equal(gapAction({ kind: 'proof', entryId: 'a', goalIds: [] }).entryId, 'a');
  assert.equal(gapAction({ kind: 'unchecked', goalIds: ['a b'] }).href, '#program/a%20b');
  assert.equal(gapAction({ kind: 'unknown', goalIds: [] }), null);
  assert.equal(limitText({ unit: 'words', max: 150 }), 'до 150 слов');
  assert.equal(limitText(null), '');
});

test('pack lines count against the goal limit and never cut the student text', async () => {
  const plan = await loadPlan({ programs, routeState: { ...empty(), goals: ['near', 'far'] }, today: TODAY }, fakeLoad);
  assert.deepEqual(limitFor(plan.table, 'near', 'activities'), { unit: 'chars', max: 40, limitSource: { evidence: source.evidence, url: source.url } });
  assert.deepEqual(limitFor(plan.table, 'far', 'activities'), {});
  const long = entry('a', { result: 'Отчёт, который прочитали в школе и в районе' });
  const [line] = packLines([long], plan.table, 'near');
  assert.ok(line.over > 0);
  assert.ok(line.text.endsWith('в районе'));
  assert.match(counterText(line), /^\d+ из 40 знаков · лишних \d+$/);
  assert.deepEqual(line.missing, ['hours', 'weeks', 'grades']);
  const [free] = packLines([long], plan.table, 'far');
  assert.match(counterText(free), /предел формы не известен/);
  assert.equal(counterText({ unit: 'chars', used: 252, max: null, over: 0 }), '252 знака · предел формы не известен');
  assert.equal(counterText({ unit: 'words', used: 21, max: 21, over: 0 }), '21 из 21 слова');
  const [award] = packLines([entry('b', { level: 'school', place: '1 место', period: '2025' })], plan.table, 'far');
  assert.match(award.text, /уровень: /);
});

test('step 4 address chooses new work or packing', () => {
  assert.equal(portfolioStep('#route/pack'), 'work');
  assert.equal(workView('#route/pack'), 'pack');
  assert.equal(workView('#route/work'), 'work');
  assert.equal(workView('#route/pack', 'exp-1'), 'work');
});
