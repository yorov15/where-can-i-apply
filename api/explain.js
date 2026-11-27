// Прокси между сайтом и моделью. Единственное место, где живёт ключ API:
// в браузер его отдавать нельзя, поэтому сайт спрашивает эту функцию.
//
// Модель — бесплатная, через OpenRouter: платить за такую маленькую
// задачу незачем. Зависимостей у функции нет, только fetch.
//
// Настройка в Vercel (Settings → Environment Variables):
//   OPENCODE_API_KEY   — ключ подписки OpenCode Go (opencode.ai/auth); если
//                        он есть, модели идут сначала через неё
//   OPENROUTER_API_KEY — бесплатные модели OpenRouter; запасной путь. Нужен
//                        хотя бы один из двух ключей
//   EXPLAIN_MODELS     — модели через запятую, первая основная, остальные
//                        запасные (до девяти). Имя вида `go/deepseek-v4-flash`
//                        идёт в OpenCode Go, любое другое — в OpenRouter.
//                        По умолчанию: с ключом Go — одна модель Go, без него — бесплатные OpenRouter
//   ALLOWED_ORIGINS    — адреса сайта через запятую (по умолчанию
//                        https://yorov15.github.io, https://nerio-app.vercel.app и прежний https://kuda-podat.vercel.app)
//   DATA_BASE_URL      — где лежат data/index.json и details.json (по
//                        умолчанию сайт на GitHub Pages)
//   DAILY_LIMIT        — потолок обращений к модели в сутки на один
//                        экземпляр функции (по умолчанию 40: у бесплатных
//                        моделей OpenRouter свой суточный предел)
import {
  explain, createCache, createLimiter, originAllowed, corsHeaders, parseCompletion, isUsableAnswer, grounded, chunk, callWithFallback, LIMITS,
} from './_explain-core.js';
import { reviewEssay,createEssayLimiter,parseEssayFeedback,ESSAY_LIMITS,ESSAY_PUBLIC } from './_essay-core.js';
import { mentorWeek, createDeviceLimiter, MENTOR_LIMITS } from './_mentor-core.js';
import { mentorStep, STEP_LIMITS } from './_step-core.js';

// Данные берутся с живого сайта, а не лежат внутри функции: карточки
// обновляются каждый день, и передеплоить прокси при каждой правке было
// бы незачем. Копия живёт полчаса; если сайт не ответил, а старая копия
// есть, работаем на ней.
const DATA_BASE = (process.env.DATA_BASE_URL || 'https://yorov15.github.io/where-can-i-apply/data/').replace(/\/?$/, '/');
const DATA_TTL_MS = 30 * 60 * 1000;
let live = null;
let loading = null;

async function fetchData() {
  try {
    const get = async (name) => {
      const res = await fetch(`${DATA_BASE}${name}`, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) throw new Error(`${name}: ${res.status}`);
      return res.json();
    };
    const [index, details] = await Promise.all([get('index.json'), get('details.json')]);
    if (!Array.isArray(index.programs) || !details.programs) throw new Error('формат данных');
    live = { at: Date.now(), index, details };
  } catch {
    // Остаётся прошлая копия; следующая попытка через минуту, а не на каждом
    // запросе (иначе каждый ждал бы по 8 секунд).
    if (live) live.at = Date.now() - DATA_TTL_MS + 60_000;
  }
  return live;
}

// Тексты условий лежат теперь по одному файлу на программу, и объяснялка
// спрашивает только ту программу, о которой её спросили: тянуть ради одной
// карточки условия всех — та же ошибка, что и раньше в браузере. Копия
// живёт столько же, сколько копия данных. Не приехало — работаем без
// условий: подсказка выйдет беднее, а отказ человек всё равно получит.
const conditions = new Map();
const essaySpecs = new Map();
async function essaySpecFor(id) {
  const hit=essaySpecs.get(id);
  if(hit&&Date.now()-hit.at<DATA_TTL_MS)return hit.spec;
  try{
    const response=await fetch(`${DATA_BASE}prep/${encodeURIComponent(id)}.json`,{signal:AbortSignal.timeout(8000)});
    if(!response.ok)return null;
    const spec=await response.json();if(!Array.isArray(spec.essays)||!spec.essayPolicy)return null;
    essaySpecs.set(id,{at:Date.now(),spec});return spec;
  }catch{return null;}
}

async function conditionsFor(id) {
  const hit = conditions.get(id);
  if (hit && Date.now() - hit.at < DATA_TTL_MS) return hit.list;
  try {
    const res = await fetch(`${DATA_BASE}conditions/${encodeURIComponent(id)}.json`, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(String(res.status));
    const list = (await res.json()).textConditions ?? [];
    conditions.set(id, { at: Date.now(), list });
    return list;
  } catch {
    return hit ? hit.list : null;
  }
}

// Детали программы вместе с её условиями — то, что раньше лежало в общем
// файле. Чужой id сюда не проходит: неизвестной программы в details нет.
async function withConditions(details, body) {
  const id = body && typeof body.programId === 'string' ? body.programId : null;
  const entry = id ? details.programs?.[id] : null;
  if (!entry) return details;
  const list = await conditionsFor(id);
  return { ...details, programs: { ...details.programs, [id]: { ...entry, textConditions: list ?? [] } } };
}

// Одновременные запросы делят одну загрузку.
function loadData() {
  if (live && Date.now() - live.at < DATA_TTL_MS) return live;
  loading ??= fetchData().finally(() => { loading = null; });
  return loading;
}

const cache = createCache();
const inflight = new Map();
const limiter = createLimiter({ daily: Number(process.env.DAILY_LIMIT) || LIMITS.dailyCalls });
const essayDeviceLimiter=createEssayLimiter();
// Отзыв на эссе считает свои обращения: 10 черновиков экзамена не должны упираться в 6 объяснений на адрес.
const essayLimiter=createLimiter({daily:Number(process.env.ESSAY_DAILY_LIMIT)||ESSAY_LIMITS.daily,perIp:ESSAY_LIMITS.perIp});
// Наставник считает свои обращения отдельно, чтобы не съедать объяснялку и наоборот.
const mentorLimiter = createLimiter({ daily: Number(process.env.MENTOR_DAILY_LIMIT) || MENTOR_LIMITS.daily, perIp: MENTOR_LIMITS.perIp });
const mentorDevices = createDeviceLimiter();
const mentorCache = createCache({ max: 300 });
// Наставник у шага маршрута (М2): тот же суточный счёт и кэш, свой счёт на устройство.
const stepDevices = createDeviceLimiter({ perDay: STEP_LIMITS.perDevice });
// Сайт стоит на GitHub Pages, то есть на другом адресе, чем функция:
// без списка разрешённых адресов браузер запретил бы ему сюда ходить.
const configured = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const allowed = configured.length ? configured : ['https://yorov15.github.io', 'https://nerio-app.vercel.app', 'https://kuda-podat.vercel.app'];

// Порядок: сначала те, что лучше пишут по-русски и не рассуждают вслух.
// Модели пробуются по одной: каждый ответ проверяется (isUsableAnswer), и
// занятая или болтливая модель просто уступает место следующей.
// По решению Мурода (04.10.2026) при ключе Go работает одна модель: deepseek-v4.1-flash
// ответила за 3 с, её рассуждения приходят отдельным полем, а не в тексте.
const GO_MODELS = ['go/deepseek-v4.1-flash'];
const FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3.8-27b:free',
  'poolside/laguna-s-2.1:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'apodex/apodex-1.1-mini:free',
  'openrouter/free',
];
const CONFIGURED = (process.env.EXPLAIN_MODELS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
// Без ключа поставщика его модели не пробуем: иначе каждая тратила бы
// попытку на заведомый отказ.
// Ключи Go начинаются с oc_sk_. Если такой ключ лежит не в той переменной
// (04.10.2026 он попал в OPENROUTER_API_KEY и OpenRouter ответил 401 на всё),
// берём его как ключ Go, а в OpenRouter не отправляем.
const isGoKey = (key) => typeof key === 'string' && key.startsWith('oc_sk_');
const goKey = () => [process.env.OPENCODE_API_KEY, process.env.OPENROUTER_API_KEY].find(isGoKey) ?? '';
const routerKey = () => (isGoKey(process.env.OPENROUTER_API_KEY) ? '' : process.env.OPENROUTER_API_KEY ?? '');
// Эссе (решение 27.11.2026): при ключе Go — только go/deepseek-v4.1-flash. В таблице
// приватности Go (opencode.ai/docs/go) у неё 0 дней хранения, а поставщики, которые
// учатся на запросах, там выключены по умолчанию. EXPLAIN_MODELS эссе не меняет: другую
// модель — только правкой здесь и новым экзаменом. Без ключа Go — бесплатная модель
// OpenRouter с запретом хранения и сбора данных (provider в askOnce), иначе выключено.
// У Go две попытки той же модели: если самопроверка забраковала первый ответ,
// на второй хватает времени (один отзыв — около 10 с).
const essayModels = () => (goKey() ? [['go/deepseek-v4.1-flash'], ['go/deepseek-v4.1-flash']] : routerKey() ? [['openrouter/free']] : []);
// Режим работает при любой модели (для экзамена); людям его предлагает только essay-status,
// и только с Go: экран перед отправкой говорит человеку, что черновик уйдёт в OpenCode Go.
const essayOffered = () => (ESSAY_PUBLIC || process.env.ESSAY_REVIEW_ENABLED === '1') && Boolean(goKey());
const usable = (name) => (name.startsWith('go/') ? Boolean(goKey()) : Boolean(routerKey()));
const pickModels = () => (CONFIGURED.length ? CONFIGURED : goKey() ? GO_MODELS : FREE_MODELS).filter(usable).slice(0, 9);
const modelGroups = () => chunk(pickModels(), 1);

// След обращения: какая модель, за сколько и чем кончилось. Собирается на
// каждый запрос отдельно и отдаётся только тому, кто попросил заголовком
// X-Explain-Trace: нужен, чтобы подбирать порядок моделей по фактам.
async function askGroup(models, prompt, timeoutMs, trace) {
  const started = Date.now();
  const note = (result) => trace.push({ model: models[0], ms: Date.now() - started, result });
  try {
    const text = await askOnce(models, prompt, timeoutMs);
    note('ok');
    return text;
  } catch (error) {
    note(String(error.message ?? error).slice(0, 60));
    throw error;
  }
}

async function askOnce(models, { system, user, mode, check }, timeoutMs) {
  const json = mode === 'essay' || mode === 'mentor-week' || mode === 'mentor-step';
  // Подписка Go отвечает по тому же протоколу, но берёт одну модель за запрос.
  const go = models[0].startsWith('go/');
  const res = await fetch(go ? 'https://opencode.ai/zen/go/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${go ? goKey() : routerKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/yorov15/where-can-i-apply',
      'X-Title': 'Nerio',
      // Go требует свой user-agent и номер сессии: без них отвечает 400.
      ...(go ? { 'User-Agent': 'nerio-explainer/1.0', 'x-opencode-session': crypto.randomUUID() } : {}),
    },
    body: JSON.stringify({
      ...(go ? { model: models[0].slice(3) } : { models }),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      // Эссе: девять пунктов по-русски плюс запас, если рассуждения модели считаются в предел.
      max_tokens: mode==='essay'?3000:mode==='mentor-week'?3000:mode==='mentor-step'?1500:1200,
      temperature: 0.3,
      // Блок provider понимает только OpenRouter; Go получает модель без него.
      ...(mode==='essay'&&!go?{provider:{data_collection:'deny',zdr:true,max_price:{prompt:0,completion:0}}}:{}),
      ...(json?{response_format:{type:'json_object'}}:{}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${go ? 'go' : 'openrouter'} ${res.status}`);
  const text = parseCompletion(await res.json());
  // Мусор — та же неудача, что и ошибка сети: идём к следующей модели.
  // У наставника своя строгая проверка: чужое дело, чужая дата или число — та же неудача.
  if (check ? !check(text) : mode==='essay'?!parseEssayFeedback(text):!isUsableAnswer(text)) throw new Error('unusable answer');
  if (!json&&!grounded(text, user)) throw new Error('invented contact');
  return text;
}

const callModel = (prompt, trace) => callWithFallback(modelGroups(), (group, timeoutMs) => askGroup(group, prompt, timeoutMs, trace), { budgetMs: 30000, perGroupMs: 9000 });
// Наставник пишет план на всю неделю (до 8 дел): модели нужно 6–30 секунд; функция живёт до 50 (vercel.json).
const callMentorModel = (prompt, trace) => callWithFallback(modelGroups(), (group, timeoutMs) => askGroup(group, prompt, timeoutMs, trace), { budgetMs: 44000, perGroupMs: 42000 });
// Модель для эссе выбирает essayModels(), а не EXPLAIN_MODELS. Go читает черновик до
// 1500 знаков и пишет девять пунктов: как у недели, ждём до 42 с из 50 (vercel.json).
// Бесплатный OpenRouter — прежние 28 с. Ограничения приватности при сбое не ослабляются.
const callEssayModel = (prompt, trace) => {
  const groups = essayModels(), go = groups[0]?.[0]?.startsWith('go/');
  return callWithFallback(groups, (group, timeoutMs) => askGroup(group, prompt, timeoutMs, trace),
    go ? { budgetMs: 44000, perGroupMs: 30000 } : { budgetMs: 30000, perGroupMs: 28000 });
};

function send(res, status, json, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(json));
}

// Тело читаем сами и с потолком: чужой запрос на мегабайты не должен
// доходить до разбора. Считаем байты, а не символы.
async function readBody(req) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > ESSAY_LIMITS.bodyBytes) return null;
  const parts = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > ESSAY_LIMITS.bodyBytes) return null;
    parts.push(part);
  }
  return Buffer.concat(parts).toString('utf8');
}

const clientIp = (req) => String(req.headers['x-vercel-forwarded-for'] ?? req.headers['x-real-ip'] ?? req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown').split(',')[0].trim();

async function handle(req, res, cors) {
  if (req.method === 'OPTIONS') return send(res, 204, {}, cors);
  if (req.method !== 'POST') return send(res, 405, { error: 'method' }, cors);
  if (!originAllowed(req.headers.origin, req.headers.host, allowed)) return send(res, 403, { error: 'origin' }, cors);

  const raw = await readBody(req);
  if (raw === null) return send(res, 413, { error: 'too-big' }, cors);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return send(res,Buffer.byteLength(raw)>LIMITS.bodyBytes?413:400,{error:Buffer.byteLength(raw)>LIMITS.bodyBytes?'too-big':'bad-request'},cors);
  }
  const cap=body?.mode==='mentor-week'?MENTOR_LIMITS.bodyBytes:body?.mode==='mentor-step'?STEP_LIMITS.bodyBytes:LIMITS.bodyBytes;
  if(body?.mode!=='essay'&&Math.max(Buffer.byteLength(raw),Number(req.headers['content-length'])||0)>cap)return send(res,413,{error:'too-big'},cors);
  if(body?.mode==='essay-status'){
    if(Object.keys(body).length!==1)return send(res,400,{error:'bad-request'},cors);
    return send(res,200,{available:essayOffered()},cors);
  }
  if(body?.mode!=='essay'&&!pickModels().length)return send(res,503,{error:'off'},cors);
  if(body?.mode==='mentor-week'){
    const trace=[];
    const result=await mentorWeek({body,ip:clientIp(req),today:new Date().toISOString().slice(0,10)},
      {limiter:mentorLimiter,deviceLimiter:mentorDevices,cache:mentorCache,callModel:prompt=>callMentorModel(prompt,trace),onReject:reason=>trace.push({reject:reason})});
    return send(res,result.status,req.headers['x-explain-trace']==='1'?{...result.json,trace}:result.json,cors);
  }
  if(body?.mode==='mentor-step'){
    const trace=[];
    const result=await mentorStep({body,ip:clientIp(req)},
      {limiter:mentorLimiter,deviceLimiter:stepDevices,cache:mentorCache,callModel:prompt=>callMentorModel(prompt,trace),onReject:reason=>trace.push({reject:reason})});
    return send(res,result.status,req.headers['x-explain-trace']==='1'?{...result.json,trace}:result.json,cors);
  }

  const data = await loadData();
  if (!data) return send(res, 503, { error: 'off' }, cors);
  const trace = [];
  if(body?.mode==='essay'){
    const program=typeof body.programId==='string'?data.index.programs.find(item=>item.id===body.programId):null;
    const spec=program?await essaySpecFor(program.id):null;
    const result=await reviewEssay({body,ip:clientIp(req)},{program,spec,limiter:essayLimiter,deviceLimiter:essayDeviceLimiter,
      available:essayModels().length>0,callModel:prompt=>callEssayModel(prompt,trace),onReject:reason=>trace.push({reject:reason})});
    // След (модель, время, почему отбракован ответ) — только по заголовку, для экзамена tools/essay-exam.mjs.
    return send(res,result.status,req.headers['x-explain-trace']==='1'?{...result.json,trace}:result.json,cors);
  }
  const { status, json } = await explain(
    { body, ip: clientIp(req), today: new Date().toISOString().slice(0, 10) },
    { index: data.index, details: await withConditions(data.details, body), cache, limiter, inflight, callModel: (prompt) => callModel(prompt, trace) },
  );
  return send(res, status, req.headers['x-explain-trace'] === '1' ? { ...json, trace } : json, cors);
}

// Ни один сбой не должен уронить функцию: наружу всегда уходит JSON.
export default async function handler(req, res) {
  const cors = corsHeaders(req.headers.origin, allowed);
  try {
    await handle(req, res, cors);
  } catch {
    if (!res.headersSent) send(res, 500, { error: 'internal' }, cors);
    else res.end();
  }
}
