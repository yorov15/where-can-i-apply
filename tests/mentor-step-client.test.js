import test from 'node:test';
import assert from 'node:assert/strict';
import { stepRequest, askStepMentor, savedStepAnswer, stepUsage, STEP_KEY, STEP_PER_DAY } from '../js/mentor-step.js';
import { validateStepRequest } from '../api/_step-core.js';

const memory = () => { const map = new Map(); return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), map }; };
const profile = {
  citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11, graduationYear: 2027, birthDate: '2009-02-11', name: 'Фарход',
  gpa: { value: 4.3, scale: 'TJ_5' }, languageTests: [{ test: 'IELTS', score: 6.5 }], exams: [{ test: 'SAT', score: 1350 }],
};
const step = { id: 'kaist:document:abc', phase: 'docs', title: 'Перевести аттестат', detail: 'Нужен заверенный перевод.', due: '2027-01-14', programIds: ['kaist'] };
const programs = [{ name: 'KAIST — приём иностранцев', sourceUrl: 'https://admission.kaist.ac.kr/', conditions: [
  { ru: 'Аттестат с заверенным переводом на английский.', kind: 'documents', field: null },
  { ru: 'Сбор за заявку — 80 000 вон.', kind: 'money', field: null },
  { ru: 'Нужен IELTS от 6.5 или TOEFL.', kind: 'must', field: 'language', test: 'IELTS' },
] }];
const answer = { explain: 'Это заверенный перевод аттестата. Отнеси копию в бюро переводов и заверь у нотариуса.', question: 'Аттестат уже на руках?' };
const ok = (value) => async () => ({ ok: true, status: 200, json: async () => value });

test('request: only step, its conditions and «сдан/не сдан» — no scores, name, birth date or gpa', () => {
  const request = stepRequest({ step, programs, profile, deviceId: '00000000-0000-4000-8000-000000000001' });
  const text = JSON.stringify(request);
  assert.doesNotMatch(text, /Фарход|2009-02-11|1350|4\.3|gpa|citizenship|graduationYear|score/);
  assert.deepEqual(request.person, { schoolCountry: 'TJ', schoolYears: 11, exams: [{ test: 'IELTS', status: 'сдан' }, { test: 'SAT', status: 'сдан' }] });
  assert.deepEqual(request.programs[0].conditions.map((item) => item.kind), ['documents']);
  assert.deepEqual(Object.keys(request).sort(), ['deviceId', 'mode', 'person', 'programs', 'step']);
  assert.ok(validateStepRequest(request));
});

test('request: exams the step names but the person lacks go as «не сдан»; no conditions of the phase → main ones', () => {
  const exam = { id: 'test:english', phase: 'tests', title: 'Подготовить сертификат английского', candidates: ['IELTS', 'TOEFL_IBT'], programIds: ['kaist'] };
  const request = stepRequest({ step: exam, programs, profile: { ...profile, languageTests: [], exams: [] }, deviceId: 'd' });
  assert.deepEqual(request.person.exams, [{ test: 'IELTS', status: 'не сдан' }, { test: 'TOEFL_IBT', status: 'не сдан' }]);
  assert.deepEqual(request.programs[0].conditions.map((item) => item.kind), ['must']);
  const apply = stepRequest({ step: { ...step, phase: 'apply' }, programs, profile, deviceId: 'd' });
  assert.deepEqual(apply.programs[0].conditions.map((item) => item.kind), ['must']);
});

test('ask: sends the request, counts the try and keeps the answer for this step', async () => {
  const storage = memory();
  let sent;
  const result = await askStepMentor({ step, programs, profile, today: '2026-11-27' }, { url: 'https://x.test', storage,
    fetchImpl: async (url, options) => { sent = JSON.parse(options.body); return ok({ answer })(); }, randomId: () => '00000000-0000-4000-8000-000000000001' });
  assert.deepEqual(result, answer);
  assert.equal(sent.mode, 'mentor-step');
  assert.equal(sent.deviceId, '00000000-0000-4000-8000-000000000001');
  assert.doesNotMatch(JSON.stringify(sent), /Фарход|2009-02-11|1350|score/);
  assert.equal(stepUsage(storage, '2026-11-27'), 1);
  assert.ok(storage.map.has(STEP_KEY));
  const again = stepRequest({ step, programs, profile, deviceId: '' });
  assert.deepEqual(savedStepAnswer(storage, step.id, again), answer);
  // Шаг поменялся — старый ответ не показываем.
  assert.equal(savedStepAnswer(storage, step.id, stepRequest({ step: { ...step, title: 'Другое' }, programs, profile, deviceId: '' })), null);
});

test('ask: limit, server errors, broken answers and network become plain error kinds', async () => {
  const full = memory();
  full.setItem(STEP_KEY, JSON.stringify({ day: '2026-11-27', count: STEP_PER_DAY }));
  const ask = (storage, fetchImpl, extra = {}) => askStepMentor({ step, programs, profile, today: '2026-11-27', ...extra }, { url: 'u', storage, fetchImpl });
  await assert.rejects(ask(full, ok({ answer })), { kind: 'rate' });
  await assert.rejects(ask(memory(), async () => ({ ok: false, status: 429, json: async () => ({ error: 'device' }) })), { kind: 'rate' });
  await assert.rejects(ask(memory(), async () => ({ ok: false, status: 503, json: async () => ({ error: 'off' }) })), { kind: 'off' });
  await assert.rejects(ask(memory(), async () => ({ ok: false, status: 503, json: async () => ({ error: 'model' }) })), { kind: 'model' });
  await assert.rejects(ask(memory(), ok({ answer: { explain: '' } })), { kind: 'model' });
  await assert.rejects(ask(memory(), async () => { throw new Error('offline'); }), { kind: 'network' });
  await assert.rejects(askStepMentor({ step, programs, profile, today: '2026-11-27' }, { url: null, storage: memory() }), { kind: 'off' });
  await assert.rejects(ask(memory(), ok({ answer }), { programs: [] }), { kind: 'off' });
});
