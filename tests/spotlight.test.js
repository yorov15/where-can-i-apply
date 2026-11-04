import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRouteState, exportState, importState, saveRouteState } from '../js/route-state.js';
import { saveExperience, removeExperience } from '../js/portfolio.js';
import { saveSpotlight, spotlightOf, spotlightName, spotlightHint, spotlightEntries, spotlightTips, spotlightText,
  activityNotes, lineLength, LINE_MAX, SPOTLIGHT_MAX } from '../js/spotlight.js';
import { spotlightRoute, spotlightHash } from '../js/spotlight-view.js';

const TODAY = '2026-11-04';
const empty = () => loadRouteState({ getItem: () => null });
const base = { kind:'project', period:'', role:'', actions:'', result:'', reflection:'', url:'', goals:[] };

function withEntries(count = 3) {
  let state = empty();
  state = saveExperience(state, { ...base, id:'site', title:'Школьный сайт', period:'2025–2026', role:'Вёрстка и тексты',
    result:'Сайт школы открывают 200 человек в месяц', skills:['tech','independence'], url:'https://example.org/site' }, TODAY);
  if (count > 1) state = saveExperience(state, { ...base, id:'club', title:'Клуб дебатов', kind:'community', skills:['leadership'] }, TODAY);
  if (count > 2) state = saveExperience(state, { ...base, id:'bare', title:'Помощь брату с математикой', kind:'family' }, TODAY);
  return { ...state, goals:['kaist'] };
}

test('без подборки состояние и экспорт прежние: пустую не храним', () => {
  const state = withEntries();
  assert.equal(Object.hasOwn(state, 'spotlight'), false);
  const saved = saveSpotlight(state, 'kaist', { items:[] }, TODAY);
  assert.equal(Object.hasOwn(saved, 'spotlight'), false);
  assert.equal(exportState(saved), exportState(state));
});

test('подборка сохраняет порядок, строки и имя и переживает экспорт и сохранение', () => {
  const state = saveSpotlight(withEntries(), 'kaist', { name:'Мурод', items:[
    { experienceId:'club', line:'Вёл клуб  весь год' }, { experienceId:'site', line:'' }] }, TODAY);
  assert.deepEqual(spotlightOf(state, 'kaist'), { updatedOn:TODAY, items:[
    { experienceId:'club', line:'Вёл клуб весь год' }, { experienceId:'site', line:'' }] });
  assert.equal(spotlightName(state), 'Мурод');
  const again = importState(exportState(state));
  assert.deepEqual(again.spotlight, state.spotlight);
  const store = new Map();
  assert.ok(saveRouteState(state, { setItem:(k, v) => store.set(k, v), getItem:k => store.get(k) ?? null }));
  assert.deepEqual(loadRouteState({ getItem:k => store.get(k) ?? null }).spotlight, state.spotlight);
});

test('не больше пяти записей, строка до 150 знаков, без повторов и чужих записей', () => {
  let state = withEntries();
  for (let i = 0; i < 4; i++) state = saveExperience(state, { ...base, id:`extra-${i}`, title:`Работа ${i}` }, TODAY);
  const ids = state.portfolio.experiences.map(entry => entry.id);
  assert.ok(saveSpotlight(state, 'kaist', { items:ids.slice(0, SPOTLIGHT_MAX).map(experienceId => ({ experienceId, line:'' })) }, TODAY));
  assert.equal(saveSpotlight(state, 'kaist', { items:ids.slice(0, 6).map(experienceId => ({ experienceId, line:'' })) }, TODAY), null);
  assert.ok(saveSpotlight(state, 'kaist', { items:[{ experienceId:'site', line:'я'.repeat(LINE_MAX) }] }, TODAY));
  assert.equal(saveSpotlight(state, 'kaist', { items:[{ experienceId:'site', line:'я'.repeat(LINE_MAX + 1) }] }, TODAY), null);
  assert.equal(saveSpotlight(state, 'kaist', { items:[{ experienceId:'site', line:'' }, { experienceId:'site', line:'' }] }, TODAY), null);
  assert.equal(saveSpotlight(state, 'kaist', { items:[{ experienceId:'ghost', line:'' }] }, TODAY), null);
  // Эмодзи — один знак, как видит человек.
  assert.equal(lineLength('👍🏽'), 2);
  assert.equal(lineLength('🙂'), 1);
});

test('удалённая запись опыта выпадает из подборки, файл не ломается', () => {
  const state = saveSpotlight(withEntries(), 'kaist', { items:[{ experienceId:'site', line:'a' }, { experienceId:'club', line:'b' }] }, TODAY);
  const removed = removeExperience(state, 'club');
  assert.deepEqual(spotlightOf(removed, 'kaist').items, [{ experienceId:'site', line:'a' }]);
  const reloaded = importState(exportState(removed));
  assert.deepEqual(reloaded.spotlight.goals.kaist.items, [{ experienceId:'site', line:'a' }]);
});

test('повреждённая подборка в файле отклоняет импорт, а не теряется молча', () => {
  const file = JSON.parse(exportState(saveSpotlight(withEntries(), 'kaist', { items:[{ experienceId:'site', line:'' }] }, TODAY)));
  assert.ok(importState(JSON.stringify(file)));
  for (const broken of [{ version:2, goals:{} }, { version:1, goals:{ kaist:{ items:'site', updatedOn:TODAY } } },
    { version:1, goals:{ kaist:{ items:[{ experienceId:'site', line:'x'.repeat(151) }], updatedOn:TODAY } } },
    { version:1, goals:{ kaist:{ items:[], updatedOn:'2026-13-01' } } }])
    assert.equal(importState(JSON.stringify({ ...file, spotlight:broken })), null);
});

test('подсказка берётся из итога записи, иначе из результата задания, иначе из навыков; без выдумок', () => {
  let state = withEntries();
  assert.equal(spotlightHint(state, 'site'), 'Сайт школы открывают 200 человек в месяц');
  assert.equal(spotlightHint(state, 'club'), 'Навыки: лидерство');
  assert.equal(spotlightHint(state, 'bare'), '');
  state = saveExperience(state, { ...state.portfolio.experiences[0], result:'слово '.repeat(60) }, TODAY);
  const long = spotlightHint(state, 'site');
  assert.ok(lineLength(long) <= LINE_MAX);
  assert.ok(long.endsWith('…'));
  // Итог работы без «Что получилось» — последний записанный результат задания.
  state = { ...state, portfolio:{ ...state.portfolio, outcomes:[
    { week:'2026-W44', taskId:'t1', title:'Шаг', text:'Первая версия', url:'', reflection:'', experienceId:'bare', updatedOn:'2026-10-28' },
    { week:'2026-W45', taskId:'t2', title:'Шаг', text:'Собрал таблицу задач', url:'https://example.org/t', reflection:'', experienceId:'bare', updatedOn:'2026-11-03' }] } };
  assert.equal(spotlightHint(state, 'bare'), 'Собрал таблицу задач');
  const [entry] = spotlightEntries(saveSpotlight(state, 'kaist', { items:[{ experienceId:'bare', line:'' }] }, TODAY), 'kaist');
  assert.equal(entry.result, 'Собрал таблицу задач');
  assert.deepEqual(entry.links, ['https://example.org/t']);
});

test('подсказки: меньше трёх записей и записи без итога; оценок нет', () => {
  const state = saveSpotlight(withEntries(), 'kaist', { items:[{ experienceId:'site', line:'' }, { experienceId:'bare', line:'' }] }, TODAY);
  assert.deepEqual(spotlightTips(state, 'kaist'), [{ kind:'more' }, { kind:'result', id:'bare', title:'Помощь брату с математикой' }]);
  const full = saveSpotlight(withEntries(), 'kaist', { items:['site', 'club', 'bare'].map(experienceId => ({ experienceId, line:'' })) }, TODAY);
  assert.deepEqual(spotlightTips(full, 'kaist').map(tip => tip.kind), ['result', 'result']);
});

test('spotlightText отдаёт текст подборки для других экранов', () => {
  const state = saveSpotlight(withEntries(), 'kaist', { name:'Мурод', items:[
    { experienceId:'site', line:'Сделал сайт школы с нуля' }, { experienceId:'club', line:'' }] }, TODAY);
  assert.equal(spotlightText(state, 'kaist', { programName:'KAIST' }), [
    'Подборка работ для: KAIST', 'Имя: Мурод', '',
    '1. Школьный сайт — проект', 'Сделал сайт школы с нуля', 'Роль: Вёрстка и тексты', 'Сроки: 2025–2026',
    'Итог: Сайт школы открывают 200 человек в месяц', 'Навыки: техника, самостоятельность', 'Ссылка: https://example.org/site', '',
    '2. Клуб дебатов — инициатива', 'Навыки: лидерство'].join('\n'));
  // Без имени программы — её id; имя можно передать снаружи; без подборки — пустая строка.
  assert.match(spotlightText(state, 'kaist', { name:'' }), /^Подборка работ для: kaist\n\n1\./);
  assert.equal(spotlightText(state, 'mit'), '');
  assert.equal(spotlightText(empty(), 'kaist'), '');
});

test('строки программы о внеучебном опыте — только из документов условий', () => {
  const conditions = [
    { ru:'Академические награды и внеучебные активности (опционально, до трёх)', kind:'documents' },
    { ru:'Оценивают всё вместе — оценки, внеучебное, рекомендации', kind:'note' },
    { ru:'Аттестат', kind:'documents' }];
  assert.deepEqual(activityNotes(conditions), ['Академические награды и внеучебные активности (опционально, до трёх)']);
  assert.deepEqual(activityNotes(null), []);
});

test('адрес подборки: выбор и страница', () => {
  assert.equal(spotlightHash('kaist'), 'route/spotlight/kaist');
  assert.equal(spotlightHash('a b', true), 'route/spotlight/a%20b/page');
  assert.deepEqual(spotlightRoute('#route/spotlight/kaist'), { goalId:'kaist', page:false });
  assert.deepEqual(spotlightRoute('#route/spotlight/a%20b/page'), { goalId:'a b', page:true });
  assert.equal(spotlightRoute('#route/applications'), null);
  assert.equal(spotlightRoute('#route/spotlight/%E0'), null);
});
