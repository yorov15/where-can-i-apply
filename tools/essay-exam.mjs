// Экзамен режима «Проверь мой черновик» (М3) на живой функции. Берёт 10
// черновиков вымышленных выпускников (tests/fixtures/essay-exam/cases.json),
// отправляет каждый в режим essay и считает:
//   прошло  — функция вернула отзыв, он проходит ту же самопроверку здесь
//             (inspectEssayFeedback по нашим data/prep) и требования случая
//             (mustMention — что отзыв обязан заметить);
//   выдумки — отзыв вернулся, но здесь не проходит проверку или содержит то,
//             чего в нём быть не должно (mustNotContain: имя, почта, «шанс»…);
//   отказ   — модель не дала годного ответа, человек увидел бы чек-лист.
// Ответы сохраняются в файл: их читает человек (полезен ли отзыв, не пишет ли
// он текст за автора). Включать режим людям — только после EXAM-OK,
// см. docs/ESSAY-SWITCH-ON.md.
//
//   node tools/essay-exam.mjs [--url https://nerio-app.vercel.app/api/explain] [--out essay-exam-answers.json] [--min 9]
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { inspectEssayFeedback, essayInput, ESSAY_LIMITS } from '../api/_essay-core.js';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const url = arg('url', 'https://nerio-app.vercel.app/api/explain');
const out = arg('out', 'essay-exam-answers.json');
const min = Number(arg('min', '9'));
const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const { cases } = read('../tests/fixtures/essay-exam/cases.json');
const programs = new Map((read('../data/index.json').programs ?? []).map((program) => [program.id, program]));

// Тот же вход, что соберёт функция: вопрос и лимиты из data/prep, черновик как есть.
export function caseInput(item) {
  const program = programs.get(item.programId), spec = read(`../data/prep/${item.programId}.json`);
  const essay = spec.essays?.find((entry) => entry.id === item.essayId);
  if (!program || !essay?.prompt || spec.essayPolicy?.review !== 'unknown') return null;
  if (item.draft.trim().length < 40 || item.draft.length > ESSAY_LIMITS.draftChars) return null;
  return essayInput(program, essay, item.draft);
}

// Итог одного ответа функции: pass, invented, missed (не заметил главного) или fail.
export function judge(item, input, status, json) {
  if (status !== 200 || !json?.feedback) return `fail ${status} ${json?.error ?? ''}`.trim();
  const { feedback, reason } = inspectEssayFeedback(JSON.stringify(json.feedback), input);
  if (!feedback) return `invented: ${reason}`;
  const text = Object.values(feedback).flat().join('\n');
  if (item.mustNotContain && new RegExp(item.mustNotContain, 'i').test(text)) return `invented: has ${text.match(new RegExp(item.mustNotContain, 'i'))[0]}`;
  if (item.mustMention && !new RegExp(item.mustMention, 'i').test(text)) return 'missed: no mention of the main problem';
  return 'pass';
}

async function main() {
  const results = [];
  for (const item of cases) {
    const input = caseInput(item);
    if (!input) { results.push({ id: item.id, result: 'bad-case' }); console.log(`${item.id}: bad-case`); continue; }
    const body = { mode: 'essay', programId: item.programId, essayId: item.essayId, draft: item.draft, deviceId: randomUUID() };
    const started = Date.now();
    let status = 0, json = null;
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://nerio-app.vercel.app', 'X-Explain-Trace': '1' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
      status = res.status;
      json = await res.json().catch(() => null);
    } catch (error) { json = { error: String(error.message ?? error) }; }
    const ms = Date.now() - started, result = judge(item, input, status, json);
    results.push({ id: item.id, about: item.about, result, ms, size: input.size, trace: json?.trace ?? null, feedback: json?.feedback ?? null });
    console.log(`${item.id}: ${result} (${ms} мс)`);
  }
  const passed = results.filter((r) => r.result === 'pass').length;
  const invented = results.filter((r) => r.result.startsWith('invented')).length;
  writeFileSync(out, JSON.stringify({ url, at: new Date().toISOString(), passed, invented, total: results.length, results }, null, 1));
  console.log(`прошло ${passed} из ${results.length}, выдумок ${invented}; ответы в ${out}`);
  if (invented === 0 && passed >= min && results.length === cases.length) console.log('EXAM-OK');
  else process.exitCode = 1;
}

// Запуск из командной строки; тест (tests/essay-exam.test.js) только импортирует caseInput и judge.
if (String(process.argv[1] ?? '').split('\\').join('/').endsWith('tools/essay-exam.mjs')) await main();
