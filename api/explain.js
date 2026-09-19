// Прокси между сайтом и Claude. Единственное место, где живёт ключ API:
// в браузер его отдавать нельзя, поэтому сайт спрашивает эту функцию.
//
// Настройка в Vercel (Settings → Environment Variables):
//   ANTHROPIC_API_KEY  — обязательно
//   EXPLAIN_MODEL      — по умолчанию claude-opus-5; для дешёвого
//                        варианта — claude-haiku-4-5
//   ALLOWED_ORIGINS    — адреса сайта через запятую, если сайт стоит не
//                        там же, где функция (https://имя.github.io)
//   DAILY_LIMIT        — потолок обращений к модели в сутки на один
//                        экземпляр функции (по умолчанию 300)
import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { explain, createCache, createLimiter, originAllowed, corsHeaders, LIMITS } from './_explain-core.js';

const readJson = (name) => JSON.parse(fs.readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));
const index = readJson('index.json');
const details = readJson('details.json');

const cache = createCache();
const limiter = createLimiter({ daily: Number(process.env.DAILY_LIMIT) || LIMITS.dailyCalls });
const allowed = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const MODEL = process.env.EXPLAIN_MODEL || 'claude-opus-5';
// Ключ читается из ANTHROPIC_API_KEY самим SDK.
const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });

async function callModel({ system, user }) {
  const params = {
    model: MODEL,
    max_tokens: 1500,
    system,
    messages: [{ role: 'user', content: user }],
  };
  // Глубину рассуждения задаёт только семейство Opus 5; у Haiku таких
  // параметров нет, и лишнее поле дало бы 400.
  if (MODEL.startsWith('claude-opus-5')) {
    params.thinking = { type: 'adaptive' };
    params.output_config = { effort: 'low' };
  }
  const response = await client.messages.create(params);
  if (response.stop_reason === 'refusal') return '';
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
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
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'off' }, cors);

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
