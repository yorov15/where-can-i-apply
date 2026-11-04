// Шаг работы и доработка по отзыву записываются на месте, в то же состояние,
// что и с «Сегодня». Старые файлы без новых записей читаются как раньше.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRouteState, exportState, importState } from '../js/route-state.js';
import { startPortfolioWork, saveTaskOutcome, togglePortfolioWorkStep, finishWorkStep, workStepOutcome,
  nextPortfolioTasks, saveExperience, updatePortfolioLearning, setPortfolioWorkPaused } from '../js/portfolio.js';
import { learningEvidence } from '../js/portfolio-learning.js';
import { prepareCurrentWeek } from '../js/weekly.js';
const TODAY='2026-11-04',WEEK='2026-W45',route={steps:[],week:[]};
const base=()=>startPortfolioWork(loadRouteState(),{id:'work-1',templateId:'data',title:'Моя работа',aim:'Разобраться',expectedResult:'Вывод',goals:[]},TODAY);
const week=state=>prepareCurrentWeek(state,route,null,TODAY);
const steps=state=>state.portfolio.experiences[0].workPlan.steps;

test('результат шага из работы = то же состояние, что «Сегодня» + «Готово»',()=>{
  const built=week(base()),task=built.week.tasks.find(item=>item.kind==='portfolio'),step=steps(built.state)[0];
  const input={text:'Нашёл таблицу',url:'https://example.org/data',reflection:'Мало строк'};
  const fromWork=finishWorkStep(built.state,'work-1',step.id,input,TODAY);
  const fromToday=togglePortfolioWorkStep(saveTaskOutcome(built.state,{...input,week:WEEK,taskId:task.taskId,experienceId:null},TODAY),'work-1',step.id,TODAY);
  assert.deepEqual(fromWork.portfolio,fromToday.portfolio);
  assert.equal(fromWork.portfolio.outcomes[0].week,WEEK);assert.equal(fromWork.portfolio.outcomes[0].taskId,task.taskId);
  assert.equal(steps(fromWork)[0].done,true);
  // «Сегодня» после перерисовки: текущий шаг отмечен, следующим идёт второй шаг работы.
  const after=week(fromWork);
  assert.equal(after.state.weekPlan[WEEK].find(item=>item.taskId===task.taskId).done,true);
  assert.equal(after.week.tasks.find(item=>!item.done&&item.kind==='portfolio').workStepId,steps(fromWork)[1].id);
});

test('результат, сохранённый на «Сегодня», виден в работе, и наоборот',()=>{
  const built=week(base()),task=built.week.tasks.find(item=>item.kind==='portfolio'),step=steps(built.state)[0];
  const today=saveTaskOutcome(built.state,{week:WEEK,taskId:task.taskId,text:'С «Сегодня»',experienceId:null},TODAY);
  assert.equal(workStepOutcome(today,'work-1',step.id,TODAY).text,'С «Сегодня»');
  const work=finishWorkStep(today,'work-1',step.id,{text:'Исправил в работе'},TODAY);
  assert.equal(work.portfolio.outcomes.length,1);
  assert.equal(work.portfolio.outcomes.find(item=>item.week===WEEK&&item.taskId===task.taskId).text,'Исправил в работе');
});

test('шаг без места в плане недели тоже закрывается из работы',()=>{
  const state=base(),step=steps(state)[0],done=finishWorkStep(state,'work-1',step.id,{text:'Сделал'},TODAY);
  assert.equal(steps(done)[0].done,true);
  assert.equal(done.portfolio.outcomes[0].title,nextPortfolioTasks(state)[0].title);
  assert.equal(done.portfolio.outcomes[0].taskId,nextPortfolioTasks(state)[0].taskId);
});

test('из работы нельзя закрыть шаг без текста, не по порядку, на паузе или с незаконченной пробой',()=>{
  const state=base(),[first,second]=steps(state);
  assert.equal(finishWorkStep(state,'work-1',first.id,{text:'   '},TODAY),null);
  assert.equal(finishWorkStep(state,'work-1',second.id,{text:'Сделал'},TODAY),null);
  assert.equal(finishWorkStep(setPortfolioWorkPaused(state,'work-1',true,TODAY),'work-1',first.id,{text:'Сделал'},TODAY),null);
  const practice=updatePortfolioLearning(state,'work-1','start',{id:'practice-1',lessonId:'comparison'},TODAY);
  assert.equal(finishWorkStep(practice,'work-1',first.id,{text:'Сделал'},TODAY),null);
  assert.equal(finishWorkStep(state,'work-1',first.id,{text:'Сделал',url:'javascript:alert(1)'},TODAY),null);
});

const review={id:'feedback-1',kind:'reader',sourceKey:'experience',request:'Понятен ли вывод?',observation:'Нет границы',nextAction:'Объясни ограничение',reviewer:''};
const withFeedback=()=>{const state=base();return updatePortfolioLearning(saveExperience(state,{...state.portfolio.experiences[0],result:'Исходный вывод'},TODAY),'work-1','feedback',review,TODAY);};

test('новый результат из формы отзыва сохраняется как обычный и становится источником решения',()=>{
  const state=withFeedback();
  const next=updatePortfolioLearning(state,'work-1','resolve',{id:review.id,kind:'revised',sourceKey:'new',resultText:'Вывод с границей',explanation:'Добавил ограничение'},TODAY);
  const saved=next.portfolio.outcomes.find(item=>item.experienceId==='work-1');
  assert.equal(saved.text,'Вывод с границей');assert.equal(saved.week,WEEK);
  const evidence=learningEvidence(next.portfolio.experiences[0],next.portfolio.outcomes).find(item=>item.key===JSON.stringify([saved.week,saved.taskId]));
  const item=next.portfolio.experiences[0].workPlan.learning.feedback[0];
  assert.deepEqual(item.resolution.result,evidence.snapshot);
  assert.equal(item.resolution.kind,'revised');assert.equal(item.source.text,'Исходный вывод');
  assert.deepEqual(importState(exportState(next)),next);
  // Выбор уже сохранённого результата работает как раньше.
  const old=saveExperience(state,{...state.portfolio.experiences[0],result:'Другой вывод'},TODAY);
  assert.equal(updatePortfolioLearning(old,'work-1','resolve',{id:review.id,kind:'revised',sourceKey:'experience',explanation:'Переписал'},TODAY)
    .portfolio.experiences[0].workPlan.learning.feedback[0].resolution.result.text,'Другой вывод');
});

test('новый результат из отзыва не сохраняется без текста, без изменений или при «сохранил решение»',()=>{
  const state=withFeedback(),send=input=>updatePortfolioLearning(state,'work-1','resolve',{id:review.id,explanation:'Объяснение',...input},TODAY);
  assert.equal(send({kind:'revised',sourceKey:'new',resultText:''}),null);
  assert.equal(send({kind:'revised',sourceKey:'new',resultText:'Исходный вывод'}),null);
  assert.equal(send({kind:'kept',sourceKey:'new',resultText:'Новый'}),null);
  assert.equal(send({kind:'revised',sourceKey:'new',resultText:'Новый',explanation:''}),null);
  assert.equal(updatePortfolioLearning(state,'work-1','resolve',{id:'missing',kind:'revised',sourceKey:'new',resultText:'Новый',explanation:'Да'},TODAY),null);
});

test('старый файл без новых записей читается, и его шаг закрывается из работы',()=>{
  // Экспорт до этой правки: работа без формата и проб, результат шага сохранён на «Сегодня» на прошлой неделе.
  const old=JSON.stringify({version:2,goals:[],hoursPerWeek:4,scores:{},examFormats:{},retakeBuffers:{},done:{},carryTasks:[],studyStarted:null,lastReview:null,statuses:{},
    weekPlan:{'2026-W44':[{taskId:'work:work-1:question',title:'Сформулируй вопрос · Моя работа',kind:'portfolio',experienceId:'work-1',workStepId:'question',minutes:60,done:false}]},
    portfolio:{version:1,experiences:[{id:'work-1',kind:'study',title:'Моя работа',period:'',role:'',actions:'',result:'',reflection:'',url:'',goals:[],createdOn:'2026-10-29',updatedOn:'2026-10-29',
      workPlan:{version:1,id:'work-1',templateId:'data',aim:'Разобраться',expectedResult:'Вывод',sessionMinutes:60,paused:false,
        steps:[{id:'question',title:'Сформулируй вопрос',expected:'Вопрос',done:false},{id:'draft',title:'Первый анализ',expected:'Расчёты',done:false}]}}],
    outcomes:[{week:'2026-W44',taskId:'work:work-1:question',title:'Сформулируй вопрос · Моя работа',text:'Прошлый результат',url:'',reflection:'',experienceId:'work-1',workStepId:'question',updatedOn:'2026-10-30'}]}});
  const state=importState(old);
  assert.ok(state);assert.equal(Object.hasOwn(state.portfolio.experiences[0].workPlan,'format'),false);
  assert.equal(workStepOutcome(state,'work-1','question',TODAY).text,'Прошлый результат');
  const done=finishWorkStep(state,'work-1','question',{text:'Прошлый результат'},TODAY);
  assert.equal(steps(done)[0].done,true);assert.equal(done.portfolio.outcomes.length,2);
  assert.deepEqual(done.portfolio.outcomes[0],state.portfolio.outcomes[0]);
  assert.deepEqual(importState(exportState(done)),done);
});
