import test from 'node:test';
import assert from 'node:assert/strict';
import { startStage, catalogLine, VALUE_TITLE } from '../js/start-view.js';
import { todayModel } from '../js/today-view.js';

test('первый вход предлагает выбрать цель; обычный опыт не подменяет учебную работу',()=>{
  assert.equal(startStage({goals:[]}), 'goal');
  assert.equal(startStage({goals:[],portfolio:{experiences:[{title:'Опыт'}]}}),'goal');
});
test('после выбора программы следующий шаг — дела поступления',()=>{
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

test('вход называет суть сайта, а объём каталога берёт из данных',()=>{
  assert.equal(VALUE_TITLE,'Узнай, куда за границу ты можешь подать документы');
  const p=(hostCountry)=>({hostCountry});
  assert.equal(catalogLine([p('KR'),p('KR'),p('JP')]),'3 программы — университеты и стипендии в 2 странах. Условия и сроки — с официальных сайтов программ.');
  assert.equal(catalogLine([p('KR')]),'1 программа — университеты и стипендии в 1 стране. Условия и сроки — с официальных сайтов программ.');
  assert.equal(catalogLine([]),'Университеты и стипендии за границей. Условия и сроки — с официальных сайтов программ.');
  assert.equal(catalogLine(undefined),'Университеты и стипендии за границей. Условия и сроки — с официальных сайтов программ.');
});
