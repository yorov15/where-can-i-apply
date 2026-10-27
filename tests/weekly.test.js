import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareCurrentWeek,pendingReview,reviewWeeks,setTaskDay,studyCalendarEvents } from '../js/weekly.js';
import { loadRouteState,toggleStudyTask,exportState,importState } from '../js/route-state.js';
const route={steps:[{id:'doc:a'}],week:[{id:'doc:a',title:'Подготовить копию паспорта'}]};
const study=(key='2026-W44')=>({active:[{plan:{code:'ielts'}}],weeks:[{key,tasks:['L','R','W','S'].map(part=>({id:`study:${key}:${part}`,code:'ielts',title:`Потренировать ${part}`,kind:'practice',minutes:60,url:'https://ielts.org'}))}]});
const build=(state=loadRouteState(),today='2026-10-27',material=study())=>prepareCurrentWeek(state,route,material,today);

test('unchecking a route action clears its weekly completion date; undated legacy marks stay undated',()=>{
  const state=loadRouteState();state.weekPlan={'2026-W44':[{taskId:'admin',routeId:'doc:a',title:'Паспорт',done:true,completedAt:'2026-10-27'}]};
  const cleared=build(state).state.weekPlan['2026-W44'];
  assert.ok(cleared.every(task=>!task.done&&!task.completedAt));
  state.done['doc:a']=null;
  const migrated=prepareCurrentWeek(state,{...route,steps:[{id:'doc:a',done:true}]},study(),'2026-10-27').state.weekPlan['2026-W44'];
  assert.equal(migrated[0].done,true);assert.equal(migrated[0].completedAt,undefined);
});

test('current Monday–Sunday week includes paperwork and preparation in one shared budget',()=>{
  const result=build();assert.equal(result.week.start,'2026-10-26');assert.equal(result.week.end,'2026-11-01');
  assert.equal(result.week.tasks.length,5);assert.equal(result.week.minutes,240);
  assert.ok(result.week.tasks.some(task=>task.routeId==='doc:a'));
  assert.ok(result.week.tasks.every(task=>task.minutes>0));
});
test('chosen day persists, excludes outside dates and appears in the exported calendar event list',()=>{
  const result=build(),task=result.week.tasks[1];
  const chosen=setTaskDay(result.state,result.week.key,task.taskId,'2026-10-29','2026-10-27');
  const restored=importState(exportState(chosen));
  const after=build(restored).week.tasks.find(item=>item.taskId===task.taskId);
  assert.equal(after.day,'2026-10-29');assert.equal(after.minutes,task.minutes);
  assert.equal(studyCalendarEvents(restored,'2026-10-27')[0].date,'2026-10-29');
  assert.deepEqual(setTaskDay(chosen,result.week.key,task.taskId,'2026-11-02','2026-10-27'),chosen);
});
test('after Sunday review counts work, selected unfinished tasks carry with no old day, and review does not repeat',()=>{
  let previous=build();let saved=toggleStudyTask(previous.state,previous.week.key,previous.week.tasks[1].taskId,'2026-10-28');
  saved=setTaskDay(saved,previous.week.key,previous.week.tasks[2].taskId,'2026-10-29','2026-10-27');
  const review=pendingReview(saved,'2026-11-02');assert.equal(review.done,1);assert.equal(review.unfinished.length,4);
  const id=previous.week.tasks[2].taskId;saved=reviewWeeks(saved,'2026-11-02',[id]);
  const current=build(saved,'2026-11-02',study('2026-W45'));
  assert.equal(current.week.tasks[0].taskId,id);assert.equal(current.week.tasks[0].day,undefined);
  assert.equal(current.review.weeks.length,0);assert.equal(current.week.minutes,240);
  assert.equal(pendingReview(current.state,'2026-11-09').weeks.length,1);
});
test('carried work never pushes completed sessions out of history or beyond the remaining budget',()=>{
  let result=build();let saved=toggleStudyTask(result.state,result.week.key,result.week.tasks[1].taskId,'2026-10-28');
  const doneMinutes=result.week.tasks[1].minutes;
  saved.carryTasks=[{taskId:'old',code:'ielts',title:'Разобрать старые ошибки',kind:'practice',minutes:60}];
  result=build(saved);assert.equal(result.week.tasks[0].done,true);assert.equal(result.week.tasks[0].minutes,doneMinutes);assert.equal(result.week.minutes,240);
  saved=result.state;saved.hoursPerWeek=2;result=build(saved);assert.ok(result.week.minutes<=120);
  assert.equal(result.state.weekPlan['2026-W44'].find(task=>task.done).completedAt,'2026-10-28');
});
test('legacy completion-only records do not fabricate review history',()=>{
  const saved=loadRouteState();saved.weekPlan['2026-W43']=[{taskId:'old',done:false}];
  assert.deepEqual(pendingReview(saved,'2026-10-27').weeks,[]);
});
