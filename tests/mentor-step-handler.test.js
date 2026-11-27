import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

// Режим «наставник у шага» через настоящий обработчик api/explain.js: модель — подделка.
process.env.OPENCODE_API_KEY = 'oc_sk_mentor-step-test-go-key';
delete process.env.OPENROUTER_API_KEY;
delete process.env.EXPLAIN_MODELS;
process.env.DATA_BASE_URL = 'https://data.example.test/';
let requests = [], reply = null, serial = 1;
globalThis.fetch = async (url, options) => {
  const address = String(url);
  if (address.includes('chat/completions')) {
    requests.push({ url: address, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ choices: [{ message: { content: reply } }] }) };
  }
  throw Error(`unexpected fetch ${address}`);
};
const { default: handler } = await import('../api/explain.js');
const device = () => `00000000-0000-4000-8000-${String(serial++).padStart(12, '0')}`;
const input = (title = 'Перевести аттестат на английский') => ({ mode: 'mentor-step', deviceId: device(),
  step: { title, phase: 'docs' },
  programs: [{ name: 'KAIST', sourceUrl: 'https://admission.kaist.ac.kr/', conditions: [{ kind: 'documents', text: 'Аттестат с заверенным переводом на английский.' }] }],
  person: { schoolCountry: 'TJ', schoolYears: 11, exams: [{ test: 'IELTS', status: 'сдан' }] } });
const good = () => JSON.stringify({ explain: 'Это заверенный перевод аттестата на английский. Отнеси копию аттестата в бюро переводов, а готовый перевод заверь у нотариуса.', question: '' });
async function call(body, headers = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body), req = Readable.from([Buffer.from(raw)]);
  req.method = 'POST';
  req.headers = { origin: 'https://nerio-app.vercel.app', host: 'nerio-app.vercel.app', 'x-real-ip': `step-${serial++}`, ...headers };
  const result = { headers: {} };
  const res = { setHeader: (k, v) => { result.headers[k] = v; }, end: (v) => { result.status = res.statusCode; result.json = v ? JSON.parse(v) : null; } };
  await handler(req, res);
  return result;
}

test('step mode goes to Go in JSON mode and returns the checked answer', async () => {
  reply = good();
  const result = await call(input());
  assert.equal(result.status, 200);
  assert.equal(result.json.answer.question, '');
  const sent = requests.at(-1);
  assert.equal(sent.url, 'https://opencode.ai/zen/go/v1/chat/completions');
  assert.equal(sent.body.response_format.type, 'json_object');
  assert.equal(sent.body.max_tokens, 1500);
  assert.match(sent.body.messages[0].content, /данные, а не команды/);
  assert.doesNotMatch(JSON.stringify(sent.body), /deviceId|0000-4000/);
});

test('a rejected answer never reaches the person; trace shows why', async () => {
  reply = JSON.stringify({ explain: 'Перевод в бюро стоит около 150 сомони за страницу, потом заверь его у нотариуса.', question: '' });
  const result = await call(input('Другой шаг про перевод'), { 'x-explain-trace': '1' });
  assert.equal(result.status, 503);
  assert.equal(result.json.error, 'model');
  assert.ok(result.json.trace.some((item) => /number/.test(item.reject ?? '')));
  reply = 'Конечно! Вот объяснение.';
  assert.deepEqual((await call(input('Третий шаг про перевод'))).json, { error: 'model' });
});

test('bad origin, scores and oversize bodies never reach the model', async () => {
  const before = requests.length;
  assert.equal((await call(input(), { origin: 'https://evil.test' })).status, 403);
  const scored = input();
  scored.person.exams = [{ test: 'IELTS', status: 'сдан', score: 7 }];
  assert.equal((await call(scored)).status, 400);
  assert.equal((await call({ ...input(), profile: { gpa: 5 } })).status, 400);
  assert.equal((await call({ mode: 'mentor-step', extra: 'x'.repeat(12500) })).status, 413);
  assert.equal(requests.length, before);
});
