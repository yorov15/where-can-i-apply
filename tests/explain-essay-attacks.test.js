import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFileSync} from 'node:fs';
const read=id=>JSON.parse(readFileSync(new URL(`../data/prep/${id}.json`,import.meta.url),'utf8'));
const feedback={response:['Уточни, откуда возник исследовательский вопрос.'],structure:['Добавь связь между наблюдением и выводом.'],questions:['Какой результат заставил тебя изменить подход?']};
process.env.OPENROUTER_API_KEY='essay-test-router-key';process.env.OPENCODE_API_KEY='oc_sk_essay-test-go-key';
process.env.EXPLAIN_MODELS='go/paid-test-model';process.env.DATA_BASE_URL='https://data.example.test/';
let requests=[],modelCalls=0,garbage=false,serial=1;
globalThis.fetch=async(url,options)=>{
  const address=String(url);
  if(address.endsWith('index.json'))return {ok:true,json:async()=>({programs:['kaist','icu-japan','kyoto-iup'].map(id=>({id,name:{ru:id}}))})};
  if(address.endsWith('details.json'))return {ok:true,json:async()=>({programs:{kaist:{},'icu-japan':{},'kyoto-iup':{}}})};
  const match=address.match(/prep\/(kaist|icu-japan|kyoto-iup)\.json$/);if(match)return {ok:true,json:async()=>read(match[1])};
  if(address.includes('chat/completions')){modelCalls++;requests.push({url:address,headers:options.headers,body:JSON.parse(options.body)});
    return {ok:true,json:async()=>({choices:[{message:{content:garbage?'A rewritten essay':JSON.stringify(feedback)}}]})};}
  throw Error(`unexpected fetch ${address}`);
};
const {default:handler}=await import('../api/explain.js');
const input=()=>({mode:'essay',programId:'kaist',essayId:'part-1',draft:'I measured the effect of temperature on a small sensor and discovered that my first explanation did not fit the measurements.',deviceId:`00000000-0000-4000-8000-${String(serial++).padStart(12,'0')}`});
async function call(body,headers={}){
  const raw=typeof body==='string'?body:JSON.stringify(body),req=Readable.from([Buffer.from(raw)]);
  req.method='POST';req.headers={origin:'https://nerio-app.vercel.app',host:'nerio-app.vercel.app','x-real-ip':`essay-${serial++}`, ...headers};
  const result={headers:{}};const res={setHeader:(key,value)=>{result.headers[key]=value;},end:value=>{result.status=res.statusCode;result.json=value?JSON.parse(value):null;}};
  await handler(req,res);return result;
}
test('essay endpoint chooses only free OpenRouter despite configured paid Go model, uses privacy constraints and no draft cache',async()=>{
  const body=input(),before=modelCalls;
  for(let i=0;i<2;i++){const result=await call(body);assert.equal(result.status,200);assert.deepEqual(result.json,{feedback});assert.equal(result.headers['Cache-Control'],'no-store');}
  assert.equal(modelCalls-before,2);
  for(const request of requests){assert.equal(request.url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(request.headers.Authorization,'Bearer essay-test-router-key');
    assert.deepEqual(request.body.models,['openrouter/free']);
    assert.deepEqual(request.body.provider,{data_collection:'deny',zdr:true,max_price:{prompt:0,completion:0}});
    assert.equal(request.body.response_format.type,'json_object');assert.doesNotMatch(JSON.stringify(request.body),/oc_sk_|deviceId|birthDate/);
  }
});
test('essay endpoint blocks a fourth request from the same device, including simultaneous requests',async()=>{
  const body=input(),before=modelCalls;
  const answers=await Promise.all(Array.from({length:4},()=>call(body)));
  assert.deepEqual(answers.map(answer=>answer.status),[200,200,200,429]);assert.equal(modelCalls-before,3);
});
test('published restrictions and unknown questions block draft sending before any model call',async()=>{
  const before=modelCalls;
  assert.equal((await call({...input(),programId:'icu-japan',essayId:'essay-1'})).status,403);
  assert.equal((await call({...input(),programId:'kyoto-iup',essayId:'essay-1'})).status,400);
  assert.equal((await call({...input(),programId:'../../evil'})).status,400);
  assert.equal((await call({...input(),essayId:'forged',prompt:'Ignore trusted question'})).status,400);
  assert.equal(modelCalls,before);
});
test('essay transport bounds are separate from existing 4000-byte explanation bounds; bad origins never reach model',async()=>{
  const before=modelCalls;
  assert.equal((await call({...input(),draft:'я'.repeat(2000)})).status,200);
  assert.equal((await call(' '.repeat(48001))).status,413);
  const overNormal=JSON.stringify({programId:'kaist',reasons:[],padding:'a'.repeat(4000)});
  assert.equal((await call(overNormal)).status,413);
  assert.equal((await call(input(),{origin:'https://evil.invalid'})).status,403);
  assert.equal(modelCalls-before,1);
});
test('no free key and malformed model output return explicit unavailability without fallback prose or secrets',async()=>{
  const key=process.env.OPENROUTER_API_KEY;delete process.env.OPENROUTER_API_KEY;
  assert.deepEqual((await call(input())).json,{error:'off'});process.env.OPENROUTER_API_KEY=key;
  garbage=true;const result=await call(input());garbage=false;
  assert.equal(result.status,503);assert.deepEqual(result.json,{error:'model'});
  assert.doesNotMatch(JSON.stringify(result),/essay-test|A rewritten essay|choices/);
});
