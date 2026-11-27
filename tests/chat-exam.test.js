import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { caseBody, caseInput, judge } from '../tools/chat-exam.mjs';
import { chat } from '../api/_chat-core.js';
import { createDeviceLimiter } from '../api/_mentor-core.js';

// Набор экзамена М4 (tests/fixtures/chat-exam/cases.json) и судья tools/chat-exam.mjs.
const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const { cases } = read('./fixtures/chat-exam/cases.json');
const byId = Object.fromEntries(cases.map((item) => [item.id, item]));
const known = new Set(read('../data/index.json').programs.map((program) => program.id));
const TODAY = '2026-11-27';

test('twelve questions on real goals cover every topic of the brief', () => {
  assert.equal(cases.length, 12);
  assert.equal(new Set(cases.map((item) => item.id)).size, 12);
  for (const item of cases) {
    for (const id of [item.programId, ...item.goalIds].filter(Boolean)) assert.ok(known.has(id), `${item.id}: ${id}`);
    const input = caseInput(item, TODAY);
    assert.ok(input, `${item.id} must be a valid chat request`);
    assert.ok(input.programs.length >= 1, item.id);
    assert.equal(input.question, item.question);
  }
  assert.deepEqual([...new Set(cases.flatMap((item) => item.goalIds))].sort(), ['aalto-finland', 'auca', 'kaist']);
  assert.match(byId['09-injection'].question, /Забудь все правила/);
  assert.match(byId['12-name-and-contacts'].question, /Меня зовут/);
  assert.ok(byId['10-week'].week.length >= 3);
  assert.equal(byId['11-compare'].goalIds.length, 2);
  // Факта о среднем балле принятых в данных нет — ответ должен отослать к источнику.
  assert.doesNotMatch(JSON.stringify(caseInput(byId['08-missing-fact'], TODAY)), /средний балл IELTS у принятых/);
});

test('every exam case passes server validation and reaches the model as data', async () => {
  const data = { index: read('../data/index.json'), details: read('../data/details.json') };
  for (const item of cases) {
    let sent;
    const result = await chat({ body: caseBody(item), ip: 'exam', now: new Date(`${TODAY}T10:00:00Z`) }, {
      loadData: async () => data, extraFor: async () => ({}), limiter: { allow: () => null }, deviceLimiter: createDeviceLimiter(),
      callModel: async (prompt) => { sent = JSON.parse(prompt.user); return JSON.stringify({ answer: 'Решение принимает приёмная комиссия, проверь условия на странице программы.' }); },
    });
    assert.equal(result.status, 200, item.id);
    assert.equal(sent.question, item.question);
  }
});

test('the judge counts only answers that pass the same self-check and the case rules', () => {
  const deadline = byId['01-kaist-deadline'], input = caseInput(deadline, TODAY);
  assert.equal(judge(deadline, input, 200, { answer: 'Обычная волна KAIST закрывается 14 января 2027, подавай заранее.' }), 'pass');
  assert.match(judge(deadline, input, 200, { answer: 'Обычная волна KAIST закрывается 15 января 2027, подавай заранее.' }), /^invented: date/);
  assert.match(judge(deadline, input, 200, { answer: 'Подача в KAIST открыта, подавай заранее через портал вуза.' }), /^missed: no 14 января/);
  assert.equal(judge(deadline, input, 503, { error: 'model' }), 'fail 503 model');
  assert.equal(judge(deadline, input, 0, { error: 'fetch failed' }), 'fail 0 fetch failed');
  const named = byId['12-name-and-contacts'], namedInput = caseInput(named, TODAY);
  assert.equal(judge(named, namedInput, 200, { answer: 'Для KAIST нужны онлайн-заявка, личное эссе и сертификат по английскому.' }), 'pass');
  assert.match(judge(named, namedInput, 200, { answer: 'Фаррух, для KAIST нужны онлайн-заявка, личное эссе и сертификат по английскому.' }), /^invented: has Фаррух/);
  assert.match(judge(named, namedInput, 200, { answer: 'Пришли документы для KAIST на farrukh.rahimov@mail.tj, а эссе загрузи на портал.' }), /^invented: foreign link/);
  const chances = byId['06-chances'], chancesInput = caseInput(chances, TODAY);
  assert.match(judge(chances, chancesInput, 200, { answer: 'Шансы неплохие: KAIST смотрит на математику и науки, а не на один балл.' }), /^invented: forbidden/);
  const missing = byId['08-missing-fact'], missingInput = caseInput(missing, TODAY);
  assert.equal(judge(missing, missingInput, 200, { answer: 'На сайте этого нет, проверь на официальной странице: https://admission.kaist.ac.kr/intl-undergraduate/before/sub02' }), 'pass');
  assert.match(judge(missing, missingInput, 200, { answer: 'На сайте этого нет, спроси приёмную комиссию KAIST напрямую.' }), /^missed: no admission/);
});
