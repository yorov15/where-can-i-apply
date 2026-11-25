import { test } from 'node:test';
import assert from 'node:assert/strict';
import { materialsTable, portfolioMode, materialGaps, MATERIAL_TYPES, NEED_LABELS, GAP_KINDS, PACK_DAYS, GROW_DAYS } from '../js/materials-plan.js';
import { TYPES } from '../js/materials-data.js';

const TODAY = '2026-11-25';
const item = (type, need, extra = {}) => ({ type, need, count: null, limit: null, prompt: null, who: null, language: 'en', via: 'platform',
  ru: `${type} ${need}`, evidence: `Quote about ${type}.`, url: `https://example.edu/${type}`, lastVerified: TODAY, ...extra });
const ok = (id, items, notStated = []) => [id, { status: 'ok', file: { id, checkedAt: TODAY, items, notStated, note: null } }];
const materials = new Map([
  ok('alpha', [item('essay', 'required', { count: 2, limit: { unit: 'words', max: 150 } }), item('recommendation', 'required', { count: 2, who: 'teacher' }),
    item('cv', 'optional'), item('awards', 'some')], ['video']),
  ok('beta', [item('recommendation', 'required', { who: 'teacher' }), item('recommendation', 'required', { who: 'counselor' }),
    item('cv', 'required'), item('essay', 'required')], ['awards']),
  ['gamma', { status: 'missing', file: null }],
  ['delta', { status: 'failed', file: null }],
]);
const cards = { alpha: { deadline: { closes: '2027-01-05' } }, beta: { deadline: { closes: '2027-01-01' } },
  gamma: { deadline: { closes: '2027-03-01' } }, delta: { deadline: { closes: null } } };
const urls = { gamma: 'https://gamma.edu/apply', delta: 'https://delta.edu/apply' };
const table = () => materialsTable({ goals: ['alpha', 'beta', 'gamma', 'delta'], materials, cards, urls });

test('подписи покрывают все типы схемы и все состояния клетки', () => {
  assert.deepEqual(MATERIAL_TYPES.map(([code]) => code), TYPES);
  assert.deepEqual(NEED_LABELS.map(([code]) => code), ['required', 'some', 'optional', 'notStated', 'unchecked', 'failed']);
  assert.ok(GAP_KINDS.every(([, ru]) => ru));
});

test('клетки: не пишет, не проверяли и не загрузилось — разные состояния', () => {
  const { cells, unchecked, failed, columns } = table();
  assert.equal(cells.alpha.essay, 'required');
  assert.equal(cells.alpha.video, 'notStated');
  assert.equal(cells.alpha.interview, 'unchecked');
  assert.equal(cells.beta.awards, 'notStated');
  assert.equal(cells.gamma.essay, 'unchecked');
  assert.equal(cells.delta.essay, 'failed');
  assert.deepEqual(unchecked, [{ goalId: 'gamma', url: 'https://gamma.edu/apply' }]);
  assert.deepEqual(failed, [{ goalId: 'delta', url: 'https://delta.edu/apply' }]);
  assert.deepEqual(columns, ['essay', 'recommendation', 'cv', 'awards'], 'только встречающиеся типы, в порядке MATERIAL_TYPES');
});

test('ряды: CV один на всех, рекомендации по who, эссе у каждой цели свои', () => {
  const { rows } = table();
  const cv = rows.find(row => row.key === 'cv');
  assert.equal(cv.need, 'required');
  assert.equal(cv.shared, true);
  assert.equal(cv.closes, '2027-01-01');
  assert.deepEqual(cv.goals.map(goal => [goal.goalId, goal.closes]), [['alpha', '2027-01-05'], ['beta', '2027-01-01']]);
  const teacher = rows.find(row => row.key === 'recommendation:teacher');
  assert.equal(teacher.count, 2);
  assert.ok(rows.find(row => row.key === 'recommendation:counselor'));
  assert.equal(rows.filter(row => row.type === 'essay').length, 2);
  assert.equal(rows[0].closes, '2027-01-01', 'сначала ближайший срок');
});

test('режим: меньше 10 недель — упаковать, до полугода — одна работа, дальше — рост', () => {
  const at = closes => portfolioMode({ goals: ['x'], cards: { x: { deadline: { closes } } }, today: TODAY });
  assert.equal(at('2027-01-05').mode, 'pack');
  assert.equal(at('2027-02-03').days, PACK_DAYS);
  assert.equal(at('2027-02-03').mode, 'one');
  assert.equal(at('2027-05-27').days, GROW_DAYS);
  assert.equal(at('2027-05-27').mode, 'one');
  assert.equal(at('2027-09-01').mode, 'grow');
  assert.equal(at('2026-11-01'), null, 'прошедший срок не считается');
  assert.equal(portfolioMode({ goals: [], cards: {}, today: TODAY }), null);
});

test('пробелы: рекомендации по цели с числом, срок начала за leadWeeks', () => {
  const recommenders = { people: [{ id: 'p1', name: 'Учитель', role: '', askedOn: null, goals: [{ goalId: 'alpha', status: 'planned' }] }] };
  const gaps = materialGaps({ table: table(), portfolio: { experiences: [] }, recommenders, mode: 'pack', today: TODAY, leadWeeks: 6 });
  const alpha = gaps.find(item => item.id === 'gap:recommenders:alpha');
  assert.deepEqual([alpha.have, alpha.need, alpha.done], [1, 2, false]);
  assert.equal(alpha.due, '2026-11-24');
  assert.equal(alpha.advice, false);
  assert.ok(alpha.evidence && alpha.url);
  const beta = gaps.find(item => item.id === 'gap:recommenders:beta');
  assert.deepEqual([beta.have, beta.need], [0, 2], 'учитель и консультант без числа в цитате — по одному');
  assert.ok(gaps.some(item => item.id === 'gap:unchecked:gamma' && item.url === 'https://gamma.edu/apply'));
  assert.ok(!gaps.some(item => item.goalIds.includes('delta')), 'не загрузилось — не пробел');
});

test('пробелы: в режиме «упаковать» новых работ не предлагаем', () => {
  const gaps = materialGaps({ table: table(), portfolio: { experiences: [] }, recommenders: { people: [] }, mode: 'pack', today: TODAY });
  assert.ok(!gaps.some(item => item.kind === 'records' || item.kind === 'awards'));
});

test('пробелы: открыта одна работа, закрытое возвращается с done', () => {
  const entries = [1, 2, 3].map(n => ({ id: `e${n}`, title: `Запись ${n}`, actions: 'Сделал', goals: [] }));
  const many = materialGaps({ table: table(), portfolio: { experiences: entries }, recommenders: { people: [] }, mode: 'one', today: TODAY });
  const records = many.find(item => item.kind === 'records');
  assert.deepEqual([records.have, records.need, records.done, records.advice], [3, 3, true, true]);
  assert.equal(many.find(item => item.kind === 'awards').done, false);
  const none = materialGaps({ table: table(), portfolio: { experiences: [] }, recommenders: { people: [] }, mode: 'grow', today: TODAY });
  assert.equal(none.filter(item => (item.kind === 'records' || item.kind === 'awards') && !item.done).length, 1);
  assert.ok(none.some(item => item.kind === 'awards' && !item.done), 'нужны оба — остаётся награда');
  assert.ok(!many.slice(0, many.findIndex(item => item.done)).some(item => item.done), 'сначала открытые');
});

test('пробелы: подтверждение у записи под цель с наградами, история для эссе', () => {
  const experiences = [
    { id: 'e1', title: 'Олимпиада', level: 'district', proof: 'none', goals: [{ goalId: 'alpha', why: '' }] },
    { id: 'e2', title: 'Клуб', proof: 'certificate', goals: [{ goalId: 'alpha', why: '' }] },
    { id: 'e3', title: 'Без цели', goals: [] },
  ];
  const gaps = materialGaps({ table: table(), portfolio: { experiences }, recommenders: { people: [] }, stories: [], mode: 'pack', today: TODAY });
  assert.deepEqual(gaps.filter(item => item.kind === 'proof').map(item => item.entryId), ['e1']);
  const story = gaps.find(item => item.kind === 'story');
  assert.deepEqual([story.have, story.need, story.advice], [0, 1, true]);
  const told = materialGaps({ table: table(), portfolio: { experiences }, recommenders: { people: [] }, stories: [{ id: 's1' }], mode: 'pack', today: TODAY });
  assert.equal(told.find(item => item.kind === 'story').done, true);
});
