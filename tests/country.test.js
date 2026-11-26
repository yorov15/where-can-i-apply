import test from 'node:test';
import assert from 'node:assert/strict';
import { countryStats, countryList, coverageText, examText, schoolText, countryHref, byDate } from '../js/country-view.js';
import { materialLine } from '../js/program-view.js';

const program = (id, extra = {}) => ({
  id, hostCountry: 'KR', name: { ru: id }, coverage: { tuition: null, living: null, travel: null },
  eligibility: {}, deadline: null, ...extra,
});

const programs = [
  program('a', {
    coverage: { tuition: true, living: true, travel: true },
    deadline: { closes: '2027-03-01' },
    eligibility: { language: { anyOf: [{ test: 'TOEFL_IBT', min: 80 }, { test: 'TOEFL_IBT_2026', min: 4 }, { test: 'IELTS', min: 6 }] }, schoolYears: { min: 12 } },
  }),
  program('b', {
    coverage: { tuition: true, living: false, travel: false },
    deadline: { closes: '2027-01-10' },
    eligibility: { language: { noLimit: true }, exam: { optional: true, anyOf: [{ test: 'SAT', min: null }] }, schoolYears: { noLimit: true } },
  }),
  program('c', { deadline: { closes: '2026-01-10' }, eligibility: { language: { anyOf: [{ test: 'IELTS', min: 6.5 }] }, schoolYears: { min: 11 } } }),
  program('d', { hostCountry: 'JP' }),
];

test('countryStats counts only programs of the country', () => {
  const stats = countryStats(programs, 'KR', '2026-11-26');
  assert.equal(stats.total, 3);
  assert.equal(stats.name, 'Южная Корея');
  assert.equal(stats.ahead, 2, 'closed deadline is not ahead');
  assert.equal(stats.nearest.id, 'b');
  assert.deepEqual(stats.coverage, { tuition: 2, living: 1, travel: 1, unknown: 1 });
});

test('both TOEFL scales count as one exam, optional SAT is not a condition', () => {
  const stats = countryStats(programs, 'KR', '2026-11-26');
  assert.deepEqual(stats.exams, [['IELTS', 2], ['TOEFL', 1]]);
  assert.equal(stats.noLanguage, 1);
  assert.equal(examText(stats), 'Условием называют: IELTS — 2 и TOEFL — 1. Сертификат по языку не нужен в 1 программе.');
});

test('school years split into four plain groups', () => {
  const stats = countryStats(programs, 'KR', '2026-11-26');
  assert.deepEqual(stats.school, { free: 1, eleven: 1, twelve: 1, unclear: 0 });
  assert.equal(schoolText(stats), 'Число лет школы не ограничивают — 1; хватит 11 лет — 1; нужно 12 лет — 1.');
});

test('coverage text names unknowns instead of counting them as no', () => {
  const stats = countryStats(programs, 'KR', '2026-11-26');
  assert.equal(coverageText(stats), 'Учёбу покрывают 2 из 3, жильё — 1, перелёт — 1. У 1 программы что-то из этого не указано.');
});

test('countryList sorts by number of programs', () => {
  assert.deepEqual(countryList(programs).map((c) => [c.code, c.total]), [['KR', 3], ['JP', 1]]);
  assert.equal(countryHref('KR'), '#country/KR');
});

test('materialLine reads type, need, count and limit', () => {
  assert.equal(
    materialLine({ type: 'essay', need: 'required', count: null, limit: { unit: 'words', max: 650 }, ru: 'Личное эссе.' }),
    'Эссе · нужно · до 650 слов. Личное эссе.',
  );
  assert.equal(
    materialLine({ type: 'recommendation', need: 'optional', count: 2, limit: null, ru: 'От учителей.' }),
    'Рекомендации · по желанию · 2 штуки. От учителей.',
  );
});

test('guest list goes by date: ahead, undated, closed', () => {
  const row = (id, closes, deadline) => ({ program: { id, deadline: closes ? { closes } : null }, deadline });
  const rows = [row('x', '2026-01-01', 'closed'), row('y', null, 'unknown'), row('z', '2027-02-01', 'due'), row('w', '2026-12-01', 'due')];
  assert.deepEqual(rows.sort(byDate).map((r) => r.program.id), ['w', 'z', 'y', 'x']);
});
