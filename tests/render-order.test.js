import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortRows, groupRows, bucketOf } from '../js/render.js';

const row = (id, status, closes, deadline = 'upcoming') => ({
  program: { id, deadline: closes ? { closes } : null },
  verdict: { status },
  deadline,
});

// Сайт отвечает на вопрос «куда я могу подать документы». С тридцатью
// пятью карточками стена отказов сверху означала бы, что свои программы
// человек находит прокруткой.
test('сначала то, куда подать можно, отказы — в конце', () => {
  const rows = [row('no1', 'no', '2027-01-01'), row('yes1', 'yes', '2027-01-01'), row('check1', 'check', '2027-01-01')];
  assert.deepEqual(sortRows(rows).map((r) => r.program.id), ['yes1', 'check1', 'no1']);
});

test('внутри одного цвета первым идёт ближний срок', () => {
  const rows = [row('later', 'yes', '2027-07-12'), row('sooner', 'yes', '2026-10-09')];
  assert.deepEqual(sortRows(rows).map((r) => r.program.id), ['sooner', 'later']);
});

test('программы без даты идут после тех, у кого срок известен', () => {
  const rows = [row('nodate', 'yes', null, 'unknown'), row('dated', 'yes', '2027-03-31')];
  assert.deepEqual(sortRows(rows).map((r) => r.program.id), ['dated', 'nodate']);
});

test('закрытый приём уезжает вниз, даже если подать было можно', () => {
  const rows = [row('closed', 'yes', '2026-05-01', 'closed'), row('open', 'no', '2027-01-01')];
  assert.deepEqual(sortRows(rows).map((r) => r.program.id), ['open', 'closed']);
});

test('группы по ответу, пустые не показываются, порядок внутри сохраняется', () => {
  const rows = [
    row('no1', 'no', '2027-01-01'),
    row('yesLate', 'yes', '2027-07-12'),
    row('yesSoon', 'yes', '2026-10-09'),
    row('yesClosed', 'yes', '2026-05-01', 'closed'),
  ];
  const groups = groupRows(rows);
  assert.deepEqual(groups.map((g) => g.status), ['yes', 'no']);
  assert.deepEqual(groups[0].rows.map((r) => r.program.id), ['yesSoon', 'yesLate', 'yesClosed']);
  assert.equal(groups[0].title, 'Можно подавать');
});

// Жёлтая куча из тридцати шести карточек читалась как список дел, хотя
// дел в ней было десять: в остальных программа просто не публикует
// чисел, и человеку там делать нечего.
const vague = (id) => ({
  program: { id, deadline: { closes: '2027-01-01' } },
  verdict: {
    status: 'check',
    reasons: [{ field: 'gpa', status: 'unknown', code: 'gpa.not-measured', params: {} }],
  },
  deadline: 'upcoming',
});
const todo = (id) => ({
  program: { id, deadline: { closes: '2027-01-01' } },
  verdict: {
    status: 'check',
    reasons: [
      { field: 'gpa', status: 'unknown', code: 'gpa.not-measured', params: {} },
      { field: 'language', status: 'unknown', code: 'language.no-certificate', params: { options: [{ test: 'IELTS', min: 6 }] } },
    ],
  },
  deadline: 'upcoming',
});

test('«похоже, можно» — отдельная группа между зелёным и списком дел', () => {
  const groups = groupRows([todo('todo'), row('no1', 'no', '2027-01-01'), vague('vague'), row('yes1', 'yes', '2027-01-01')]);
  assert.deepEqual(groups.map((g) => g.status), ['yes', 'likely', 'check', 'no']);
  assert.deepEqual(groups[1].rows.map((r) => r.program.id), ['vague']);
  assert.deepEqual(groups[2].rows.map((r) => r.program.id), ['todo']);
});

test('хотя бы одно дело человека — и карточка остаётся в списке дел', () => {
  assert.equal(bucketOf(todo('x').verdict), 'check');
  assert.equal(bucketOf(vague('x').verdict), 'likely');
});
