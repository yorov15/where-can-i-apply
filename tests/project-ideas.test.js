import test from 'node:test';
import assert from 'node:assert/strict';
import { PROJECT_IDEAS, IDEA_DIRECTIONS } from '../js/project-ideas.js';
import { startPortfolioWork, portfolioOf } from '../js/portfolio.js';
import { loadRouteState, exportState, importState } from '../js/route-state.js';
test('каждая идея создаёт переносимую работу со своими четырьмя шагами',()=>{
  assert.equal(new Set(PROJECT_IDEAS.map(item=>item.id)).size,PROJECT_IDEAS.length);
  for(const [direction] of IDEA_DIRECTIONS)assert.ok(PROJECT_IDEAS.filter(item=>item.direction===direction).length>=3);
  for(const item of PROJECT_IDEAS){
    const state=startPortfolioWork(loadRouteState(),{id:'work',ideaId:item.id,templateId:item.templateId,title:'Мой собственный вопрос',aim:'Своя задача',expectedResult:'Мой результат'},'2026-11-05');
    assert.ok(state,item.id);const plan=portfolioOf(state).experiences[0].workPlan;
    assert.equal(plan.ideaId,item.id);assert.equal(plan.expectedResult,'Мой результат');
    assert.deepEqual(plan.steps.map(({done,...step})=>step),item.steps);
    assert.deepEqual(importState(exportState(state)),state);
    assert.ok(plan.steps.every(step=>!step.done));assert.ok(item.materials&&item.question&&item.output);
  }
});
test('неизвестная или несовместимая идея не создаёт работу; обычная работа остаётся доступна',()=>{
  const state=loadRouteState(),input={id:'work',templateId:'data',title:'Тема',aim:'Вопрос'};
  assert.equal(startPortfolioWork(state,{...input,ideaId:'unknown'},'2026-11-05'),null);
  assert.equal(startPortfolioWork(state,{...input,ideaId:'paper-interface'},'2026-11-05'),null);
  const next=startPortfolioWork(state,input,'2026-11-05');assert.ok(next);
  assert.equal(Object.hasOwn(portfolioOf(next).experiences[0].workPlan,'ideaId'),false);
  assert.deepEqual(portfolioOf(state).experiences,[]);
});
