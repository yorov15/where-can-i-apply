import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleRoute,routeCalendarEvents } from '../js/agenda.js';
import { buildEventsIcs } from '../js/plan.js';
const today='2026-10-27';
const goal=(id,closes,confidence='confirmed')=>({id,name:id,deadline:{closes,confidence}});
const step=(id,kind,extra={})=>({id,kind,phase:kind==='document'?'docs':kind==='test'?'tests':kind,programIds:['a','b'],members:[{name:'A'},{name:'B'}],title:id,...extra});
const fixture=()=>({goals:[goal('a','2027-01-14'),goal('b','2027-01-23','expected')],steps:[step('doc:transcript','document',{documentCode:'transcript'}),step('test:ielts','test',{track:'ielts'}),step('apply:a','apply',{due:'2027-01-14'})],week:[]});
const plans={'test:ielts':{lastDate:'2027-01-12',booked:'2027-01-10',expectedDeadline:false}};

test('shared documents use the nearest relevant deadline as an explicitly labelled planning target; unknown issuing time stays unknown',()=>{
  const route=scheduleRoute(fixture(),plans,{transcript:{waitDays:null}},today);
  assert.equal(route.steps[0].due,'2027-01-14');
  assert.equal(route.steps[0].dueKind,'planning');
  assert.equal(route.steps[0].startBy,null);
  assert.equal(route.steps[1].due,'2027-01-10');
  assert.equal(route.steps[1].dueKind,'booked');
  assert.equal(route.steps[2].dueKind,'application');
});
test('issuing estimates move only the planning start; unannounced and closed programme dates create no document date',()=>{
  assert.equal(scheduleRoute(fixture(),plans,{transcript:{waitDays:7}},today).steps[0].startBy,'2027-01-07');
  const route=fixture();route.goals=[goal('a',null),goal('b','2026-10-01')];
  assert.equal(scheduleRoute(route,{}, {},today).steps[0].due,null);
});
test('route calendar includes documents, booked exams, exam planning bounds and applications with clear provenance',()=>{
  const route=scheduleRoute(fixture(),plans,{transcript:{waitDays:null}},today);
  const events=routeCalendarEvents(route,plans,{ielts:{name:'IELTS',register:'https://ielts.org'}},{a:'https://example.org'},today);
  assert.equal(events.length,4);
  assert.match(events.find(item=>item.id==='route-doc:transcript').description,/Отдельный срок/);
  assert.ok(events.some(item=>item.date==='2027-01-10'));
  assert.ok(events.some(item=>item.date==='2027-01-12'));
  route.steps[0].done=true;
  assert.equal(routeCalendarEvents(route,plans,{}, {},today).length,3);
});
test('ICS dates, alarms, stable identity, UTF-8 folding and hostile text remain valid',()=>{
  const items=[{id:'logical-id',date:'2026-12-31',title:'Дело, одно; два\rBEGIN:VEVENT',description:'Описание\n'+ 'я'.repeat(100),url:'javascript:alert(1)'}];
  const result=buildEventsIcs(items,today,'20261027T100000Z');
  assert.equal(result.events,1);
  assert.match(result.text,/DTEND;VALUE=DATE:20270101/);
  assert.equal(result.text.match(/BEGIN:VALARM/g).length,2);
  assert.match(result.text,/TRIGGER:-P7D/);assert.match(result.text,/TRIGGER:-P1D/);
  assert.doesNotMatch(result.text,/\r\nURL:/);
  assert.equal(result.text.match(/\r\nBEGIN:VEVENT\r\n/g).length,1);
  for(const line of result.text.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
  const updated=buildEventsIcs([{...items[0],date:'2027-01-03'}],today,'20261028T100000Z');
  assert.equal(result.text.match(/UID:.+/)[0],updated.text.match(/UID:.+/)[0]);
  assert.equal(buildEventsIcs([{id:'bad',date:'2027-02-30'},...items,...items],today,'S').events,1);
});
