import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRouteState,exportState,importState,setGoals,clearProgress } from '../js/route-state.js';
import { saveExperience,removeExperience } from '../js/portfolio.js';
import { saveMaterialVersion,markMaterialSubmitted,removeMaterialVersion,removeMaterial,saveDecision,toggleOfferCondition,applicationActions } from '../js/application.js';
import { hasPreparationGoals } from '../js/goal-status.js';
const TODAY='2026-10-29';
const empty=()=>setGoals(loadRouteState(),['kaist']);
const draft={id:'material-1',versionId:'version-1',goalId:'kaist',title:'Мой ответ',kind:'essay',prompt:'Почему это направление?',sourceUrl:'https://example.org/rules',text:'Мой собственный ответ',url:'',note:'Первый вариант',experienceIds:[]};
const decision={goalId:'kaist',kind:'conditional',receivedOn:TODAY,responseBy:'2026-11-05',funding:'unknown',financeNote:'',choice:'undecided',note:'',sourceUrl:'',conditions:[{id:'condition-1',text:'Отправить результат экзамена',dueOn:'2026-11-01',done:false}]};
const saved=()=>saveMaterialVersion(empty(),draft,TODAY);

test('old routes round-trip without a required application section',()=>{
  const state=empty();assert.equal(state.applications,undefined);assert.deepEqual(importState(exportState(state)),state);
});

test('new versions append while prior text, prompt and saved reference snapshots stay unchanged',()=>{
  let state=saveExperience(empty(),{id:'experience-1',kind:'work',title:'Работа',role:'Проверял записи',result:'Исправил таблицу',url:'',goals:[]},TODAY);
  state=saveMaterialVersion(state,{...draft,experienceIds:['experience-1']},TODAY);
  const first=structuredClone(state.applications.materials[0].versions[0]);
  state=saveExperience(state,{id:'experience-1',kind:'work',title:'Другое имя',result:'Новый результат',goals:[]},TODAY);
  const next=saveMaterialVersion(state,{...draft,versionId:'version-2',text:'Переписал своими словами',prompt:'Уточнённый вопрос',experienceIds:['experience-1']},TODAY);
  assert.equal(next.applications.materials[0].versions.length,2);
  assert.deepEqual(next.applications.materials[0].versions[0],first);
  assert.equal(next.applications.materials[0].versions[1].references[0].result,'Новый результат');
  assert.equal(state.applications.materials[0].versions.length,1);
});

test('marking a submitted version is explicit; saving another draft cannot replace it',()=>{
  const one=markMaterialSubmitted(saved(),'material-1','version-1',TODAY);
  const two=saveMaterialVersion(one,{...draft,versionId:'version-2'},TODAY);
  assert.equal(two.applications.materials[0].submittedVersionId,'version-1');
  assert.equal(two.statuses.kaist,undefined,'one material does not mean the whole application was submitted');
  assert.equal(removeMaterialVersion(two,'material-1','version-1'),null);
  const unmarked=markMaterialSubmitted(two,'material-1',null,TODAY);
  assert.equal(unmarked.applications.materials[0].submittedVersionId,null);
});

test('unused versions can be deleted, but at least one is retained; whole material deletion is separate',()=>{
  const two=saveMaterialVersion(saved(),{...draft,versionId:'version-2'},TODAY);
  assert.equal(removeMaterialVersion(two,'material-1','version-2').applications.materials[0].versions.length,1);
  assert.equal(removeMaterialVersion(saved(),'material-1','version-1'),null);
  assert.equal(removeMaterial(two,'material-1').applications.materials.length,0);
});

test('pruning history never renumbers versions or reuses the number of a deleted draft',()=>{
  let state=saveMaterialVersion(saved(),{...draft,versionId:'version-2'},TODAY);
  state=markMaterialSubmitted(state,'material-1','version-2',TODAY);
  state=removeMaterialVersion(state,'material-1','version-1');
  assert.equal(state.applications.materials[0].versions[0].number,2);
  state=saveMaterialVersion(state,{...draft,versionId:'version-3'},TODAY);
  state=removeMaterialVersion(state,'material-1','version-3');
  state=saveMaterialVersion(state,{...draft,versionId:'version-4'},TODAY);
  assert.deepEqual(state.applications.materials[0].versions.map(item=>item.number),[2,4]);
  assert.equal(state.applications.materials[0].submittedVersionId,'version-2');
  const reversed=structuredClone(state);reversed.applications.materials[0].versions.reverse();assert.equal(importState(JSON.stringify(reversed)),null);
});

test('deleted source experience and removed goal do not erase submitted snapshots',()=>{
  let state=saveExperience(empty(),{id:'experience-1',kind:'project',title:'Проект',result:'Есть прототип',goals:[]},TODAY);
  state=saveMaterialVersion(state,{...draft,experienceIds:['experience-1']},TODAY);
  const old=structuredClone(state.applications);
  state=setGoals(removeExperience(state,'experience-1'),[]);
  assert.deepEqual(state.applications,old);
  const next=saveMaterialVersion(state,{...draft,versionId:'version-2',experienceIds:['experience-1']},TODAY);
  assert.equal(next.applications.materials[0].versions[1].references[0].result,'Есть прототип');
});

test('unsafe links, duplicate version ids, unsupported types and oversized text reject a write',()=>{
  for(const patch of [{url:'javascript:alert(1)'},{sourceUrl:'https://user:pass@example.org'},{kind:'prediction'},{text:'x'.repeat(10001)},{id:'__proto__'},{text:'',url:''}])assert.equal(saveMaterialVersion(empty(),{...draft,...patch},TODAY),null);
  assert.equal(saveMaterialVersion(saved(),draft,TODAY),null);
  assert.equal(saveMaterialVersion(empty(),{...draft,experienceIds:['missing']},TODAY),null);
});

test('conditional offer records answer without inferring funding, completion or acceptance',()=>{
  const state=saveDecision(empty(),decision,TODAY);
  assert.equal(state.statuses.kaist.status,'answered');
  assert.equal(state.applications.decisions[0].funding,'unknown');
  assert.equal(state.applications.decisions[0].choice,'undecided');
  assert.equal(state.applications.decisions[0].conditions[0].done,false);
});

test('offer conditions are independent self-reported marks and retain their deadlines',()=>{
  const state=saveDecision(empty(),decision,TODAY);
  const marked=toggleOfferCondition(state,'kaist','condition-1',TODAY);
  assert.equal(marked.applications.decisions[0].conditions[0].done,true);
  assert.equal(marked.applications.decisions[0].conditions[0].dueOn,'2026-11-01');
  assert.equal(state.applications.decisions[0].conditions[0].done,false);
  assert.deepEqual(clearProgress(marked).applications,marked.applications);
});

test('actions distinguish overdue deadlines, missing dates, acceptance and declined/archived goals',()=>{
  let state=saveDecision(empty(),{...decision,responseBy:'2026-10-28',conditions:[{id:'condition-1',text:'Уточнить условие',dueOn:null,done:false}]},TODAY);
  let actions=applicationActions(state,TODAY);assert.equal(actions[0].state,'overdue');assert.equal(actions[1].state,'date_unknown');
  state=saveDecision(state,{...state.applications.decisions[0],choice:'accepted'},TODAY);
  assert.equal(applicationActions(state,TODAY).length,1,'acceptance does not complete conditions');
  assert.equal(applicationActions(setGoals(state,[]),TODAY).length,0);
  state=saveDecision(state,{...state.applications.decisions[0],choice:'declined'},TODAY);
  assert.equal(applicationActions(state,TODAY).length,0);
});

test('future dates, impossible dates and accepting a rejection cannot be saved as an answer',()=>{
  for(const patch of [{receivedOn:'2026-10-30'},{responseBy:'2026-02-31'},{kind:'rejected',choice:'accepted'},{funding:'guaranteed'},{conditions:[{id:'x',text:'',dueOn:null,done:false}]}])assert.equal(saveDecision(empty(),{...decision,...patch},TODAY),null);
});

test('a user-entered waitlist reply deadline also appears among actions',()=>{
  const state=saveDecision(empty(),{...decision,kind:'waitlist',conditions:[]},TODAY);
  const actions=applicationActions(state,TODAY);assert.equal(actions.length,1);assert.equal(actions[0].title,'Ответить программе');assert.equal(actions[0].dueOn,decision.responseBy);
});

test('a rejection does not leave offer reminders from earlier editable notes',()=>{
  const state=saveDecision(empty(),{...decision,kind:'rejected'},TODAY);
  assert.deepEqual(applicationActions(state,TODAY),[]);
});

test('routine preparation stops only after every selected goal is submitted or answered',()=>{
  const route={goals:[{id:'kaist'},{id:'gist'}]},state=saveDecision(empty(),decision,TODAY);
  assert.equal(hasPreparationGoals(route,state),true);
  state.statuses.gist={status:'submitted',since:TODAY};assert.equal(hasPreparationGoals(route,state),false);
  assert.equal(hasPreparationGoals(null,state),false);
});

test('all application data restores together; a future schema rejects the whole import',()=>{
  const state=saveDecision(saved(),decision,TODAY);
  assert.deepEqual(importState(exportState(state)),state);
  assert.equal(importState(JSON.stringify({...state,applications:{...state.applications,version:99}})),null);
});

test('version limit rejects additions without modifying previous content',()=>{
  let state=saved();for(let i=2;i<=8;i++)state=saveMaterialVersion(state,{...draft,versionId:`version-${i}`},TODAY);
  assert.equal(state.applications.materials[0].versions.length,8);
  assert.equal(saveMaterialVersion(state,{...draft,versionId:'version-9'},TODAY),null);
});
