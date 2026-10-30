import { applicationsOf,MATERIAL_KINDS,DECISION_KINDS,FUNDING_STATES,OFFER_CHOICES } from './application.js';
import { portfolioOf } from './portfolio.js';
import { safeHttpUrl } from './lib/url.js';
import { formatDate,plural } from './lib/format.js';
const drafts=new Map(),opened=new Map(),selected=new Map();
export function clearApplicationDrafts(){drafts.clear();opened.clear();selected.clear();}
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const button=(title,run,primary=false)=>{const n=el('button',primary?'button':'button button-quiet',title);n.type='button';n.addEventListener('click',run);return n;};
const status=()=>{const n=el('p','route-status');n.setAttribute('role','status');return n;};
const nameOf=(programs,id)=>{const name=programs.find(item=>item.id===id)?.name;return typeof name==='string'?name:name?.ru??id;};
const labelOf=(list,id)=>list.find(([code])=>code===id)?.[1]??id;
function details(key,title,initial=false,cls='journey-edit'){
  const n=el('details',cls);n.open=opened.get(key)??(drafts.has(key)||initial);n.append(el('summary',null,title));
  n.addEventListener('toggle',()=>{if(n.isConnected)opened.set(key,n.open);});return n;
}
function field(parent,title,name,value,{type='textarea',max=2000,required=false}={}){
  const label=el('label',null,title),n=el(type==='textarea'?'textarea':'input');n.name=name;n.value=value??'';n.required=required;
  if(type==='textarea'){n.rows=4;n.maxLength=max;}else{n.type=type;if(type!=='date')n.maxLength=max;}
  label.append(n);parent.append(label);return n;
}
function select(parent,title,name,list,value){
  const label=el('label',null,title),n=el('select');n.name=name;
  for(const [id,text] of list){const option=el('option',null,text);option.value=id;n.append(option);}n.value=value??'';label.append(n);parent.append(label);return n;
}
function link(parent,url,title){const safe=safeHttpUrl(url);if(!safe)return;const n=el('a',null,title);n.href=safe;n.target='_blank';n.rel='noopener noreferrer';parent.append(n);}
function bind(form,key,read,submit,done){
  const say=status();form.append(say);const remember=()=>drafts.set(key,read());form.addEventListener('input',remember);form.addEventListener('change',remember);
  form.addEventListener('submit',event=>{event.preventDefault();const result=submit(read());say.textContent=result.message;if(result.ok){drafts.delete(key);opened.set(key,false);done(result);}});
}

function materialForm(goalId,material,props,done){
  const key=`material:${material?.id??goalId}`,last=material?.versions.at(-1),value=drafts.get(key)??last??{kind:'essay'};
  const box=details(key,material?'Сохранить новую версию':'Добавить материал'),form=el('form','journey-form');
  form.dataset.materialForm=material?.id??'new';
  if(material)form.append(el('p','journey-meta','За основу взята последняя версия. Сохранение добавит новую; прежний текст останется.'));
  field(form,'Название материала','title',value.title,{type:'text',max:160,required:true});
  select(form,'Вид материала','kind',MATERIAL_KINDS,value.kind);
  field(form,'Вопрос или формат из заявки · если есть','prompt',value.prompt);
  field(form,'Ссылка на условия · необязательно','sourceUrl',value.sourceUrl,{type:'url'});
  field(form,'Твой текст · или добавь ссылку ниже','text',value.text,{max:10000});
  field(form,'Ссылка на материал · необязательно','url',value.url,{type:'url'});
  field(form,'Что изменилось в этой версии? · необязательно','note',value.note,{max:1000});
  const refs=el('fieldset'),legend=el('legend',null,'Работы из портфолио · до трёх');refs.append(legend);
  const portfolio=portfolioOf(props.handlers.getRouteState()),oldRefs=last?.references??[];
  const choices=[...portfolio.experiences,...oldRefs.filter(ref=>!portfolio.experiences.some(item=>item.id===ref.experienceId)).map(ref=>({id:ref.experienceId,title:`${ref.title} · сохранённая копия`}))];
  const picked=value.experienceIds??value.references?.map(item=>item.experienceId)??[];
  const controls=choices.map(entry=>{const row=el('label','journey-check'),check=el('input');check.type='checkbox';check.name='experience';check.value=entry.id;check.checked=picked.includes(entry.id);row.append(check,document.createTextNode(entry.title));refs.append(row);return check;});
  const limit=()=>{const full=controls.filter(n=>n.checked).length>=3;for(const n of controls)n.disabled=full&&!n.checked;};limit();form.addEventListener('change',limit);
  if(!choices.length)refs.append(el('p','journey-meta','Сначала добавь опыт в библиотеку, если хочешь связать его с материалом.'));
  refs.append(el('p','journey-meta','В версию попадёт снимок выбранных работ и до четырёх последних результатов каждой работы.'));
  form.append(refs);
  const read=()=>({...Object.fromEntries(new FormData(form)),experienceIds:controls.filter(n=>n.checked).map(n=>n.value)});
  const save=el('button','button',material?'Сохранить новую версию':'Сохранить первую версию');save.type='submit';form.append(save);
  bind(form,key,read,data=>props.handlers.onSaveMaterialVersion({...data,id:material?.id??crypto.randomUUID(),versionId:crypto.randomUUID(),goalId}),result=>{opened.set(`card:${result.id}`,true);done(result);});
  box.append(form);return box;
}

function materialCard(material,props,redraw){
  const latest=material.versions.at(-1),box=details(`card:${material.id}`,latest.title,false,'journey-card');box.dataset.material=material.id;
  const badge=material.submittedVersionId?`Отправлена версия ${material.versions.find(v=>v.id===material.submittedVersionId).number}`:`Черновик · ${material.versions.length} ${plural(material.versions.length,'версия','версии','версий')}`;
  box.append(el('p','journey-meta',badge));
  const current=selected.get(material.id)??latest.id;
  const picker=select(box,'Показать версию','version',material.versions.map(v=>[v.id,`${v.number} · ${formatDate(v.savedOn)}${v.id===material.submittedVersionId?' · отправлена':''}`]),material.versions.some(v=>v.id===current)?current:latest.id);
  const body=el('div');box.append(body);
  const paint=()=>{
    const version=material.versions.find(item=>item.id===picker.value);selected.set(material.id,version.id);body.replaceChildren();
    body.append(el('p','journey-meta',labelOf(MATERIAL_KINDS,version.kind)));
    if(version.prompt)body.append(el('p','journey-copy',version.prompt));link(body,version.sourceUrl,'Условия из твоей записи');
    if(version.text)body.append(el('div','journey-copy',version.text));link(body,version.url,'Открыть материал');
    if(version.note)body.append(el('p','journey-meta',version.note));
    if(version.references.length){
      const refs=details(`refs:${version.id}`,`Снимки работ · ${version.references.length}`);
      for(const item of version.references){const row=el('article','journey-reference');row.append(el('h5',null,item.title));
        if(item.role)row.append(el('p','journey-copy',`Личный вклад: ${item.role}`));if(item.result)row.append(el('p','journey-copy',item.result));link(row,item.url,'Открыть работу');
        for(const outcome of item.outcomes){row.append(el('p','journey-meta',outcome.title),el('p','journey-copy',outcome.text));link(row,outcome.url,'Результат задания');}refs.append(row);
      }body.append(refs);
    }
    const actions=el('div','journey-actions'),say=status();
    actions.append(button(material.submittedVersionId===version.id?'Снять отметку отправки':'Отметить как отправленную',()=>{
      const result=props.handlers.onMarkMaterialSubmitted(material.id,material.submittedVersionId===version.id?null:version.id);if(result.ok)redraw(material.goalId,result.message);else say.textContent=result.message;
    }));body.append(actions,say);
    if(material.versions.length>1&&version.id!==material.submittedVersionId){const remove=details(`delete-version:${version.id}`,'Удалить эту версию');remove.append(el('p','journey-meta','Будет удалена только выбранная неотправленная версия.'),button('Удалить выбранную версию',()=>{
      const result=props.handlers.onRemoveMaterialVersion(material.id,version.id);if(result.ok){selected.delete(material.id);redraw(material.goalId,result.message);}else say.textContent=result.message;
    }));body.append(remove);}
  };picker.addEventListener('change',paint);paint();
  if(material.versions.length<8)box.append(materialForm(material.goalId,material,props,result=>{selected.delete(material.id);opened.set(`card:${material.id}`,true);redraw(material.goalId,result.message);}));
  else box.append(el('p','journey-meta','Сохранено восемь версий. Чтобы добавить новую, удали ненужную неотправленную версию.'));
  const remove=details(`delete-material:${material.id}`,'Удалить материал целиком');
  remove.append(el('p','journey-meta','Материал и все его версии будут удалены из этого маршрута.'),button('Удалить материал и версии',()=>{const result=props.handlers.onRemoveMaterial(material.id);if(result.ok){drafts.delete(`material:${material.id}`);redraw(material.goalId,result.message);}}));box.append(remove);return box;
}

function decisionForm(goalId,existing,props,redraw){
  const key=`decision:${goalId}`,box=details(key,existing?'Изменить ответ и условия':'Записать ответ программы'),form=el('form','journey-form');
  form.dataset.decisionForm=goalId;
  const value=drafts.get(key)??existing??{kind:'offer',receivedOn:props.today,funding:'unknown',choice:'undecided',conditions:[]};
  const kind=select(form,'Какой ответ получил?','kind',DECISION_KINDS,value.kind);
  const received=field(form,'Дата ответа','receivedOn',value.receivedOn,{type:'date',required:true});received.max=props.today;
  field(form,'Ответить программе до · если известно','responseBy',value.responseBy,{type:'date'});
  select(form,'Что известно о финансировании?','funding',FUNDING_STATES,value.funding);
  field(form,'Финансирование и расходы · свои записи','financeNote',value.financeNote);
  const choice=select(form,'Твоё решение по предложению','choice',OFFER_CHOICES,value.choice);
  const sync=()=>{const positive=['offer','conditional'].includes(kind.value);choice.parentElement.hidden=!positive;if(!positive)choice.value='undecided';};kind.addEventListener('change',sync);sync();
  field(form,'Ссылка на письмо или условия · необязательно','sourceUrl',value.sourceUrl,{type:'url'});
  field(form,'Заметка · необязательно','note',value.note);
  const conditions=el('fieldset');conditions.append(el('legend',null,'Что ещё нужно выполнить'));form.append(conditions);
  const rows=[];
  const read=()=>({...Object.fromEntries(new FormData(form)),conditions:rows.map(row=>{
    const actual=applicationsOf(props.handlers.getRouteState()).decisions.find(item=>item.goalId===goalId)?.conditions.find(item=>item.id===row.id);
    return {id:row.id,text:row.text.value,dueOn:row.date.value||null,done:actual?.done??false,...(actual?.doneOn?{doneOn:actual.doneOn}:{})};
  })});
  const remember=()=>drafts.set(key,read());
  const add=(value={})=>{
    if(rows.length>=8)return;const row=el('div','journey-reference'),id=value.id??crypto.randomUUID();
    const body=field(row,'Условие','condition',value.text,{max:500,required:true}),date=field(row,'Срок условия · если известен','conditionDate',value.dueOn,{type:'date'});
    const control={id,text:body,date};rows.push(control);
    row.append(button('Убрать условие из формы',()=>{rows.splice(rows.indexOf(control),1);row.remove();remember();}));conditions.append(row);
  };
  for(const item of value.conditions)add(item);
  form.append(button('Добавить условие',()=>{add();remember();}));
  const save=el('button','button','Сохранить ответ');save.type='submit';form.append(save);
  bind(form,key,read,data=>props.handlers.onSaveDecision({...data,goalId}),result=>{redraw(goalId,result.message);props.handlers.onDecisionSaved?.(goalId,result.message);});box.append(form);return box;
}

function decisionCard(entry,props,redraw){
  const box=el('article','journey-response');box.dataset.decision=entry.goalId;
  box.append(el('h4',null,labelOf(DECISION_KINDS,entry.kind)),el('p','journey-meta',`Ответ ${formatDate(entry.receivedOn)}`));
  box.append(el('p','journey-copy',`Финансирование: ${labelOf(FUNDING_STATES,entry.funding).toLowerCase()}`));
  if(entry.financeNote)box.append(el('p','journey-copy',entry.financeNote));
  if(['offer','conditional'].includes(entry.kind))box.append(el('p','journey-copy',`Твоё решение: ${labelOf(OFFER_CHOICES,entry.choice).toLowerCase()}`));
  if(entry.responseBy)box.append(el('p','journey-meta',`Срок ответа: ${formatDate(entry.responseBy)}`));
  if(entry.kind==='conditional'&&!entry.conditions.length)box.append(el('p','journey-meta','Условия пока не записаны. Сверь полученное письмо.'));
  const say=status();
  for(const condition of entry.conditions){const row=el('label','journey-check'),check=el('input');check.type='checkbox';check.checked=condition.done;check.dataset.offerCondition=condition.id;
    const body=el('span');body.append(document.createTextNode(condition.text),el('small','journey-meta',condition.dueOn?`До ${formatDate(condition.dueOn)}`:'Срок не указан'));
    check.addEventListener('change',()=>{const result=props.handlers.onOfferCondition(entry.goalId,condition.id);if(result.ok)redraw(entry.goalId,result.message,`[data-offer-condition="${CSS.escape(condition.id)}"]`);else{check.checked=condition.done;say.textContent=result.message;}});row.append(check,body);box.append(row);
  }
  if(entry.note)box.append(el('p','journey-copy',entry.note));link(box,entry.sourceUrl,'Письмо или условия из твоей записи');box.append(say);return box;
}

export function renderApplications(props){
  const initial=applicationsOf(props.handlers.getRouteState());
  if(!props.planIds.length&&!initial.materials.length&&!initial.decisions.length)return null;
  const box=el('section','journey-panel');box.dataset.applicationWorkspace='';
  function draw(focusId=null,message='',focusSelector=null){
    box.replaceChildren();const state=props.handlers.getRouteState(),data=applicationsOf(state);
    const header=el('header','journey-head');header.append(el('p','journey-kicker','От опыта к заявке'),el('h3',null,'Материалы и ответы'),el('p','journey-meta','Сохраняй свои версии по каждой цели и отмечай, что действительно отправил.'));box.append(header);
    const ids=[...new Set([...state.goals,...data.materials.map(item=>item.goalId),...data.decisions.map(item=>item.goalId)])];
    for(const [index,id] of ids.entries()){
      const active=state.goals.includes(id),goal=details(`goal:${id}`,nameOf(props.programs,id),index===0,'journey-card');goal.dataset.applicationGoal=id;
      if(focusId===id){goal.open=true;opened.set(`goal:${id}`,true);}
      if(!active)goal.append(el('p','journey-meta','Цель убрана из плана. Записи сохранены в архиве.'));
      const materials=data.materials.filter(item=>item.goalId===id),answer=data.decisions.find(item=>item.goalId===id);
      if(!materials.length)goal.append(el('p','journey-empty','Пока нет материалов. Можно начать с собственного ответа, CV или ссылки на работу.'));
      for(const item of materials)goal.append(materialCard(item,props,draw));
      goal.append(materialForm(id,null,props,result=>draw(id,result.message,`[data-material="${CSS.escape(result.id)}"] > summary`)));
      if(answer)goal.append(decisionCard(answer,props,draw));
      goal.append(decisionForm(id,answer,props,draw));
      if(answer){const remove=details(`remove-decision:${id}`,'Удалить запись об ответе');remove.append(el('p','journey-meta','Условия и заметки об ответе будут удалены. Общий статус цели можно изменить в её карточке.'),button('Удалить запись об ответе',()=>{const result=props.handlers.onRemoveDecision(id);if(result.ok){drafts.delete(`decision:${id}`);draw(id,result.message);}}));goal.append(remove);}
      box.append(goal);
    }
    box.append(el('p','journey-meta','Тексты, версии и ответы хранятся в этом браузере и входят в файл маршрута. Отправляй материалы через официальный канал программы.'));
    const say=status();say.textContent=message;box.append(say);
    if(focusId)box.querySelector(focusSelector??`[data-application-goal="${CSS.escape(focusId)}"] > summary`)?.focus();
  }
  draw();return box;
}

export function renderOfferActions(actions,props){
  if(!actions.length)return null;const box=el('section','journey-panel');box.dataset.offerActions='';
  const header=el('header','journey-head');header.append(el('p','journey-kicker','По твоим записям'),el('h3',null,'После ответа'));box.append(header);
  for(const item of actions.slice(0,5)){const row=el('article','journey-action');row.dataset.state=item.state;
    row.append(el('p','journey-meta',nameOf(props.programs,item.goalId)),el('h4',null,item.title),
      el('p','journey-meta',!item.dueOn?'Срок не указан':`${item.state==='overdue'?'Просрочено · ':'До '}${formatDate(item.dueOn)}`),
      button('Открыть материалы и ответ',()=>props.handlers.onOpenApplication(item.goalId)));box.append(row);
  }
  if(actions.length>5)box.append(el('p','journey-meta',`Ещё действий: ${actions.length-5}. Полный список условий — в материалах и ответах по целям.`));
  return box;
}
