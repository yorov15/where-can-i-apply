// Экзамен наставника у шага маршрута (М2) на живой функции. Берёт шаги 10
// вымышленных учеников с настоящими условиями программ
// (tests/fixtures/mentor-step/cases.json), отправляет каждый в режим
// mentor-step и считает:
//   прошло    — функция вернула объяснение (значит, оно прошло серверную проверку);
//   выдумки   — объяснение вернулось, но не проходит ту же проверку здесь (их быть не должно);
//   отказ     — модель не дала годного ответа, человек увидел бы шаг без наставника.
// Ответы сохраняются в файл, чтобы их прочитал человек (понятно ли, есть ли
// первое действие, к месту ли вопрос).
//
//   node tools/mentor-step-exam.mjs [--url https://nerio-app.vercel.app/api/explain] [--out answers.json] [--min 9]
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { validateStepRequest, parseStepAnswer } from '../api/_step-core.js';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const url = arg('url', 'https://nerio-app.vercel.app/api/explain');
const out = arg('out', 'mentor-step-exam-answers.json');
const min = Number(arg('min', '9'));
const { cases } = JSON.parse(readFileSync(new URL('../tests/fixtures/mentor-step/cases.json', import.meta.url), 'utf8'));

const results = [];
for (const item of cases) {
  const body = { ...item.request, deviceId: randomUUID() };
  const req = validateStepRequest(body);
  if (!req) { results.push({ id: item.id, result: 'bad-case' }); console.log(`${item.id}: bad-case`); continue; }
  const started = Date.now();
  let status = 0, json = null;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://nerio-app.vercel.app', 'X-Explain-Trace': '1' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    status = res.status;
    json = await res.json().catch(() => null);
  } catch (error) { json = { error: String(error.message ?? error) }; }
  const ms = Date.now() - started;
  let result;
  if (status === 200 && json?.answer) result = parseStepAnswer(JSON.stringify(json.answer), req) ? 'pass' : 'invented';
  else result = `fail ${status} ${json?.error ?? ''}`.trim();
  results.push({ id: item.id, result, ms, trace: json?.trace ?? null, step: req.step, answer: json?.answer ?? null });
  console.log(`${item.id}: ${result} (${ms} мс)`);
}

const passed = results.filter((r) => r.result === 'pass').length;
const invented = results.filter((r) => r.result === 'invented').length;
writeFileSync(out, JSON.stringify({ url, passed, invented, total: results.length, results }, null, 1));
console.log(`прошло ${passed} из ${results.length}, выдумок ${invented}; ответы в ${out}`);
if (invented === 0 && passed >= min && results.length === cases.length) console.log('EXAM-OK');
else process.exitCode = 1;
