// Собственные учебные примеры Nerio. Снимок урока сохраняется вместе с пробой.
import { safeHttpUrl } from './lib/url.js';
export const LEARNING_LESSONS=[
  {id:'comparison',version:1,title:'Сравнить данные',skill:'Сравнить доли и обозначить границу вывода.',
    task:'Учебные данные: у маршрута А вовремя приехали 8 машин из 16, у Б — 9 из 30. Какой был пунктуальнее в этих наблюдениях? Покажи расчёт и одно ограничение.',
    example:'Сравниваем доли: 8/16 = 0,5, а 9/30 = 0,3. В этой выборке доля у А выше. Само число 9 больше 8, но объёмы наблюдений разные. Неизвестны дни и время: вывод «А всегда лучше» не следует. Это вымышленные данные.',
    transfer:'Новая учебная таблица: у В — 12 из 20, у Г — 18 из 40. Сравни доли и объясни, чего вывод не показывает.',
    criteria:['Показаны оба знаменателя и расчёт.','Вывод ограничен данными наблюдениями.']},
  {id:'adaptation',version:1,title:'Изменить учебный пример',skill:'Отделить повторение инструкции от своего решения.',
    task:'Выбери маленький открытый пример: рисунок, расчёт, конструкцию или код. Укажи источник. Что повторишь и какое одно условие изменишь? Предскажи результат.',
    example:'Вымышленная проба: ученик повторил бумажную подставку по инструкции, затем увеличил ширину основания. Он указал автора, сохранил обе версии и сравнил устойчивость на одной поверхности. Собственное решение — изменение основания; исходная конструкция остаётся учебным повторением.',
    transfer:'Выполни свою пробу. Сравни предсказание с наблюдением и предложи следующее изменение. Укажи, что сделал сам, а что взял из примера.',
    criteria:['Источник отделён от личного изменения.','Есть наблюдение, а не только предположение.']},
  {id:'prototype-test',version:1,title:'Проверить маленький прототип',skill:'Проверить одно предположение о работе решения.',
    task:'Представь памятку для новичка в кружке. Какое действие читатель должен суметь выполнить? Что будешь наблюдать при пробе?',
    example:'Вымышленный пример: читателя попросили найти место и время встречи. Он нашёл время, но не понял адрес. Автор добавил ориентир и повторил пробу. Фраза «памятка понравилась» не заменяет наблюдение о выполненном действии.',
    transfer:'Для своей идеи выбери одно действие, сделай маленький макет и опиши доступную пробу. Если пока некому показать, запиши план проверки и эту границу.',
    criteria:['Действие читателя конкретно.','Наблюдение и ожидаемый эффект различаются.']},
  {id:'research-question',version:1,title:'Сузить исследовательский вопрос',skill:'Связать вопрос с доступными данными и способом проверки.',
    task:'Тема «как меняется климат» слишком широка для одной работы. Предложи маленький вопрос: что, где и за какой период сравнишь? Какие данные нужны?',
    example:'Вымышленный план: сравнить средние месячные температуры двух мест за один доступный период. Сначала проверить единицы, пропуски и источник. Такое сравнение описывает выбранные наблюдения, но само по себе не устанавливает причину различий.',
    transfer:'Запиши собственный узкий вопрос, доступный источник, способ сравнения и одно ограничение. Если источника ещё нет, укажи, что нужно найти до анализа.',
    criteria:['Понятно, какие сведения нужны для ответа.','Способ соответствует вопросу; неизвестность обозначена.']},
  {id:'creative-choice',version:1,title:'Сравнить творческие варианты',skill:'Объяснить авторский выбор через замысел и наблюдение.',
    task:'Выбери маленький творческий замысел. Какие два варианта попробуешь и какое одно условие изменишь?',
    example:'Вымышленная работа: на двух афишах изменили только порядок заголовка и даты. Читатель одного варианта не нашёл дату. Автор выбрал другое расположение для своей задачи. Это объяснение решения, а не универсальное правило дизайна.',
    transfer:'Сделай или опиши свою пару проб. Выбери вариант и объясни связь с замыслом. Какое замечание ты принял бы, а какое потребовало бы проверки?',
    criteria:['Варианты различаются понятным решением.','Выбор объяснён через задачу, а не только «красивее».']},
  {id:'own-experience',version:1,title:'Показать личный вклад',skill:'Различить действие человека и общий результат.',
    task:'Учебная фраза: «Мы организовали встречу для школьников». Какие вопросы помогут понять вклад автора?',
    example:'Полезно спросить: за что отвечал ты, какое решение принял и что наблюдал после него? Вымышленное уточнение: «Я составил расписание и после путаницы добавил отдельное время для вопросов». Здесь видно действие; это ещё не доказательство большого общественного эффекта.',
    transfer:'Выбери настоящий эпизод, который готов обсуждать. Запиши своё действие, наблюдавшийся результат и то, что зависело от других. Обычная работа или помощь семье тоже подходят.',
    criteria:['Своё действие отделено от работы других.','Факты отделены от догадок; преувеличений нет.']},
];
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const key=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v);
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(`${v}T00:00:00Z`))&&new Date(`${v}T00:00:00Z`).toISOString().slice(0,10)===v;
const text=(v,max,required=false)=>typeof v==='string'&&v.length<=max&&(!required||v.trim())?v.trim():null;
const blank=()=>({version:1,practices:[],activePracticeId:null,feedback:[]});
const unique=items=>new Set(items).size===items.length;
function lesson(value){
  if(!object(value)||!key(value.id)||value.version!==1||!Array.isArray(value.criteria)||!value.criteria.length||value.criteria.length>4)return null;
  const fields=Object.fromEntries(Object.entries({title:160,skill:500,task:1500,example:2500,transfer:1500}).map(([name,max])=>[name,text(value[name],max,true)]));
  const criteria=value.criteria.map(item=>text(item,250,true));
  return Object.values(fields).includes(null)||criteria.includes(null)?null:{id:value.id,version:1,...fields,criteria};
}
function evidence(value){
  if(!object(value)||!day(value.recordedOn))return null;
  const title=text(value.title,200,true),body=text(value.text,2000,true),raw=text(value.url??'',2000),url=raw? safeHttpUrl(raw):raw;
  if(!title||!body||url===null)return null;
  if(url){const parsed=new URL(url);if(parsed.username||parsed.password)return null;}
  return {title,text:body,url,recordedOn:value.recordedOn};
}
function answer(value){if(!object(value)||!day(value.savedOn))return null;const body=text(value.text,2000,true);return body?{text:body,savedOn:value.savedOn}:null;}
function practice(value){
  if(!object(value)||!key(value.id)||!day(value.startedOn))return null;
  const content=lesson(value.lesson);if(!content)return null;
  const next={id:value.id,lesson:content,startedOn:value.startedOn};
  if(Object.hasOwn(value,'attempt')){next.attempt=answer(value.attempt);if(!next.attempt||next.attempt.savedOn<next.startedOn)return null;}
  if(Object.hasOwn(value,'exampleOpenedOn')){if(!next.attempt||!day(value.exampleOpenedOn)||value.exampleOpenedOn<next.attempt.savedOn)return null;next.exampleOpenedOn=value.exampleOpenedOn;}
  if(Object.hasOwn(value,'transfer')){
    const body=answer(value.transfer),reason=text(value.transfer?.reason,1000,true);
    if(!body||!reason||!next.exampleOpenedOn||body.savedOn<next.exampleOpenedOn)return null;next.transfer={...body,reason};
  }
  return next;
}
function feedback(value){
  if(!object(value)||!key(value.id)||!day(value.savedOn)||!['reader','subject'].includes(value.kind))return null;
  const source=evidence(value.source),fields=Object.fromEntries(Object.entries({request:1000,observation:2000,nextAction:1000,reviewer:120}).map(([name,max])=>[name,text(value[name]??'',max,name!=='reviewer')]));
  if(!source||source.recordedOn>value.savedOn||Object.values(fields).includes(null))return null;
  const next={id:value.id,kind:value.kind,source,...fields,savedOn:value.savedOn};
  if(Object.hasOwn(value,'resolution')){
    const resolution=value.resolution,body=text(resolution?.explanation,2000,true),result=evidence(resolution?.result);
    if(!object(resolution)||!['revised','kept'].includes(resolution.kind)||!body||!result||!day(resolution.savedOn)||resolution.savedOn<value.savedOn||result.recordedOn>resolution.savedOn)return null;
    if(resolution.kind==='revised'&&result.text===source.text&&result.url===source.url)return null;
    if(resolution.kind==='kept'&&JSON.stringify(result)!==JSON.stringify(source))return null;
    next.resolution={kind:resolution.kind,explanation:body,result,savedOn:resolution.savedOn};
  }
  return next;
}
export function normalizeLearning(value){
  if(!object(value)||value.version!==1||!Array.isArray(value.practices)||value.practices.length>3||!Array.isArray(value.feedback)||value.feedback.length>4)return null;
  const practices=value.practices.map(practice),reviews=value.feedback.map(feedback),activePracticeId=value.activePracticeId??null;
  if(practices.includes(null)||reviews.includes(null)||!unique(practices.map(item=>item.id))||!unique(reviews.map(item=>item.id))||activePracticeId!==null&&!practices.some(item=>item.id===activePracticeId))return null;
  const next={version:1,practices,activePracticeId,feedback:reviews};
  return new TextEncoder().encode(JSON.stringify(next)).length<=100000?next:null;
}
export const learningOf=plan=>normalizeLearning(plan?.learning)??blank();
export const activePractice=plan=>{const data=learningOf(plan);return data.practices.find(item=>item.id===data.activePracticeId)??null;};
export const pendingPractice=plan=>{const item=activePractice(plan);return item&&!item.transfer?item:null;};
export function learningEvidence(entry,outcomes){
  return [...(entry.result?[{key:'experience',title:'Результат в записи опыта',snapshot:{title:entry.title,text:entry.result,url:entry.url,recordedOn:entry.updatedOn}}]:[]),
    ...outcomes.filter(item=>item.experienceId===entry.id).map(item=>({key:JSON.stringify([item.week,item.taskId]),title:`${item.title} · ${item.updatedOn}`,snapshot:{title:item.title,text:item.text,url:item.url,recordedOn:item.updatedOn}}))];
}
export function changeLearning(value,action,input,today,entry,outcomes){
  if(!day(today)||!object(input))return null;
  const next=value==null?blank():normalizeLearning(value);if(!next)return null;
  const current=next.practices.find(item=>item.id===next.activePracticeId),source=()=>learningEvidence(entry,outcomes).find(item=>item.key===input.sourceKey)?.snapshot;
  if(action==='start'){
    const content=LEARNING_LESSONS.find(item=>item.id===input.lessonId);
    if(!content||!key(input.id)||next.practices.some(item=>item.id===input.id)||current&&!current.transfer||next.practices.length>=3)return null;
    next.practices.push({id:input.id,lesson:structuredClone(content),startedOn:today});next.activePracticeId=input.id;
  }else if(action==='attempt'){
    if(!current||current.attempt)return null;current.attempt={text:input.text,savedOn:today};
  }else if(action==='example'){
    if(!current?.attempt)return null;current.exampleOpenedOn??=today;
  }else if(action==='transfer'){
    if(!current?.exampleOpenedOn||current.transfer)return null;current.transfer={text:input.text,reason:input.reason,savedOn:today};
  }else if(action==='archive')next.activePracticeId=null;
  else if(action==='resume'){
    const item=next.practices.find(item=>item.id===input.id);if(!item||item.transfer||current&&!current.transfer)return null;next.activePracticeId=item.id;
  }else if(action==='remove-practice'){
    if(!next.practices.some(item=>item.id===input.id))return null;next.practices=next.practices.filter(item=>item.id!==input.id);if(next.activePracticeId===input.id)next.activePracticeId=null;
  }else if(action==='feedback'){
    if(!key(input.id)||next.feedback.some(item=>item.id===input.id)||next.feedback.length>=4||!source())return null;
    next.feedback.push({id:input.id,kind:input.kind,request:input.request,observation:input.observation,nextAction:input.nextAction,reviewer:input.reviewer??'',source:source(),savedOn:today});
  }else if(action==='resolve'){
    const item=next.feedback.find(item=>item.id===input.id);if(!item||item.resolution)return null;
    item.resolution={kind:input.kind,explanation:input.explanation,result:input.kind==='kept'?item.source:source(),savedOn:today};
  }else if(action==='remove-feedback'){
    if(!next.feedback.some(item=>item.id===input.id))return null;next.feedback=next.feedback.filter(item=>item.id!==input.id);
  }else return null;
  return normalizeLearning(next);
}
