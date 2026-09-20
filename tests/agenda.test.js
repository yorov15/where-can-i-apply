import test from 'node:test';
import assert from 'node:assert/strict';
import { horizonOf, agenda } from '../js/agenda.js';

const TODAY = '2026-09-20';

const row = (id, closes, status = 'yes') => ({
  program: { id, name: { ru: id }, deadline: closes ? { closes } : null },
  verdict: { status, reasons: [] },
  deadline: closes && closes < TODAY ? 'closed' : 'open',
});

test('горизонт считается от сегодня, а не от календарного месяца', () => {
  assert.equal(horizonOf({ deadline: { closes: '2026-10-01' } }, TODAY), 'soon');
  assert.equal(horizonOf({ deadline: { closes: '2026-10-20' } }, TODAY), 'soon');
  assert.equal(horizonOf({ deadline: { closes: '2026-10-21' } }, TODAY), 'quarter');
  assert.equal(horizonOf({ deadline: { closes: '2026-12-19' } }, TODAY), 'quarter');
  assert.equal(horizonOf({ deadline: { closes: '2026-12-20' } }, TODAY), 'later');
});

test('без объявленной даты — отдельный горизонт, торопить нечем', () => {
  assert.equal(horizonOf({ deadline: null }, TODAY), 'unknown');
  assert.equal(horizonOf({ deadline: { opens: '2027-01-01' } }, TODAY), 'unknown');
});

// Прошедший срок в календарь не попадает: подать уже нельзя, а место
// наверху экрана стоит дорого.
test('закрытый приём в календарь не идёт', () => {
  const out = agenda([row('было', '2026-08-01')], TODAY);
  assert.deepEqual(out, []);
});

test('в календарь идёт только то, куда подать можно прямо сейчас', () => {
  const rows = [
    row('зелёная', '2026-10-01'),
    row('жёлтая', '2026-10-02', 'check'),
    row('красная', '2026-10-03', 'no'),
  ];
  const out = agenda(rows, TODAY);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].rows.map((r) => r.program.id), ['зелёная']);
});

test('корзины идут по времени, внутри — по дате', () => {
  const rows = [
    row('позже', '2027-06-01'),
    row('без даты', null),
    row('скоро-2', '2026-10-10'),
    row('квартал', '2026-11-15'),
    row('скоро-1', '2026-09-25'),
  ];
  const out = agenda(rows, TODAY);
  assert.deepEqual(out.map((g) => g.key), ['soon', 'quarter', 'later', 'unknown']);
  assert.deepEqual(out[0].rows.map((r) => r.program.id), ['скоро-1', 'скоро-2']);
});

test('пустые корзины не показываются', () => {
  const out = agenda([row('одна', '2026-09-25')], TODAY);
  assert.equal(out.length, 1);
  assert.equal(out[0].key, 'soon');
  assert.ok(out[0].title);
});
