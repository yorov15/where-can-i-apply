import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRouteState, saveRouteState, exportState, importState, setGoals, toggleStep, clearProgress } from '../js/route-state.js';
import { saveExperience, removeExperience, saveTaskOutcome, removeTaskOutcome, normalizePortfolio } from '../js/portfolio.js';
import { prepareCurrentWeek } from '../js/weekly.js';

const TODAY = '2026-10-28';
const WEEK = '2026-W44';
const empty = () => loadRouteState({ getItem: () => null });
const entry = { id:'exp-1', title:'Помощь в магазине', kind:'work', period:'Лето 2026', role:'Вёл учёт', actions:'Проверил записи', result:'Исправил таблицу', reflection:'Нужно проверять ввод', url:'https://example.org/work', goals:[{goalId:'kaist',why:'Хочу рассказать об интересе к данным'}] };
const withEntry = () => saveExperience(setGoals(empty(), ['kaist']), entry, TODAY);
const withTask = () => ({ ...withEntry(), weekPlan:{[WEEK]:[{taskId:'practice:1',title:'Проверь таблицу',done:false,minutes:30}]} });

test('old routes have no required portfolio and retain their exact progress', () => {
  const old = toggleStep(setGoals(empty(), ['kaist']), 'doc:passport', TODAY);
  assert.equal(old.portfolio, undefined);
  assert.deepEqual(importState(exportState(old)), old);
  assert.equal(importState('{"version":1,"goal":"kaist","done":[]}').portfolio, undefined);
});

test('experience keeps authorship, goal explanation and dates across edits without mutating input', () => {
  const start = empty();
  const created = saveExperience(start, entry, TODAY);
  assert.equal(start.portfolio, undefined);
  assert.equal(created.portfolio.experiences[0].createdOn, TODAY);
  const edited = saveExperience(created, {...entry,role:'Проверял ввод'}, '2026-10-29');
  assert.equal(edited.portfolio.experiences[0].createdOn, TODAY);
  assert.equal(edited.portfolio.experiences[0].updatedOn, '2026-10-29');
  assert.equal(created.portfolio.experiences[0].role, entry.role);
  assert.equal(edited.portfolio.experiences[0].goals[0].why, entry.goals[0].why);
});

test('goal removal and progress reset keep experience and its original mapping', () => {
  const start = withEntry();
  assert.deepEqual(setGoals(start, []).portfolio, start.portfolio);
  assert.deepEqual(clearProgress(start).portfolio, start.portfolio);
});

test('unsafe URLs, ids, impossible dates and oversized fields cannot be saved', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'file:///c:/secret', 'https://user:pass@example.org']) {
    assert.equal(saveExperience(empty(), {...entry,url}, TODAY), null);
  }
  for (const id of ['__proto__','constructor','prototype','']) assert.equal(saveExperience(empty(), {...entry,id}, TODAY), null);
  assert.equal(saveExperience(empty(), {...entry,title:'x'.repeat(161)}, TODAY), null);
  assert.equal(saveExperience(empty(), {...entry,title:'  '}, TODAY), null);
  assert.equal(saveExperience(empty(), entry, '2026-02-31'), null);
  assert.equal({}.polluted, undefined);
});

test('one outcome per task and week can be edited; it never ticks the task', () => {
  const start = withTask();
  const patch = {week:WEEK,taskId:'practice:1',experienceId:'exp-1',text:'Проверил 12 строк',url:'',reflection:'Нашёл повтор'};
  const next = saveTaskOutcome(start, patch, TODAY);
  assert.equal(next.weekPlan[WEEK][0].done, false);
  assert.equal(start.portfolio.outcomes.length, 0);
  assert.equal(next.portfolio.outcomes[0].title, 'Проверь таблицу');
  const edited = saveTaskOutcome(next, {...patch,text:'Проверил ещё раз'}, TODAY);
  assert.equal(edited.portfolio.outcomes.length, 1);
  assert.equal(edited.portfolio.outcomes[0].text, 'Проверил ещё раз');
  assert.equal(saveTaskOutcome(start, {...patch,taskId:'missing'}, TODAY), null);
  assert.equal(saveTaskOutcome(start, {...patch,experienceId:'missing'}, TODAY), null);
  assert.equal(saveTaskOutcome(start, {...patch,text:''}, TODAY), null);
});

test('deleting experience detaches outcomes while retaining their text and history', () => {
  const state = saveTaskOutcome(withTask(), {week:WEEK,taskId:'practice:1',experienceId:'exp-1',text:'Готово',url:'',reflection:''}, TODAY);
  const next = removeExperience(state, 'exp-1');
  assert.equal(next.portfolio.experiences.length, 0);
  assert.equal(next.portfolio.outcomes[0].experienceId, null);
  assert.equal(next.portfolio.outcomes[0].text, 'Готово');
  assert.equal(state.portfolio.experiences.length, 1);
});

test('rebuilding a week preserves saved outcomes even when a task leaves the plan', () => {
  const state = saveTaskOutcome(withTask(), {week:WEEK,taskId:'practice:1',text:'Пробовал метод',url:'',reflection:''}, TODAY);
  const rebuilt = prepareCurrentWeek(state, {steps:[],week:[]}, null, TODAY).state;
  assert.equal(rebuilt.weekPlan[WEEK].length, 0);
  assert.deepEqual(rebuilt.portfolio, state.portfolio);
});

test('whole route export and local save restore portfolio together with tasks and old fields', () => {
  const state = saveTaskOutcome(withTask(), {week:WEEK,taskId:'practice:1',experienceId:'exp-1',text:'Готово',url:'https://example.org/result',reflection:'Доработаю'}, TODAY);
  assert.deepEqual(importState(exportState(state)), state);
  const serialized = exportState(state);
  assert.deepEqual(loadRouteState({getItem:key=>key==='eligibility-route'?serialized:null}), state);
});

test('invalid or future portfolio in an import rejects the whole file instead of silently deleting it', () => {
  const state = withEntry();
  for (const portfolio of [{version:2,experiences:[],outcomes:[]},{version:1,experiences:'bad',outcomes:[]}, {...state.portfolio,experiences:[...state.portfolio.experiences,...state.portfolio.experiences]}]) {
    assert.equal(importState(JSON.stringify({...state,portfolio})), null);
  }
  assert.equal(normalizePortfolio({...state.portfolio,outcomes:[{week:WEEK,taskId:'x',experienceId:'missing',text:'x',title:'x',url:'',reflection:'',updatedOn:TODAY}]}), null);
  assert.equal(normalizePortfolio({...state.portfolio,outcomes:[{week:{toString:'bad'},taskId:'x'}]}), null);
  assert.equal(state.portfolio.experiences.length, 1);
});

test('outcomes can be deleted independently so the library limit does not lock old history forever', () => {
  const state = saveTaskOutcome(withTask(), {week:WEEK,taskId:'practice:1',experienceId:'exp-1',text:'Готово'}, TODAY);
  const next = removeTaskOutcome(state,WEEK,'practice:1');
  assert.equal(next.portfolio.outcomes.length,0);
  assert.equal(state.portfolio.outcomes.length,1);
  assert.deepEqual(next.portfolio.experiences,state.portfolio.experiences);
  assert.deepEqual(next.weekPlan,state.weekPlan);
});

test('limits reject a new record without changing existing library', () => {
  const state=withEntry();
  const tooMany={...state.portfolio,experiences:Array.from({length:41},(_,index)=>({...state.portfolio.experiences[0],id:`exp-${index}`}))};
  assert.equal(normalizePortfolio(tooMany),null);
  const heavy={...state.portfolio,experiences:Array.from({length:40},(_,index)=>({...state.portfolio.experiences[0],id:`exp-${index}`,role:'я'.repeat(1000),actions:'я'.repeat(2000),result:'я'.repeat(2000),reflection:'я'.repeat(2000)}))};
  assert.equal(normalizePortfolio(heavy),null);
  assert.equal(state.portfolio.experiences.length,1);
});

test('save reports primary storage failure; a legacy compatibility failure cannot undo a successful save', () => {
  assert.equal(saveRouteState({...withEntry(),portfolio:{version:99}},{setItem(){assert.fail('Invalid data must not overwrite saved work');}}),false);
  assert.equal(saveRouteState(withEntry(),{setItem(){throw Error('quota');}}),false);
  let saved=null;
  assert.equal(saveRouteState(withEntry(),{setItem(key,value){if(key==='eligibility-plan')throw Error('quota');saved=value;}}),true);
  assert.equal(JSON.parse(saved).portfolio.experiences[0].title,entry.title);
});
