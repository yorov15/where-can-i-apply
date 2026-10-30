import { EXPERIENCE_KINDS, portfolioOf } from './portfolio.js';
import { safeHttpUrl } from './lib/url.js';
import { formatDate } from './lib/format.js';
import { renderWorkPicker, renderWorkPlan, clearWorkDrafts } from './portfolio-work-view.js';
import { pendingPractice } from './portfolio-learning.js';

// Несохранённый ввод переживает служебную перерисовку, но не перезагрузку.
const drafts = new Map();
const openSections = new Set();
export function clearPortfolioDrafts() { drafts.clear(); openSections.clear(); clearWorkDrafts(); }
const el = (tag,cls,text) => { const node=document.createElement(tag); if(cls)node.className=cls; if(text!=null)node.textContent=text; return node; };
const button = (text,run) => { const node=el('button','button button-quiet',text); node.type='button'; node.addEventListener('click',run); return node; };
const status = () => { const node=el('p','route-status'); node.setAttribute('role','status'); return node; };
const nameOf = (programs,id) => {
  const name=programs.find(item=>item.id===id)?.name;
  return typeof name==='string'?name:name?.ru??id;
};

function rememberOpen(node,key,opened=false) {
  node.open=openSections.has(key)||opened;
  node.addEventListener('toggle',()=>{
    if(!node.isConnected)return;
    if(node.open)openSections.add(key);else openSections.delete(key);
  });
}

function field(form,title,name,value,{max=2000,rows=3,type='textarea',required=false}={}) {
  const label=el('label',null,title), input=el(type==='textarea'?'textarea':'input');
  input.name=name; input.value=value??''; input.maxLength=max; input.required=required;
  if(type==='textarea')input.rows=rows; else input.type=type;
  label.append(input); form.append(label); return input;
}

function selectField(form,title,name,options,value) {
  const label=el('label',null,title), select=el('select'); select.name=name;
  for(const [id,text] of options){const option=el('option',null,text);option.value=id;select.append(option);}
  select.value=value??''; label.append(select);form.append(label);return select;
}

function readFields(form) {
  const data=new FormData(form);
  return Object.fromEntries([...data].filter(([name])=>!name.startsWith('goal:')&&!name.startsWith('why:')));
}

function showLink(parent,value,label='Открыть работу') {
  const url=safeHttpUrl(value);if(!url)return;
  const link=el('a',null,label);link.href=url;link.target='_blank';link.rel='noopener noreferrer';parent.append(link);
}

function paragraph(parent,title,value) {
  if(!value)return;
  const text=el('p','route-goal-meta');text.append(el('strong',null,`${title}: `));
  value.split('\n').forEach((line,index)=>{if(index)text.append(el('br'));text.append(document.createTextNode(line));});parent.append(text);
}

function experienceForm(entry,props,onSaved) {
  const id=entry?.id??'new', draftKey=`experience:${id}`;
  const value=drafts.get(draftKey)??entry??{kind:'project',goals:[]};
  const form=el('form','journey-form');form.dataset.experienceForm=id;
  field(form,'Как называется занятие или работа?','title',value.title,{type:'text',max:160,required:true});
  selectField(form,'Вид опыта','kind',EXPERIENCE_KINDS,value.kind);
  field(form,'Когда и как долго? · необязательно','period',value.period,{type:'text',max:120});
  field(form,'Что делал лично ты?','role',value.role,{max:1000,rows:2});
  field(form,'Какие действия ты предпринял?','actions',value.actions);
  field(form,'Что получилось?','result',value.result);
  field(form,'Что понял и что изменил бы?','reflection',value.reflection);
  field(form,'Ссылка на работу · необязательно','url',value.url,{type:'url'});
  const links=el('details','journey-edit');links.append(el('summary',null,'Связать с целями'));
  rememberOpen(links,`goals:${id}`);
  links.append(el('p','route-detail','Объясни своими словами, чем опыт полезен для цели. Это твоя заметка, а не оценка комиссии.'));
  const goalIds=[...new Set([...props.handlers.getRouteState().goals,...(value.goals??[]).map(item=>item.goalId)])];
  const controls=[];
  for(const goalId of goalIds){
    const old=value.goals?.find(item=>item.goalId===goalId),label=el('label','journey-check'),check=el('input','route-check');
    check.type='checkbox';check.name=`goal:${goalId}`;check.checked=Boolean(old);
    label.append(check,document.createTextNode(nameOf(props.programs,goalId)));links.append(label);
    const why=field(links,'Как этот опыт связан с целью?',`why:${goalId}`,old?.why,{max:1000,rows:2});
    const update=()=>{why.parentElement.hidden=!check.checked;why.disabled=!check.checked;};
    check.addEventListener('change',update);update();controls.push({goalId,check,why});
  }
  if(!goalIds.length)links.append(el('p','route-detail','Сначала сохрани опыт. Когда выберешь программу, сможешь связать его с целью.'));
  form.append(links);
  const say=status(),save=el('button','button','Сохранить опыт');save.type='submit';form.append(save,say);
  const read=()=>({...readFields(form),goals:controls.filter(item=>item.check.checked).map(item=>({goalId:item.goalId,why:item.why.value}))});
  const remember=()=>drafts.set(draftKey,read());form.addEventListener('input',remember);form.addEventListener('change',remember);
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const input={...read(),id:entry?.id??crypto.randomUUID()};
    const response=props.handlers.onSaveExperience(input);say.textContent=response.message;
    if(response.ok){drafts.delete(draftKey);onSaved(input.id,response.message);}
  });
  return form;
}

export function renderPortfolio(props) {
  const box=el('section','journey-panel');box.dataset.portfolio='';let expanded=null;
  function draw(message='') {
    box.replaceChildren();
    const portfolio=portfolioOf(props.handlers.getRouteState());
    const header=el('header','journey-head');header.append(el('p','journey-kicker','Твоё портфолио'),el('h3',null,'Мой опыт и работы'),el('p','journey-meta','Сохраняй занятия, проекты, работу и помощь семье. Выбирай, что развивать дальше.'));box.append(header);
    if(!portfolio.experiences.length)box.append(el('p','journey-empty','Добавь то, чем уже занимаешься, или выбери небольшую новую работу.'));
    const saved=(id,text)=>{expanded=id;openSections.delete('add');openSections.delete(`editor:${id}`);draw(text);box.querySelector(`[data-experience="${CSS.escape(id)}"] > summary`)?.focus();};
    box.append(renderWorkPicker(props,saved));
    for(const entry of portfolio.experiences){
      const card=el('details','journey-card');card.dataset.experience=entry.id;
      rememberOpen(card,`entry:${entry.id}`,expanded===entry.id||drafts.has(`experience:${entry.id}`));
      const summary=el('summary'),caption=el('span');caption.append(el('span','journey-title',entry.title));
      const progress=entry.workPlan?(entry.workPlan.paused?'На паузе':`${entry.workPlan.steps.filter(step=>step.done).length} из ${entry.workPlan.steps.length} шагов`):EXPERIENCE_KINDS.find(([id])=>id===entry.kind)?.[1];
      caption.append(el('small','journey-meta',[progress,entry.period].filter(Boolean).join(' · ')));summary.append(caption);card.append(summary);
      const work=renderWorkPlan(entry,props,saved);if(work)card.append(work);
      const facts=el('details','journey-edit');facts.open=!entry.workPlan;facts.append(el('summary',null,'Опыт и результаты'));
      for(const [name,title] of [['role','Личный вклад'],['actions','Действия'],['result','Результат'],['reflection','Вывод']])paragraph(facts,title,entry[name]);
      showLink(facts,entry.url);
      for(const goal of entry.goals)paragraph(facts,`Для ${nameOf(props.programs,goal.goalId)}`,goal.why||'Объяснение пока не добавлено');
      const linked=portfolio.outcomes.filter(item=>item.experienceId===entry.id);
      for(const item of linked)paragraph(facts,`Задание «${item.title}» · ${formatDate(item.updatedOn)}`,item.text);card.append(facts);
      const edit=el('details','journey-edit');rememberOpen(edit,`editor:${entry.id}`,drafts.has(`experience:${entry.id}`));
      edit.append(el('summary',null,'Изменить запись'),experienceForm(entry,props,saved));card.append(edit);
      const remove=el('details','journey-edit');remove.append(el('summary',null,'Удалить запись'));
      remove.append(el('p','route-detail','Запись опыта, её учебные пробы и отзывы будут удалены. Сохранённые результаты заданий останутся.'));
      remove.append(button('Удалить этот опыт',()=>{
        const response=props.handlers.onRemoveExperience(entry.id);
        if(response.ok){drafts.delete(`experience:${entry.id}`);draw(response.message);box.querySelector('[data-add-experience] > summary')?.focus();}
        else box.querySelector('[data-portfolio-status]').textContent=response.message;
      }));card.append(remove);box.append(card);
    }
    const add=el('details','journey-edit');add.dataset.addExperience='';add.append(el('summary',null,'Добавить опыт'));
    rememberOpen(add,'add',drafts.has('experience:new'));
    add.append(experienceForm(null,props,saved));box.append(add);
    if(portfolio.outcomes.length){
      const results=el('details','journey-edit');results.dataset.savedOutcomes='';results.append(el('summary',null,`Результаты заданий · ${portfolio.outcomes.length}`));
      for(const item of [...portfolio.outcomes].reverse()){
        const row=el('details','journey-edit');row.append(el('summary',null,`${item.title} · ${formatDate(item.updatedOn)}`));
        paragraph(row,'Результат',item.text);paragraph(row,'Вывод',item.reflection);showLink(row,item.url);
        if(item.experienceId)paragraph(row,'Связанный опыт',portfolio.experiences.find(entry=>entry.id===item.experienceId)?.title);
        const remove=el('details','journey-edit');remove.append(el('summary',null,'Удалить результат'));
        remove.append(el('p','route-detail','Текст, ссылка и вывод этого результата будут удалены. Опыт и галочка задания останутся.'));
        remove.append(button('Удалить этот результат',()=>{
          const response=props.handlers.onRemoveTaskOutcome(item.week,item.taskId);
          if(response.ok){drafts.delete(JSON.stringify(['outcome',item.week,item.taskId]));draw(response.message);box.querySelector('[data-saved-outcomes] > summary, [data-add-experience] > summary')?.focus();}
          else box.querySelector('[data-portfolio-status]').textContent=response.message;
        }));row.append(remove);
        results.append(row);
      }box.append(results);
    }
    box.append(el('p','journey-meta','Записи хранятся на устройстве и входят в файл маршрута. Внешние файлы по ссылкам сохраняй отдельно.'));
    const say=status();say.dataset.portfolioStatus='';say.textContent=message;box.append(say);
  }
  draw();return box;
}

export function renderTaskOutcome(week,task,props) {
  const draftKey=JSON.stringify(['outcome',week,task.taskId]);
  const portfolio=portfolioOf(props.handlers.getRouteState());
  const practice=pendingPractice(portfolio.experiences.find(item=>item.id===task.experienceId)?.workPlan);
  if(practice){const box=el('section','journey-reference');box.dataset.learningTask=task.taskId;box.append(el('p','journey-meta',`Учебная проба: ${practice.lesson.title}`),el('p','route-detail','Открой пробу в своей работе. После неё вернись к результату текущего шага.'),button('Открыть учебную пробу',()=>props.handlers.onOpenPortfolio(task.experienceId)));return box;}
  const saved=portfolio.outcomes.find(item=>item.week===week&&item.taskId===task.taskId);
  const value=drafts.get(draftKey)??saved??{};
  const box=el('details','journey-edit');box.dataset.taskOutcome=task.taskId;
  rememberOpen(box,draftKey,drafts.has(draftKey));
  const summary=el('summary',null,saved?'Результат сохранён · изменить':'Записать результат');box.append(summary);
  box.append(el('p','route-detail','Запиши, что сделал и что понял. Галочка задания меняется отдельно.'));
  const form=el('form','journey-form');
  field(form,'Что получилось?','text',value.text,{required:true});
  field(form,'Ссылка на результат · необязательно','url',value.url,{type:'url'});
  field(form,'Что понял или доработаешь?','reflection',value.reflection,{rows:2});
  if(task.kind==='portfolio'){
    form.append(el('p','route-detail',`Связанная работа: ${portfolio.experiences.find(item=>item.id===task.experienceId)?.title??'запись не найдена'}`));
    const binding=el('input');binding.type='hidden';binding.name='experienceId';binding.value=task.experienceId;form.append(binding);
  }else selectField(form,'Связать с моим опытом · необязательно','experienceId',[['','Без связи'],...portfolio.experiences.map(item=>[item.id,item.title])],value.experienceId);
  const say=status(),save=el('button','button button-quiet','Сохранить результат');save.type='submit';form.append(save,say);
  form.addEventListener('input',()=>drafts.set(draftKey,readFields(form)));
  form.addEventListener('change',()=>drafts.set(draftKey,readFields(form)));
  form.addEventListener('submit',event=>{
    event.preventDefault();const data=readFields(form);
    const response=props.handlers.onSaveTaskOutcome({...data,experienceId:data.experienceId||null,week,taskId:task.taskId});
    say.textContent=response.message;
    if(response.ok){drafts.delete(draftKey);summary.textContent='Результат сохранён · изменить';}
  });box.append(form);return box;
}
