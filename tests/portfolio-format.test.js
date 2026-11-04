import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRouteState, exportState, importState } from '../js/route-state.js';
import { startPortfolioWork, savePortfolioBrief, saveExperience, experiencesBySkill, EXPERIENCE_SKILLS } from '../js/portfolio.js';
import { WORK_TEMPLATES, WORK_FORMATS, workFormatLabel } from '../js/portfolio-work.js';
import { essayCount } from '../js/essay.js';

const TODAY = '2026-11-04';
const empty = () => loadRouteState({ getItem: () => null });
const work = { id:'work-1', templateId:'data', title:'Проверить данные', aim:'Хочу понять метод', expectedResult:'Анализ с объяснением', goals:[] };
// Файл экспорта до этой правки: работа без формата итога, опыт без навыков.
const OLD_EXPORT = JSON.stringify({ version:2, goals:[], done:{}, portfolio:{ version:1, outcomes:[], experiences:[
  { id:'old-exp', kind:'project', title:'Школьный сайт', period:'', role:'Делал вёрстку', actions:'', result:'', reflection:'', url:'', goals:[], createdOn:'2026-10-28', updatedOn:'2026-10-28' },
  { id:'old-work', kind:'study', title:'Таблица расходов', period:'', role:'', actions:'', result:'', reflection:'', url:'', goals:[], createdOn:'2026-10-29', updatedOn:'2026-10-29',
    workPlan:{ version:1, id:'old-work', templateId:'data', aim:'Понять траты', expectedResult:'Таблица', sessionMinutes:60, paused:false,
      steps:[{ id:'question', title:'Вопрос', expected:'Один вопрос', done:false }] } },
] } });

test('every template proposes a known result format; the student can choose another one', () => {
  for (const template of WORK_TEMPLATES) assert.ok(workFormatLabel(template), template.id);
  const byDefault = startPortfolioWork(empty(), work, TODAY).portfolio.experiences[0].workPlan;
  assert.equal(byDefault.format, 'table');
  assert.equal(workFormatLabel(byDefault), 'Расчёт или таблица');
  const chosen = startPortfolioWork(empty(), { ...work, format:'talk' }, TODAY).portfolio.experiences[0].workPlan;
  assert.equal(chosen.format, 'talk');
  assert.equal(startPortfolioWork(empty(), { ...work, format:'poster' }, TODAY), null);
  assert.deepEqual(WORK_FORMATS.map(([id]) => id), ['text','code','table','talk','other']);
});

test('old export without format and skills imports unchanged and re-exports identically', () => {
  const state = importState(OLD_EXPORT);
  assert.ok(state);
  const [entry, workEntry] = state.portfolio.experiences;
  assert.equal(Object.hasOwn(entry, 'skills'), false);
  assert.equal(Object.hasOwn(workEntry.workPlan, 'format'), false);
  assert.equal(workFormatLabel(workEntry.workPlan), null);
  assert.deepEqual(importState(exportState(state)), state);
  // Старую работу можно править, не выбирая формат; формат добавляется только по выбору.
  const edited = savePortfolioBrief(state, 'old-work', { aim:'Понять траты', expectedResult:'Таблица', format:'' }, TODAY);
  assert.equal(Object.hasOwn(edited.portfolio.experiences[1].workPlan, 'format'), false);
  const chosen = savePortfolioBrief(state, 'old-work', { aim:'Понять траты', expectedResult:'Таблица', format:'text' }, TODAY);
  assert.equal(chosen.portfolio.experiences[1].workPlan.format, 'text');
  assert.equal(savePortfolioBrief(state, 'old-work', { aim:'Понять траты', expectedResult:'Таблица', format:'essay' }, TODAY), null);
});

test('new format and skills survive export and import; unknown values reject the whole file', () => {
  let state = startPortfolioWork(empty(), { ...work, format:'code' }, TODAY);
  state = saveExperience(state, { id:'work-1', skills:['tech','research'] }, TODAY);
  const back = importState(exportState(state));
  assert.deepEqual(back, state);
  assert.equal(back.portfolio.experiences[0].workPlan.format, 'code');
  assert.deepEqual(back.portfolio.experiences[0].skills, ['tech','research']);
  const badFormat = structuredClone(state); badFormat.portfolio.experiences[0].workPlan.format = 'poster';
  assert.equal(importState(JSON.stringify(badFormat)), null);
  const badSkill = structuredClone(state); badSkill.portfolio.experiences[0].skills = ['charisma'];
  assert.equal(importState(JSON.stringify(badSkill)), null);
});

test('an experience takes one to three distinct known skills; clearing removes the field', () => {
  const base = { id:'exp', title:'Кружок', kind:'community', goals:[] };
  const saved = saveExperience(empty(), { ...base, skills:['leadership','teamwork','helping'] }, TODAY);
  assert.deepEqual(saved.portfolio.experiences[0].skills, ['leadership','teamwork','helping']);
  assert.equal(saveExperience(empty(), { ...base, skills:['leadership','teamwork','helping','tech'] }, TODAY), null);
  assert.equal(saveExperience(empty(), { ...base, skills:['tech','tech'] }, TODAY), null);
  assert.equal(saveExperience(empty(), { ...base, skills:['__proto__'] }, TODAY), null);
  assert.equal(saveExperience(empty(), { ...base, skills:'tech' }, TODAY), null);
  const kept = saveExperience(saved, { id:'exp', title:'Кружок робототехники' }, TODAY);
  assert.deepEqual(kept.portfolio.experiences[0].skills, ['leadership','teamwork','helping']);
  const cleared = saveExperience(saved, { id:'exp', skills:[] }, TODAY);
  assert.equal(Object.hasOwn(cleared.portfolio.experiences[0], 'skills'), false);
  assert.equal(EXPERIENCE_SKILLS.length, 7);
});

test('examples are grouped by skill in the fixed list order and include only tagged records', () => {
  let state = saveExperience(empty(), { id:'a', title:'Сайт для школы', kind:'project', goals:[], skills:['tech','independence'] }, TODAY);
  state = saveExperience(state, { id:'b', title:'Помощь соседям', kind:'community', goals:[], skills:['helping','independence'] }, TODAY);
  state = saveExperience(state, { id:'c', title:'Без навыков', kind:'other', goals:[] }, TODAY);
  assert.deepEqual(experiencesBySkill(state), [
    { skill:'independence', label:'Самостоятельность', entries:[{ id:'a', title:'Сайт для школы' }, { id:'b', title:'Помощь соседям' }] },
    { skill:'helping', label:'Помощь людям', entries:[{ id:'b', title:'Помощь соседям' }] },
    { skill:'tech', label:'Техника', entries:[{ id:'a', title:'Сайт для школы' }] },
  ]);
  assert.deepEqual(experiencesBySkill(empty()), []);
});

test('essay counter uses only limits from program data; without them it shows no bound', () => {
  const free = essayCount('Я хочу учиться', { id:'essay-1' });
  assert.equal(free.text, '3 слова · 14 знаков');
  assert.equal(essayCount('Да', {}).text, '1 слово · 2 знака');
  assert.equal(free.over, false); assert.equal(free.under, false);
  assert.doesNotMatch(free.text, / из |источнику/);
  const words = essayCount('раз два три', { words:{ min:5, max:10 } });
  assert.equal(words.text, '3 из 10 слов · 11 знаков. По источнику: от 5 слов, до 10 слов. Пока меньше минимума.');
  assert.equal(words.under, true);
  assert.equal(essayCount('', { words:{ min:5 } }).under, false);
  const bytes = essayCount('Привет', { characters:10, bytes:10 });
  assert.equal(bytes.text, '1 слово · 6 из 10 знаков · 12 из 10 байт. По источнику: до 10 знаков, до 10 байт. Объём превышает лимит.');
  assert.equal(bytes.over, true);
});
