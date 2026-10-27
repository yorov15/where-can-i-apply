import { formatDate } from './lib/format.js';
import { safeHttpUrl } from './lib/url.js';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const shift=(day,n)=>new Date(Date.parse(`${day}T00:00:00Z`)+n*86400000).toISOString().slice(0,10);
export function renderCurrentWeek(snapshot,handlers) {
  const {week,review,backlog}=snapshot;
  const box=el('section','route-week');box.dataset.currentWeek=week.key;
  box.append(el('h3','route-phase-title',`Эта неделя: ${formatDate(week.start)} — ${formatDate(week.end)}`));
  if(review.weeks.length){
    const reviewBox=el('div','route-warn');reviewBox.dataset.weekReview='';
    reviewBox.append(el('p',null,`Сверим прошлые недели: сделано ${review.done}, осталось ${review.unfinished.length}. Отметь, что переносим.`));
    for(const task of review.unfinished){const p=el('p'),label=el('label','row'),check=el('input');check.type='checkbox';check.checked=true;check.value=task.taskId;label.append(check,task.title);p.append(label);reviewBox.append(p);}
    const button=el('button','button button-quiet','Завершить сверку');button.type='button';button.addEventListener('click',()=>handlers.onReview([...reviewBox.querySelectorAll('input:checked')].map(input=>input.value)));reviewBox.append(button);box.append(reviewBox);
  }
  if(!week.tasks.length){box.append(el('p','route-detail','Дел для этой недели пока нет. Проверь полный маршрут и выбранные цели.'));return box;}
  box.append(el('p','route-detail',`Всего запланировано ${week.minutes} мин. Это время на работу над делами, а не срок изготовления документа. Выбери день и, например, занимайся после школы.`));
  if(week.minutes>week.budget)box.append(el('p','route-warn','Ты уменьшил часы после выполненных занятий. Их прежнее время сохранено в истории; новых дел на эту неделю не добавляем.'));
  const list=el('ul','route-week-list');
  for(const task of week.tasks){
    const row=el('li','route-week-item');row.dataset.weekTask=task.taskId;
    const layout=el('div',task.done?'route-step is-done':'route-step'),body=el('div','route-step-body'),check=el('input','route-check');check.type='checkbox';check.checked=task.done;check.id=`current-${task.taskId}`;
    check.addEventListener('change',()=>handlers.onWeeklyToggle(week.key,task.taskId));
    const label=el('label','route-step-title',`${task.title} · ${task.minutes} мин`);label.htmlFor=check.id;body.append(label);
    const select=el('select');select.setAttribute('aria-label',`День: ${task.title}`);
    const empty=el('option',null,'Выбрать день');empty.value='';select.append(empty);
    for(let i=0;i<7;i++){const day=shift(week.start,i),option=el('option',null,`${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i]} · ${formatDate(day)}`);option.value=day;select.append(option);}
    select.value=task.day??'';select.addEventListener('change',()=>handlers.onTaskDay(week.key,task.taskId,select.value));body.append(select);
    const url=safeHttpUrl(task.url);if(url){const a=el('a',null,'Открыть материал');a.href=url;a.target='_blank';a.rel='noopener';body.append(a);}
    layout.append(check,body);row.append(layout);list.append(row);
  }
  box.append(list);
  if(backlog)box.append(el('p','route-detail',`В очереди ещё ${backlog} перенесённых дел. Они появятся по мере выполнения — часы недели сохраняются.`));
  return box;
}
