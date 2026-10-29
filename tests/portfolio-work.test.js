import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRouteState, exportState, importState, clearProgress } from '../js/route-state.js';
import { startPortfolioWork, setPortfolioWorkPaused, togglePortfolioWorkStep, savePortfolioReview, savePortfolioBrief,
  nextPortfolioTasks, saveExperience, saveTaskOutcome, removeExperience } from '../js/portfolio.js';
import { WORK_TEMPLATES } from '../js/portfolio-work.js';
import { prepareCurrentWeek, reviewWeeks, studyCalendarEvents } from '../js/weekly.js';
const TODAY='2026-10-29', WEEK='2026-W44';
const route={steps:[],week:[]};
const empty=()=>loadRouteState();
const input={id:'work-1',templateId:'data',title:'Проверить данные',aim:'Хочу понять метод',expectedResult:'Анализ с объяснением',goals:[]};
const start=(state=empty(),patch={})=>startPortfolioWork(state,{...input,...patch},TODAY);
const week=state=>prepareCurrentWeek(state,route,null,TODAY);
function outcome(state,text='Сделал первую пробу') {
  const built=week(state),task=built.week.tasks.find(item=>item.kind==='portfolio'&&!item.done);
  return saveTaskOutcome(built.state,{week:WEEK,taskId:task.taskId,text,experienceId:null},TODAY);
}
function advance(state) {
  const task=nextPortfolioTasks(state)[0];
  return togglePortfolioWorkStep(outcome(state),task.experienceId,task.workStepId,TODAY);
}

test('templates create an unfinished experience with a personal brief and a snapshot of all steps',()=>{
  const before=empty(),state=start(before),entry=state.portfolio.experiences[0];
  assert.equal(before.portfolio,undefined);
  assert.equal(entry.workPlan.aim,input.aim);assert.equal(entry.workPlan.expectedResult,input.expectedResult);
  assert.equal(entry.result,'');assert.equal(entry.workPlan.steps.length,4);
  assert.ok(entry.workPlan.steps.every(step=>!step.done&&step.expected));
  assert.notEqual(entry.workPlan.steps,WORK_TEMPLATES.find(item=>item.id==='data').steps);
  assert.equal(start(before,{templateId:'unknown'}),null);
  assert.equal(start(before,{aim:''}),null);
});

test('editing experience and its brief retains steps, results and the original template',()=>{
  const state=start(),entry=state.portfolio.experiences[0];
  const edited=saveExperience(state,{id:entry.id,title:'Новое имя',kind:entry.kind,goals:[]},TODAY);
  assert.deepEqual(edited.portfolio.experiences[0].workPlan,entry.workPlan);
  const narrowed=savePortfolioBrief(edited,entry.id,{aim:'Меньше данных',expectedResult:'Небольшая таблица'},TODAY);
  assert.equal(narrowed.portfolio.experiences[0].workPlan.expectedResult,'Небольшая таблица');
  assert.deepEqual(narrowed.portfolio.experiences[0].workPlan.steps,entry.workPlan.steps);
});

test('only the next step can be completed and it requires a saved result from that work',()=>{
  const state=start(),entry=state.portfolio.experiences[0],step=entry.workPlan.steps[0];
  assert.equal(togglePortfolioWorkStep(state,entry.id,step.id,TODAY),null);
  assert.equal(togglePortfolioWorkStep(outcome(state),entry.id,entry.workPlan.steps[1].id,TODAY),null);
  const saved=outcome(state),record=saved.portfolio.outcomes[0];
  assert.equal(record.experienceId,entry.id);assert.equal(record.workStepId,step.id);
  assert.equal(saved.weekPlan[WEEK][0].done,false);
  const done=togglePortfolioWorkStep(saved,entry.id,step.id,TODAY);
  assert.equal(done.portfolio.experiences[0].workPlan.steps[0].done,true);
  assert.equal(nextPortfolioTasks(done)[0].workStepId,entry.workPlan.steps[1].id);
});

test('returning to an earlier step reopens later steps while preserving all recorded work',()=>{
  const state=advance(advance(start())),entry=state.portfolio.experiences[0];
  const reopened=togglePortfolioWorkStep(state,entry.id,entry.workPlan.steps[0].id,TODAY);
  assert.ok(reopened.portfolio.experiences[0].workPlan.steps.every(step=>!step.done));
  assert.deepEqual(reopened.portfolio.outcomes,state.portfolio.outcomes);
  assert.ok(state.portfolio.experiences[0].workPlan.steps[1].done);
});

test('pausing and deleting work remove pending sessions without deleting results',()=>{
  const state=outcome(start()),paused=setPortfolioWorkPaused(state,'work-1',true,TODAY);
  assert.equal(nextPortfolioTasks(paused).length,0);assert.equal(week(paused).week.tasks.length,0);
  assert.equal(paused.portfolio.outcomes.length,1);
  assert.equal(nextPortfolioTasks(setPortfolioWorkPaused(paused,'work-1',false,TODAY)).length,1);
  const deleted=removeExperience(state,'work-1');
  assert.equal(week(deleted).week.tasks.length,0);assert.equal(deleted.portfolio.outcomes[0].experienceId,null);
});

test('self-review is a saved reflection, not an automatic completion or numeric profile rating',()=>{
  const state=start(),review={ownership:'Сделал анализ',method:'Сравнил записи',evidence:'Сохранил таблицу',changes:'Проверю ввод',limits:'Небольшая выборка',relevance:'Интерес к данным'};
  const next=savePortfolioReview(state,'work-1',review,TODAY);
  assert.equal(next.portfolio.experiences[0].workPlan.review.limits,review.limits);
  assert.ok(next.portfolio.experiences[0].workPlan.steps.every(step=>!step.done));
  assert.deepEqual(importState(exportState(next)),next);
  assert.equal(savePortfolioReview(state,'work-1',{limits:'x'.repeat(1001)},TODAY),null);
});

test('old library records round-trip unchanged; unknown work-plan versions reject the import',()=>{
  const old=saveExperience(empty(),{id:'old',title:'Занятие',kind:'other',goals:[]},TODAY);
  assert.equal(old.portfolio.experiences[0].workPlan,undefined);
  assert.deepEqual(importState(exportState(old)),old);
  const state=start();state.portfolio.experiences[0].workPlan.version=99;
  assert.equal(importState(JSON.stringify(state)),null);
  const duplicate=start(start(),{id:'work-2'});
  duplicate.portfolio.experiences[1].workPlan.id='work-1';
  assert.equal(importState(JSON.stringify(duplicate)),null);
});

test('portfolio, exams and paperwork share five sessions and one time budget',()=>{
  const state=start(start(),{id:'work-2'});
  const study={active:[{plan:{code:'ielts'}}],weeks:[{key:WEEK,tasks:['a','b','c','d'].map(id=>({id,code:'ielts',title:`Практика ${id}`,kind:'practice',minutes:60}))}]};
  const route={steps:[{id:'doc:a'}],week:[{id:'doc:a',title:'Паспорт'}]};
  const result=prepareCurrentWeek(state,route,study,TODAY);
  assert.equal(result.week.tasks.length,5);assert.equal(result.week.minutes,240);
  assert.ok(result.week.tasks.some(task=>task.kind==='portfolio'));
  assert.ok(result.week.tasks.some(task=>task.routeId==='doc:a'));
  assert.ok(result.week.tasks.some(task=>task.code==='ielts'));
  assert.equal(result.week.tasks.filter(task=>task.kind==='portfolio').length,1);
  assert.equal(result.workBacklog,1);
  assert.ok(result.week.tasks.every(task=>task.minutes>=5));
  assert.deepEqual(prepareCurrentWeek(result.state,route,study,TODAY).week.tasks,result.week.tasks);
});

test('two works with the same title remain distinct and work can be planned without a university goal',()=>{
  const state=start(start(),{id:'work-2'}),result=week(state);
  assert.equal(result.week.tasks.length,2);assert.equal(new Set(result.week.tasks.map(task=>task.taskId)).size,2);
  assert.equal(result.week.minutes,120);assert.ok(result.week.minutes<=result.week.budget);assert.deepEqual(state.goals,[]);
});

test('a nearly exhausted budget never creates zero-minute sessions or loses completed history',()=>{
  const state=start();state.hoursPerWeek=2;
  state.weekPlan[WEEK]=[{taskId:'old',title:'Завершённое дело',done:true,minutes:118,completedAt:TODAY}];
  const result=week(state);assert.equal(result.week.tasks.length,1);assert.equal(result.week.minutes,118);
  assert.equal(result.workBacklog,1);assert.equal(result.state.weekPlan[WEEK][0].completedAt,TODAY);
});

test('imported completion marks without duration cannot make the weekly budget nonfinite',()=>{
  const state=start();state.weekPlan[WEEK]=[{taskId:'legacy',title:'Старое дело',done:true}];
  const result=week(state);assert.ok(Number.isFinite(result.week.minutes));
  assert.equal(result.week.tasks.find(task=>task.taskId==='legacy').minutes,0);
  assert.ok(result.week.tasks.filter(task=>!task.done).every(task=>task.minutes>0));
  assert.ok(result.week.minutes<=result.week.budget);
});

test('a carried work step retains its identity and outcomes when the calendar changes',()=>{
  const built=week(start()),task=built.week.tasks[0];
  const reviewed=reviewWeeks(built.state,'2026-11-02',[task.taskId]);
  const next=prepareCurrentWeek(reviewed,route,null,'2026-11-02');
  assert.equal(next.week.tasks[0].taskId,task.taskId);assert.equal(next.week.tasks.length,1);
  assert.equal(next.week.tasks[0].expected,task.expected);
  assert.equal(next.review.weeks.length,0);
  assert.equal(studyCalendarEvents(next.state,'2026-11-02').length,0);
});

test('resetting completion marks reopens work steps and preserves results and self-review',()=>{
  const state=advance(start()),reset=clearProgress(state);
  assert.ok(reset.portfolio.experiences[0].workPlan.steps.every(step=>!step.done));
  assert.deepEqual(reset.portfolio.outcomes,state.portfolio.outcomes);
});
