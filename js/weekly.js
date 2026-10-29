import { mondayOf,weekKey } from './study-plan.js';
import { importState,exportState } from './route-state.js';
import { nextPortfolioTasks } from './portfolio.js';
const clone=state=>importState(exportState(state));
const shift=(day,n)=>new Date(Date.parse(`${day}T00:00:00Z`)+n*86400000).toISOString().slice(0,10);
const keyOf=task=>task.kind==='portfolio'?task.taskId:task.routeId??`${task.code??''}:${task.title}`;
const firstUnique=tasks=>{const map=new Map();for(const task of tasks)if(!map.has(keyOf(task)))map.set(keyOf(task),task);return [...map.values()];};

export function pendingReview(state,today) {
  const current=weekKey(today),reviewed=state.lastReview?weekKey(state.lastReview):'';
  const weeks=Object.entries(state.weekPlan).filter(([key,tasks])=>key<current&&key>=reviewed&&tasks.some(task=>task.title));
  const tasks=weeks.flatMap(([,items])=>items.filter(task=>task.title));
  return { weeks:weeks.map(([key])=>key), done:tasks.filter(task=>task.done).length,
    unfinished:[...new Map(tasks.filter(task=>!task.done).map(task=>[keyOf(task),task])).values()] };
}

export function reviewWeeks(state,today,taskIds) {
  const next=clone(state),review=pendingReview(next,today),selected=new Set(taskIds);
  const carried=[...next.carryTasks,...review.unfinished.filter(task=>selected.has(task.taskId)).map(task=>{const item={...task,done:false};delete item.day;delete item.completedAt;return item;})];
  next.carryTasks=[...new Map(carried.map(task=>[keyOf(task),task])).values()];
  next.lastReview=today;
  return next;
}

export function prepareCurrentWeek(state,route,study,today) {
  const next=clone(state),start=mondayOf(today),key=weekKey(today),end=shift(start,6);
  for(const [week,tasks] of Object.entries(next.weekPlan))for(const task of tasks){
    if(task.routeId&&route.steps.some(step=>step.id===task.routeId)){
      task.done=route.steps.find(step=>step.id===task.routeId).done===true;
      if(task.done&&next.done[task.routeId])task.completedAt=next.done[task.routeId];
      else delete task.completedAt;
    }
    if(week===key&&task.kind==='portfolio'){
      const step=next.portfolio?.experiences.find(entry=>entry.id===task.experienceId)?.workPlan?.steps.find(step=>step.id===task.workStepId);
      if(step){task.done=step.done;if(step.done)task.completedAt=step.completedOn;else delete task.completedAt;}
    }
  }
  const stored=next.weekPlan[key]??[];
  const sourceTasks=study?.weeks.find(week=>week.key===key)?.tasks??[];
  const admin=route.week.filter(step=>!step.done).slice(0,sourceTasks.length?1:5).map(step=>({taskId:`week:${key}:${step.id}`,routeId:step.id,title:step.title,kind:'action',minutes:30}));
  const exercises=sourceTasks.map(task=>({taskId:task.id,title:task.title,kind:task.kind,code:task.code,minutes:task.minutes,url:task.url}));
  const projects=nextPortfolioTasks(next),projectById=new Map(projects.map(task=>[task.taskId,task]));
  const availableTask=task=>task.kind==='portfolio'?projectById.has(task.taskId):task.routeId?route.steps.some(step=>step.id===task.routeId&&!step.done):study?.active.some(item=>item.plan.code===task.code);
  const refreshTask=task=>task.kind==='portfolio'?{...task,...projectById.get(task.taskId)}:task;
  const validCarry=next.carryTasks.filter(availableTask).map(refreshTask);
  const completed=stored.filter(task=>task.done&&task.title);
  const scheduled=stored.filter(task=>!task.done&&task.day&&task.title&&availableTask(task))
    .map(task=>({...refreshTask(task),minutes:[...admin,...exercises,...projects].find(item=>keyOf(item)===keyOf(task))?.minutes??task.minutes}));
  const candidates=[...completed,...scheduled,...validCarry,...admin.slice(0,1),...projects.slice(0,1),...exercises,...projects.slice(1),...admin.slice(1)];
  const unique=firstUnique(candidates);
  // Carried tasks keep priority. At most five sessions share the total budget.
  const budget=next.hoursPerWeek*60,spent=completed.reduce((sum,task)=>sum+(task.minutes??0),0);
  const available=Math.max(0,budget-spent),done=unique.filter(task=>task.done).slice(0,5);
  // Не создаём нулевые сессии, когда почти весь бюджет уже использован.
  const slots=Math.max(0,Math.min(5-done.length,Math.floor(available/5)));
  const pending=unique.filter(task=>!task.done).slice(0,slots),selected=[...done,...pending];
  const allocated=pending.map(()=>5);let remaining=available-pending.length*5;
  const cap=task=>task.kind==='portfolio'?task.workMinutes??60:Infinity;
  while(remaining>=5){
    let chosen=-1;
    for(let i=0;i<pending.length;i++)if(allocated[i]+5<=cap(pending[i])
      &&(chosen<0||allocated[i]/(pending[i].minutes||30)<allocated[chosen]/(pending[chosen].minutes||30)))chosen=i;
    if(chosen<0)break;
    allocated[chosen]+=5;remaining-=5;
  }
  const lastSlot=pending.findIndex((task,index)=>allocated[index]+remaining<=cap(task));
  if(remaining>0&&remaining<5&&lastSlot>=0)allocated[lastSlot]+=remaining;
  const tasks=selected.map((task,index)=>{
    const old=stored.find(item=>item.taskId===task.taskId);
    const minutes=task.done?task.minutes??0:allocated[index-done.length];
    const item={...task,minutes,done:old?.done??false};
    if(old?.day&&old.day>=start&&old.day<=end)item.day=old.day;
    if(old?.completedAt)item.completedAt=old.completedAt;
    return item;
  });
  // Preserve completed history when a changed goal or budget removes a row.
  next.weekPlan[key]=[...tasks,...stored.filter(task=>task.done&&!tasks.some(item=>item.taskId===task.taskId))];
  next.carryTasks=validCarry;
  return { state:next,week:{key,start,end,tasks,budget,minutes:tasks.reduce((sum,task)=>sum+task.minutes,0)},
    review:pendingReview(next,today),backlog:validCarry.filter(task=>!tasks.some(item=>item.taskId===task.taskId)).length,
    workBacklog:projects.filter(task=>!tasks.some(item=>item.taskId===task.taskId)).length };
}

export function setTaskDay(state,week,taskId,day,today) {
  const next=clone(state),start=mondayOf(today),end=shift(start,6);
  if(week!==weekKey(today)||day!==''&&(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(`${day}T00:00:00Z`))||new Date(`${day}T00:00:00Z`).toISOString().slice(0,10)!==day||day<start||day>end))return next;
  const task=next.weekPlan[week]?.find(item=>item.taskId===taskId);
  if(task){if(day)task.day=day;else delete task.day;}
  return next;
}

export function studyCalendarEvents(state,today) {
  return Object.values(state.weekPlan).flatMap(tasks=>tasks.filter(task=>task.title&&task.day&&task.day>=today&&!task.done)
    .map(task=>({id:`study-${task.taskId}`,date:task.day,title:task.title,description:`День выбран тобой. Запланированное время: ${task.minutes??0} мин; это не обещание, что всё дело займёт столько времени.`,url:task.url})));
}
