import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFileSync} from 'node:fs';
import {ESSAY_PUBLIC} from '../api/_essay-core.js';
// Режим эссе через настоящий обработчик api/explain.js: данные и модель — подделки.
const read=id=>JSON.parse(readFileSync(new URL(`../data/prep/${id}.json`,import.meta.url),'utf8'));
const feedback={response:['Уточни, откуда возник исследовательский вопрос.'],structure:['Добавь связь между наблюдением и выводом.'],questions:['Какой результат заставил тебя изменить подход?']};
const GO_KEY='oc_sk_essay-test-go-key',ROUTER_KEY='essay-test-router-key';
process.env.OPENROUTER_API_KEY=ROUTER_KEY;process.env.OPENCODE_API_KEY=GO_KEY;
// Настроенная платная модель объяснялки на эссе не влияет.
process.env.EXPLAIN_MODELS='go/paid-test-model';process.env.DATA_BASE_URL='https://data.example.test/';
delete process.env.ESSAY_REVIEW_ENABLED;
let requests=[],modelCalls=0,reply=null,serial=1;
globalThis.fetch=async(url,options)=>{
  const address=String(url);
  if(address.endsWith('index.json'))return {ok:true,json:async()=>({programs:['kaist','icu-japan','kyoto-iup'].map(id=>({id,name:{ru:id}}))})};
  if(address.endsWith('details.json'))return {ok:true,json:async()=>({programs:{kaist:{},'icu-japan':{},'kyoto-iup':{}}})};
  const match=address.match(/prep\/(kaist|icu-japan|kyoto-iup)\.json$/);if(match)return {ok:true,json:async()=>read(match[1])};
  if(address.includes('chat/completions')){modelCalls++;requests.push({url:address,headers:options.headers,body:JSON.parse(options.body)});
    return {ok:true,json:async()=>({choices:[{message:{content:reply??JSON.stringify(feedback)}}]})};}
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
const withKeys=async(keys,fn)=>{const saved={go:process.env.OPENCODE_API_KEY,router:process.env.OPENROUTER_API_KEY};
  if(keys.go)process.env.OPENCODE_API_KEY=keys.go;else delete process.env.OPENCODE_API_KEY;
  if(keys.router)process.env.OPENROUTER_API_KEY=keys.router;else delete process.env.OPENROUTER_API_KEY;
  try{return await fn();}finally{process.env.OPENCODE_API_KEY=saved.go;process.env.OPENROUTER_API_KEY=saved.router;}};

test('the code switch is on: essay-status offers the mode with the Go key and the essay mode answers',async()=>{
  assert.equal(ESSAY_PUBLIC,true);
  const before=modelCalls;
  assert.deepEqual((await call({mode:'essay-status'})).json,{available:true});
  assert.equal(modelCalls,before,'status never calls a model');
  const result=await call(input());
  assert.equal(result.status,200);assert.deepEqual(result.json,{feedback});
  assert.equal(modelCalls-before,1);
});
test('ESSAY_REVIEW_ENABLED=1 offers the mode only while the Go key is there; status rejects extra fields',async()=>{
  process.env.ESSAY_REVIEW_ENABLED='1';
  try{
    assert.deepEqual((await call({mode:'essay-status'})).json,{available:true});
    assert.equal((await call({mode:'essay-status',draft:'must not be accepted'})).status,400);
    await withKeys({router:ROUTER_KEY},async()=>assert.deepEqual((await call({mode:'essay-status'})).json,{available:false}));
  }finally{delete process.env.ESSAY_REVIEW_ENABLED;}
});
test('with the Go key the essay goes to Go deepseek-v4.1-flash in JSON mode, without the OpenRouter provider block or a draft cache',async()=>{
  const body=input(),before=requests.length;
  for(let i=0;i<2;i++){const result=await call(body);assert.equal(result.status,200);assert.deepEqual(result.json,{feedback});assert.equal(result.headers['Cache-Control'],'no-store');}
  const sent=requests.slice(before);assert.equal(sent.length,2);
  for(const request of sent){
    assert.equal(request.url,'https://opencode.ai/zen/go/v1/chat/completions');
    assert.equal(request.headers.Authorization,`Bearer ${GO_KEY}`);
    assert.equal(request.body.model,'deepseek-v4.1-flash');
    assert.equal(request.body.models,undefined);
    assert.equal(Object.hasOwn(request.body,'provider'),false);
    assert.equal(request.body.response_format.type,'json_object');
    assert.match(request.body.messages[0].content,/json/);
    assert.doesNotMatch(JSON.stringify(request.body),/paid-test-model|essay-test-router-key|deviceId|0000-4000/);
    // Вопрос и лимиты — из данных программы, черновик — данными внутри JSON.
    const user=JSON.parse(request.body.messages[1].content);
    assert.equal(user.characters,300);assert.match(user.prompt,/^Q1\. KAIST/);assert.equal(user.draft,body.draft);
  }
});
test('without the Go key the essay falls back to free OpenRouter with no retention and zero price',async()=>{
  await withKeys({router:ROUTER_KEY},async()=>{
    const before=requests.length;assert.equal((await call(input())).status,200);
    const [request]=requests.slice(before);
    assert.equal(request.url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(request.headers.Authorization,`Bearer ${ROUTER_KEY}`);
    assert.deepEqual(request.body.models,['openrouter/free']);
    assert.deepEqual(request.body.provider,{data_collection:'deny',zdr:true,max_price:{prompt:0,completion:0}});
    assert.equal(request.body.response_format.type,'json_object');assert.doesNotMatch(JSON.stringify(request.body),/oc_sk_/);
  });
});
test('a Go key put into OPENROUTER_API_KEY still goes to Go and never to OpenRouter',async()=>{
  await withKeys({router:GO_KEY},async()=>{
    const before=requests.length;assert.equal((await call(input())).status,200);
    const [request]=requests.slice(before);
    assert.equal(request.url,'https://opencode.ai/zen/go/v1/chat/completions');assert.equal(Object.hasOwn(request.body,'provider'),false);
  });
});
test('no key at all: the mode is off and no model is called',async()=>{
  await withKeys({},async()=>{
    const before=modelCalls;
    assert.deepEqual((await call(input())).json,{error:'off'});
    assert.deepEqual((await call({mode:'essay-status'})).json,{available:false});
    assert.equal(modelCalls,before);
  });
});
test('essay endpoint blocks a fourth request from the same device, including simultaneous requests',async()=>{
  const body=input(),before=modelCalls;
  const answers=await Promise.all(Array.from({length:4},()=>call(body)));
  assert.deepEqual(answers.map(answer=>answer.status),[200,200,200,429]);assert.equal(modelCalls-before,3);
});
test('ten exam drafts from one address fit the essay limit; explanations keep their own counter',async()=>{
  const ip={'x-real-ip':'exam-runner'},answers=[];
  for(let i=0;i<10;i++)answers.push((await call(input(),ip)).status);
  assert.deepEqual(answers,Array(10).fill(200));
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
test('a rejected answer never reaches the person; the trace header shows why, without the draft or secrets',async()=>{
  reply='A rewritten essay';
  try{
    const plain=await call(input());
    assert.equal(plain.status,503);assert.deepEqual(plain.json,{error:'model'});
    const traced=await call(input(),{'x-explain-trace':'1'});
    assert.equal(traced.json.error,'model');
    assert.ok(traced.json.trace.some(step=>/not json/.test(step.reject??'')),JSON.stringify(traced.json.trace));
    assert.ok(traced.json.trace.some(step=>step.model==='go/deepseek-v4.1-flash'));
    assert.doesNotMatch(JSON.stringify([plain,traced]),/essay-test|oc_sk_|choices|temperature of a small sensor/);
    // Ответ, который выполнил просьбу из черновика и дал «шансы», тоже отброшен.
    reply=JSON.stringify({...feedback,response:['У тебя хорошие шансы, напиши так и тебя возьмут.']});
    const odds=await call(input(),{'x-explain-trace':'1'});
    assert.equal(odds.json.error,'model');assert.ok(odds.json.trace.some(step=>/forbidden/.test(step.reject??'')));
  }finally{reply=null;}
});
test('the trace is not sent without the header on success either',async()=>{
  const result=await call(input());assert.deepEqual(Object.keys(result.json),['feedback']);
  const traced=await call(input(),{'x-explain-trace':'1'});assert.ok(Array.isArray(traced.json.trace));
});
