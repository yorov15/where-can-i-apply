import test from 'node:test';
import assert from 'node:assert/strict';
import { parentReport } from '../js/parent-report.js';
import { planCost } from '../js/cost.js';
import { loadRouteState,clearProgress } from '../js/route-state.js';

const goal=(id,closes='2027-01-14',confidence='confirmed')=>({id,name:id,deadline:{closes,confidence}});
const emptyCost=()=>({totals:[],paid:[],free:[],waived:[],unknown:[]});
const base=()=>({today:'2026-10-27',state:loadRouteState(),cost:emptyCost(),
  route:{goals:[goal('KAIST')],steps:[],week:[]}});

test('report counts only dated completed work since Monday through today, deduplicates route and weekly marks',()=>{
  const input=base();
  input.state.done={'doc:a':'2026-10-26',old:'2026-10-25',legacy:null,future:'2026-10-28',alias:'2026-10-27'};
  input.route.steps=['doc:a','old','legacy','future','not-checked'].map(id=>({id,title:id,done:id!=='not-checked'}));
  input.route.steps.push({id:'doc:b',legacyIds:['alias'],title:'Справка',done:true});
  input.state.weekPlan={'2026-W43':[
    {taskId:'carry',title:'Пробник',done:true,completedAt:'2026-10-27'},
    {taskId:'unchecked',title:'Не сделано',done:false,completedAt:'2026-10-27'},
    {taskId:'bad-date',title:'Ошибка даты',done:true,completedAt:'2026-10-32'},
  ],'2026-W44':[{taskId:'admin',routeId:'doc:a',title:'Паспорт',done:true,completedAt:'2026-10-26'}]};
  const text=parentReport(input);
  assert.match(text,/26\.10\.2026–01\.11\.2026/);
  assert.match(text,/Отмечено за неделю: 3\./);
  assert.doesNotMatch(text,/минут|потрачено|Не сделано|Ошибка даты|future|legacy/);
  input.today='2026-11-02';assert.match(parentReport(input),/нет дел с датой выполнения/);
});

test('legacy undated marks and reset progress are not reported as this week',()=>{
  const input=base();input.state.done={'doc:a':null};
  input.route.steps=[{id:'doc:a',done:true,title:'Паспорт'}];
  assert.match(parentReport(input),/нет дел с датой выполнения/);
  input.state.weekPlan={'2026-W44':[{taskId:'a',title:'Пробник',done:true,completedAt:input.today}]};
  input.state=clearProgress(input.state);input.route.steps[0].done=false;
  assert.match(parentReport(input),/нет дел с датой выполнения/);
});

test('report uses current unfinished weekly tasks and nearest open application, preserving expected date',()=>{
  const input=base();input.route.goals=[goal('Closed','2026-10-25'),goal('Unknown',null),goal('Expected','2026-10-30','expected'),goal('Later')];
  input.weekly={week:{tasks:[{title:'Завершено',done:true},{title:'Написать учителю',done:false}]}};
  assert.match(parentReport(input),/Дальше: Написать учителю\./);
  assert.match(parentReport(input),/30\.10\.2026 \(ожидаемая дата\) · Expected/);
  input.route.goals=[goal('Unknown',null)];
  assert.match(parentReport(input),/Нет известной даты предстоящей подачи/);
});

test('fees retain currencies, waiver condition and unknown amounts; application date is not a payment date',()=>{
  const input=base(),programs=['a','b','c','free','waived','unknown'].map(id=>({id,name:{ru:id}}));
  const fees=[{amount:80,currency:'USD'},{amount:20,currency:'USD'},{amount:50,currency:'EUR'},
    {amount:0,currency:'USD'},{amount:65,currency:'USD',waivedForAid:true},null];
  input.cost=planCost(programs,{programs:Object.fromEntries(programs.map(p=>[p.id,{}])),
    conditions:Object.fromEntries(programs.map((p,i)=>[p.id,fees[i]?[{fee:fees[i]}]:[]]))});
  const text=parentReport(input);
  assert.match(text,/100\sдолл\. США \+ 50\sевро/);
  assert.match(text,/При запросе финпомощи плату снимают: waived \(65\sдолл\. США\)/);
  assert.match(text,/Без платы за подачу: 1/);assert.match(text,/Целей с неизвестной суммой: 1/);
  assert.match(text,/Даты оплаты не подтверждены/);assert.doesNotMatch(text,/165|оплатить до/);
});

test('all sections fit 1200 characters even with long imported goals, tasks, currencies and fee waivers',()=>{
  const input=base(),long='Длинное название '.repeat(100);
  input.route.goals=Array.from({length:100},(_,i)=>goal(`${i}${long}`));
  input.state.weekPlan={'2026-W44':Array.from({length:100},(_,i)=>({taskId:String(i),title:long,done:true,completedAt:input.today}))};
  input.weekly={week:{tasks:Array.from({length:100},()=>({title:long,done:false}))}};
  input.cost={totals:Array.from({length:15},()=>({amount:100000,currency:'USD'})),free:Array(100).fill(long),waived:Array(100).fill(long),unknown:Array(100).fill(long)};
  const text=parentReport(input);assert.ok(text.length<=1200,`${text.length} characters`);
  assert.match(text,/Даты оплаты не подтверждены/);
});

test('imported multiline titles cannot inject new report sections',()=>{
  const input=base();input.route.goals[0].name='KAIST\nОплатить 1000\u0000';
  input.weekly={week:{tasks:[{title:'Паспорт\r\nУже принято',done:false}]}};
  assert.ok(parentReport(input).split('\n').includes('Дальше: Паспорт Уже принято.'));
});
