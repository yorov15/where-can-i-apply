import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { norm, countryName, matchesFilter, bucketCounts, COUNTRY_RU } from '../js/filter.js';

const harvard = { title: 'Гарвардский колледж — помощь по достатку семьи', orig: 'Harvard College — need-based financial aid', country: 'US', bucket: 'yes' };
const turkey = { title: 'Türkiye Bursları — государственная стипендия Турции', orig: 'Türkiye Scholarships', country: 'TR', bucket: 'check' };
const none = { query: '', bucket: 'all', country: '' };

test('нормализация: регистр, ё, диакритика', () => {
  assert.equal(norm('  Türkiye '), 'turkiye');
  assert.equal(norm('Ёлка'), 'елка');
  assert.equal(norm('ГАРВАРД'), norm('гарвард'));
});

test('без фильтров подходит всё', () => {
  assert.equal(matchesFilter(harvard, none), true);
  assert.equal(matchesFilter(turkey, none), true);
});

test('поиск по русскому названию, по английскому и по стране', () => {
  assert.equal(matchesFilter(harvard, { ...none, query: 'гарвард' }), true);
  assert.equal(matchesFilter(harvard, { ...none, query: 'harvard' }), true);
  assert.equal(matchesFilter(harvard, { ...none, query: 'сша' }), true);
  assert.equal(matchesFilter(turkey, { ...none, query: 'turkiye' }), true);
  assert.equal(matchesFilter(turkey, { ...none, query: 'гарвард' }), false);
});

test('несколько слов — все должны найтись, порядок не важен', () => {
  assert.equal(matchesFilter(harvard, { ...none, query: 'сша гарвард' }), true);
  assert.equal(matchesFilter(harvard, { ...none, query: 'гарвард турция' }), false);
});

test('лишние пробелы и регистр запроса не мешают', () => {
  assert.equal(matchesFilter(harvard, { ...none, query: '  ГАРВАРД   ' }), true);
});

test('фильтр по вердикту и по стране', () => {
  assert.equal(matchesFilter(harvard, { ...none, bucket: 'yes' }), true);
  assert.equal(matchesFilter(harvard, { ...none, bucket: 'no' }), false);
  assert.equal(matchesFilter(harvard, { ...none, country: 'US' }), true);
  assert.equal(matchesFilter(harvard, { ...none, country: 'TR' }), false);
});

test('фильтры работают вместе', () => {
  const f = { query: 'harvard', bucket: 'yes', country: 'US' };
  assert.equal(matchesFilter(harvard, f), true);
  assert.equal(matchesFilter(harvard, { ...f, bucket: 'check' }), false);
});

test('счётчики по вердиктам', () => {
  assert.deepEqual(bucketCounts([harvard, turkey, { ...harvard, bucket: 'yes' }]), { all: 3, yes: 2, likely: 0, check: 1, no: 0 });
});

test('неизвестный код страны показывается как есть, а не пропадает', () => {
  assert.equal(countryName('ZZ'), 'ZZ');
  assert.equal(countryName('KR'), 'Южная Корея');
});

// Защита от тихой поломки: добавили программу из новой страны и забыли
// имя — в списке страна выглядела бы кодом «BR».
test('для каждой страны из данных есть русское название', () => {
  const { programs } = JSON.parse(readFileSync(new URL('../data/index.json', import.meta.url), 'utf8'));
  const missing = [...new Set(programs.map((p) => p.hostCountry))].filter((code) => !COUNTRY_RU[code]);
  assert.deepEqual(missing, []);
});
