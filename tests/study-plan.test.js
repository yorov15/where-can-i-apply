import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildStudyPlan, mondayOf, weekKey, studyAdvice } from '../js/study-plan.js';
import { loadRouteState, recordMock, setStudyHours, toggleStudyTask, exportState, importState } from '../js/route-state.js';
const track=code=>JSON.parse(readFileSync(new URL(`../data/prep/exams/${code}.json`,import.meta.url),'utf8'));
const state=()=>({...loadRouteState(),studyStarted:'2026-10-27'});
const step={ id:'test:ielts', track:'ielts', target:{test:'IELTS',min:6.5} };
const plan={ code:'ielts',test:'IELTS',current:6,target:6.5,lastDate:'2027-01-14' };
const build=(overrides={})=>buildStudyPlan({steps:[step],tracks:{ielts:track('ielts')},plans:{[step.id]:plan},state:state(),today:'2026-10-27',...overrides});

test('79 days produce calendar weeks within the chosen total budget and mock sessions on 3, 6, 9',()=>{
  const result=build();
  assert.ok(result.weeks.length>=11);
  for(const week of result.weeks){
    assert.ok(week.tasks.length>=3&&week.tasks.length<=5);
    assert.ok(week.tasks.every(task=>task.minutes>0&&task.url.startsWith('https://')));
    assert.equal(week.minutes,240);
  }
  for(const index of [3,6,9])assert.ok(result.weeks.find(week=>week.index===index).tasks.some(task=>task.kind==='mock'));
  assert.equal(result.weeks[0].start,'2026-10-26');
  assert.equal(result.weeks[0].end,'2026-11-01');
});
test('weekly budget belongs to all exams together; lowering hours keeps every week within budget',()=>{
  const satStep={id:'test:sat',track:'sat',target:{test:'SAT'}};
  for(const hours of [2,4,6,10]){
    const result=build({steps:[step,satStep],tracks:{ielts:track('ielts'),sat:track('sat')},plans:{[step.id]:plan,[satStep.id]:{...plan,code:'sat',test:'SAT'}},state:setStudyHours(state(),hours)});
    for(const week of result.weeks){assert.equal(week.minutes,hours*60);assert.ok(week.tasks.some(task=>task.code==='ielts'));assert.ok(week.tasks.some(task=>task.code==='sat'));}
  }
});
test('latest weak part gets more time and a flat self-report changes the advice without certifying eligibility',()=>{
  let saved=recordMock(state(),'ielts',{test:'IELTS',date:'2026-10-20',overall:6,parts:{L:6,R:6,W:5,S:6}},'2026-10-27');
  saved=recordMock(saved,'ielts',{test:'IELTS',date:'2026-10-27',overall:6,parts:{L:6.5,R:6,W:5,S:6}},'2026-10-27');
  const recent=saved.scores.ielts.at(-1);
  const result=build({state:saved,plans:{[step.id]:{...plan,recent}}});
  const tasks=result.weeks[0].tasks;
  assert.ok(tasks.find(task=>task.part==='W').minutes>tasks.find(task=>task.part==='L').minutes);
  assert.match(studyAdvice(result.active[0],saved),/Балл пока не вырос/);
  assert.match(studyAdvice(result.active[0],saved),/Writing/);
  assert.equal(Object.keys(saved.done).length,0);
});
test('task completion survives export/import and score edits replace the same dated entry',()=>{
  const result=build(),week=result.weeks[0],task=week.tasks[0];
  let saved=toggleStudyTask(state(),week.key,task.id);
  assert.equal(build({state:importState(exportState(saved))}).weeks[0].tasks[0].done,true);
  saved=recordMock(saved,'ielts',{test:'IELTS',date:'2026-10-27',overall:5.5},'2026-10-27');
  saved=recordMock(saved,'ielts',{test:'IELTS',date:'2026-10-27',overall:6},'2026-10-27');
  assert.equal(saved.scores.ielts.length,1);
  assert.equal(saved.scores.ielts[0].overall,6);
  assert.equal(recordMock(saved,'ielts',{test:'IELTS',date:'2026-10-28',overall:6},'2026-10-27'),null);
  assert.equal(recordMock(saved,'ielts',{test:'IELTS',date:'2026-10-27',overall:12},'2026-10-27'),null);
  assert.equal(recordMock(saved,'ielts',{test:'SAT',date:'2026-10-27',overall:1300},'2026-10-27'),null);
});
test('unknown dates give one week, expired or completed tests give none; older anchors still reach this week',()=>{
  assert.equal(build({plans:{[step.id]:{...plan,lastDate:null}}}).weeks.length,1);
  assert.equal(build({plans:{[step.id]:{...plan,expired:true}}}).weeks.length,0);
  assert.equal(build({steps:[{...step,done:true}]}).weeks.length,0);
  assert.ok(build({state:{...state(),studyStarted:'2020-01-01'}}).weeks.length>0);
  assert.equal(mondayOf('2027-01-03'),'2026-12-28');
  assert.equal(weekKey('2027-01-03'),'2026-W53');
  assert.equal(weekKey('2027-01-04'),'2027-W01');
});
