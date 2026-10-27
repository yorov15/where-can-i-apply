import { askEssay,draftSize,essayUsage,ESSAY_ERRORS } from './essay.js';
import { safeHttpUrl } from './lib/url.js';
import { EXPLAIN_URL } from './config.js';
import { formatDate } from './lib/format.js';
// Drafts and feedback survive a route re-render in memory, but are never
// written to storage, route exports or analytics. Reloading clears them.
const drafts=new Map();
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node;};
const sourceLink=(source,label)=>{const url=safeHttpUrl(source?.url);if(!url)return el('span',null,'Источник не загрузился');
  const a=el('a',null,label??`Источник · проверено ${formatDate(source.lastVerified)}`);a.href=url;a.target='_blank';a.rel='noopener';return a;};

export function renderEssays(goals,specs,onRetry) {
  const entries=goals.filter(goal=>Object.hasOwn(specs,goal.id));if(!entries.length)return null;
  const section=el('section','route-phase');section.dataset.essays='';
  section.append(el('h3',null,'Эссе и мотивационные письма'));
  section.append(el('p','route-detail','Сначала ответь на вопрос вуза своими словами. ИИ даёт замечания к черновику.'));
  for(const goal of entries){
    const spec=specs[goal.id],box=el('details','route-more');box.dataset.essayProgram=goal.id;
    box.append(el('summary',null,goal.name.split(' — ')[0]));
    if(!spec){box.append(el('p','route-warn','Требования к эссе не загрузились.'));const retry=el('button','button button-quiet','Повторить загрузку эссе');retry.type='button';retry.addEventListener('click',onRetry);box.append(retry);section.append(box);continue;}
    const blocked=spec.essayPolicy?.review==='blocked';
    if(blocked){box.append(el('p','route-warn',spec.essayPolicy.note),sourceLink(spec.essayPolicy.source,'Правило программы'));
      box.append(el('p','route-detail','ИИ-проверка здесь отключена. Используй требования и собственные примеры.'));}
    else box.append(el('p','route-detail','Правило об ИИ в собранных источниках не найдено. Перед отправкой сверь действующие правила программы.'));
    for(const item of spec.essays??[]){
      const field=el('details','route-more');field.dataset.essayField=item.id;field.append(el('summary',null,item.title));
      if(item.prompt)field.append(el('p','route-detail',item.prompt));
      else field.append(el('p','route-detail','Точная формулировка вопроса пока не разобрана. Открой форму в источнике; ИИ-проверка этого поля недоступна.'));
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
      const count=el('p','route-detail'),size=()=>{const n=draftSize(input.value),limits=[];
        if(item.words?.min)limits.push(`от ${item.words.min} слов`);if(item.words?.max)limits.push(`до ${item.words.max} слов`);
        if(item.characters)limits.push(`до ${item.characters} знаков`);if(item.bytes)limits.push(`до ${item.bytes} байт`);
        count.textContent=`${n.words} слов · ${n.characters} знаков · ${n.bytes} байт${limits.length?`. По источнику: ${limits.join(', ')}.`:''}`;
        const over=n.words>(item.words?.max??Infinity)||n.characters>(item.characters??Infinity)||n.bytes>(item.bytes??Infinity);
        count.className=over?'route-warn':'route-detail';if(over)count.textContent+=' Объём превышает лимит.';
      };size();input.addEventListener('input',()=>{saved.text=input.value;saved.feedback=null;saved.status='';feedback.replaceChildren();status.textContent='';size();});field.append(count);
      const feedback=el('div'),status=el('p','route-status');status.setAttribute('role','status');status.textContent=saved.status;
      const show=()=>{feedback.replaceChildren();for(const [name,title] of [['response','Ответ на вопрос'],['structure','Ход мысли'],['questions','Что уточнить самому']]){
        if(!saved.feedback?.[name])continue;feedback.append(el('h4',null,title));for(const line of saved.feedback[name])feedback.append(el('p','route-detail',line));}};show();
      if(!blocked&&item.prompt){
        field.append(el('p','route-detail','Черновик исчезнет после перезагрузки. Сохрани свою копию. Для проверки он уйдёт через Vercel и OpenRouter к бесплатной модели; убери имена и контакты.'));
        const consentLabel=el('label','row'),consent=el('input');consent.type='checkbox';consentLabel.append(consent,document.createTextNode('Я сверил правила программы и разрешаю отправить этот черновик на ИИ-проверку.'));field.append(consentLabel);
        const quota=el('p','route-detail'),updateQuota=()=>{quota.textContent=`Сегодня осталось ${3-essayUsage()} из 3 попыток на этот браузер. Ошибка запроса тоже расходует попытку.`;};updateQuota();field.append(quota);
        const check=el('button','button button-quiet',saved.busy?'Проверяю…':'Проверить черновик');check.type='button';check.disabled=saved.busy;
        saved.update=()=>{show();status.textContent=saved.status;check.disabled=saved.busy;input.readOnly=saved.busy;check.textContent=saved.busy?'Проверяю…':'Проверить черновик';updateQuota();};saved.update();
        check.addEventListener('click',async()=>{
          if(!consent.checked){status.textContent='Сначала сверь правила программы и разреши отправку.';return;}
          if(saved.busy)return;
          saved.busy=true;saved.status='Проверяю…';saved.update();
          try{saved.feedback=await askEssay({programId:goal.id,essayId:item.id,draft:input.value},{url:EXPLAIN_URL});saved.status='Отзыв ИИ. Проверь его и реши сам, что менять.';}
          catch(error){saved.status=ESSAY_ERRORS[error.kind]??ESSAY_ERRORS.model;}
          finally{saved.busy=false;saved.update();}
        });field.append(check);
      }
      field.append(status,feedback);box.append(field);
    }
    section.append(box);
  }
  return section;
}
