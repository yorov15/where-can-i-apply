import { mondayOf } from './study-plan.js';
import { money } from './cost.js';

const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
const date = iso => iso.split('-').reverse().join('.');
const clean = value => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
const clip = (value,max) => {const text=clean(value);return text.length>max?`${text.slice(0,max-1)}…`:text;};
const titles = (items,max=180) => clip(items.slice(0,2).map(item=>clip(item.title,70)).join('; ')
  + (items.length>2?`; ещё ${items.length-2}`:''),max);

// A completion date is evidence of a mark, not of time spent or admission.
// Null dates from migration and future dates never become this week's work.
export function parentReport({route,state,weekly,cost,today}) {
  const start=mondayOf(today),end=new Date(Date.parse(`${start}T00:00:00Z`)+6*86400000).toISOString().slice(0,10);
  const inWeek=value=>day(value)&&value>=start&&value<=today;
  const completed=new Map();
  for(const step of route.steps) {
    if(step.done&&[step.id,...(step.legacyIds??[])].some(id=>inWeek(state.done[id]))) completed.set(step.id,step);
  }
  for(const tasks of Object.values(state.weekPlan)) for(const task of tasks) {
    if(task.done&&task.title&&inWeek(task.completedAt)) completed.set(task.routeId??task.taskId,task);
  }
  const done=[...completed.values()];
  const next=(weekly?.week.tasks??route.week).filter(task=>!task.done);
  const nearest=route.goals.filter(goal=>day(goal.deadline?.closes)&&goal.deadline.closes>=today)
    .sort((a,b)=>a.deadline.closes.localeCompare(b.deadline.closes))[0];
  const lines=[`Nerio · ${date(start)}–${date(end)} · на ${date(today)}`,
    `Цели: ${clip(route.goals.map(goal=>goal.name.split(' — ')[0]).join('; '),110)}.`,
    `План на неделю: ${state.hoursPerWeek} ч.`,
    done.length?`Отмечено за неделю: ${done.length}. ${titles(done)}.`:'За эту неделю нет дел с датой выполнения.',
    next.length?`Дальше: ${titles(next)}.`:'Дальше: сверить требования и сроки целей.',
    nearest?`Ближайшая подача: ${date(nearest.deadline.closes)}${nearest.deadline.confidence==='confirmed'?'':' (ожидаемая дата)'} · ${clip(nearest.name.split(' — ')[0],65)}.`:'Нет известной даты предстоящей подачи; сверь сайты целей.',
  ];
  if(cost.totals.length) lines.push(`Плата за подачу по целям: ${clip(cost.totals.map(item=>money(item.amount,item.currency)).join(' + '),150)}.`);
  if(cost.free.length) lines.push(`Без платы за подачу: ${cost.free.length}.`);
  if(cost.waived.length) lines.push(`При запросе финпомощи плату снимают: ${clip(cost.waived.join('; '),105)}.`);
  if(cost.unknown.length) lines.push(`Целей с неизвестной суммой: ${cost.unknown.length}; итог может быть больше.`);
  if(cost.totals.length||cost.waived.length) lines.push('Даты оплаты не подтверждены — уточнить у вузов.');
  return lines.join('\n');
}

// The browser's PDF printer receives only this report, without the profile.
export function printParentReport(text,doc=document,win=window) {
  doc.getElementById('parent-print')?.remove();
  const article=doc.createElement('article');article.id='parent-print';article.hidden=true;
  for(const line of text.split('\n')) {const p=doc.createElement('p');p.textContent=line;article.append(p);}
  doc.body.append(article);doc.body.classList.add('is-parent-print');
  const cleanup=()=>{article.remove();doc.body.classList.remove('is-parent-print');win.removeEventListener('afterprint',cleanup);};
  win.addEventListener('afterprint',cleanup,{once:true});
  try {win.print();} catch(error) {cleanup();throw error;}
}
