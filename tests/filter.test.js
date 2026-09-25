import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { norm, countryName, matchesFilter, bucketCounts, COUNTRY_RU } from '../js/filter.js';
import { KINDS, KIND_LABEL, KIND_FILTER } from '../js/lib/kinds.js';

const harvard = { title: 'Гарвардский колледж — помощь по достатку семьи', orig: 'Harvard College — need-based financial aid', country: 'US', bucket: 'yes', kind: 'need-aid' };
const turkey = { title: 'Türkiye Bursları — государственная стипендия Турции', orig: 'Türkiye Scholarships', country: 'TR', bucket: 'check', kind: 'government' };
const none = { query: '', bucket: 'all', country: '', kind: '' };

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

test('фильтр по типу программы', () => {
  assert.equal(matchesFilter(harvard, { ...none, kind: 'need-aid' }), true);
  assert.equal(matchesFilter(harvard, { ...none, kind: 'government' }), false);
  assert.equal(matchesFilter(turkey, { ...none, kind: 'government' }), true);
});

test('тип работает вместе с остальными фильтрами', () => {
  const f = { query: '', bucket: 'check', country: 'TR', kind: 'government' };
  assert.equal(matchesFilter(turkey, f), true);
  assert.equal(matchesFilter(turkey, { ...f, kind: 'need-aid' }), false);
});

// Тип виден в карточке словами, значит человек может его и набрать.
test('поиск находит и по названию типа', () => {
  assert.equal(matchesFilter(harvard, { ...none, query: 'достатку' }), true);
  assert.equal(matchesFilter({ ...turkey, title: 'X', orig: 'X' }, { ...none, query: 'квота' }), true);
  assert.equal(matchesFilter({ ...harvard, title: 'X', orig: 'X' }, { ...none, query: 'квота' }), false);
});

test('у каждого типа есть подпись для карточки и для списка', () => {
  for (const kind of KINDS) {
    assert.ok(KIND_LABEL[kind], `подпись карточки: ${kind}`);
    assert.ok(KIND_FILTER[kind], `подпись фильтра: ${kind}`);
  }
  assert.deepEqual(Object.keys(KIND_LABEL).sort(), [...KINDS].sort());
  assert.deepEqual(Object.keys(KIND_FILTER).sort(), [...KINDS].sort());
});

// Список типов живёт в двух местах: tools/schema.py (его проверяет сборка)
// и js/lib/kinds.js (его показывает сайт). Разошлись бы — сборка
// пропустила бы тип, которого сайт не знает, и показал бы его сырым словом.
test('список типов в JS совпадает со списком в Python', () => {
  const py = readFileSync(new URL('../tools/schema.py', import.meta.url), 'utf8');
  const match = py.match(/^KINDS = \(([^)]*)\)/m);
  assert.ok(match, 'в tools/schema.py не найден KINDS');
  const fromPython = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(fromPython, [...KINDS]);
});

test('у каждой программы в индексе есть допустимый тип', () => {
  const { programs } = JSON.parse(readFileSync(new URL('../data/index.json', import.meta.url), 'utf8'));
  const bad = programs.filter((p) => !KINDS.includes(p.kind)).map((p) => `${p.id}: ${p.kind}`);
  assert.deepEqual(bad, []);
});

test('счётчики по вердиктам', () => {
  assert.deepEqual(bucketCounts([harvard, turkey, { ...harvard, bucket: 'yes' }]), { all: 3, plan: 0, yes: 2, likely: 0, check: 1, no: 0 });
});

test('«В плане» считает отмеченные программы поверх вердиктов и фильтрует по ним', () => {
  const items = [{ ...harvard, plan: true }, turkey];
  assert.equal(bucketCounts(items).plan, 1);
  assert.equal(matchesFilter(items[0], { query: '', bucket: 'plan', country: '', kind: '' }), true);
  assert.equal(matchesFilter(items[1], { query: '', bucket: 'plan', country: '', kind: '' }), false);
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
