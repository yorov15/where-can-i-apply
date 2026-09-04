import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAge, checkGraduationYear } from '../js/rules.js';

const confirmed = (closes) => ({
  deadline: { opens: null, closes, confidence: 'confirmed' },
});
const expected = (closes) => ({
  deadline: { opens: null, closes, confidence: 'expected' },
});

// «Under 21 years of age» — так написано в источнике Türkiye Bursları.
// В max пришлось бы писать 20 при цитате «21»: читатель принял бы это
// за опечатку и «исправил».
const under21 = { min: null, maxExclusive: 21, asOf: 'deadline', evidence: 'x' };

test('двадцать проходит там, где нужно младше 21', () => {
  const me = { birthDate: '2007-01-01' }; // на 2027-02-20 будет 20
  assert.equal(checkAge(me, under21, confirmed('2027-02-20')).status, 'pass');
});

test('двадцать один не проходит там, где нужно младше 21', () => {
  const me = { birthDate: '2006-01-01' }; // на 2027-02-20 будет 21
  const got = checkAge(me, under21, confirmed('2027-02-20'));
  assert.equal(got.status, 'fail');
  assert.match(got.message, /младше 21/);
});

test('maxExclusive и max не путаются: до 21 включительно — другое правило', () => {
  const me = { birthDate: '2006-01-01' };
  const upTo21 = { min: null, max: 21, asOf: 'deadline', evidence: 'x' };
  assert.equal(checkAge(me, upTo21, confirmed('2027-02-20')).status, 'pass');
});

test('без asOf возраст считается на дату закрытия приёма', () => {
  const me = { birthDate: '2008-08-09' }; // на 2027-02-20 будет 18
  const rule = { min: null, maxExclusive: 21, evidence: 'x' };
  assert.equal(checkAge(me, rule, confirmed('2027-02-20')).status, 'pass');
});

test('без asOf пограничный возраст даёт unknown с объяснением', () => {
  const me = { birthDate: '2007-01-01' }; // 20 при пределе 20
  const rule = { min: null, maxExclusive: 21, evidence: 'x' };
  const got = checkAge(me, rule, confirmed('2027-02-20'));
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /на какой момент/);
});

test('без asOf и без даты приёма считать не на что', () => {
  const rule = { min: null, maxExclusive: 21, evidence: 'x' };
  const got = checkAge({ birthDate: '2008-08-09' }, rule, expected(null));
  assert.equal(got.status, 'unknown');
});

test('год выпуска сверяется с годом подачи, а не с записанным числом', () => {
  const rule = { min: null, maxRelative: 'applicationYear', evidence: 'x' };
  const me = { graduationYear: 2027 };
  assert.equal(checkGraduationYear(me, rule, confirmed('2027-02-20')).status, 'pass');
});

test('выпуск позже года подачи не проходит', () => {
  const rule = { min: null, maxRelative: 'applicationYear', evidence: 'x' };
  const got = checkGraduationYear({ graduationYear: 2028 }, rule, confirmed('2027-02-20'));
  assert.equal(got.status, 'fail');
  assert.match(got.message, /2027/);
  assert.match(got.message, /2028/);
});

test('та же запись остаётся верной в следующем цикле', () => {
  // Ради этого правило и сделано относительным: число 2027 через год
  // начало бы врать молча.
  const rule = { min: null, maxRelative: 'applicationYear', evidence: 'x' };
  assert.equal(
    checkGraduationYear({ graduationYear: 2028 }, rule, confirmed('2028-02-20')).status,
    'pass'
  );
});

test('без даты приёма относительную границу не посчитать', () => {
  const rule = { min: null, maxRelative: 'applicationYear', evidence: 'x' };
  const got = checkGraduationYear({ graduationYear: 2027 }, rule, expected(null));
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /Год приёма неизвестен/);
});

// Дат приёма нет вовсе — обычный случай: ЦВЭ и GKS их не публикуют.
const noDates = (today) => ({
  deadline: { opens: null, closes: null, confidence: 'expected' },
  today,
});

test('без дат приёма возраст считается на сегодня', () => {
  const me = { birthDate: '2008-08-09' }; // сегодня 18 при пределе 24
  const rule = { min: null, maxExclusive: 25, evidence: 'x' };
  assert.equal(checkAge(me, rule, noDates('2026-09-03')).status, 'pass');
});

test('без дат приёма пограничный возраст даёт unknown', () => {
  const me = { birthDate: '2002-01-01' }; // сегодня 24 при пределе 24
  const rule = { min: null, maxExclusive: 25, evidence: 'x' };
  const got = checkAge(me, rule, noDates('2026-09-03'));
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /даты приёма ещё не объявлены/);
});

test('без дат приёма явно старший всё равно отсеивается', () => {
  const me = { birthDate: '1995-01-01' }; // сегодня 31 при пределе 24
  const rule = { min: null, maxExclusive: 25, evidence: 'x' };
  assert.equal(checkAge(me, rule, noDates('2026-09-03')).status, 'fail');
});

test('дата приёма важнее сегодняшней, когда она есть', () => {
  const me = { birthDate: '2008-08-09' };
  const rule = { min: null, maxExclusive: 19, evidence: 'x' };
  // сегодня 18 — прошёл бы; на дату приёма 2027-02-20 тоже 18
  assert.equal(checkAge(me, rule, { ...confirmed('2027-02-20'), today: '2026-09-03' }).status, 'unknown');
});

test('год выпуска на сегодняшнюю дату не подменяется', () => {
  // Год подачи может отличаться от текущего: подмена отсеяла бы человека
  // молча, поэтому здесь честное «не знаю».
  const rule = { min: null, maxRelative: 'applicationYear', evidence: 'x' };
  const got = checkGraduationYear({ graduationYear: 2027 }, rule, noDates('2026-09-03'));
  assert.equal(got.status, 'unknown');
});

test('нижняя граница работает вместе с относительной верхней', () => {
  const rule = { min: 2026, maxRelative: 'applicationYear', evidence: 'x' };
  const got = checkGraduationYear({ graduationYear: 2025 }, rule, confirmed('2027-02-20'));
  assert.equal(got.status, 'fail');
  assert.match(got.message, /2026/);
});
