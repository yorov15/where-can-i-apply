import { plural } from './lib/format.js';
export const ESSAY_USAGE_KEY='nerio-essay-usage';
export const ESSAY_DEVICE_KEY='nerio-essay-device';
export const ESSAY_ERRORS={rate:'Лимит проверок исчерпан. Попробуй завтра.',off:'Бесплатная проверка сейчас недоступна. Пользуйся чек-листом.',
  model:'Модель не вернула пригодный отзыв. Черновик остался в поле.',network:'Не получилось связаться. Черновик остался в поле.',
  storage:'В этом браузере ИИ-проверка недоступна. Чек-лист работает.',restricted:'У этой программы есть ограничения на такую проверку.',invalid:'Вставь черновик длиной от 40 до 10 000 знаков.'};
const localDay=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export async function essayAvailable(url,fetchImpl=fetch){
  if(!url)return false;
  try{const response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'essay-status'}),signal:AbortSignal.timeout(10000)});
    return response.ok&&(await response.json()).available===true;}catch{return false;}
}
export function essayUsage(storage=localStorage,today=localDay()) {
  try{const raw=JSON.parse(storage.getItem(ESSAY_USAGE_KEY)??'null');return raw?.day===today&&Number.isInteger(raw.count)&&raw.count>=0?Math.min(3,raw.count):0;}catch{return 0;}
}
export function draftSize(text) {return {words:text.trim()?text.trim().split(/\s+/u).length:0,characters:Array.from(text).length,bytes:new TextEncoder().encode(text).length};}
// Границы берём только из данных программы: words/characters/bytes проверены
// сборкой по цитате снимка (tools/essays.py). Нет поля — счётчик без границы.
export function essayCount(text,item={}) {
  const n=draftSize(text),words=item.words??{},limits=[];
  // «из N» — всегда родительный падеж множественного числа: «из 300 знаков».
  const part=(value,max,forms)=>max?`${value} из ${max} ${forms[2]}`:`${value} ${plural(value,...forms)}`;
  const parts=[part(n.words,words.max,['слово','слова','слов']),part(n.characters,item.characters,['знак','знака','знаков'])];
  if(item.bytes)parts.push(part(n.bytes,item.bytes,['байт','байта','байт']));
  if(words.min)limits.push(`от ${words.min} слов`);if(words.max)limits.push(`до ${words.max} слов`);
  if(item.characters)limits.push(`до ${item.characters} знаков`);if(item.bytes)limits.push(`до ${item.bytes} байт`);
  const over=n.words>(words.max??Infinity)||n.characters>(item.characters??Infinity)||n.bytes>(item.bytes??Infinity);
  const under=!over&&n.words>0&&n.words<(words.min??0);
  const line=parts.join(' · ')+(limits.length?`. По источнику: ${limits.join(', ')}.`:'')
    +(over?' Объём превышает лимит.':under?' Пока меньше минимума.':'');
  return {text:line,over,under};
}
export async function askEssay({programId,essayId,draft},{url,storage=localStorage,locks=navigator.locks,fetchImpl=fetch,today=localDay(),randomId=()=>crypto.randomUUID()}={}) {
  const fail=kind=>{const error=new Error(kind);error.kind=kind;throw error;};
  if(typeof draft!=='string'||draft.trim().length<40||draft.length>10000)fail('invalid');
  if(!url)fail('off');
  if(!locks?.request)fail('storage');
  return locks.request('nerio-essay-check',async()=>{
    let deviceId;
    try{
      const count=essayUsage(storage,today);if(count>=3)fail('rate');
      deviceId=storage.getItem(ESSAY_DEVICE_KEY)||randomId();storage.setItem(ESSAY_DEVICE_KEY,deviceId);
      // Reserve before sending, so reloads and simultaneous tabs cannot issue
      // a fourth request. Failed requests also consume one daily attempt.
      const value=JSON.stringify({day:today,count:count+1});storage.setItem(ESSAY_USAGE_KEY,value);
      if(storage.getItem(ESSAY_USAGE_KEY)!==value)fail('storage');
    }catch(error){if(error.kind)throw error;fail('storage');}
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
    try{
      const response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
        body:JSON.stringify({mode:'essay',programId,essayId,draft,deviceId})});
      if(!response.ok){let error;try{error=(await response.json()).error;}catch{}
        fail(response.status===429?'rate':response.status===403?'restricted':error==='off'?'off':response.status===400?'invalid':'model');}
      const value=await response.json(),keys=['response','structure','questions'];
      if(!value?.feedback||!keys.every(key=>Array.isArray(value.feedback[key])&&value.feedback[key].length>=1&&value.feedback[key].length<=3
        &&value.feedback[key].every(line=>typeof line==='string'&&line.length<=350)))fail('model');
      return value.feedback;
    }catch(error){if(error.kind)throw error;fail('network');}finally{clearTimeout(timer);}
  });
}
