// Экзамен чата с Nero (М4) на живой функции. Берёт 12 вопросов вымышленного
// выпускника (tests/fixtures/chat-exam/cases.json), отправляет каждый в режим
// chat и считает:
//   прошло  — функция вернула ответ, он проходит ту же самопроверку здесь
//             (inspectChatAnswer по фактам из нашей data/) и требования случая
//             (mustMention — что ответ обязан назвать);
//   выдумки — ответ вернулся, но здесь не проходит проверку или содержит то,
//             чего в нём быть не должно (mustNotContain: имя, почта, «шанс»…);
//   отказ   — модель не дала годного ответа, человек увидел бы «Nero не ответил».
// Ответы сохраняются в файл: их читает человек (полезен ли ответ, понятен ли
// выпускнику). Предлагать чат людям (CHAT_PUBLIC или CHAT_ENABLED=1) — только
// после EXAM-OK, см. docs/AI-MENTOR.md, раздел М4.
//
//   node tools/chat-exam.mjs [--url https://nerio-app.vercel.app/api/explain] [--out chat-exam-answers.json] [--min 11]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { chatInput, chatPrograms, chatProgramIds, buildChatInput, inspectChatAnswer, todayIso } from '../api/_chat-core.js';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const url = arg('url', 'https://nerio-app.vercel.app/api/explain');
const out = arg('out', 'chat-exam-answers.json');
const min = Number(arg('min', '11'));
const path = (name) => new URL(name, import.meta.url);
const read = (name) => JSON.parse(readFileSync(path(name), 'utf8'));
const { cases } = read('../tests/fixtures/chat-exam/cases.json');
const data = { index: read('../data/index.json'), details: read('../data/details.json') };

// Тело запроса, как его соберёт сайт.
export function caseBody(item, deviceId = randomUUID()) {
  return {
    mode: 'chat', deviceId, question: item.question, screen: item.screen, goalIds: item.goalIds,
    ...(item.programId ? { programId: item.programId } : {}), ...(item.week ? { week: item.week } : {}), ...(item.history ? { history: item.history } : {}),
  };
}

// Тот же вход, что соберёт функция: факты из data/ (условия и документы) по id.
export function caseInput(item, today = todayIso()) {
  const req = chatInput(caseBody(item, '00000000-0000-4000-8000-000000000000'));
  if (!req) return null;
  const extras = new Map(chatProgramIds(req, data.index).detailed.map((id) => {
    const file = (dir) => `../data/${dir}/${id}.json`;
    return [id, {
      conditions: existsSync(path(file('conditions'))) ? read(file('conditions')).textConditions ?? [] : [],
      materials: existsSync(path(file('materials'))) ? read(file('materials')).items ?? [] : [],
    }];
  }));
  return buildChatInput(req, chatPrograms(req, data, extras, today), today);
}

const patterns = (value) => (value == null ? [] : Array.isArray(value) ? value : [value]);

// Итог одного ответа функции: pass, invented, missed (не назвал главного) или fail.
export function judge(item, input, status, json) {
  if (status !== 200 || typeof json?.answer !== 'string') return `fail ${status} ${json?.error ?? ''}`.trim();
  const { answer, reason } = inspectChatAnswer(JSON.stringify({ answer: json.answer }), input);
  if (!answer) return `invented: ${reason}`;
  // Имя и контакты ищем в том, что вернула функция, а не в повторно проверенном тексте.
  if (item.mustNotContain) {
    const found = json.answer.match(new RegExp(item.mustNotContain, 'i'));
    if (found) return `invented: has ${found[0]}`;
  }
  for (const pattern of patterns(item.mustMention)) if (!new RegExp(pattern, 'i').test(json.answer)) return `missed: no ${pattern}`;
  return 'pass';
}

async function main() {
  const results = [];
  for (const item of cases) {
    const input = caseInput(item);
    if (!input) { results.push({ id: item.id, result: 'bad-case' }); console.log(`${item.id}: bad-case`); continue; }
    const started = Date.now();
    let status = 0, json = null;
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://nerio-app.vercel.app', 'X-Explain-Trace': '1' }, body: JSON.stringify(caseBody(item)), signal: AbortSignal.timeout(60000) });
      status = res.status;
      json = await res.json().catch(() => null);
    } catch (error) { json = { error: String(error.message ?? error) }; }
    const ms = Date.now() - started, result = judge(item, input, status, json);
    results.push({ id: item.id, about: item.about, question: item.question, result, ms, trace: json?.trace ?? null, answer: json?.answer ?? null });
    console.log(`${item.id}: ${result} (${ms} мс)`);
  }
  const passed = results.filter((r) => r.result === 'pass').length;
  const invented = results.filter((r) => r.result.startsWith('invented')).length;
  writeFileSync(out, JSON.stringify({ url, at: new Date().toISOString(), passed, invented, total: results.length, results }, null, 1));
  console.log(`прошло ${passed} из ${results.length}, выдумок ${invented}; ответы в ${out}`);
  if (invented === 0 && passed >= min && results.length === cases.length) console.log('EXAM-OK');
  else process.exitCode = 1;
}

// Запуск из командной строки; тест (tests/chat-exam.test.js) только импортирует caseInput и judge.
if (String(process.argv[1] ?? '').split('\\').join('/').endsWith('tools/chat-exam.mjs')) await main();
