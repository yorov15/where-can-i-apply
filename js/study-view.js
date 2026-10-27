import { formatDate } from './lib/format.js';
import { safeHttpUrl } from './lib/url.js';
import { SCORE_LIMITS } from './lib/limits.js';
import { studyAdvice } from './study-plan.js';
const el=(tag, className, text) => { const node=document.createElement(tag); if(className)node.className=className; if(text!=null)node.textContent=text; return node; };
const resource=(label,url) => { const safe=safeHttpUrl(url); if(!safe)return null; const a=el('a',null,label); a.href=safe;a.target='_blank';a.rel='noopener';return a; };

function scoreForm(item,today,onMock) {
  const { plan,track }=item;
  const limit=SCORE_LIMITS[plan.test];
  if(!limit)return null;
  const more=el('details','route-more');
  more.dataset.mock=plan.code;
  more.append(el('summary',null,`Добавить пробник: ${track.name}`));
  const form=el('form');
  const input=(name,label,type,limits={},required=false) => {
    const p=el('p'),wrap=el('label','route-detail',`${label} `),node=el('input');
    node.name=name;node.type=type;node.required=required;node.setAttribute('aria-label',label);
    Object.assign(node,limits);wrap.append(node);p.append(wrap);form.append(p);return node;
  };
  input('date','Дата пробника','date',{value:today,max:today},true);
  input('overall','Общий балл','number',{min:limit.min,max:limit.max,step:limit.step},true);
  const partLimit=plan.test==='SAT'?{min:200,max:800,step:10}:limit;
  for(const part of track.parts) input(part.code,`Балл ${part.name} (если есть)`,'number',{min:partLimit.min,max:partLimit.max,step:partLimit.step});
  form.append(el('p','route-detail','Если материал не оценивает ответ, оставь поле пустым. Writing и Speaking сверь с критериями или преподавателем. Пробник не заменяет сертификат.'));
  const submit=el('button','button button-quiet','Сохранить пробник');submit.type='submit';form.append(submit);
  const status=el('p','route-status');status.setAttribute('role','status');form.append(status);
  form.addEventListener('submit',event => {
    event.preventDefault();
    if(!form.reportValidity())return;
    const f=form.elements;
    const score={date:f.date.value,overall:Number(f.overall.value),test:plan.test,
      parts:Object.fromEntries(track.parts.filter(part=>f[part.code].value!=='').map(part=>[part.code,Number(f[part.code].value)]))};
    status.textContent=onMock(plan.code,score) ?? '';
  });
  more.append(form);return more;
}

export function renderStudyPlan(study,state,today,handlers) {
  if(!study?.active.length)return null;
  const box=el('section','route-week');box.dataset.study='';
  box.append(el('h3','route-phase-title','Подготовка по неделям'));
  box.append(el('p','route-detail',`${state.hoursPerWeek} ч в неделю на все экзамены. Измени время в основной анкете. Минуты в плане — распределение твоего времени; рост балла не гарантируется.`));
  for(const item of study.active) {
    const advice=el('p','route-detail',`${item.track.name}: ${studyAdvice(item,state)}`);advice.dataset.advice=item.plan.code;box.append(advice);
    const source=resource(`Материалы ${item.track.name} · проверено ${formatDate(item.track.practiceSource.lastVerified)}`,item.track.practiceSource.url);
    if(source){const p=el('p','route-detail');p.append(source);box.append(p);}
    const form=scoreForm(item,today,handlers.onMock);if(form)box.append(form);
    if(!item.end)box.append(el('p','route-detail',`Для ${item.track.name} пока показана только текущая неделя: дата экзамена не определена.`));
  }
  box.append(el('p','route-detail','Каждую третью неделю — работа с пробником. Если не хватает времени на полный тест, разбей тренировку на занятия; общий балл вводи после всех частей. Используй новые варианты, если организатор их предлагает.'));
  for(const week of study.weeks) {
    const more=el('details','route-phase');more.dataset.studyWeek=week.key;
    if(week===study.weeks[0])more.open=true;
    more.append(el('summary','route-phase-title',`Неделя ${week.index}: ${formatDate(week.start)} — ${formatDate(week.end)} · ${week.minutes} мин`));
    const list=el('ul','route-week-list');
    for(const task of week.tasks) {
      const row=el('li','route-week-item');row.dataset.studyTask=task.id;
      const layout=el('div',task.done?'route-step is-done':'route-step'),body=el('div','route-step-body');
      const label=el('label','route-step-title',`${task.title} · ${task.minutes} мин`),check=el('input','route-check');check.type='checkbox';check.checked=task.done;
      check.id=task.id;label.htmlFor=check.id;
      check.addEventListener('change',()=>handlers.onStudyToggle(week.key,task.id));
      body.append(label);
      const a=resource('Открыть материал',task.url);if(a){const p=el('p','route-detail');p.append(a);body.append(p);}
      layout.append(check,body);row.append(layout);
      list.append(row);
    }
    more.append(list);box.append(more);
  }
  return box;
}
