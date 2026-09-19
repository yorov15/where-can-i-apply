// Прокси между сайтом и моделью. Единственное место, где живёт ключ API:
// в браузер его отдавать нельзя, поэтому сайт спрашивает эту функцию.
//
// Модель — бесплатная, через OpenRouter: платить за такую маленькую
// задачу незачем. Зависимостей у функции нет, только fetch.
//
// Настройка в Vercel (Settings → Environment Variables):
//   OPENROUTER_API_KEY — обязательно
//   EXPLAIN_MODELS     — модели через запятую, первая основная, остальные
//                        запасные (до девяти); по умолчанию бесплатные.
//                        Когда сайт станет популярным — сюда можно
//                        поставить платную, например deepseek/deepseek-chat
//   ALLOWED_ORIGINS    — адреса сайта через запятую (по умолчанию
//                        https://yorov15.github.io)
//   DATA_BASE_URL      — где лежат data/index.json и details.json (по
//                        умолчанию сайт на GitHub Pages)
//   DAILY_LIMIT        — потолок обращений к модели в сутки на один
//                        экземпляр функции (по умолчанию 40: у бесплатных
//                        моделей OpenRouter свой суточный предел)
import {
  explain, createCache, createLimiter, originAllowed, corsHeaders, parseCompletion, isUsableAnswer, grounded, chunk, callWithFallback, LIMITS,
} from './_explain-core.js';

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

// Одновременные запросы делят одну загрузку.
function loadData() {
  if (live && Date.now() - live.at < DATA_TTL_MS) return live;
  loading ??= fetchData().finally(() => { loading = null; });
  return loading;
}

const cache = createCache();
const inflight = new Map();
const limiter = createLimiter({ daily: Number(process.env.DAILY_LIMIT) || LIMITS.dailyCalls });
// Сайт стоит на GitHub Pages, то есть на другом адресе, чем функция:
// без списка разрешённых адресов браузер запретил бы ему сюда ходить.
const configured = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const allowed = configured.length ? configured : ['https://yorov15.github.io'];

// Порядок: сначала те, что лучше пишут по-русски и не рассуждают вслух.
// Модели пробуются по одной: каждый ответ проверяется (isUsableAnswer), и
// занятая или болтливая модель просто уступает место следующей.
const DEFAULT_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3.8-27b:free',
  'z-ai/glm-5.2:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nex-agi/nex-n2.5-pro:free',
  'deepseek/deepseek-v4-flash-0731:free',
  'openrouter/free',
];
const CONFIGURED = (process.env.EXPLAIN_MODELS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const groups = chunk((CONFIGURED.length ? CONFIGURED : DEFAULT_MODELS).slice(0, 9), 1);

// След обращения: какая модель, за сколько и чем кончилось. Собирается на
// каждый запрос отдельно и отдаётся только тому, кто попросил заголовком
// X-Explain-Trace: нужен, чтобы подбирать порядок моделей по фактам.
async function askGroup(models, { system, user }, timeoutMs, trace) {
  const started = Date.now();
  const note = (result) => trace.push({ model: models[0], ms: Date.now() - started, result });
  try {
    const text = await askOnce(models, { system, user }, timeoutMs);
    note('ok');
    return text;
  } catch (error) {
    note(String(error.message ?? error).slice(0, 60));
    throw error;
  }
}

async function askOnce(models, { system, user }, timeoutMs) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/yorov15/where-can-i-apply',
      'X-Title': 'Kuda ya mogu podat dokumenty',
    },
    body: JSON.stringify({
      models,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 1200,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}`);
  const text = parseCompletion(await res.json());
  // Мусор — та же неудача, что и ошибка сети: идём к следующей модели.
  if (!isUsableAnswer(text)) throw new Error('unusable answer');
  if (!grounded(text, user)) throw new Error('invented contact');
  return text;
}

const callModel = (prompt, trace) => callWithFallback(groups, (group, timeoutMs) => askGroup(group, prompt, timeoutMs, trace), { budgetMs: 44000, perGroupMs: 15000 });

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
  if (Number.isFinite(declared) && declared > LIMITS.bodyBytes) return null;
  const parts = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > LIMITS.bodyBytes) return null;
    parts.push(part);
  }
  return Buffer.concat(parts).toString('utf8');
}

const clientIp = (req) => String(req.headers['x-vercel-forwarded-for'] ?? req.headers['x-real-ip'] ?? req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown').split(',')[0].trim();

async function handle(req, res, cors) {
  if (req.method === 'OPTIONS') return send(res, 204, {}, cors);
  if (req.method !== 'POST') return send(res, 405, { error: 'method' }, cors);
  if (!originAllowed(req.headers.origin, req.headers.host, allowed)) return send(res, 403, { error: 'origin' }, cors);
  if (!process.env.OPENROUTER_API_KEY) return send(res, 503, { error: 'off' }, cors);

  const raw = await readBody(req);
  if (raw === null) return send(res, 413, { error: 'too-big' }, cors);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return send(res, 400, { error: 'bad-request' }, cors);
  }

  const data = await loadData();
  if (!data) return send(res, 503, { error: 'off' }, cors);
  const trace = [];
  const { status, json } = await explain(
    { body, ip: clientIp(req), today: new Date().toISOString().slice(0, 10) },
    { index: data.index, details: data.details, cache, limiter, inflight, callModel: (prompt) => callModel(prompt, trace) },
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
