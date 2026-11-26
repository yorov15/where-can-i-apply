import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

// Режим наставника через настоящий обработчик api/explain.js: модель — подделка.
process.env.OPENCODE_API_KEY = 'oc_sk_mentor-test-go-key';
delete process.env.OPENROUTER_API_KEY;
delete process.env.EXPLAIN_MODELS;
process.env.DATA_BASE_URL = 'https://data.example.test/';
const today = new Date().toISOString().slice(0, 10);
const shift = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const sunday = shift(today, 6 - ((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
let requests = [], reply = null, serial = 1;
globalThis.fetch = async (url, options) => {
  const address = String(url);
  if (address.includes('chat/completions')) {
    requests.push({ url: address, headers: options.headers, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ choices: [{ message: { content: reply } }] }) };
  }
  throw Error(`unexpected fetch ${address}`);
};
const { default: handler } = await import('../api/explain.js');
const device = () => `00000000-0000-4000-8000-${String(serial++).padStart(12, '0')}`;
const input = (title = 'Заказать перевод аттестата') => ({ mode: 'mentor-week', deviceId: device(), today, hoursPerWeek: 3,
  tasks: [{ taskId: 'step-a', title, kind: 'action', minutes: 30 }], deadlines: [] });
const good = (day = today) => JSON.stringify({ focus: 'Главное на неделе — начать с документов, они занимают больше всего времени.',
  days: [{ taskId: 'step-a', day, why: 'Перевод делают не один день, поэтому его лучше начать раньше.', firstStep: 'Найди аттестат и сфотографируй каждую страницу при хорошем свете.' }] });
async function call(body, headers = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body), req = Readable.from([Buffer.from(raw)]);
  req.method = 'POST';
  req.headers = { origin: 'https://nerio-app.vercel.app', host: 'nerio-app.vercel.app', 'x-real-ip': `mentor-${serial++}`, ...headers };
  const result = { headers: {} };
  const res = { setHeader: (k, v) => { result.headers[k] = v; }, end: (v) => { result.status = res.statusCode; result.json = v ? JSON.parse(v) : null; } };
  await handler(req, res);
  return result;
}

test('mentor mode goes to Go in JSON mode and returns the checked plan', async () => {
  reply = good();
  const result = await call(input());
  assert.equal(result.status, 200);
  assert.equal(result.json.plan.days[0].day, today);
  const sent = requests.at(-1);
  assert.equal(sent.url, 'https://opencode.ai/zen/go/v1/chat/completions');
  assert.equal(sent.body.response_format.type, 'json_object');
  assert.equal(sent.body.max_tokens, 3000);
  assert.match(sent.body.messages[0].content, /json/);
  assert.doesNotMatch(JSON.stringify(sent.body), /deviceId|0000-4000/);
});

test('an answer that fails the check never reaches the person', async () => {
  reply = good(shift(sunday, 1));
  assert.deepEqual((await call(input('Другое дело недели'))).json, { error: 'model' });
  reply = 'Конечно! Вот план: делай всё в понедельник.';
  assert.deepEqual((await call(input('Третье дело недели'))).json, { error: 'model' });
});

test('mentor body may be bigger than an explanation request, but not unbounded', async () => {
  reply = good();
  // Самый большой допустимый запрос: 8 дел и 6 сроков с длинными названиями и id.
  const big = input();
  big.tasks = Array.from({ length: 8 }, (_, i) => ({ taskId: `t${i}`.padEnd(80, 'x'), title: 'я'.repeat(160), kind: 'portfolio-step'.slice(0, 24), minutes: 600, day: today }));
  big.deadlines = Array.from({ length: 6 }, () => ({ title: 'я'.repeat(160), date: today }));
  const size = Buffer.byteLength(JSON.stringify(big));
  assert.ok(size > 4000 && size < 8000, String(size));
  assert.notEqual((await call(big)).status, 413);
  assert.equal((await call({ mode: 'mentor-week', extra: 'x'.repeat(8500) })).status, 413);
});

test('bad origin and bad shape never reach the model', async () => {
  const before = requests.length;
  assert.equal((await call(input(), { origin: 'https://evil.test' })).status, 403);
  assert.equal((await call({ ...input(), profile: { gpa: 5 } })).status, 400);
  assert.equal(requests.length, before);
});
