import { EXPERIENCE_KINDS, portfolioOf } from './portfolio.js';
import { safeHttpUrl } from './lib/url.js';
import { formatDate } from './lib/format.js';

// Несохранённый ввод переживает служебную перерисовку, но не перезагрузку.
const drafts = new Map();
const openSections = new Set();
export function clearPortfolioDrafts() { drafts.clear(); openSections.clear(); }
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
  const form=el('form');form.dataset.experienceForm=id;
  field(form,'Как называется занятие или работа?','title',value.title,{type:'text',max:160,required:true});
  selectField(form,'Вид опыта','kind',EXPERIENCE_KINDS,value.kind);
  field(form,'Когда и как долго? · необязательно','period',value.period,{type:'text',max:120});
  field(form,'Что делал лично ты?','role',value.role,{max:1000,rows:2});
  field(form,'Какие действия ты предпринял?','actions',value.actions);
  field(form,'Что получилось?','result',value.result);
  field(form,'Что понял и что изменил бы?','reflection',value.reflection);
  field(form,'Ссылка на работу · необязательно','url',value.url,{type:'url'});
  const links=el('details','route-more');links.append(el('summary',null,'Связать с целями'));
  rememberOpen(links,`goals:${id}`);
  links.append(el('p','route-detail','Объясни своими словами, чем опыт полезен для цели. Это твоя заметка, а не оценка комиссии.'));
  const goalIds=[...new Set([...props.handlers.getRouteState().goals,...(value.goals??[]).map(item=>item.goalId)])];
  const controls=[];
  for(const goalId of goalIds){
    const old=value.goals?.find(item=>item.goalId===goalId),label=el('label','row'),check=el('input','route-check');
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
  const box=el('section','route-phase');box.dataset.portfolio='';let expanded=null;
  function draw(message='') {
    box.replaceChildren();
    const portfolio=portfolioOf(props.handlers.getRouteState());
    box.append(el('h3',null,'Мой опыт и работы'),el('p','route-detail','Сохраняй проекты, занятия, работу и помощь семье. Сертификат или публичная ссылка не обязательны.'));
    const saved=(id,text)=>{expanded=id;openSections.delete('add');openSections.delete(`editor:${id}`);draw(text);box.querySelector(`[data-experience="${CSS.escape(id)}"] > summary`)?.focus();};
    for(const entry of portfolio.experiences){
      const card=el('details','route-more');card.dataset.experience=entry.id;
      rememberOpen(card,`entry:${entry.id}`,expanded===entry.id||drafts.has(`experience:${entry.id}`));
      const summary=el('summary',null,entry.title);card.append(summary);
      card.append(el('p','route-goal-meta',[EXPERIENCE_KINDS.find(([id])=>id===entry.kind)?.[1],entry.period].filter(Boolean).join(' · ')));
      for(const [name,title] of [['role','Личный вклад'],['actions','Действия'],['result','Результат'],['reflection','Вывод']])paragraph(card,title,entry[name]);
      showLink(card,entry.url);
      for(const goal of entry.goals)paragraph(card,`Для ${nameOf(props.programs,goal.goalId)}`,goal.why||'Объяснение пока не добавлено');
      const linked=portfolio.outcomes.filter(item=>item.experienceId===entry.id);
      for(const item of linked)paragraph(card,`Задание «${item.title}» · ${formatDate(item.updatedOn)}`,item.text);
      const edit=el('details','route-more');rememberOpen(edit,`editor:${entry.id}`,drafts.has(`experience:${entry.id}`));
      edit.append(el('summary',null,'Изменить запись'),experienceForm(entry,props,saved));card.append(edit);
      const remove=el('details','route-more');remove.append(el('summary',null,'Удалить запись'));
      remove.append(el('p','route-detail','Запись опыта будет удалена. Сохранённые результаты заданий останутся.'));
      remove.append(button('Удалить этот опыт',()=>{
        const response=props.handlers.onRemoveExperience(entry.id);
        if(response.ok){drafts.delete(`experience:${entry.id}`);draw(response.message);box.querySelector('[data-add-experience] > summary')?.focus();}
        else box.querySelector('[data-portfolio-status]').textContent=response.message;
      }));card.append(remove);box.append(card);
    }
    const add=el('details','route-more');add.dataset.addExperience='';add.append(el('summary',null,'Добавить опыт'));
    rememberOpen(add,'add',drafts.has('experience:new'));
    add.append(experienceForm(null,props,saved));box.append(add);
    if(portfolio.outcomes.length){
      const results=el('details','route-more');results.dataset.savedOutcomes='';results.append(el('summary',null,`Результаты заданий · ${portfolio.outcomes.length}`));
      for(const item of [...portfolio.outcomes].reverse()){
        const row=el('details','route-more');row.append(el('summary',null,`${item.title} · ${formatDate(item.updatedOn)}`));
        paragraph(row,'Результат',item.text);paragraph(row,'Вывод',item.reflection);showLink(row,item.url);
        if(item.experienceId)paragraph(row,'Связанный опыт',portfolio.experiences.find(entry=>entry.id===item.experienceId)?.title);
        const remove=el('details','route-more');remove.append(el('summary',null,'Удалить результат'));
        remove.append(el('p','route-detail','Текст, ссылка и вывод этого результата будут удалены. Опыт и галочка задания останутся.'));
        remove.append(button('Удалить этот результат',()=>{
          const response=props.handlers.onRemoveTaskOutcome(item.week,item.taskId);
          if(response.ok){drafts.delete(JSON.stringify(['outcome',item.week,item.taskId]));draw(response.message);box.querySelector('[data-saved-outcomes] > summary, [data-add-experience] > summary')?.focus();}
          else box.querySelector('[data-portfolio-status]').textContent=response.message;
        }));row.append(remove);
        results.append(row);
      }box.append(results);
    }
    box.append(el('p','route-detail','Записи хранятся в этом браузере и входят в файл маршрута. Скачай его для резервной копии. Ссылки не сохраняют копии внешних файлов.'));
    const say=status();say.dataset.portfolioStatus='';say.textContent=message;box.append(say);
  }
  draw();return box;
}

export function renderTaskOutcome(week,task,props) {
  const draftKey=JSON.stringify(['outcome',week,task.taskId]);
  const portfolio=portfolioOf(props.handlers.getRouteState());
  const saved=portfolio.outcomes.find(item=>item.week===week&&item.taskId===task.taskId);
  const value=drafts.get(draftKey)??saved??{};
  const box=el('details','route-more');box.dataset.taskOutcome=task.taskId;
  rememberOpen(box,draftKey,drafts.has(draftKey));
  const summary=el('summary',null,saved?'Результат сохранён · изменить':'Записать результат');box.append(summary);
  box.append(el('p','route-detail','Запиши, что сделал и что понял. Галочка задания меняется отдельно.'));
  const form=el('form');
  field(form,'Что получилось?','text',value.text,{required:true});
  field(form,'Ссылка на результат · необязательно','url',value.url,{type:'url'});
  field(form,'Что понял или доработаешь?','reflection',value.reflection,{rows:2});
  selectField(form,'Связать с моим опытом · необязательно','experienceId',[['','Без связи'],...portfolio.experiences.map(item=>[item.id,item.title])],value.experienceId);
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
