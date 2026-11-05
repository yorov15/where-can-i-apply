import { feeWaiverInquiry, waiverTitle } from './fee-waiver.js';
import { safeHttpUrl } from './lib/url.js';
import { formatDate } from './lib/format.js';
import { isStale } from './lib/dates.js';
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node;};
export function renderFeeWaiver(waiver,fee,programName,today) {
  if(!waiver&&!(fee?.amount>0))return null;
  const box=el('details','journey-reference');box.dataset.feeWaiver=waiver?.mode??'unknown';
  box.append(el('summary',null,waiverTitle(waiver)));
  if(!waiver){box.append(el('p','route-detail','Условия снятия взноса для этой программы пока не проверены. Учти взнос в расходах и сверь правила на сайте приёмной.'));return box;}
  box.append(el('p','route-detail',waiver.ru),el('p','route-detail',waiver.action));
  if(waiver.scope==='notSpecified')box.append(el('p','route-warn','На странице нет отдельного подтверждения для иностранных абитуриентов. Уточни применимость правила к себе до оплаты.'));
  if(waiver.mode==='request')box.append(el('p','route-detail','До подтверждения снятия взноса учитывай его в расходах на подачу.'));
  const href=safeHttpUrl(waiver.source?.url);
  if(href){const source=el('p','card-source',`Проверено ${formatDate(waiver.source.lastVerified)}. `),link=el('a',null,'Условия на сайте вуза');link.href=href;link.target='_blank';link.rel='noopener noreferrer';source.append(link);box.append(source);}
  if(isStale(waiver.source?.lastVerified,today))box.append(el('p','route-warn','Проверка этих условий устарела. Перед запросом открой источник.'));
  if(waiver.mode==='request'){
    const draft=el('details','route-more');draft.append(el('summary',null,'Уточнить условия у приёмной · текст на английском'),el('p','route-detail','Замени страну и имя в квадратных скобках. Контакт возьми с сайта вуза.'));
    const area=el('textarea');area.rows=9;area.readOnly=true;area.value=feeWaiverInquiry(programName);area.setAttribute('aria-label','Вопрос приёмной о снятии взноса');
    const say=el('p','route-status');say.setAttribute('role','status');
    const copy=el('button','button button-quiet','Скопировать вопрос');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(area.value);say.textContent='Текст скопирован. Замени страну и имя перед отправкой.';}catch{area.select();say.textContent='Выдели текст и скопируй его.';}});
    draft.append(area,copy,say);box.append(draft);
  }
  return box;
}
