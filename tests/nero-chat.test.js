import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAT_ERRORS, CHAT_PER_DAY, CHAT_USAGE_KEY, CHAT_HISTORY_KEY, HISTORY_KEEP,
  chatScreen, questionOk, chatUsage, reserveChat, chatRequest, chatErrorKind, chatAnswer,
  readHistory, writeHistory, answerParts,
} from '../js/lib/nero-chat.js';
import { askChat, chatDeviceId, chatAvailable } from '../js/nero-chat.js';
import { MENTOR_KEY } from '../js/mentor.js';
import { ESSAY_DEVICE_KEY } from '../js/essay.js';

const memory = () => { const map = new Map(); return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), map }; };
const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
const UUID = '11111111-2222-4333-8444-555555555555';
const reply = (status, value) => async () => ({ ok: status < 400, status, json: async () => value });

test('экран для сервера: программа, «Сегодня», путь, каталог, остальное', () => {
  assert.equal(chatScreen('program'), 'program');
  assert.equal(chatScreen('today'), 'today');
  assert.equal(chatScreen('route'), 'path');
  assert.equal(chatScreen('answer'), 'catalog');
  assert.equal(chatScreen('profile'), 'other');
  assert.equal(chatScreen(undefined), 'other');
});

test('вопрос — от 3 до 500 знаков без пробелов по краям', () => {
  assert.equal(questionOk('  да '), false);
  assert.equal(questionOk('Что?'), true);
  assert.equal(questionOk('я'.repeat(500)), true);
  assert.equal(questionOk('я'.repeat(501)), false);
  assert.equal(questionOk(null), false);
});

test('тело запроса: только поля контракта и в их пределах', () => {
  const week = { key: 'w', tasks: Array.from({ length: 15 }, (_, i) => ({
    taskId: `t${i}`, title: `${'Д'.repeat(200)}`, minutes: i === 0 ? 900 : i === 1 ? -5 : 30.4, done: i % 2 === 0,
    kind: 'action', experienceId: 'secret', routeId: 'r', ...(i === 2 ? { day: '2026-11-28' } : i === 3 ? { day: 'завтра' } : {}),
  })) };
  const history = Array.from({ length: 6 }, (_, i) => ({ q: `вопрос ${i}`, a: 'о'.repeat(2000) }));
  const goals = Array.from({ length: 14 }, (_, i) => `goal-${i}`);
  const req = chatRequest({ question: `  ${'в'.repeat(600)} `, screen: 'program', programId: 'kaist', goalIds: [...goals, 'bad id', 'goal-0'],
    week, history, deviceId: UUID, profile: { name: 'Имя' }, scores: [1] });
  assert.deepEqual(Object.keys(req).sort(), ['deviceId', 'goalIds', 'history', 'mode', 'programId', 'question', 'screen', 'week']);
  assert.equal(req.mode, 'chat');
  assert.equal(req.question.length, 500);
  assert.equal(req.goalIds.length, 10);
  assert.ok(!req.goalIds.includes('bad id'));
  assert.equal(req.week.length, 12);
  assert.deepEqual(Object.keys(req.week[2]).sort(), ['day', 'done', 'minutes', 'title']);
  assert.deepEqual(Object.keys(req.week[3]).sort(), ['done', 'minutes', 'title']);
  assert.equal(req.week[0].title.length, 160);
  assert.equal(req.week[0].minutes, 600);
  assert.equal(req.week[1].minutes, 0);
  assert.equal(req.week[4].minutes, 30);
  assert.equal(typeof req.week[1].done, 'boolean');
  assert.deepEqual(req.history.map((pair) => pair.q), ['вопрос 3', 'вопрос 4', 'вопрос 5']);
  assert.ok(req.history.every((pair) => pair.a.length === 1200));
  assert.doesNotMatch(JSON.stringify(req), /secret|experienceId|taskId|Имя|scores/);
});

test('id программы уходит только со страницы программы; пустые неделя и история не уходят', () => {
  const req = chatRequest({ question: 'Что делать?', screen: 'today', programId: 'kaist', goalIds: ['kaist'], deviceId: UUID });
  assert.equal('programId' in req, false);
  assert.equal('week' in req, false);
  assert.equal('history' in req, false);
  assert.equal(chatRequest({ question: 'abc', screen: 'nowhere', deviceId: UUID }).screen, 'other');
});

test('предел: 20 вопросов в сутки, на следующий день заново, сломанное хранилище не роняет', () => {
  const storage = memory();
  for (let i = 0; i < CHAT_PER_DAY; i++) assert.equal(reserveChat(storage, '2026-11-27'), true);
  assert.equal(chatUsage(storage, '2026-11-27'), CHAT_PER_DAY);
  assert.equal(reserveChat(storage, '2026-11-27'), false);
  assert.equal(chatUsage(storage, '2026-11-28'), 0);
  storage.setItem(CHAT_USAGE_KEY, '{oops');
  assert.equal(chatUsage(storage, '2026-11-27'), 0);
  assert.equal(chatUsage(broken, '2026-11-27'), 0);
  assert.equal(reserveChat(broken, '2026-11-27'), false);
});

test('ошибки сервера: rate, off, bad и всё прочее как отказ модели', () => {
  assert.equal(chatErrorKind(429, null), 'rate');
  assert.equal(chatErrorKind(200, { error: 'rate' }), 'rate');
  assert.equal(chatErrorKind(503, { error: 'off' }), 'off');
  assert.equal(chatErrorKind(400, { error: 'bad' }), 'bad');
  assert.equal(chatErrorKind(400, { error: 'bad-request' }), 'bad');
  assert.equal(chatErrorKind(413, { error: 'too-big' }), 'big');
  assert.equal(chatErrorKind(403, null), 'off');
  assert.equal(chatErrorKind(503, { error: 'model' }), 'model');
  assert.equal(chatErrorKind(502, { error: 'model' }), 'model');
  assert.equal(chatErrorKind(500, { error: 'что-то новое' }), 'model');
  assert.match(CHAT_ERRORS.rate, /^На сегодня вопросы к Nero закончились/);
  assert.match(CHAT_ERRORS.model, /^Nero не дал ответа, который прошёл проверку/);
  for (const kind of ['rate', 'off', 'model', 'network', 'bad', 'short']) assert.ok(CHAT_ERRORS[kind], kind);
});

test('ответ: непустая строка разумной длины', () => {
  assert.equal(chatAnswer({ answer: '  Начни с перевода аттестата.  ' }), 'Начни с перевода аттестата.');
  assert.equal(chatAnswer({ answer: '   ' }), null);
  assert.equal(chatAnswer({ answer: 42 }), null);
  assert.equal(chatAnswer({ answer: 'я'.repeat(5000) }), null);
  assert.equal(chatAnswer(null), null);
});

test('история: последние 10 пар, мусор отбрасывается, без хранилища — пусто', () => {
  const storage = memory();
  writeHistory(storage, Array.from({ length: 14 }, (_, i) => ({ q: `q${i}`, a: `a${i}` })));
  const list = readHistory(storage);
  assert.equal(list.length, HISTORY_KEEP);
  assert.equal(list[0].q, 'q4');
  storage.setItem(CHAT_HISTORY_KEY, JSON.stringify([{ q: 'x' }, { q: 'да', a: 'нет' }, 5]));
  assert.deepEqual(readHistory(storage), [{ q: 'да', a: 'нет' }]);
  storage.setItem(CHAT_HISTORY_KEY, 'не json');
  assert.deepEqual(readHistory(storage), []);
  assert.deepEqual(readHistory(broken), []);
  assert.equal(writeHistory(broken, []), false);
});

test('ссылки в ответе: только http(s), точка в конце остаётся тексту', () => {
  assert.deepEqual(answerParts('Смотри https://www.kaist.ac.kr/en/. Потом пиши.'), [
    { text: 'Смотри ' }, { text: 'https://www.kaist.ac.kr/en/', url: 'https://www.kaist.ac.kr/en/' }, { text: '. Потом пиши.' },
  ]);
  assert.deepEqual(answerParts('javascript:alert(1) и data:text/html,x'), [{ text: 'javascript:alert(1) и data:text/html,x' }]);
  assert.deepEqual(answerParts('(http://a.tj)'), [{ text: '(' }, { text: 'http://a.tj', url: 'http://a.tj/' }, { text: ')' }]);
  assert.deepEqual(answerParts('без ссылок'), [{ text: 'без ссылок' }]);
});

test('код устройства — тот же, что у наставника недели; нет его — берём код черновика и кладём к наставнику', () => {
  const storage = memory();
  storage.setItem(MENTOR_KEY, JSON.stringify({ deviceId: UUID, day: '2026-11-27', count: 2 }));
  assert.equal(chatDeviceId(storage, () => 'new'), UUID);
  const other = memory();
  other.setItem(ESSAY_DEVICE_KEY, UUID);
  assert.equal(chatDeviceId(other, () => 'new'), UUID);
  assert.equal(JSON.parse(other.getItem(MENTOR_KEY)).deviceId, UUID);
  const fresh = memory();
  const id = '99999999-2222-4333-8444-555555555555';
  assert.equal(chatDeviceId(fresh, () => id), id);
  assert.equal(chatDeviceId(fresh, () => 'другой'), id);
});

test('askChat: отправляет тело контракта, считает попытку до ответа, возвращает текст', async () => {
  const storage = memory();
  let sent;
  const answer = await askChat({ question: 'С чего начать?', screen: 'today', goalIds: ['kaist'], history: [] },
    { url: 'https://x/api', today: '2026-11-27', storage, randomId: () => UUID,
      fetchImpl: async (url, init) => { sent = JSON.parse(init.body); return { ok: true, status: 200, json: async () => ({ answer: 'С перевода.' }) }; } });
  assert.equal(answer, 'С перевода.');
  assert.equal(sent.mode, 'chat');
  assert.equal(sent.deviceId, UUID);
  assert.equal(chatUsage(storage, '2026-11-27'), 1);
});

test('askChat: ошибки по видам', async () => {
  const run = (fetchImpl, extra = {}) => askChat({ question: 'С чего начать?', screen: 'today', goalIds: [] },
    { url: 'https://x/api', today: '2026-11-27', storage: memory(), randomId: () => UUID, fetchImpl, ...extra })
    .then(() => 'ok', (error) => error.kind);
  assert.equal(await run(reply(429, { error: 'rate' })), 'rate');
  const limited = memory();
  await askChat({ question: 'С чего начать?' }, { url: 'https://x', today: '2026-11-27', storage: limited, randomId: () => UUID, fetchImpl: reply(429, { error: 'rate' }) }).catch(() => {});
  assert.equal(chatUsage(limited, '2026-11-27'), CHAT_PER_DAY);
  assert.equal(await run(reply(503, { error: 'off' })), 'off');
  assert.equal(await run(reply(502, { error: 'model' })), 'model');
  assert.equal(await run(reply(200, { answer: '' })), 'model');
  assert.equal(await run(async () => { throw new Error('offline'); }), 'network');
  assert.equal(await run(reply(200, { answer: 'да' }), { url: null }), 'off');
  assert.equal(await askChat({ question: 'ну' }, { url: 'https://x', storage: memory() }).catch((error) => error.kind), 'short');
  const full = memory();
  full.setItem(CHAT_USAGE_KEY, JSON.stringify({ day: '2026-11-27', count: CHAT_PER_DAY }));
  let called = false;
  assert.equal(await askChat({ question: 'Ещё вопрос' }, { url: 'https://x', today: '2026-11-27', storage: full, randomId: () => UUID,
    fetchImpl: async () => { called = true; return { ok: true, status: 200, json: async () => ({ answer: 'да' }) }; } }).catch((error) => error.kind), 'rate');
  assert.equal(called, false);
});

test('статус чата: только явное available:true', async () => {
  assert.equal(await chatAvailable('https://x', reply(200, { available: true })), true);
  assert.equal(await chatAvailable('https://x', reply(200, { available: 'yes' })), false);
  assert.equal(await chatAvailable('https://x', async () => { throw new Error('x'); }), false);
  assert.equal(await chatAvailable(null), false);
});
