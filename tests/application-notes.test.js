import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRouteState, saveRouteState, exportState, importState, clearProgress } from '../js/route-state.js';
import { applicationNotesOf, normalizeApplicationNotes, saveStory, removeStory, saveSchool, schoolText, storyText } from '../js/application-notes.js';
import { saveExperience, removeExperience } from '../js/portfolio.js';
const day='2026-11-05',empty=()=>loadRouteState();
const entry={id:'first',prompt:'mistake',title:'Исправили протечку',context:'После дождя',actions:'Вместе проверили крышу',result:'Протечка устранена',lesson:'Проверять причину до ремонта',useFor:'Вопрос о работе в команде'};
test('личные факты переживают хранение, экспорт, импорт и сброс учебных галочек',()=>{
  const state=saveSchool(saveStory(empty(),entry,day),{name:'Школа 12',years:'11',scale:'От 1 до 5, проходная 3',classSize:'40',graduation:'2027-06-15'},day);
  const original=JSON.stringify(state),store=new Map();
  assert.ok(saveRouteState(state,{setItem:(key,value)=>store.set(key,value)}));
  assert.deepEqual(applicationNotesOf(loadRouteState({getItem:key=>store.get(key)})),state.applicationNotes);
  assert.deepEqual(importState(exportState(state)),state);
  assert.deepEqual(clearProgress(state).applicationNotes,state.applicationNotes);
  assert.equal(JSON.stringify(state),original);
  const changed=saveStory(state,{...entry,result:'Проверили после второго дождя'},'2026-11-06');
  assert.equal(changed.applicationNotes.stories[0].createdOn,day);
  assert.equal(changed.applicationNotes.stories[0].updatedOn,'2026-11-06');
  assert.equal(state.applicationNotes.stories[0].result,entry.result);
});
test('школа допускает неполные данные; неизвестное и исходная шкала не превращаются в оценки',()=>{
  const state=saveSchool(empty(),{scale:'От 1 до 5, проходная 3',rank:'Школа не рассчитывает'},day);
  const text=schoolText(state.applicationNotes.school);
  assert.match(text,/От 1 до 5, проходная 3/);assert.match(text,/Student-prepared draft/);
  assert.doesNotMatch(text,/4\.0|GPA|Graduation date\n/);
  assert.equal(applicationNotesOf(saveSchool(state,{},day)).school,undefined);
  for(const bad of [{years:'0'},{years:'21'},{classSize:'-2'},{classSize:'1.5'},{graduation:'2027-02-30'},{contact:42}])assert.equal(saveSchool(state,bad,day),null);
});
test('импорт отклоняет повреждённые личные записи целиком, не теряя их молча',()=>{
  const valid=saveStory(empty(),entry,day);
  for(const change of [notes=>notes.version=2,notes=>notes.stories.push(notes.stories[0]),notes=>notes.stories[0].actions=42,
    notes=>notes.stories[0].title='x'.repeat(161),notes=>notes.stories[0].id='__proto__',notes=>notes.stories[0].updatedOn='2026-02-31']) {
    const bad=structuredClone(valid);change(bad.applicationNotes);assert.equal(importState(JSON.stringify(bad)),null);
  }
  let state=empty();for(let i=0;i<20;i++)state=saveStory(state,{...entry,id:`story-${i}`},day);
  assert.equal(saveStory(state,{...entry,id:'21'},day),null);
  assert.ok(saveStory(state,{...entry,id:'story-0'},day));
  assert.equal(normalizeApplicationNotes({version:1,stories:'wrong'}),null);
});
test('история из опыта остаётся самостоятельным снимком после изменения или удаления работы',()=>{
  let state=saveExperience(empty(),{id:'work',title:'Инициатива',kind:'community',actions:'Посадили деревья',goals:[]},day);
  state=saveStory(state,{...entry,experienceTitle:'Инициатива'},day);
  state=removeExperience(state,'work');
  assert.match(storyText(applicationNotesOf(state).stories[0]),/Из записи опыта: Инициатива/);
  assert.equal(applicationNotesOf(state).stories[0].actions,entry.actions);
  const removed=removeStory(state,'first');assert.equal(applicationNotesOf(removed).stories.length,0);
  assert.equal(applicationNotesOf(state).stories.length,1);
});
test('отказ хранилища не выдаётся за сохранение; старые файлы остаются прежними',()=>{
  const state=saveStory(empty(),entry,day);
  assert.equal(saveRouteState(state,{setItem:()=>{throw Error('QuotaExceededError');}}),false);
  assert.deepEqual(importState(exportState(empty())),empty());
  assert.equal(Object.hasOwn(importState(exportState(empty())),'applicationNotes'),false);
});
