import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPlan, savePlan, togglePlan, planPrograms, planText, buildIcs, fold, PLAN_KEY, DONE_KEY, loadDone, saveDone, taskKey, planTasks } from '../js/plan.js';

const store = (initial) => {
  const map = new Map(initial ? [[PLAN_KEY, initial]] : []);
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

const mit = { id: 'mit', name: { ru: 'MIT — приём на бакалавриат' }, deadline: { opens: '2026-08-01', closes: '2027-01-04', confidence: 'confirmed' } };
const toronto = { id: 'pearson', name: { ru: 'Стипендия Пирсона, Университет Торонто' }, deadline: { closes: '2026-10-09', confidence: 'expected' } };
const nodate = { id: 'x', name: { ru: 'Без срока' }, deadline: null };
const old = { id: 'old', name: { ru: 'Закрытая' }, deadline: { closes: '2026-01-01', confidence: 'confirmed' } };

test('план читается и пишется, мусор в хранилище даёт пустой план', () => {
  const s = store();
  savePlan(['mit'], s);
  assert.deepEqual(loadPlan(s), ['mit']);
  assert.deepEqual(loadPlan(store('не json')), []);
  assert.deepEqual(loadPlan(store('{"a":1}')), []);
  assert.deepEqual(loadPlan(store('["a",5,"b"]')), ['a', 'b']);
});

test('togglePlan включает и выключает, не меняя исходный список', () => {
  const ids = ['a'];
  assert.deepEqual(togglePlan(ids, 'b'), ['a', 'b']);
  assert.deepEqual(togglePlan(ids, 'a'), []);
  assert.deepEqual(ids, ['a']);
});

test('исчезнувшая из данных программа из плана молча пропускается', () => {
  assert.deepEqual(planPrograms([mit], ['gone', 'mit']).map((p) => p.id), ['mit']);
});

test('текст плана: по срокам, ожидаемые даты помечены, ссылки берутся из подробностей', () => {
  const text = planText([mit, nodate, toronto], '2026-09-26', { mit: 'https://mit.edu/apply' });
  const lines = text.split('\n');
  assert.match(lines[0], /3 программы/);
  assert.match(lines[2], /^1\. Стипендия Пирсона.*9 октября 2026 \(ожидаемая дата\)/);
  assert.match(lines[3], /^2\. MIT.*до 4 января 2027$/);
  assert.equal(lines[4], '   https://mit.edu/apply');
  assert.match(lines[5], /^3\. Без срока — срок не объявлен/);
});

test('пустой план — пустой текст', () => {
  assert.equal(planText([], '2026-09-26'), '');
});

test('календарь: событие на весь день, два напоминания, ожидаемая дата помечена', () => {
  const { text, events } = buildIcs([toronto, mit], '2026-09-26', '20260926T100000Z', { mit: 'https://mit.edu/apply' });
  assert.equal(events, 2);
  assert.match(text, /^BEGIN:VCALENDAR\r\n/);
  assert.match(text, /END:VCALENDAR\r\n$/);
  assert.match(text, /DTSTART;VALUE=DATE:20261009\r\nDTEND;VALUE=DATE:20261010/);
  assert.match(text, /DTSTART;VALUE=DATE:20270104\r\nDTEND;VALUE=DATE:20270105/);
  assert.equal(text.match(/BEGIN:VALARM/g).length, 4);
  assert.match(text, /TRIGGER:-P7D/);
  assert.match(text, /TRIGGER:-P1D/);
  assert.match(text.replace(/\r\n /g, ''), /Дедлайн \(ожидаемый\): Стипендия Пирсона/);
  assert.match(text.replace(/\r\n /g, ''), /SUMMARY:Дедлайн: MIT/);
  assert.match(text, /URL:https:\/\/mit\.edu\/apply/);
});

test('календарь: закрытые сроки и программы без даты не попадают', () => {
  const { events, text } = buildIcs([old, nodate], '2026-09-26', '20260926T100000Z');
  assert.equal(events, 0);
  assert.doesNotMatch(text, /VEVENT/);
});

test('конец года: следующий день после 31 декабря — 1 января', () => {
  const dec = { id: 'd', name: { ru: 'D' }, deadline: { closes: '2026-12-31', confidence: 'confirmed' } };
  assert.match(buildIcs([dec], '2026-09-26', 'S').text, /DTEND;VALUE=DATE:20270101/);
});

test('запятые и точки с запятой в названии экранируются', () => {
  const p = { id: 'e', name: { ru: 'А, Б; В' }, deadline: { closes: '2027-01-04', confidence: 'confirmed' } };
  assert.match(buildIcs([p], '2026-09-26', 'S').text.replace(/\r\n /g, ''), /SUMMARY:Дедлайн: А\\, Б\\; В/);
});

test('длинная строка режется по 75 байт и не рвёт русскую букву', () => {
  const folded = fold(`SUMMARY:${'ж'.repeat(80)}`);
  const parts = folded.split('\r\n');
  assert.ok(parts.length > 1);
  for (const part of parts) assert.ok(new TextEncoder().encode(part).length <= 75, part);
  assert.equal(parts.map((x, i) => (i ? x.slice(1) : x)).join(''), `SUMMARY:${'ж'.repeat(80)}`);
});

const extraOf = (...conds) => ({ textConditions: conds.map(([kind, ru]) => ({ kind, ru, field: null })) });

test('дела: обязательное, потом шаги, потом деньги; заметки и повторы не попадают', () => {
  const tasks = planTasks('mit', extraOf(['money', 'Взнос 75 долларов'], ['note', 'Кредитов нет'], ['must', 'Два письма'], ['steps', 'Подача онлайн'], ['must', 'Два письма']));
  assert.deepEqual(tasks.map((t) => [t.kind, t.text]), [['must', 'Два письма'], ['steps', 'Подача онлайн'], ['money', 'Взнос 75 долларов']]);
  assert.deepEqual(planTasks('x', null), []);
});

test('отметка привязана к тексту дела: ключ стабилен и различает и программы, и тексты', () => {
  assert.equal(taskKey('mit', 'Два письма'), taskKey('mit', 'Два письма'));
  assert.notEqual(taskKey('mit', 'Два письма'), taskKey('yale', 'Два письма'));
  assert.notEqual(taskKey('mit', 'Два письма'), taskKey('mit', 'Три письма'));
});

test('отметки дел читаются и пишутся, мусор даёт пустой набор', () => {
  const map = new Map();
  const s = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
  saveDone(new Set(['a#1', 'b#2']), s);
  assert.deepEqual([...loadDone(s)], ['a#1', 'b#2']);
  map.set(DONE_KEY, 'не json');
  assert.equal(loadDone(s).size, 0);
  map.set(DONE_KEY, '["a",5]');
  assert.deepEqual([...loadDone(s)], ['a']);
});
