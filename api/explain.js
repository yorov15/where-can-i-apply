// Прокси между сайтом и моделью. Единственное место, где живёт ключ API:
// в браузер его отдавать нельзя, поэтому сайт спрашивает эту функцию.
//
// Модель — бесплатная, через OpenRouter: платить за такую маленькую
// задачу незачем. Зависимостей у функции нет, только fetch.
//
// Настройка в Vercel (Settings → Environment Variables):
//   OPENROUTER_API_KEY — обязательно
//   EXPLAIN_MODELS     — модели через запятую, первая основная, остальные
//                        запасные (до трёх); по умолчанию бесплатные
//   ALLOWED_ORIGINS    — адреса сайта через запятую, если сайт стоит не
//                        там же, где функция (https://имя.github.io)
//   DAILY_LIMIT        — потолок обращений к модели в сутки на один
//                        экземпляр функции (по умолчанию 40: у бесплатных
//                        моделей OpenRouter свой суточный предел)
import fs from 'node:fs';
import {
  explain, createCache, createLimiter, originAllowed, corsHeaders, parseCompletion, LIMITS,
} from './_explain-core.js';

const readJson = (name) => JSON.parse(fs.readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));
const index = readJson('index.json');
const details = readJson('details.json');

const cache = createCache();
const limiter = createLimiter({ daily: Number(process.env.DAILY_LIMIT) || LIMITS.dailyCalls });
const allowed = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

// Порядок: сначала та, что лучше пишет по-русски. Если первая занята или
// отвечает пусто, OpenRouter сам пробует следующую.
const DEFAULT_MODELS = [
  'google/gemma-4-31b-it:free',
  'qwen/qwen3.8-27b:free',
  'deepseek/deepseek-v4-flash-0731:free',
];
const MODELS = (process.env.EXPLAIN_MODELS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const models = (MODELS.length ? MODELS : DEFAULT_MODELS).slice(0, 3);

async function callModel({ system, user }) {
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
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}`);
  return parseCompletion(await res.json());
}

function send(res, status, json, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(json));
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const cors = corsHeaders(origin, allowed);

  if (req.method === 'OPTIONS') return send(res, 204, {}, cors);
  if (req.method !== 'POST') return send(res, 405, { error: 'method' }, cors);
  if (!originAllowed(origin, req.headers.host, allowed)) return send(res, 403, { error: 'origin' }, cors);
  if (!process.env.OPENROUTER_API_KEY) return send(res, 503, { error: 'off' }, cors);

  // Тело читаем сами и с потолком: чужой запрос на мегабайты не должен
  // доходить до разбора.
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > LIMITS.bodyBytes) return send(res, 413, { error: 'too-big' }, cors);
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return send(res, 400, { error: 'bad-request' }, cors);
  }

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown').split(',')[0].trim();
  const today = new Date().toISOString().slice(0, 10);
  const { status, json } = await explain({ body, ip, today }, { index, details, cache, limiter, callModel });
  return send(res, status, json, cors);
}
