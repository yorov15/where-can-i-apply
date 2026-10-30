import test from 'node:test';
import assert from 'node:assert/strict';
import { startStage } from '../js/start-view.js';
import { todayModel } from '../js/today-view.js';

test('первый вход предлагает выбрать цель; обычный опыт не подменяет учебную работу',()=>{
  assert.equal(startStage({goals:[]}), 'goal');
  assert.equal(startStage({goals:[],portfolio:{experiences:[{title:'Опыт'}]}}),'goal');
});
test('после выбора программы следующий шаг — своя работа',()=>{
  assert.equal(startStage({goals:['kaist']}),'work');
});
test('незавершённая работа ведёт к делу и без выбранной программы',()=>{
  assert.equal(startStage({goals:[],portfolio:{experiences:[{workPlan:{paused:false,steps:[{done:false}]}}]}}),'task');
});
test('пауза и завершённая работа не объявляются готовым следующим делом',()=>{
  for(const workPlan of [{paused:true,steps:[{done:false}]},{paused:false,steps:[{done:true}]}]){
    assert.equal(startStage({goals:['kaist'],portfolio:{experiences:[{workPlan}]}}),'work');
  }
});

test('переход из работы открывает её реальное дело и не меняет порядок общего плана',()=>{
  const tasks=[{taskId:'apply',done:false},{taskId:'work',experienceId:'own-work',done:false}];
  const props={route:null,routeState:{goals:[]},weekly:{week:{tasks}},today:'2026-10-30'};
  assert.equal(todayModel(props).next.taskId,'apply');
  assert.equal(todayModel({...props,todayFocus:'own-work'}).next.taskId,'work');
  assert.equal(todayModel({...props,todayFocus:'not-in-week'}).next,null);
  assert.deepEqual(tasks.map(task=>task.taskId),['apply','work']);
});
