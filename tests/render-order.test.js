import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortRows } from '../js/render.js';

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
