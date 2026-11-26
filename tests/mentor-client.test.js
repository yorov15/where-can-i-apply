import test from 'node:test';
import assert from 'node:assert/strict';
import { mentorRequest, askMentor, savedMentorPlan, mentorUsage, MENTOR_KEY, MENTOR_PER_DAY } from '../js/mentor.js';

const memory = () => { const map = new Map(); return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), map }; };
const week = { key: '2026-W48', start: '2026-11-23', end: '2026-11-29', tasks: [
  { taskId: 'a', title: 'Перевод аттестата', kind: 'action', minutes: 30, done: false },
  { taskId: 'b', title: 'Х'.repeat(200), kind: 'portfolio', minutes: 0, done: false, day: '2026-11-28', experienceId: 'secret' },
  { taskId: 'c', title: 'Уже сделано', kind: 'action', minutes: 30, done: true },
] };
const dates = [{ date: '2026-11-28', title: 'Х', note: 'Выбранный день' }, { date: '2026-12-08', title: 'Подача в KAIST', note: 'Подтверждённый срок' }];
const plan = { focus: 'Главное — документы.', days: [
  { taskId: 'a', day: '2026-11-26', why: 'Перевод делают долго.', firstStep: 'Найди аттестат.' },
  { taskId: 'b', day: '2026-11-28', why: 'Это часть портфолио.', firstStep: 'Выпиши три вещи.' },
] };
const ok = (value) => async () => ({ ok: true, status: 200, json: async () => value });

test('request carries only open tasks, trimmed titles, clamped minutes and real deadlines', () => {
  const req = mentorRequest({ week, dates, today: '2026-11-26', hoursPerWeek: 4, deviceId: 'd' });
  assert.deepEqual(req.tasks.map((t) => t.taskId), ['a', 'b']);
  assert.equal(req.tasks[1].title.length, 160);
  assert.equal(req.tasks[1].minutes, 5);
  assert.equal(req.tasks[1].day, '2026-11-28');
  assert.deepEqual(req.deadlines, [{ title: 'Подача в KAIST', date: '2026-12-08' }]);
  assert.doesNotMatch(JSON.stringify(req), /secret|experienceId|done/);
});

test('ask: saves the plan for this week, counts the try, shows only open tasks later', async () => {
  const storage = memory();
  let sent;
  const result = await askMentor({ week, dates, today: '2026-11-26', hoursPerWeek: 4 }, { url: 'https://x.test', storage,
    fetchImpl: async (url, options) => { sent = JSON.parse(options.body); return ok({ plan })(); }, randomId: () => '00000000-0000-4000-8000-000000000001' });
  assert.equal(result.focus, plan.focus);
  assert.equal(sent.deviceId, '00000000-0000-4000-8000-000000000001');
  assert.equal(mentorUsage(storage, '2026-11-26'), 1);
  assert.equal(mentorUsage(storage, '2026-11-27'), 0);
  const later = { ...week, tasks: week.tasks.map((t) => (t.taskId === 'a' ? { ...t, done: true } : t)) };
  assert.deepEqual(savedMentorPlan(storage, later).days.map((d) => d.taskId), ['b']);
  assert.equal(savedMentorPlan(storage, { ...week, key: '2026-W49' }), null);
});

test('ask: daily limit, broken answers and network errors become plain messages', async () => {
  const storage = memory();
  storage.setItem(MENTOR_KEY, JSON.stringify({ day: '2026-11-26', count: MENTOR_PER_DAY }));
  await assert.rejects(askMentor({ week, dates, today: '2026-11-26', hoursPerWeek: 4 }, { url: 'u', storage, fetchImpl: ok({ plan }) }), { kind: 'rate' });
  const fresh = memory();
  const bad = { ...plan, days: [{ ...plan.days[0], taskId: 'zzz' }, plan.days[1]] };
  await assert.rejects(askMentor({ week, dates, today: '2026-11-26', hoursPerWeek: 4 }, { url: 'u', storage: fresh, fetchImpl: ok({ plan: bad }) }), { kind: 'model' });
  await assert.rejects(askMentor({ week, dates, today: '2026-11-26', hoursPerWeek: 4 }, { url: 'u', storage: fresh, fetchImpl: async () => { throw new Error('offline'); } }), { kind: 'network' });
  await assert.rejects(askMentor({ week, dates, today: '2026-11-26', hoursPerWeek: 4 }, { url: 'u', storage: fresh, fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: 'device' }) }) }), { kind: 'rate' });
  await assert.rejects(askMentor({ week, dates, today: '2026-11-26', hoursPerWeek: 4 }, { url: null, storage: fresh }), { kind: 'off' });
  const allDone = { ...week, tasks: week.tasks.map((t) => ({ ...t, done: true })) };
  await assert.rejects(askMentor({ week: allDone, dates, today: '2026-11-26', hoursPerWeek: 4 }, { url: 'u', storage: memory(), fetchImpl: ok({ plan }) }), { kind: 'empty' });
});
