// Личный опыт и результаты заданий — часть локального маршрута.
// Версия раздела независима от старой версии маршрута. Неизвестную версию
// при импорте отклоняем целиком: молча терять личные работы нельзя.
import { safeHttpUrl } from './lib/url.js';
import { WORK_TEMPLATES, WORK_REVIEW_FIELDS, normalizeWorkPlan, workTaskId } from './portfolio-work.js';
import { changeLearning, pendingPractice } from './portfolio-learning.js';
import { weekKey } from './study-plan.js';
import { projectIdea } from './project-ideas.js';

export const EXPERIENCE_KINDS = [['project','Проект'],['study','Учёба'],['work','Работа'],['family','Помощь семье'],['creative','Творчество'],['community','Инициатива'],['sport','Спорт'],['other','Другое']];
// Навыки — короткий закрытый список, чтобы примеры для эссе группировались одинаково.
export const EXPERIENCE_SKILLS = [['independence','Самостоятельность'],['leadership','Лидерство'],['teamwork','Работа в команде'],
  ['research','Исследование'],['creativity','Творчество'],['helping','Помощь людям'],['tech','Техника']];
export const MAX_SKILLS = 3;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const key = value => typeof value === 'string' && value.length > 0 && value.length <= 200
  && !['__proto__','constructor','prototype'].includes(value);
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
const text = (value, max) => value == null ? '' : typeof value === 'string' && value.length <= max ? value.trim() : null;
const url = value => {
  const source = text(value, 2000);
  if (source === '' || source === null) return source;
  const safe = safeHttpUrl(source);
  if (!safe) return null;
  const parsed = new URL(safe);
  return parsed.username || parsed.password ? null : safe;
};
const blank = () => ({version:1,experiences:[],outcomes:[]});
const unique = values => new Set(values).size === values.length;

function experience(value) {
  if (!object(value) || !key(value.id) || !EXPERIENCE_KINDS.some(([code]) => code === value.kind)
    || !day(value.createdOn) || !day(value.updatedOn)) return null;
  const fields = Object.fromEntries(Object.entries({title:160,period:120,role:1000,actions:2000,result:2000,reflection:2000})
    .map(([name,max]) => [name,text(value[name],max)]));
  const link = url(value.url);
  if (!fields.title || Object.values(fields).includes(null) || link === null || !Array.isArray(value.goals) || value.goals.length > 8) return null;
  const goals = value.goals.map(item => {
    if (!object(item) || !key(item.goalId)) return null;
    const why = text(item.why,1000);
    return why === null ? null : {goalId:item.goalId,why};
  });
  if (goals.includes(null) || !unique(goals.map(item => item.goalId))) return null;
  const entry={id:value.id,kind:value.kind,...fields,url:link,goals,createdOn:value.createdOn,updatedOn:value.updatedOn};
  if(Object.hasOwn(value,'skills')&&value.skills!=null){
    const skills=value.skills;
    if(!Array.isArray(skills)||skills.length>MAX_SKILLS||!unique(skills)||skills.some(code=>!EXPERIENCE_SKILLS.some(([id])=>id===code)))return null;
    if(skills.length)entry.skills=[...skills];
  }
  if(Object.hasOwn(value,'workPlan')){entry.workPlan=normalizeWorkPlan(value.workPlan);if(!entry.workPlan)return null;}
  return entry;
}

function outcome(value) {
  if (!object(value) || typeof value.week !== 'string' || !/^\d{4}-W\d{2}$/.test(value.week) || !key(value.taskId) || !day(value.updatedOn)) return null;
  const title = text(value.title,200), result = text(value.text,2000), reflection = text(value.reflection,2000), link = url(value.url);
  if (!title || !result || reflection === null || link === null || value.experienceId != null && !key(value.experienceId)) return null;
  if(value.workStepId!=null&&!key(value.workStepId))return null;
  return {week:value.week,taskId:value.taskId,title,text:result,url:link,reflection,experienceId:value.experienceId ?? null,updatedOn:value.updatedOn,
    ...(value.workStepId!=null?{workStepId:value.workStepId}:{})};
}

export function normalizePortfolio(value) {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.experiences) || !Array.isArray(value.outcomes)
    || value.experiences.length > 40 || value.outcomes.length > 100) return null;
  const experiences = value.experiences.map(experience), outcomes = value.outcomes.map(outcome);
  if (experiences.includes(null) || outcomes.includes(null) || !unique(experiences.map(item => item.id))
    || !unique(outcomes.map(item => JSON.stringify([item.week,item.taskId])))) return null;
  if (outcomes.some(item => item.experienceId && !experiences.some(entry => entry.id === item.experienceId))) return null;
  if(!unique(experiences.filter(entry=>entry.workPlan).map(entry=>entry.workPlan.id)))return null;
  const next = {version:1,experiences,outcomes};
  return new TextEncoder().encode(JSON.stringify(next)).length <= 300_000 ? next : null;
}

export function portfolioOf(state) { return normalizePortfolio(state?.portfolio) ?? blank(); }

export function saveExperience(state, input, today) {
  if (!object(input) || !day(today)) return null;
  const portfolio = portfolioOf(state), old = portfolio.experiences.find(item => item.id === input.id);
  const entry = experience({...old,...input,createdOn:old?.createdOn ?? today,updatedOn:today});
  if (!entry) return null;
  portfolio.experiences = old ? portfolio.experiences.map(item => item.id === entry.id ? entry : item) : [...portfolio.experiences,entry];
  const checked = normalizePortfolio(portfolio);
  return checked ? {...state,portfolio:checked} : null;
}

export function removeExperience(state, id) {
  if (!key(id)) return null;
  const portfolio = portfolioOf(state);
  portfolio.experiences = portfolio.experiences.filter(item => item.id !== id);
  portfolio.outcomes = portfolio.outcomes.map(item => item.experienceId === id ? {...item,experienceId:null} : item);
  return {...state,portfolio};
}

export function saveTaskOutcome(state, input, today) {
  if (!object(input) || !day(today)) return null;
  const task = state.weekPlan?.[input.week]?.find(item => item.taskId === input.taskId);
  if (!task) return null;
  const portfolio = portfolioOf(state);
  let binding={};
  if(task.kind==='portfolio'){
    const entry=portfolio.experiences.find(entry=>entry.id===task.experienceId);
    const step=entry?.workPlan?.steps.find(step=>step.id===task.workStepId);
    if(!step||task.taskId!==workTaskId(entry.workPlan,step))return null;
    binding={experienceId:entry.id,workStepId:step.id};
  }
  const saved = outcome({...input,...binding,title:task.title,updatedOn:today});
  if (!saved) return null;
  const same = item => item.week === saved.week && item.taskId === saved.taskId;
  portfolio.outcomes = [...portfolio.outcomes.filter(item => !same(item)),saved];
  const checked = normalizePortfolio(portfolio);
  return checked ? {...state,portfolio:checked} : null;
}

export function removeTaskOutcome(state, week, taskId) {
  if (typeof week !== 'string' || !/^\d{4}-W\d{2}$/.test(week) || !key(taskId)) return null;
  const portfolio = portfolioOf(state);
  portfolio.outcomes = portfolio.outcomes.filter(item => item.week !== week || item.taskId !== taskId);
  return {...state,portfolio};
}

export function startPortfolioWork(state,input,today) {
  if(!object(input)||!day(today))return null;
  const template=WORK_TEMPLATES.find(item=>item.id===input.templateId);
  if(!template||portfolioOf(state).experiences.some(item=>item.id===input.id))return null;
  const idea=input.ideaId?projectIdea(input.ideaId):null;
  if(input.ideaId&&(!idea||idea.templateId!==template.id))return null;
  return saveExperience(state,{id:input.id,title:input.title,kind:template.kind,goals:input.goals??[],
    workPlan:{version:1,id:input.id,templateId:template.id,aim:input.aim,expectedResult:input.expectedResult??template.output,format:input.format||template.format,sessionMinutes:input.sessionMinutes??60,paused:false,
      ...(idea?{ideaId:idea.id}:{}),steps:(idea?.steps??template.steps).map(step=>({...step,done:false}))}},today);
}

function updateWorkPlan(state,id,today,change) {
  if(!day(today))return null;
  const portfolio=portfolioOf(state),entry=portfolio.experiences.find(item=>item.id===id);
  if(!entry?.workPlan||change(entry.workPlan,portfolio)===false)return null;
  entry.updatedOn=today;
  const checked=normalizePortfolio(portfolio);
  return checked?{...state,portfolio:checked}:null;
}

export function setPortfolioWorkPaused(state,id,paused,today) {
  if(typeof paused!=='boolean')return null;
  return updateWorkPlan(state,id,today,plan=>{plan.paused=paused;});
}

export function togglePortfolioWorkStep(state,id,stepId,today) {
  return updateWorkPlan(state,id,today,(plan,portfolio)=>{
    const index=plan.steps.findIndex(step=>step.id===stepId),step=plan.steps[index];
    if(!step)return false;
    if(step.done){for(const item of plan.steps.slice(index)){item.done=false;delete item.completedOn;}return;}
    if(plan.paused||pendingPractice(plan)||plan.steps.slice(0,index).some(item=>!item.done)
      ||!portfolio.outcomes.some(item=>item.experienceId===id&&item.workStepId===stepId&&item.text))return false;
    step.done=true;step.completedOn=today;
  });
}

// Результат шага из самой работы пишется туда же, куда его пишет «Сегодня»:
// неделя сегодняшнего дня и id дела этого шага. Потом шаг отмечается готовым.
export function finishWorkStep(state,id,stepId,input,today) {
  if(!object(input)||!day(today))return null;
  const portfolio=portfolioOf(state),entry=portfolio.experiences.find(item=>item.id===id),plan=entry?.workPlan;
  const step=plan?.steps.find(item=>item.id===stepId);
  if(!step||plan.paused||pendingPractice(plan)||plan.steps.find(item=>!item.done)!==step)return null;
  const week=weekKey(today),taskId=workTaskId(plan,step),task=state.weekPlan?.[week]?.find(item=>item.taskId===taskId);
  const saved=outcome({text:input.text,url:input.url,reflection:input.reflection,week,taskId,experienceId:id,workStepId:stepId,
    title:task?.title??`${step.title} · ${entry.title}`.slice(0,200),updatedOn:today});
  if(!saved)return null;
  portfolio.outcomes=[...portfolio.outcomes.filter(item=>item.week!==week||item.taskId!==taskId),saved];
  const checked=normalizePortfolio(portfolio);
  return checked?togglePortfolioWorkStep({...state,portfolio:checked},id,stepId,today):null;
}

// Последний записанный результат шага: сначала на этой неделе, иначе — любой прежний.
export function workStepOutcome(state,id,stepId,today) {
  const entry=portfolioOf(state).experiences.find(item=>item.id===id),step=entry?.workPlan?.steps.find(item=>item.id===stepId);
  if(!step||!day(today))return null;
  const items=portfolioOf(state).outcomes.filter(item=>item.experienceId===id&&item.workStepId===stepId);
  return items.find(item=>item.week===weekKey(today)&&item.taskId===workTaskId(entry.workPlan,step))??items.at(-1)??null;
}

export function savePortfolioBrief(state,id,input,today) {
  if(!object(input))return null;
  return updateWorkPlan(state,id,today,plan=>{plan.aim=input.aim;plan.expectedResult=input.expectedResult;if(input.format)plan.format=input.format;if(input.sessionMinutes!=null)plan.sessionMinutes=input.sessionMinutes;});
}

export function updatePortfolioLearning(state,id,action,input,today){
  return updateWorkPlan(state,id,today,(plan,portfolio)=>{
    if(['start','resume'].includes(action)&&!plan.steps.some(step=>!step.done))return false;
    // Доработку можно записать прямо в форме отзыва: она становится обычным
    // результатом работы и сразу же источником решения.
    if(action==='resolve'&&input?.sourceKey==='new'){
      if(input.kind!=='revised'||!key(input.id))return false;
      const saved=outcome({text:input.resultText,url:input.resultUrl,reflection:'',week:weekKey(today),taskId:`feedback:${input.id}`,experienceId:id,
        title:`Доработка по отзыву · ${portfolio.experiences.find(item=>item.id===id).title}`.slice(0,200),updatedOn:today});
      if(!saved||portfolio.outcomes.some(item=>item.week===saved.week&&item.taskId===saved.taskId))return false;
      portfolio.outcomes.push(saved);input={...input,sourceKey:JSON.stringify([saved.week,saved.taskId])};
    }
    const entry=portfolio.experiences.find(item=>item.id===id),next=changeLearning(plan.learning,action,input,today,entry,portfolio.outcomes);
    if(!next)return false;plan.learning=next;
  });
}

export function savePortfolioReview(state,id,input,today) {
  if(!object(input))return null;
  return updateWorkPlan(state,id,today,plan=>{
    const fields=Object.fromEntries(WORK_REVIEW_FIELDS.map(([name])=>[name,input[name]??'']));
    if(Object.values(fields).some(value=>typeof value!=='string'||value.length>1000))return false;
    if(Object.values(fields).some(value=>value.trim()))plan.review={...fields,checkedOn:today};else delete plan.review;
  });
}

// Свои записи опыта по навыкам — для блока «Примеры по навыку» у эссе.
export function experiencesBySkill(state) {
  const experiences=portfolioOf(state).experiences;
  return EXPERIENCE_SKILLS.map(([skill,label])=>({skill,label,entries:experiences.filter(entry=>entry.skills?.includes(skill)).map(({id,title})=>({id,title}))}))
    .filter(group=>group.entries.length);
}

export function nextPortfolioTasks(state) {
  return portfolioOf(state).experiences.flatMap(entry=>{
    const plan=entry.workPlan,step=plan?.steps.find(item=>!item.done);
    const practice=pendingPractice(plan);
    return !step||plan.paused?[]:[{taskId:workTaskId(plan,step),title:`${practice?'Учебная проба: '+practice.lesson.title:step.title} · ${entry.title}`.slice(0,200),kind:'portfolio',
      experienceId:entry.id,workStepId:step.id,expected:practice?'Своя попытка, разбор примера и новая задача с объяснением.':step.expected,minutes:plan.sessionMinutes,workMinutes:plan.sessionMinutes}];
  });
}
