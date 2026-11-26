// Экзамен наставника на живой функции. Берёт недели 10 вымышленных учеников
// (tests/fixtures/mentor-week/cases.json), сдвигает даты к сегодняшнему дню,
// отправляет каждую в режим mentor-week и считает:
//   прошло    — функция вернула план (значит, он прошёл серверную проверку);
//   выдумки   — план вернулся, но не проходит ту же проверку здесь (их быть не должно);
//   отказ     — модель не дала годного ответа, человек увидел бы обычный список.
// Ответы сохраняются в файл, чтобы их прочитал человек (понятно ли, конкретен ли
// первый шаг).
//
//   node tools/mentor-exam.mjs [--url https://nerio-app.vercel.app/api/explain] [--out answers.json] [--min 9]
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { validateMentorRequest, parseMentorAnswer } from '../api/_mentor-core.js';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const url = arg('url', 'https://nerio-app.vercel.app/api/explain');
const out = arg('out', 'mentor-exam-answers.json');
const min = Number(arg('min', '9'));
const { cases } = JSON.parse(readFileSync(new URL('../tests/fixtures/mentor-week/cases.json', import.meta.url), 'utf8'));

const today = new Date().toISOString().slice(0, 10);
const shift = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const monday = shift(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
const sunday = shift(monday, 6);

function moved(request) {
  const delta = Math.round((Date.parse(today) - Date.parse(request.today)) / 86400000);
  const tasks = request.tasks.map((task) => {
    const { day, ...rest } = task;
    const next = day ? shift(day, delta) : null;
    // День, который человек поставил сам, переносим, только если он остаётся на этой неделе и не в прошлом.
    return next && next >= today && next >= monday && next <= sunday ? { ...rest, day: next } : rest;
  });
  return { ...request, today, deviceId: randomUUID(), tasks, deadlines: request.deadlines.map((item) => ({ ...item, date: shift(item.date, delta) })) };
}

const results = [];
for (const item of cases) {
  const body = moved(item.request);
  const req = validateMentorRequest(body, today);
  if (!req) { results.push({ id: item.id, result: 'bad-case' }); continue; }
  const started = Date.now();
  let status = 0, json = null;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://nerio-app.vercel.app', 'X-Explain-Trace': '1' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    status = res.status;
    json = await res.json().catch(() => null);
  } catch (error) { json = { error: String(error.message ?? error) }; }
  const ms = Date.now() - started;
  let result;
  if (status === 200 && json?.plan) result = parseMentorAnswer(JSON.stringify(json.plan), req) ? 'pass' : 'invented';
  else result = `fail ${status} ${json?.error ?? ''}`.trim();
  results.push({ id: item.id, result, ms, trace: json?.trace ?? null, tasks: req.tasks.map(({ taskId, title, minutes, day }) => ({ taskId, title, minutes, day })), plan: json?.plan ?? null });
  console.log(`${item.id}: ${result} (${ms} мс)`);
}

const passed = results.filter((r) => r.result === 'pass').length;
const invented = results.filter((r) => r.result === 'invented').length;
writeFileSync(out, JSON.stringify({ url, today, passed, invented, total: results.length, results }, null, 1));
console.log(`прошло ${passed} из ${results.length}, выдумок ${invented}; ответы в ${out}`);
if (invented === 0 && passed >= min && results.length === cases.length) console.log('EXAM-OK');
else process.exitCode = 1;
