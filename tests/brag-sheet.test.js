import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRouteState, exportState, importState, saveRouteState } from '../js/route-state.js';
import { saveExperience, removeExperience } from '../js/portfolio.js';
import { saveSpotlight } from '../js/spotlight.js';
import { saveRecommender, setRecommenderSheet, setRecommenderStatus, recommendersOf, normalizeSheet, sheetFilled,
  teacherMemo, SHEET_MAX, SHEET_FIELDS } from '../js/recommenders.js';
import { bragSheetText, bragSheetHash, bragSheetRoute, sheetWorks, sheetSections, sheetFrom, SHEET_FORM, FROM_BLANK } from '../js/brag-sheet.js';

const TODAY = '2026-11-04';
const exp = { kind: 'project', period: '', role: '', actions: '', result: '', reflection: '', url: '', goals: [] };
const empty = () => ({ ...loadRouteState({ getItem: () => null }), goals: ['harvard', 'kaist'] });
const withPerson = () => saveRecommender(empty(), { id: 'p1', name: 'Гульнора Рахимовна', role: 'учитель физики', goalIds: ['harvard', 'kaist'] });
const sheetOf = state => recommendersOf(state).people[0].sheet;
const entries = [
  { goalId: 'harvard', nameRu: 'Гарвардский колледж', closes: '2027-01-01', channels: ['commonapp'] },
  { goalId: 'kaist', nameRu: 'KAIST', closes: null, channels: [] },
];
const answers = {
  study: 'Физику: хочу понять, как работает солнечная станция в нашем районе.',
  quality1: 'Упорство — задачу с олимпиады разбирали после уроков три дня.',
  quality2: '',
  quality3: 'Любопытство — нашли вывод формулы в книге для старших классов.',
  proud: '',
  more: '  С 8 класса помогаю семье   в магазине.\n\n\nПоэтому на кружки времени мало.  ',
};

// ——— хранение ———

test('пустая шпаргалка не хранится: состояние и экспорт как раньше', () => {
  const state = withPerson();
  const blank = setRecommenderSheet(state, 'p1', Object.fromEntries(SHEET_FIELDS.map(field => [field, '   '])));
  assert.equal(Object.hasOwn(recommendersOf(blank).people[0], 'sheet'), false);
  assert.equal(exportState(blank), exportState(state));
  assert.equal(sheetFilled(undefined), false);
  assert.equal(normalizeSheet({ study: '', proud: 42 }), null);
});

test('ответы чистятся, длинное обрезается до 300 знаков, пустые поля не хранятся', () => {
  const state = setRecommenderSheet(withPerson(), 'p1', { ...answers, proud: '😀'.repeat(SHEET_MAX + 20), extra: 'чужое поле' });
  const sheet = sheetOf(state);
  assert.deepEqual(Object.keys(sheet), ['study', 'quality1', 'quality3', 'proud', 'more']);
  assert.equal(sheet.more, 'С 8 класса помогаю семье в магазине.\nПоэтому на кружки времени мало.');
  assert.equal(Array.from(sheet.proud).length, SHEET_MAX);
  assert.equal(setRecommenderSheet(state, 'нет-такого', answers), null);
  assert.equal(setRecommenderSheet(state, 'p1', 'строка'), null);
  // Пустые поля стирают прежние ответы, совсем пустая форма — шпаргалку.
  const cleared = setRecommenderSheet(state, 'p1', { study: 'Только это' });
  assert.deepEqual(sheetOf(cleared), { study: 'Только это' });
  assert.equal(Object.hasOwn(recommendersOf(setRecommenderSheet(cleared, 'p1', {})).people[0], 'sheet'), false);
});

test('шпаргалка общая для человека: переживает смену целей, статусов, экспорт, импорт и сохранение', () => {
  let state = setRecommenderSheet(withPerson(), 'p1', answers);
  state = saveRecommender(state, { id: 'p1', name: 'Гульнора Рахимовна', role: 'учитель физики', goalIds: ['kaist'] });
  state = setRecommenderStatus(state, 'p1', 'kaist', 'asked', TODAY);
  const sheet = sheetOf(state);
  assert.equal(sheet.study, answers.study);
  assert.deepEqual(importState(exportState(state)).recommenders.people[0].sheet, sheet);
  const store = new Map();
  assert.ok(saveRouteState(state, { setItem: (k, v) => store.set(k, v), getItem: k => store.get(k) ?? null }));
  assert.deepEqual(recommendersOf(loadRouteState({ getItem: k => store.get(k) ?? null })).people[0].sheet, sheet);
});

test('битая шпаргалка не ломает маршрут и человека', () => {
  const broken = JSON.parse(exportState(setRecommenderSheet(withPerson(), 'p1', answers)));
  broken.recommenders.people[0].sheet = { study: ['массив'], quality1: 7, proud: { x: 1 }, more: 'Осталось' };
  broken.recommenders.people.push({ id: 'p2', name: 'Второй', goals: [], sheet: 'мусор' });
  const loaded = loadRouteState({ getItem: () => JSON.stringify(broken) });
  assert.deepEqual(loaded.goals, ['harvard', 'kaist']);
  assert.deepEqual(loaded.recommenders.people[0].sheet, { more: 'Осталось' });
  assert.equal(loaded.recommenders.people[1].name, 'Второй');
  assert.equal(Object.hasOwn(loaded.recommenders.people[1], 'sheet'), false);
  broken.recommenders.people[0].sheet = null;
  assert.equal(Object.hasOwn(importState(JSON.stringify(broken)).recommenders.people[0], 'sheet'), false);
});

// ——— текст ———

test('текст: кому, от кого, куда и до какого числа, ответы по разделам; пустые поля не попадают', () => {
  const state = setRecommenderSheet(withPerson(), 'p1', answers);
  const text = bragSheetText({ teacher: 'Гульнора Рахимовна', role: 'учитель физики', from: '', entries, sheet: sheetOf(state), works: null });
  assert.match(text, /^Шпаргалка для рекомендации\n\nКому: Гульнора Рахимовна · учитель физики\nОт: \[имя и фамилия, класс\]/);
  assert.match(text, /Куда подаюсь:\n— Гарвардский колледж: до 1 января 2027, отправлять через Common App\n— KAIST: срок ещё не объявлен/);
  assert.match(text, /Что хочу изучать и почему:\nФизику: хочу понять/);
  // Второе качество пустое — нумерация без дыры.
  assert.match(text, /Что вы видели на уроках:\n1\. Упорство — [^\n]+\n2\. Любопытство — /);
  assert.match(text, /Что ещё важно знать:\nС 8 класса помогаю семье в магазине\.\nПоэтому на кружки/);
  assert.doesNotMatch(text, /Чем горжусь/);
  assert.doesNotMatch(text, /Мои работы/);
  assert.doesNotMatch(text, /undefined|null/);
  assert.ok(text.endsWith('Если нужно что-то ещё — спросите, пришлю.'));
  assert.ok(text.includes(FROM_BLANK));
});

test('разделы листа: только заполненные, качества — нумерованным списком', () => {
  assert.deepEqual(sheetSections({ proud: 'Доклад' }).map(section => section.title), ['Чем горжусь в вашем предмете']);
  assert.deepEqual(sheetSections({ quality2: 'Б', quality3: 'В' })[0].items, ['Б', 'В']);
  assert.deepEqual(sheetSections(null), []);
  assert.deepEqual(SHEET_FORM.map(item => item.field), SHEET_FIELDS);
  assert.ok(SHEET_FORM.every(item => item.hint.length > 0 && item.label.length > 0));
});

// ——— «Мои работы» ———

function withPortfolio() {
  let state = withPerson();
  state = saveExperience(state, { ...exp, id: 'solar', title: 'Модель солнечной станции', period: '2025–2026',
    result: 'Модель взяли на районную выставку' }, TODAY);
  state = saveExperience(state, { ...exp, id: 'club', title: 'Кружок физики', kind: 'community' }, TODAY);
  return state;
}

test('работы: без подборки — названия записей портфолио, как в памятке', () => {
  const state = withPortfolio();
  assert.deepEqual(sheetWorks(state, entries), { kind: 'titles', titles: ['Модель солнечной станции (2025–2026)', 'Кружок физики'] });
  const text = bragSheetText({ teacher: 'А', entries, sheet: { study: 'Физику' }, works: sheetWorks(state, entries) });
  assert.match(text, /Мои работы:\n— Модель солнечной станции \(2025–2026\)\n— Кружок физики/);
  // Тот же список, что и в памятке.
  assert.match(teacherMemo({ entries, experiences: state.portfolio.experiences }), /— Модель солнечной станции \(2025–2026\)\n— Кружок физики/);
  assert.equal(sheetWorks(withPerson(), entries), null);
});

test('работы: есть подборка у цели этого человека — берётся она, через spotlightText', () => {
  let state = withPortfolio();
  state = saveSpotlight(state, 'kaist', { name: 'Мурод', items: [{ experienceId: 'solar', line: 'Собрали модель втроём' }] }, TODAY);
  const works = sheetWorks(state, entries);
  assert.equal(works.kind, 'spotlight');
  assert.equal(works.texts.length, 1);
  assert.match(works.texts[0], /^Подборка работ для: KAIST\n\n1\. Модель солнечной станции — проект\nСобрали модель втроём/);
  // Имя идёт строкой «От:» наверху листа, в подборке не повторяется.
  assert.doesNotMatch(works.texts[0], /Имя:/);
  assert.equal(sheetFrom(state), 'Мурод');
  const text = bragSheetText({ teacher: 'А', from: sheetFrom(state), entries, sheet: {}, works });
  assert.match(text, /От: Мурод/);
  assert.match(text, /Мои работы:\n\nПодборка работ для: KAIST/);
  assert.doesNotMatch(text, /— Кружок физики/);
  // Подборка другой цели (не этого человека) не берётся.
  assert.equal(sheetWorks(state, entries.slice(0, 1)).kind, 'titles');
  // Удалили запись подборки — снова список названий.
  const gone = removeExperience(state, 'solar');
  assert.deepEqual(sheetWorks(gone, entries), { kind: 'titles', titles: ['Кружок физики'] });
});

// ——— адрес страницы ———

test('адрес страницы шпаргалки', () => {
  assert.equal(bragSheetHash('a b/c'), 'route/recommenders/a%20b%2Fc/sheet');
  assert.equal(bragSheetRoute(`#${bragSheetHash('a b/c')}`), 'a b/c');
  assert.equal(bragSheetRoute('#route/recommenders/p1'), null);
  assert.equal(bragSheetRoute('#route/recommenders/p1/sheet/x'), null);
  assert.equal(bragSheetRoute('#route/recommenders/%E0/sheet'), null);
  assert.equal(bragSheetRoute('#route/spotlight/p1/page'), null);
});
