// Личные материалы и ответы. Версия хранит снимок текста и выбранного
// опыта; редактирование библиотеки не переписывает прежнюю заявку.
import { safeHttpUrl } from './lib/url.js';
import { portfolioOf } from './portfolio.js';

export const MATERIAL_KINDS=[['essay','Эссе / мотивационное письмо'],['short-answer','Короткий ответ'],['cv','CV'],['portfolio','Подборка работ'],['other','Другой материал']];
export const DECISION_KINDS=[['offer','Оффер'],['conditional','Условный оффер'],['waitlist','Лист ожидания'],['rejected','Отказ'],['other','Другой ответ']];
export const FUNDING_STATES=[['unknown','Пока не знаю'],['pending','Ожидаю решение'],['offered','Предложена помощь'],['none','Помощи нет']];
export const OFFER_CHOICES=[['undecided','Ещё решаю'],['accepted','Принял предложение'],['declined','Отказался от предложения']];
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const key=v=>typeof v==='string'&&v.length>0&&v.length<=200&&!['__proto__','constructor','prototype'].includes(v);
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(`${v}T00:00:00Z`))&&new Date(`${v}T00:00:00Z`).toISOString().slice(0,10)===v;
const text=(v,max)=>v==null?'':typeof v==='string'&&v.length<=max?v.trim():null;
const allowed=(list,value)=>list.some(([id])=>id===value);
const unique=list=>new Set(list).size===list.length;
const date=v=>v==null||v===''?null:day(v)?v:undefined;
function url(value){const raw=text(value,2000);if(raw===''||raw===null)return raw;const safe=safeHttpUrl(raw);if(!safe)return null;const parsed=new URL(safe);return parsed.username||parsed.password?null:safe;}
const blank=()=>({version:1,materials:[],decisions:[]});

function reference(value){
  if(!object(value)||!key(value.experienceId)||!Array.isArray(value.outcomes)||value.outcomes.length>4)return null;
  const title=text(value.title,160),role=text(value.role,1000),result=text(value.result,2000),link=url(value.url);
  if(!title||role===null||result===null||link===null)return null;
  const outcomes=value.outcomes.map(item=>{
    if(!object(item)||!day(item.updatedOn))return null;
    const title=text(item.title,200),body=text(item.text,2000),link=url(item.url);
    return !title||!body||link===null?null:{title,text:body,url:link,updatedOn:item.updatedOn};
  });
  return outcomes.includes(null)?null:{experienceId:value.experienceId,title,role,result,url:link,outcomes};
}

function version(value){
  if(!object(value)||!key(value.id)||!day(value.savedOn)||!allowed(MATERIAL_KINDS,value.kind)||!Array.isArray(value.references)||value.references.length>3)return null;
  if(!Number.isSafeInteger(value.number)||value.number<1)return null;
  const fields={title:text(value.title,160),prompt:text(value.prompt,2000),text:text(value.text,10000),note:text(value.note,1000),url:url(value.url),sourceUrl:url(value.sourceUrl)};
  if(!fields.title||Object.values(fields).includes(null)||!fields.text&&!fields.url)return null;
  const references=value.references.map(reference);
  if(references.includes(null)||!unique(references.map(item=>item.experienceId)))return null;
  return {id:value.id,number:value.number,kind:value.kind,...fields,references,savedOn:value.savedOn};
}

function material(value){
  if(!object(value)||!key(value.id)||!key(value.goalId)||!day(value.createdOn)||!Array.isArray(value.versions)||!value.versions.length||value.versions.length>8)return null;
  const versions=value.versions.map((item,index)=>object(item)?version({...item,number:item.number??index+1}):null);
  if(versions.includes(null)||!unique(versions.map(item=>item.id))||!unique(versions.map(item=>item.number))
    ||versions.some((item,index)=>index>0&&item.number<=versions[index-1].number))return null;
  const nextVersionNumber=value.nextVersionNumber??Math.max(...versions.map(item=>item.number))+1;
  if(!Number.isSafeInteger(nextVersionNumber)||nextVersionNumber<=Math.max(...versions.map(item=>item.number)))return null;
  const submittedVersionId=value.submittedVersionId??null;
  if(submittedVersionId!==null&&(!versions.some(item=>item.id===submittedVersionId)||!day(value.submittedOn)))return null;
  if(value.sourceKey!=null&&!key(value.sourceKey))return null;
  return {id:value.id,goalId:value.goalId,createdOn:value.createdOn,versions,nextVersionNumber,submittedVersionId,submittedOn:submittedVersionId?value.submittedOn:null,
    ...(value.sourceKey!=null?{sourceKey:value.sourceKey}:{})};
}

function decision(value){
  if(!object(value)||!key(value.goalId)||!allowed(DECISION_KINDS,value.kind)||!day(value.receivedOn)||!day(value.updatedOn)
    ||!allowed(FUNDING_STATES,value.funding)||!allowed(OFFER_CHOICES,value.choice)||!Array.isArray(value.conditions)||value.conditions.length>8)return null;
  if(!['offer','conditional'].includes(value.kind)&&value.choice!=='undecided')return null;
  const responseBy=date(value.responseBy),financeNote=text(value.financeNote,2000),note=text(value.note,2000),sourceUrl=url(value.sourceUrl);
  if(responseBy===undefined||financeNote===null||note===null||sourceUrl===null)return null;
  const conditions=value.conditions.map(item=>{
    if(!object(item)||!key(item.id))return null;
    const body=text(item.text,500),dueOn=date(item.dueOn);
    if(!body||dueOn===undefined||item.doneOn!=null&&!day(item.doneOn))return null;
    return {id:item.id,text:body,dueOn,done:item.done===true,...(item.done===true&&item.doneOn?{doneOn:item.doneOn}:{})};
  });
  if(conditions.includes(null)||!unique(conditions.map(item=>item.id)))return null;
  return {goalId:value.goalId,kind:value.kind,receivedOn:value.receivedOn,responseBy,funding:value.funding,financeNote,choice:value.choice,note,sourceUrl,conditions,updatedOn:value.updatedOn};
}

export function normalizeApplications(value){
  if(!object(value)||value.version!==1||!Array.isArray(value.materials)||!Array.isArray(value.decisions)||value.materials.length>12||value.decisions.length>20)return null;
  const materials=value.materials.map(material),decisions=value.decisions.map(decision);
  if(materials.includes(null)||decisions.includes(null)||!unique(materials.map(item=>item.id))||!unique(decisions.map(item=>item.goalId)))return null;
  if(!unique(materials.filter(item=>item.sourceKey).map(item=>JSON.stringify([item.goalId,item.sourceKey]))))return null;
  const next={version:1,materials,decisions};
  return new TextEncoder().encode(JSON.stringify(next)).length<=200000?next:null;
}
export const applicationsOf=state=>normalizeApplications(state?.applications)??blank();
const commit=(state,applications)=>{const checked=normalizeApplications(applications);return checked?{...state,applications:checked}:null;};

export function saveMaterialVersion(state,input,today){
  if(!object(input)||!day(today)||!key(input.id)||!key(input.goalId)||!key(input.versionId))return null;
  const applications=applicationsOf(state),old=applications.materials.find(item=>item.id===input.id);
  if(old&&(old.goalId!==input.goalId||old.versions.some(item=>item.id===input.versionId)))return null;
  const ids=input.experienceIds??old?.versions.at(-1).references.map(item=>item.experienceId)??[];
  if(!Array.isArray(ids)||ids.length>3||!unique(ids)||ids.some(id=>!key(id)))return null;
  const portfolio=portfolioOf(state),references=ids.map(id=>{
    const entry=portfolio.experiences.find(item=>item.id===id);
    if(!entry)return old?.versions.at(-1).references.find(item=>item.experienceId===id)??null;
    return {experienceId:id,title:entry.title,role:entry.role,result:entry.result,url:entry.url,
      outcomes:portfolio.outcomes.filter(item=>item.experienceId===id).slice(-4).map(({title,text,url,updatedOn})=>({title,text,url,updatedOn}))};
  });
  if(references.includes(null))return null;
  const saved=version({...input,id:input.versionId,number:old?.nextVersionNumber??1,references,savedOn:today});if(!saved)return null;
  const next=old?{...old,versions:[...old.versions,saved],nextVersionNumber:saved.number+1}:{id:input.id,goalId:input.goalId,createdOn:today,versions:[saved],nextVersionNumber:2,submittedVersionId:null,submittedOn:null,
    ...(input.sourceKey!=null?{sourceKey:input.sourceKey}:{})};
  applications.materials=old?applications.materials.map(item=>item.id===old.id?next:item):[...applications.materials,next];
  return commit(state,applications);
}

export function markMaterialSubmitted(state,id,versionId,today){
  if(!day(today))return null;
  const applications=applicationsOf(state),entry=applications.materials.find(item=>item.id===id);
  if(!entry||versionId!==null&&!entry.versions.some(item=>item.id===versionId))return null;
  entry.submittedVersionId=versionId;entry.submittedOn=versionId?today:null;return commit(state,applications);
}
export function removeMaterialVersion(state,id,versionId){
  const applications=applicationsOf(state),entry=applications.materials.find(item=>item.id===id);
  if(!entry||entry.versions.length<=1||entry.submittedVersionId===versionId||!entry.versions.some(item=>item.id===versionId))return null;
  entry.versions=entry.versions.filter(item=>item.id!==versionId);return commit(state,applications);
}
export function removeMaterial(state,id){
  const applications=applicationsOf(state);applications.materials=applications.materials.filter(item=>item.id!==id);return commit(state,applications);
}
export function saveDecision(state,input,today){
  if(!object(input)||!day(today)||!day(input.receivedOn)||input.receivedOn>today)return null;
  const saved=decision({...input,updatedOn:today});if(!saved)return null;
  const applications=applicationsOf(state);applications.decisions=[...applications.decisions.filter(item=>item.goalId!==saved.goalId),saved];
  const next=commit(state,applications);
  return next?{...next,statuses:{...state.statuses,[saved.goalId]:{status:'answered',since:saved.receivedOn}}}:null;
}
export function toggleOfferCondition(state,goalId,id,today){
  if(!day(today))return null;
  const applications=applicationsOf(state),entry=applications.decisions.find(item=>item.goalId===goalId),condition=entry?.conditions.find(item=>item.id===id);
  if(!condition)return null;
  condition.done=!condition.done;if(condition.done)condition.doneOn=today;else delete condition.doneOn;
  return commit(state,applications);
}
export function removeDecision(state,goalId){
  const applications=applicationsOf(state);applications.decisions=applications.decisions.filter(item=>item.goalId!==goalId);return commit(state,applications);
}
export function applicationActions(state,today){
  if(!day(today))return [];
  return applicationsOf(state).decisions.flatMap(entry=>{
    if(!state.goals?.includes(entry.goalId)||entry.choice==='declined'||entry.kind==='rejected')return [];
    const items=entry.conditions.filter(item=>!item.done).map(item=>({id:item.id,goalId:entry.goalId,title:item.text,dueOn:item.dueOn,type:'condition'}));
    const positive=['offer','conditional'].includes(entry.kind);
    if(entry.choice==='undecided'&&(positive||entry.responseBy))items.push({id:'reply',goalId:entry.goalId,title:positive?'Ответить на предложение':'Ответить программе',dueOn:entry.responseBy,type:'reply'});
    return items.map(item=>({...item,state:!item.dueOn?'date_unknown':item.dueOn<today?'overdue':'upcoming'}));
  }).sort((a,b)=>(a.dueOn??'9999').localeCompare(b.dueOn??'9999')||a.type.localeCompare(b.type));
}
