import { WORK_TEMPLATES, WORK_REVIEW_FIELDS } from './portfolio-work.js';
import { formatDate } from './lib/format.js';
import { renderPortfolioLearning, clearLearningDrafts } from './portfolio-learning-view.js';
import { pendingPractice } from './portfolio-learning.js';

const drafts=new Map(),opened=new Map();
export function clearWorkDrafts(){drafts.clear();opened.clear();clearLearningDrafts();}
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node;};
const say=()=>{const node=el('p','route-status');node.setAttribute('role','status');return node;};
const button=(title,run,primary=false)=>{const node=el('button',primary?'button':'button button-quiet',title);node.type='button';node.addEventListener('click',run);return node;};
const read=form=>Object.fromEntries(new FormData(form));
function details(key,title,initial=false){
  const node=el('details','journey-edit');node.open=opened.get(key)??(drafts.has(key)||initial);node.append(el('summary',null,title));
  node.addEventListener('toggle',()=>{if(node.isConnected)opened.set(key,node.open);});return node;
}
function field(parent,title,name,value,{required=false,short=false,max=1000}={}){
  const label=el('label',null,title),node=el(short?'input':'textarea');node.name=name;node.value=value??'';node.required=required;node.maxLength=max;
  if(short)node.type='text';else node.rows=3;label.append(node);parent.append(label);return node;
}
function options(parent,title,name,choices,value){
  const label=el('label',null,title),node=el('select');node.name=name;
  for(const [id,text] of choices){const option=el('option',null,text);option.value=id;node.append(option);}node.value=value??'';label.append(node);parent.append(label);return node;
}
const timeOptions=[[15,'15 минут'],[30,'30 минут'],[45,'45 минут'],[60,'60 минут'],[90,'90 минут'],[120,'120 минут']];
function bindForm(form,key,submit,done){
  const status=say();form.append(status);
  const remember=()=>drafts.set(key,read(form));form.addEventListener('input',remember);form.addEventListener('change',remember);
  form.addEventListener('submit',event=>{event.preventDefault();const response=submit(read(form));status.textContent=response.message;
    if(response.ok){drafts.delete(key);opened.delete(key);done(response);}});
}

export function renderWorkPicker(props,onSaved){
  const key='new-work',box=details(key,'Выбрать работу для развития опыта');box.dataset.workPicker='';
  box.className='journey-start';
  box.append(el('p','route-detail','Выбери интересную и посильную работу. Это учебные предложения Nerio; условия конкретной программы проверяй отдельно.'));
  const value=drafts.get(key)??{templateId:'data',sessionMinutes:'60'},form=el('form','journey-form');
  const template=options(form,'Что хочешь попробовать?','templateId',WORK_TEMPLATES.map(item=>[item.id,item.name]),value.templateId);
  const info=el('div','journey-note');form.append(info);
  field(form,'Какую задачу выбираешь?','title',value.title,{required:true,short:true,max:160});
  field(form,'Почему тебе это интересно?','aim',value.aim,{required:true});
  const expected=field(form,'Какой результат хочешь получить?','expectedResult',value.expectedResult??WORK_TEMPLATES.find(item=>item.id===value.templateId)?.output,{required:true});
  const explain=()=>{const item=WORK_TEMPLATES.find(item=>item.id===template.value);info.replaceChildren(el('p','route-detail',item.description),el('p','route-detail',item.smaller));};
  explain();template.addEventListener('change',()=>{explain();expected.value=WORK_TEMPLATES.find(item=>item.id===template.value).output;});
  options(form,'Выделить на следующий шаг · не больше','sessionMinutes',timeOptions,value.sessionMinutes);
  form.append(el('p','route-detail','Это часть твоих часов на неделю. План может выделить меньше времени; завершать весь шаг за одну сессию не обязательно.'));
  const goals=props.handlers.getRouteState().goals;
  const goalName=id=>{const name=props.programs.find(item=>item.id===id)?.name;return typeof name==='string'?name:name?.ru??id;};
  options(form,'Для какой цели? · необязательно','goalId',[['','Пока без цели'],...goals.map(id=>[id,goalName(id)])],value.goalId);
  field(form,'Чем работа полезна для этой цели? · если выбрал цель','why',value.why);
  const start=el('button','button','Начать работу');start.type='submit';form.append(start);
  bindForm(form,key,data=>props.handlers.onStartPortfolioWork({...data,id:crypto.randomUUID(),sessionMinutes:Number(data.sessionMinutes),goals:data.goalId?[{goalId:data.goalId,why:data.why}]:[]}),response=>onSaved(response.id,response.message));
  box.append(form);return box;
}

export function renderWorkPlan(entry,props,onSaved){
  const plan=entry.workPlan;if(!plan)return null;
  const box=el('section','journey-work');box.dataset.workPlan=entry.id;
  const status=say(),done=plan.steps.filter(step=>step.done).length;
  const progress=el('progress','journey-progress');progress.max=plan.steps.length;progress.value=done;progress.setAttribute('aria-label',`Готово ${done} из ${plan.steps.length} шагов`);box.append(progress);
  const brief=el('dl','journey-brief');brief.append(el('dt',null,'Почему это интересно'),el('dd',null,plan.aim),el('dt',null,'Хочу получить'),el('dd',null,plan.expectedResult));box.append(brief);
  const change=(response)=>{if(response.ok)onSaved(entry.id,response.message);else status.textContent=response.message;};
  const pause=button(plan.paused?'Продолжить работу':'Поставить на паузу',()=>change(props.handlers.onPausePortfolioWork(entry.id,!plan.paused)));pause.className='link-button';box.append(pause);
  const next=plan.steps.find(step=>!step.done);
  box.append(renderPortfolioLearning(entry,props,onSaved));
  for(const [index,step] of plan.steps.entries()){
    const row=details(`work-step:${entry.id}:${step.id}`,`${index+1}. ${step.title}${step.done?' · готово':''}`,next?.id===step.id&&!plan.paused);row.className='journey-step';row.dataset.workStep=step.id;row.dataset.current=String(next?.id===step.id&&!plan.paused);
    row.append(el('p','route-detail',`Результат шага: ${step.expected}`));
    if(step.done){
      row.append(el('p','route-detail','Возврат к этому шагу снимет отметки с него и следующих шагов. Записанные результаты останутся.'));
      row.append(button('Вернуться к этому шагу',()=>change(props.handlers.onPortfolioWorkStep(entry.id,step.id))));
    }else if(next.id===step.id&&!plan.paused){
      const actions=el('div','journey-actions'),complete=button('Отметить шаг готовым',()=>change(props.handlers.onPortfolioWorkStep(entry.id,step.id)));complete.disabled=Boolean(pendingPractice(plan));actions.append(button('Открыть дела недели',props.handlers.onOpenToday,true),complete);row.append(actions);
      row.append(el('p','route-detail',pendingPractice(plan)?'Сначала закончи или отложи учебную пробу выше. Затем сохрани результат этого шага на «Сегодня».':'Сначала сохрани результат задания на «Сегодня». Отметка означает, что ты сам считаешь шаг законченным.'));
    }
    box.append(row);
  }
  if(done===plan.steps.length)box.append(el('p','route-detail','Шаги закончены. Запиши выводы и выбери, как использовать работу для своей цели.'));
  const briefKey=`brief:${entry.id}`,editor=details(briefKey,'Уточнить задачу и объём'),briefForm=el('form','journey-form');
  const value=drafts.get(briefKey)??plan;
  field(briefForm,'Почему тебе это интересно?','aim',value.aim,{required:true});
  field(briefForm,'Какой результат хочешь получить?','expectedResult',value.expectedResult,{required:true});
  options(briefForm,'Выделить на следующий шаг · не больше','sessionMinutes',timeOptions,value.sessionMinutes);
  const save=el('button','button button-quiet','Сохранить задачу');save.type='submit';briefForm.append(save);
  bindForm(briefForm,briefKey,data=>props.handlers.onSavePortfolioBrief(entry.id,{...data,sessionMinutes:Number(data.sessionMinutes)}),response=>onSaved(entry.id,response.message));
  editor.append(briefForm);box.append(editor);
  const reviewKey=`review:${entry.id}`,review=details(reviewKey,'Самопроверка работы'),reviewForm=el('form','journey-form');
  const reflection=drafts.get(reviewKey)??plan.review??{};
  review.append(el('p','route-detail','Ответь по своей работе. Можно написать «пока не знаю» или «не применимо» и выбрать, что проверить дальше.'));
  if(plan.review)review.append(el('p','route-detail',`Сохранено ${formatDate(plan.review.checkedOn)}`));
  for(const [name,title] of WORK_REVIEW_FIELDS)field(reviewForm,title,name,reflection[name]);
  const check=el('button','button button-quiet','Сохранить самопроверку');check.type='submit';reviewForm.append(check);
  bindForm(reviewForm,reviewKey,data=>props.handlers.onSavePortfolioReview(entry.id,data),response=>onSaved(entry.id,response.message));
  review.append(reviewForm);box.append(review,status);return box;
}
