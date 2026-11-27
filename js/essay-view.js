import { askEssay,essayCount,essayUsage,essayAvailable,draftContacts,ESSAY_ERRORS } from './essay.js';
import { experiencesBySkill } from './portfolio.js';
import { safeHttpUrl } from './lib/url.js';
import { EXPLAIN_URL } from './config.js';
import { formatDate } from './lib/format.js';
// Drafts and feedback survive a route re-render in memory, but are never
// written to storage, route exports or analytics. Reloading clears them.
const drafts=new Map();
let availabilityRequest;
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node;};
const sourceLink=(source,label)=>{const url=safeHttpUrl(source?.url);if(!url)return el('span',null,'Источник не загрузился');
  const a=el('a',null,label??`Источник · проверено ${formatDate(source.lastVerified)}`);a.href=url;a.target='_blank';a.rel='noopener';return a;};

// Свои записи опыта, сгруппированные по навыку. Ссылка открывает запись в «Работах».
function skillExamples(handlers) {
  if(!handlers?.getRouteState)return null;
  const groups=experiencesBySkill(handlers.getRouteState()),box=el('details','route-more');box.dataset.skillExamples='';
  box.append(el('summary',null,'Примеры по навыку'));
  if(!groups.length){box.append(el('p','route-detail','Отметь навыки в записях опыта: «Работы» → запись → «Изменить запись». Здесь появятся твои примеры.'));return box;}
  box.append(el('p','route-detail','Твои записи опыта. Выбери пример, который отвечает на вопрос программы.'));
  for(const group of groups){
    box.append(el('h4',null,group.label));const list=el('ul');
    for(const entry of group.entries){
      const item=el('li'),link=el('a',null,entry.title);link.href='#route';
      link.addEventListener('click',event=>{event.preventDefault();handlers.onOpenPortfolio(entry.id);});
      item.append(link);list.append(item);
    }box.append(list);
  }
  return box;
}

export function renderEssays(goals,specs,onRetry,onSaveVersion,onVersionSaved,handlers) {
  const entries=goals.filter(goal=>Object.hasOwn(specs,goal.id));if(!entries.length)return null;
  const section=el('section','route-phase');section.dataset.essays='';
  section.append(el('h3',null,'Эссе и мотивационные письма'));
  section.append(el('p','route-detail','Сверь задание и требования программы. Ответь своими словами и проверь объём.'));
  const stories=el('a','link-button','Выбрать случай из банка историй');stories.href='#route/stories';section.append(stories);
  const examples=skillExamples(handlers);if(examples)section.append(examples);
  for(const goal of entries){
    const spec=specs[goal.id],box=el('details','route-more');box.dataset.essayProgram=goal.id;
    box.append(el('summary',null,goal.name.split(' — ')[0]));
    if(!spec){box.append(el('p','route-warn','Требования к эссе не загрузились.'));const retry=el('button','button button-quiet','Повторить загрузку эссе');retry.type='button';retry.addEventListener('click',onRetry);box.append(retry);section.append(box);continue;}
    const blocked=spec.essayPolicy?.review==='blocked';
    if(blocked){box.append(el('p','route-warn',spec.essayPolicy.note),sourceLink(spec.essayPolicy.source,'Правило программы'));
      box.append(el('p','route-detail','Проверка наставником здесь отключена. Используй требования и собственные примеры.'));}
    for(const item of spec.essays??[]){
      const field=el('details','route-more');field.dataset.essayField=item.id;field.append(el('summary',null,item.title));
      if(item.prompt)field.append(el('p','route-detail',item.prompt));
      else field.append(el('p','route-detail','Точная формулировка вопроса пока не разобрана. Открой форму в источнике; наставник это поле не проверяет.'));
      const key=`${goal.id}:${item.id}`,saved=drafts.get(key)??{text:'',feedback:null,busy:false,status:'',checks:[]};drafts.set(key,saved);
      const list=el('div');for(const [index,requirement] of item.requirements.entries()){
        const row=el('label','row'),check=el('input');check.type='checkbox';check.checked=saved.checks[index]===true;
        check.addEventListener('change',()=>{saved.checks[index]=check.checked;});row.append(check,document.createTextNode(requirement));list.append(row);
      }field.append(list,sourceLink(item.source));
      const topics=el('details','route-more');topics.append(el('summary',null,'Вопросы, чтобы найти свою тему'));
      for(const question of ['Какой свой опыт помогает ответить на этот вопрос?','Что именно ты сделал и чему научился?','Как этот опыт связан с тем, чему ты хочешь учиться?'])topics.append(el('p','route-detail',question));
      field.append(topics);
      const label=el('label',null,'Твой черновик'),input=el('textarea');input.rows=7;input.maxLength=10000;input.value=saved.text;
      input.autocomplete='off';input.spellcheck=false;input.readOnly=saved.busy;label.append(input);field.append(label);
      const count=el('p','route-detail'),size=()=>{const result=essayCount(input.value,item);
        count.textContent=result.text;count.className=result.over||result.under?'route-warn':'route-detail';
      };count.dataset.essayCount='';size();input.addEventListener('input',()=>{saved.text=input.value;saved.feedback=null;saved.status='';feedback.replaceChildren();status.textContent='';size();
        // Текст поменялся — показанное «что уйдёт» устарело, пусть человек посмотрит заново.
        if(saved.preview){saved.preview=false;saved.update?.();}});field.append(count);
      const feedback=el('div'),status=el('p','route-status');status.setAttribute('role','status');status.textContent=saved.status;
      field.append(el('p','route-detail','Черновик исчезнет после перезагрузки. Сохрани свою копию.'));
      if(onSaveVersion){
        const save=el('button','button button-quiet','Сохранить версию для заявки');save.type='button';
        save.addEventListener('click',()=>{const result=onSaveVersion(goal.id,item,input.value);saved.status=result.message;status.textContent=result.message;if(result.ok)onVersionSaved?.(goal.id,item.id);});
        field.append(save,el('p','route-detail','По этой кнопке текст сохранится на устройстве и попадёт в файл маршрута.'));
      }
      const show=()=>{feedback.replaceChildren();for(const [name,title] of [['response','Ответ на вопрос'],['structure','Ход мысли'],['questions','Что уточнить самому']]){
        if(!saved.feedback?.[name])continue;feedback.append(el('h4',null,title));for(const line of saved.feedback[name])feedback.append(el('p','route-detail',line));}};show();
      if(!blocked&&item.prompt){
        const aiBox=el('div');aiBox.hidden=true;
        const availabilityNote=el('p','route-detail','Проверку наставником включим позже. Сейчас используй чек-лист и счётчик объёма.');field.append(availabilityNote);
        aiBox.append(el('p','route-detail','Правило об ИИ в собранных источниках не найдено. Сверь действующие правила программы. Наставник не пишет и не переписывает текст: он задаёт вопросы и показывает, где мысль неясна.'));
        const consentLabel=el('label','row'),consent=el('input');consent.type='checkbox';consentLabel.append(consent,document.createTextNode('Я сверил правила программы и разрешаю отправить этот черновик наставнику.'));aiBox.append(consentLabel);
        const quota=el('p','route-detail'),updateQuota=()=>{quota.textContent=`Сегодня осталось ${3-essayUsage()} из 3 попыток на этот браузер. Ошибка запроса тоже расходует попытку.`;};updateQuota();aiBox.append(quota);
        const check=el('button','button button-quiet','Проверить черновик');check.type='button';
        // Перед отправкой человек видит ровно то, что уйдёт: вопрос программы и черновик целиком.
        const preview=el('div'),outgoing=el('textarea'),contacts=el('p','route-warn'),actions=el('div','route-actions');
        outgoing.readOnly=true;outgoing.rows=5;outgoing.setAttribute('aria-label','Черновик, который уйдёт на проверку');
        const send=el('button','button','Отправить наставнику'),cancel=el('button','button button-quiet','Не отправлять');send.type='button';cancel.type='button';actions.append(send,cancel);
        preview.append(el('h4',null,'Что уйдёт на проверку'),
          el('p','route-detail',`Уйдёт весь черновик ниже и выбор вопроса: «${item.title}», ${goal.name.split(' — ')[0]}. Ещё — случайный номер браузера, по нему считаем 3 проверки в день. Анкета и другие черновики не уходят. Путь: Vercel, затем OpenCode Go и модель DeepSeek; по правилам Go она не хранит запросы. Наша функция черновик не записывает.`),
          outgoing,contacts,el('p','route-detail','Перечитай и убери имена, почту, телефон и ссылки. Поправить можно в поле «Твой черновик».'),actions);
        saved.update=()=>{show();status.textContent=saved.status;input.readOnly=saved.busy;
          check.disabled=saved.busy;check.textContent=saved.busy?'Проверяю…':'Проверить черновик';check.hidden=Boolean(saved.preview);
          preview.hidden=!saved.preview;outgoing.value=saved.preview?input.value:'';
          const found=saved.preview?draftContacts(input.value):[];contacts.hidden=!found.length;
          contacts.textContent=found.length?`Похоже, в тексте есть: ${found.join(', ')}. Убери это перед отправкой.`:'';
          updateQuota();};saved.update();
        check.addEventListener('click',()=>{
          if(!consent.checked){status.textContent='Сначала сверь правила программы и разреши отправку.';return;}
          if(saved.busy)return;
          if(input.value.trim().length<40||input.value.length>10000){status.textContent=ESSAY_ERRORS.invalid;return;}
          saved.preview=true;saved.status='';saved.update();outgoing.focus();
        });
        cancel.addEventListener('click',()=>{saved.preview=false;saved.update();check.focus();});
        send.addEventListener('click',async()=>{
          if(saved.busy||!saved.preview)return;
          const draft=outgoing.value;
          saved.preview=false;saved.busy=true;saved.status='Наставник читает черновик. Это до минуты.';saved.update();
          try{saved.feedback=await askEssay({programId:goal.id,essayId:item.id,draft},{url:EXPLAIN_URL});saved.status='Отзыв наставника. Проверь его и реши сам, что менять.';}
          catch(error){saved.status=ESSAY_ERRORS[error.kind]??ESSAY_ERRORS.model;}
          finally{saved.busy=false;saved.update();}
        });aiBox.append(check,preview);field.append(aiBox);
        availabilityRequest??=essayAvailable(EXPLAIN_URL);
        availabilityRequest.then(available=>{aiBox.hidden=!available;availabilityNote.hidden=available;});
      }
      field.append(status,feedback);box.append(field);
    }
    section.append(box);
  }
  return section;
}
