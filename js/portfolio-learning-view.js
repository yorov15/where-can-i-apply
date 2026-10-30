import { LEARNING_LESSONS, learningOf, activePractice, learningEvidence } from './portfolio-learning.js';
import { formatDate } from './lib/format.js';
const drafts=new Map(),opened=new Map();
export function clearLearningDrafts(){drafts.clear();opened.clear();}
export function forgetLearningDrafts(entry){
  const ids=[entry.id,...(entry.workPlan?.learning?.practices??[]).map(item=>item.id),...(entry.workPlan?.learning?.feedback??[]).map(item=>item.id)];
  for(const map of [drafts,opened])for(const key of map.keys())if(ids.some(id=>key.endsWith(`:${id}`)))map.delete(key);
}
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const button=(title,run,primary=false)=>{const n=el('button',primary?'button':'button button-quiet',title);n.type='button';n.addEventListener('click',run);return n;};
function details(key,title,initial=false){const n=el('details','journey-edit');n.open=opened.get(key)??(drafts.has(key)||initial);n.append(el('summary',null,title));n.addEventListener('toggle',()=>{if(n.isConnected)opened.set(key,n.open);});return n;}
function field(parent,title,name,value,{max=2000,required=true,short=false}={}){const label=el('label',null,title),n=el(short?'input':'textarea');n.name=name;n.value=value??'';n.maxLength=max;n.required=required;if(short)n.type='text';else n.rows=3;label.append(n);parent.append(label);return n;}
function select(parent,title,name,choices,value){const label=el('label',null,title),n=el('select');n.name=name;n.required=true;for(const [id,title] of choices){const option=el('option',null,title);option.value=id;n.append(option);}n.value=value??choices[0]?.[0]??'';label.append(n);parent.append(label);return n;}
const read=form=>Object.fromEntries(new FormData(form));
function form(key,run,done){const n=el('form','journey-form'),status=el('p','route-status');n.dataset.learningForm=key;status.setAttribute('role','status');n.addEventListener('input',()=>drafts.set(key,read(n)));n.addEventListener('change',()=>drafts.set(key,read(n)));n.addEventListener('submit',event=>{event.preventDefault();const response=run(read(n));status.textContent=response.message;if(response.ok){drafts.delete(key);done(response);}});return {node:n,status};}
function submit(node,status,title){const n=el('button','button button-quiet',title);n.type='submit';node.append(n,status);}
function evidenceView(source,title){const n=el('div','journey-reference');n.append(el('p','journey-meta',`${title} · ${formatDate(source.recordedOn)}`),el('p','journey-copy',source.text));if(source.url){const link=el('a',null,'Сохранённая ссылка');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';n.append(link);}return n;}
function practiceHistory(item,run,canResume){const box=details(`practice-history:${item.id}`,item.lesson.title);box.append(el('p','journey-meta',item.lesson.skill),el('p','journey-copy',item.lesson.task));if(item.attempt)box.append(el('h4',null,'Первая попытка'),el('p','journey-copy',item.attempt.text));if(item.exampleOpenedOn)box.append(el('h4',null,'Разбор примера'),el('p','journey-copy',item.lesson.example));if(item.transfer)box.append(el('h4',null,'Новая попытка'),el('p','journey-copy',item.transfer.text),el('p','journey-copy',item.transfer.reason));else if(canResume)box.append(button('Продолжить эту пробу',()=>run('resume',{id:item.id})));return box;}

export function renderPortfolioLearning(entry,props,onSaved){
  const plan=entry.workPlan,data=learningOf(plan),current=activePractice(plan),box=el('section','journey-work');box.dataset.learning=entry.id;
  const status=el('p','route-status');status.setAttribute('role','status');
  const run=(action,input={})=>{const result=props.handlers.onPortfolioLearning(entry.id,action,input);if(result.ok)onSaved(entry.id,result.message);else status.textContent=result.message;return result;};
  const finish=response=>onSaved(entry.id,response.message),send=(action,input)=>props.handlers.onPortfolioLearning(entry.id,action,input);
  const training=details(`training:${entry.id}`,'Потренироваться перед следующим шагом',Boolean(current&&!current.transfer));training.dataset.training='';
  training.append(el('p','journey-meta','Учебные примеры Nerio. Проба использует время текущего шага; её можно отложить. Правильность ответов здесь не оценивается.'));
  if(current){
    training.append(el('h4',null,current.lesson.title),el('p','journey-meta',current.lesson.skill));
    if(!current.attempt){
      training.append(el('p','journey-copy',current.lesson.task));
      const key=`attempt:${current.id}`,value=drafts.get(key)??{},part=form(key,input=>send('attempt',input),finish);
      field(part.node,'Твоя первая попытка','text',value.text);submit(part.node,part.status,'Сохранить попытку');training.append(part.node);
    }else{
      const first=details(`first:${current.id}`,'Твоя первая попытка');first.append(el('p','journey-copy',current.lesson.task),el('p','journey-copy',current.attempt.text));training.append(first);
      if(!current.exampleOpenedOn)training.append(button('Открыть разбор примера',()=>run('example'),true));
      else{
        training.append(el('h4',null,'Разбор примера'),el('p','journey-copy',current.lesson.example));
        const list=el('ul');for(const criterion of current.lesson.criteria)list.append(el('li',null,criterion));training.append(list);
        if(!current.transfer){
          training.append(el('h4',null,'Попробуй с меньшей помощью'),el('p','journey-copy',current.lesson.transfer));
          const key=`transfer:${current.id}`,value=drafts.get(key)??{},part=form(key,input=>send('transfer',input),finish);
          field(part.node,'Новая попытка','text',value.text);field(part.node,'Что понял или изменил после разбора?','reason',value.reason,{max:1000});submit(part.node,part.status,'Сохранить новую попытку');training.append(part.node);
        }else training.append(el('h4',null,'Твоя новая попытка'),el('p','journey-copy',current.transfer.text),el('p','journey-copy',current.transfer.reason),el('p','journey-meta','Обе попытки сохранены. Если остался вопрос, обсуди его с человеком, который знает тему. Теперь можно продолжить работу.'));
      }
    }
    training.append(button(current.transfer?'Убрать из текущего шага':'Отложить пробу и продолжить работу',()=>run('archive')));
  }
  if((!current||current.transfer)&&plan.steps.some(step=>!step.done)){
    const key=`lesson:${entry.id}`,picker=form(key,input=>send('start',{...input,id:crypto.randomUUID()}),finish);
    const recommended={data:'comparison',prototype:'prototype-test',creative:'creative-choice',episodes:'own-experience'}[plan.templateId]??'adaptation';
    select(picker.node,'Выбери учебную пробу','lessonId',LEARNING_LESSONS.map(item=>[item.id,item.title]),drafts.get(key)?.lessonId??recommended);
    submit(picker.node,picker.status,'Начать учебную пробу');training.append(picker.node);
    if(data.practices.length>=3)training.append(el('p','journey-meta','Хранятся три пробы. Чтобы начать следующую, удали одну из истории.'));
  }
  if(data.practices.length){const history=details(`practices:${entry.id}`,`Сохранённые пробы · ${data.practices.length}`);for(const item of data.practices){
    const past=practiceHistory(item,run,(!current||Boolean(current.transfer))&&item.id!==data.activePracticeId&&plan.steps.some(step=>!step.done));if(item.id===data.activePracticeId)past.append(el('p','journey-meta','Открыта в текущем шаге.'));
    const remove=details(`remove-practice:${item.id}`,'Удалить эту пробу');remove.append(el('p','journey-meta','Обе попытки и снимок урока будут удалены.'),button('Удалить пробу и ответы',()=>run('remove-practice',{id:item.id})));past.append(remove);history.append(past);
  }training.append(history);}
  box.append(training);

  const reviews=details(`feedback:${entry.id}`,`Отзыв и доработка${data.feedback.length?' · '+data.feedback.length:''}`);reviews.dataset.learningFeedback='';
  reviews.append(el('p','journey-meta','Запиши полученный отзыв. Имя и предметную компетенцию проверяющего указываешь ты; Nerio их не проверяет. Ничего не отправляется автоматически.'));
  const choices=learningEvidence(entry,props.handlers.getRouteState().portfolio?.outcomes??[]),sources=[['','Выбери сохранённый результат'],...choices.map(item=>[item.key,item.title])];
  for(const item of data.feedback){
    const card=el('article','journey-response');card.dataset.feedback=item.id;
    card.append(el('h4',null,item.kind==='subject'?'Отзыв по предмету':'Отзыв о понятности'),el('p','journey-meta',`${item.reviewer||'Проверяющий не указан'} · записано ${formatDate(item.savedOn)}`),el('p','journey-copy',`Твой запрос: ${item.request}`),el('p','journey-copy',item.observation),el('p','journey-copy',`Следующее действие: ${item.nextAction}`));
    const source=details(`feedback-source:${item.id}`,'Какой результат рассматривали');source.append(evidenceView(item.source,'Снимок результата'));card.append(source);
    if(item.resolution){card.append(el('h4',null,item.resolution.kind==='revised'?'Доработка записана':'Решение сохранено с объяснением'),el('p','journey-copy',item.resolution.explanation));const after=details(`feedback-after:${item.id}`,'Результат после решения');after.append(evidenceView(item.resolution.result,'Сохранённый результат'));card.append(after);}
    else{
      const key=`resolve:${item.id}`,value=drafts.get(key)??{kind:'revised'},part=form(key,input=>send('resolve',{...input,id:item.id}),finish);
      const kind=select(part.node,'Что решил по отзыву?','kind',[['revised','Доработал результат'],['kept','Сохранил прежнее решение']],value.kind);
      const result=select(part.node,'Обновлённый сохранённый результат','sourceKey',sources,value.sourceKey);
      const show=()=>{result.parentElement.hidden=kind.value==='kept';result.disabled=kind.value==='kept';};kind.addEventListener('change',show);show();
      field(part.node,'Что изменил или почему сохранил решение?','explanation',value.explanation);part.node.append(el('p','journey-meta','Сначала сохрани обновлённый результат в работе или в задании на «Сегодня». Здесь сохранится его снимок.'));
      submit(part.node,part.status,'Сохранить решение по отзыву');card.append(part.node);
    }
    const remove=details(`remove-feedback:${item.id}`,'Удалить запись об отзыве');remove.append(el('p','journey-meta','Отзыв, его снимки и решение будут удалены. Исходная работа останется.'),button('Удалить отзыв и решение',()=>run('remove-feedback',{id:item.id})));card.append(remove);reviews.append(card);
  }
  if(choices.length){
    const key=`new-feedback:${entry.id}`,value=drafts.get(key)??{},add=details(key,'Записать полученный отзыв'),part=form(key,input=>send('feedback',{...input,id:crypto.randomUUID()}),finish);
    select(part.node,'Какой результат показывал?','sourceKey',sources,value.sourceKey);
    select(part.node,'Что проверяли?','kind',[['reader','Понятность — отзыв читателя'],['subject','Метод или содержание — предметный отзыв']],value.kind);
    field(part.node,'Кто оставил отзыв? · необязательно','reviewer',value.reviewer,{max:120,required:false,short:true});
    field(part.node,'Какой вопрос ты задал о своей работе?','request',value.request,{max:1000});
    field(part.node,'Какое конкретное наблюдение или вопрос получил?','observation',value.observation);
    field(part.node,'Какое следующее действие предложили?','nextAction',value.nextAction,{max:1000});
    submit(part.node,part.status,'Сохранить полученный отзыв');add.append(part.node);reviews.append(add);
  }else reviews.append(el('p','journey-meta','Сначала сохрани результат работы в записи опыта или в задании на «Сегодня». После этого можно записать отзыв о нём.'));
  box.append(reviews,status);return box;
}
