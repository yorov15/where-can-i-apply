import test from 'node:test';
import assert from 'node:assert/strict';
import { LEARNING_LESSONS, normalizeLearning, learningOf, pendingPractice, learningEvidence } from '../js/portfolio-learning.js';
import { startPortfolioWork, updatePortfolioLearning, saveExperience, saveTaskOutcome, removeTaskOutcome, togglePortfolioWorkStep, nextPortfolioTasks } from '../js/portfolio.js';
import { loadRouteState, importState, exportState } from '../js/route-state.js';
import { prepareCurrentWeek } from '../js/weekly.js';
const TODAY='2026-10-30',base=()=>startPortfolioWork(loadRouteState(),{id:'work-1',templateId:'data',title:'Моя работа',aim:'Разобраться',expectedResult:'Понятный вывод'},TODAY);
const plan=state=>state.portfolio.experiences[0].workPlan;
const change=(state,action,input={})=>updatePortfolioLearning(state,'work-1',action,input,TODAY);
const start=(state=base(),id='practice-1',lessonId='comparison')=>change(state,'start',{id,lessonId});
function finish(state=start()) {return change(change(change(state,'attempt',{text:'Первая попытка'}),'example'),'transfer',{text:'Новая попытка',reason:'Сравнил знаменатели'});}
function result(state=base(),text='Исходный результат'){const entry=state.portfolio.experiences[0];return saveExperience(state,{...entry,result:text},TODAY);}
const review={id:'feedback-1',kind:'reader',sourceKey:'experience',request:'Понятен ли вывод?',observation:'Не указана граница',nextAction:'Объясни ограничение',reviewer:'Читатель'};

test('old works keep their exact shape and all six lessons are optional',()=>{
  const state=base();assert.equal(Object.hasOwn(plan(state),'learning'),false);assert.deepEqual(importState(exportState(state)),state);
  for(const lesson of LEARNING_LESSONS){const next=start(state,'practice-1',lesson.id);assert.equal(plan(next).learning.practices[0].lesson.title,lesson.title);assert.notEqual(plan(next).learning.practices[0].lesson,lesson);}
  assert.equal(start(state,'p','unknown'),null);assert.equal(Object.hasOwn(plan(state),'learning'),false);
});

test('attempt, opened example and new attempt are ordered and saved only once',()=>{
  let state=start();assert.equal(change(state,'example'),null);assert.equal(change(state,'transfer',{text:'x',reason:'y'}),null);
  state=change(state,'attempt',{text:'Мой ответ'});assert.equal(change(state,'attempt',{text:'Переписанный ответ'}),null);
  assert.equal(change(state,'transfer',{text:'x',reason:'y'}),null);state=change(state,'example');
  assert.equal(change(state,'transfer',{text:'x',reason:''}),null);state=change(state,'transfer',{text:'Новый ответ',reason:'Уточнил вывод'});
  assert.equal(pendingPractice(plan(state)),null);assert.equal(change(state,'transfer',{text:'ещё',reason:'y'}),null);
  assert.equal(plan(state).steps.some(step=>step.done),false);assert.equal(state.portfolio.outcomes.length,0);
});

test('lesson content and first attempt survive changing the work and roundtrip',()=>{
  const state=finish(),snapshot=structuredClone(plan(state).learning);
  const edited=result(state,'Новая работа');assert.deepEqual(plan(edited).learning,snapshot);assert.deepEqual(importState(exportState(edited)),edited);
});

test('practice shares the existing weekly slot and does not add a second budget',()=>{
  const before=base(),after=start(before),route={steps:[],week:[]};
  const a=prepareCurrentWeek(before,route,null,TODAY),b=prepareCurrentWeek(after,route,null,TODAY);
  assert.equal(a.week.tasks.length,b.week.tasks.length);assert.equal(a.week.tasks[0].taskId,b.week.tasks[0].taskId);
  assert.equal(a.week.tasks[0].minutes,b.week.tasks[0].minutes);assert.match(nextPortfolioTasks(after)[0].title,/Учебная проба/);
});

test('finishing a practice is not a work-step outcome; pending practice can be postponed',()=>{
  let state=start();assert.equal(togglePortfolioWorkStep(state,'work-1','question',TODAY),null);
  state=prepareCurrentWeek(state,{steps:[],week:[]},null,TODAY).state;
  const [week,tasks]=Object.entries(state.weekPlan)[0],task=tasks[0];
  state=saveTaskOutcome(state,{week,taskId:task.taskId,text:'Настоящий результат'},TODAY);
  assert.equal(togglePortfolioWorkStep(state,'work-1','question',TODAY),null);
  state=change(state,'archive');assert.equal(plan(state).learning.practices.length,1);
  assert.ok(togglePortfolioWorkStep(state,'work-1','question',TODAY));
  assert.equal(togglePortfolioWorkStep(finish(),'work-1','question',TODAY),null);
});

test('unfinished attempts resume without losing answers and history is bounded',()=>{
  let state=change(start(),'attempt',{text:'Моя проба'});assert.equal(start(state,'other'),null);
  state=change(change(state,'archive'),'resume',{id:'practice-1'});assert.equal(plan(state).learning.practices[0].attempt.text,'Моя проба');
  state=change(state,'archive');state=change(start(state,'practice-2'),'archive');state=change(start(state,'practice-3'),'archive');
  assert.equal(start(state,'practice-4'),null);state=change(state,'remove-practice',{id:'practice-2'});assert.ok(start(state,'practice-4'));
  assert.equal(state.portfolio.experiences.length,1);assert.equal(plan(state).learning.practices[0].attempt.text,'Моя проба');
});

test('review contains the actual shown result and never completes the work',()=>{
  const before=result(),state=change(before,'feedback',review),item=plan(state).learning.feedback[0];
  assert.equal(item.source.text,'Исходный результат');assert.equal(plan(state).steps.some(step=>step.done),false);
  const edited=result(state,'Исправленный результат');assert.equal(plan(edited).learning.feedback[0].source.text,'Исходный результат');
  assert.equal(Object.hasOwn(plan(before),'learning'),false);
});

test('a revision needs a changed result while keeping a decision needs an explanation',()=>{
  let state=change(result(),'feedback',review);
  assert.equal(change(state,'resolve',{id:review.id,kind:'revised',explanation:'Готово',sourceKey:'experience'}),null);
  assert.equal(change(state,'resolve',{id:review.id,kind:'kept',explanation:''}),null);
  state=result(state,'Уточнённый вывод');state=change(state,'resolve',{id:review.id,kind:'revised',explanation:'Добавил границу',sourceKey:'experience'});
  const item=plan(state).learning.feedback[0];assert.equal(item.source.text,'Исходный результат');assert.equal(item.resolution.result.text,'Уточнённый вывод');
  assert.equal(change(state,'resolve',{id:review.id,kind:'kept',explanation:'Другое'}),null);
});

test('keeping a decision preserves the reviewed snapshot even if the current work changes',()=>{
  let state=result(change(result(),'feedback',review),'Другой текущий текст');state=change(state,'resolve',{id:review.id,kind:'kept',explanation:'Сохраняю в этой версии'});
  const item=plan(state).learning.feedback[0];assert.deepEqual(item.resolution.result,item.source);
});

test('deleting an original task outcome does not erase the feedback snapshot',()=>{
  let state=prepareCurrentWeek(base(),{steps:[],week:[]},null,TODAY).state;
  const [week,tasks]=Object.entries(state.weekPlan)[0],task=tasks[0];state=saveTaskOutcome(state,{week,taskId:task.taskId,text:'Результат шага'},TODAY);
  const source=learningEvidence(state.portfolio.experiences[0],state.portfolio.outcomes)[0];
  state=change(state,'feedback',{...review,sourceKey:source.key});state=removeTaskOutcome(state,week,task.taskId);
  assert.equal(plan(state).learning.feedback[0].source.text,'Результат шага');assert.deepEqual(importState(exportState(state)),state);
});

test('review source, types, lengths and record limits are validated',()=>{
  assert.equal(change(base(),'feedback',review),null);
  for(const patch of [{kind:'verified'},{sourceKey:'missing'},{request:''},{observation:'x'.repeat(2001)}])assert.equal(change(result(),'feedback',{...review,...patch}),null);
  let state=result();for(let i=1;i<=4;i++)state=change(state,'feedback',{...review,id:`feedback-${i}`,kind:i===4?'subject':'reader'});
  assert.equal(change(state,'feedback',{...review,id:'fifth'}),null);state=change(state,'remove-feedback',{id:'feedback-1'});assert.ok(change(state,'feedback',{...review,id:'new'}));
  assert.equal(state.portfolio.experiences[0].result,'Исходный результат');
});

test('invalid or future learning schemas reject the entire import',()=>{
  const state=finish(),invalid=structuredClone(state);plan(invalid).learning.version=99;assert.equal(importState(JSON.stringify(invalid)),null);
  const value=learningOf(plan(state));value.practices[0].exampleOpenedOn='2026-02-31';assert.equal(normalizeLearning(value),null);
  const other=learningOf(plan(state));delete other.practices[0].attempt;assert.equal(normalizeLearning(other),null);
});

test('unsafe snapshot links are rejected and literal markup remains plain data',()=>{
  const state=change(result(),'feedback',{...review,observation:'<img src=x onerror=alert(1)>'});assert.ok(state);
  const value=learningOf(plan(state));value.feedback[0].source.url='javascript:alert(1)';assert.equal(normalizeLearning(value),null);
  value.feedback[0].source.url='https://user:password@example.org/';assert.equal(normalizeLearning(value),null);
});
