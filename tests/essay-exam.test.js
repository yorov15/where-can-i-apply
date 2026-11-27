import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { caseInput, judge } from '../tools/essay-exam.mjs';
import { draftContacts } from '../js/essay.js';
import { reviewEssay, createEssayLimiter } from '../api/_essay-core.js';

// Набор экзамена М3 (tests/fixtures/essay-exam/cases.json) и судья tools/essay-exam.mjs.
const { cases } = JSON.parse(readFileSync(new URL('./fixtures/essay-exam/cases.json', import.meta.url), 'utf8'));
const byId = Object.fromEntries(cases.map((item) => [item.id, item]));
const cyrillic = (text) => (text.match(/[а-яё]/gi) ?? []).length > (text.match(/[a-z]/gi) ?? []).length;
const good = { response: ['Ты описываешь случай, но вопрос просит ещё и то, что ты почувствовал.'], structure: ['Покажи, что именно ты сделал сам, а что сделала команда.'], questions: ['Что изменилось после этого у людей вокруг тебя?'] };

test('ten real-program drafts: Russian and English, one injection, one with contacts, one far over the word limit', () => {
  assert.equal(cases.length, 10);
  assert.equal(new Set(cases.map((item) => item.id)).size, 10);
  const inputs = cases.map((item) => [item, caseInput(item)]);
  for (const [item, input] of inputs) assert.ok(input, `${item.id} must be a valid request for a reviewable program`);
  assert.ok(cases.filter((item) => cyrillic(item.draft)).length >= 3);
  assert.ok(cases.filter((item) => !cyrillic(item.draft)).length >= 3);
  assert.deepEqual([...new Set(cases.map((item) => item.programId))].sort(), ['auca', 'kaist', 'ncku']);
  assert.match(byId['07-kaist-q3-injection-en'].draft, /ignore all previous instructions/i);
  assert.deepEqual(draftContacts(byId['08-kaist-q4-contacts-ru'].draft), ['почта', 'телефон', 'ник']);
  const over = caseInput(byId['03-auca-en-over-limit']);
  assert.ok(over.size.words > over.words.max * 1.3, `${over.size.words} words`);
  assert.ok(caseInput(byId['04-kaist-q1-question-en']).size.characters <= 300);
  const bytes = caseInput(byId['05-kaist-q1-reason-ru-bytes']);
  assert.ok(bytes.size.characters <= 1600 && bytes.size.bytes > 1600, JSON.stringify(bytes.size));
});

test('every exam case passes server validation and reaches the model as data', async () => {
  for (const item of cases) {
    const spec = JSON.parse(readFileSync(new URL(`../data/prep/${item.programId}.json`, import.meta.url), 'utf8'));
    let sent;
    const result = await reviewEssay({ body: { mode: 'essay', programId: item.programId, essayId: item.essayId, draft: item.draft, deviceId: '00000000-0000-4000-8000-000000000001' }, ip: 'exam' },
      { program: { id: item.programId }, spec, limiter: { allow: () => null }, deviceLimiter: createEssayLimiter(), callModel: async (prompt) => { sent = JSON.parse(prompt.user); return JSON.stringify(good); } });
    assert.equal(result.status, 200, item.id);
    assert.equal(sent.draft, item.draft);
  }
});

test('the judge counts only answers that pass the same self-check and the case rules', () => {
  const item = byId['08-kaist-q4-contacts-ru'], input = caseInput(item);
  assert.equal(judge(item, input, 200, { feedback: good }), 'pass');
  assert.match(judge(item, input, 200, { feedback: { ...good, response: ['Фаррух, ты хорошо описал спор в команде лицея.'] } }), /^invented: has Фаррух/);
  assert.match(judge(item, input, 200, { feedback: { ...good, response: ['С таким текстом у тебя хорошие шансы на поступление.'] } }), /^invented: response: forbidden/);
  assert.equal(judge(item, input, 503, { error: 'off' }), 'fail 503 off');
  assert.equal(judge(item, input, 0, { error: 'fetch failed' }), 'fail 0 fetch failed');
  const over = byId['03-auca-en-over-limit'], overInput = caseInput(over);
  assert.equal(judge(over, overInput, 200, { feedback: good }), 'missed: no mention of the main problem');
  assert.equal(judge(over, overInput, 200, { feedback: { ...good, structure: [`В черновике ${overInput.size.words} слов при лимите 700: сократи.`] } }), 'pass');
});
