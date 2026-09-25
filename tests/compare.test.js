import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareTable, examCell } from '../js/compare.js';

const today = '2026-09-26';
const mit = {
  id: 'mit',
  name: { ru: 'MIT' },
  deadline: { closes: '2027-01-04', confidence: 'confirmed' },
  coverage: { tuition: true, living: true, travel: false },
  eligibility: { exam: { anyOf: [{ test: 'SAT', min: null }, { test: 'ACT', min: null }], evidence: 'x' } },
};
const duke = {
  id: 'duke',
  name: { ru: 'Duke' },
  deadline: null,
  coverage: {},
  eligibility: { exam: { optional: true, anyOf: [{ test: 'SAT', min: null }, { test: 'ACT', min: null }], evidence: 'x' } },
};
const entry = (program, status = 'yes') => ({ program, verdict: { status, reasons: [], attested: [] }, deadline: 'unknown' });
const details = { programs: { mit: { applyUrl: 'https://mit.edu/apply' } } };

test('экзамен: нет правила — «не указан», обязателен — нужен, необязателен — по желанию', () => {
  assert.equal(examCell(null), 'Не указан');
  assert.equal(examCell(mit.eligibility.exam), 'Нужен SAT или ACT');
  assert.equal(examCell(duke.eligibility.exam), 'Не обязателен (SAT или ACT по желанию)');
  assert.equal(examCell({ anyOf: [{ test: 'SAT', min: 1400 }, { test: 'ACT', min: 32 }] }), 'Нужен SAT от 1400 или ACT от 32');
});

test('таблица: по столбцу на программу, строки в одном порядке, ссылка только там, где она есть', () => {
  const table = compareTable([entry(mit), entry(duke)], details, today);
  assert.deepEqual(table.columns.map((c) => c.title), ['MIT', 'Duke']);
  assert.deepEqual(table.rows.map((r) => r.label), ['Подходишь ли', 'Срок', 'Что покрывает', 'Экзамен', 'Сайт']);
  for (const r of table.rows) assert.equal(r.cells.length, 2);
  const site = table.rows.at(-1).cells;
  assert.equal(site[0].href, 'https://mit.edu/apply');
  assert.equal(site[1].href, null);
  assert.equal(site[1].text, '—');
  assert.match(table.rows[0].cells[0].text, /Подходишь по условиям/);
  assert.match(table.rows[1].cells[0].text, /4 января 2027/);
});
