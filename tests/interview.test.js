import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  interviewFor, quoteLang, questionsFor, GENERAL_QUESTIONS, startSession, advance, skip, remaining, milestone,
  formatClock, spoken, normalizeInterview, saveAnswer, setChecks, removeAnswer, addQuestion, removeQuestion,
  setSettings, settingsOf, answersFor, interviewOf, CHECKS, MAX_ANSWERS, MAX_CUSTOM, DEFAULT_SETTINGS,
} from '../js/interview.js';
import { exportState, importState, loadRouteState, saveRouteState, ROUTE_STATE_KEY } from '../js/route-state.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'data/interview.json'), 'utf8'));
const programs = Object.fromEntries(readdirSync(join(root, 'data/programs')).filter(name => name.endsWith('.json'))
  .map(name => [name.slice(0, -5), JSON.parse(readFileSync(join(root, 'data/programs', name), 'utf8'))]));
const base = { version: 2, goals: [], done: {} };

// ——— что нашла сборка ———

test('каждая цитата собеседования дословно лежит в условиях своей программы', () => {
  const ids = Object.keys(data.programs);
  assert.ok(ids.length >= 50, `найдено ${ids.length}`);
  for (const id of ids) {
    const evidence = (programs[id]?.textConditions ?? []).map(item => item.evidence ?? '');
    const entry = interviewFor(data, id);
    assert.ok(entry, id);
    for (const quote of [...entry.quotes, ...entry.topics]) {
      assert.ok(evidence.some(text => text.includes(quote.evidence)), `${id}: ${quote.evidence}`);
      assert.match(quote.evidence, /interview|intewiew|面接|면접|面试|面試|собеседовани|интервью/i, id);
    }
  }
});

test('«собеседования нет» и стороннее интервью не дают кнопку', () => {
  for (const id of ['amherst-college', 'columbia-university', 'nyu', 'williams-college', 'keio-pearl', 'washu', 'copenhagen']) {
    assert.equal(interviewFor(data, id), null, id);
  }
  for (const id of ['cambridge', 'ada-university', 'tokyo', 'unist']) assert.ok(interviewFor(data, id), id);
});

test('запись без цитаты или с чужой ссылкой не годится', () => {
  const fake = { programs: {
    empty: { quotes: [{ evidence: '  ' }], topics: [] },
    bad: { quotes: [{ evidence: 'Interview required.' }], url: 'javascript:alert(1)', lastVerified: '2026-13-01' },
  } };
  assert.equal(interviewFor(fake, 'empty'), null);
  assert.equal(interviewFor(fake, 'missing'), null);
  assert.equal(interviewFor(fake, '__proto__'), null);
  assert.equal(interviewFor(null, 'bad'), null);
  const bad = interviewFor(fake, 'bad');
  assert.equal(bad.url, null);
  assert.equal(bad.lastVerified, null);
});

test('язык цитаты для экранного диктора', () => {
  assert.equal(quoteLang('Interview required'), 'en');
  assert.equal(quoteLang('서류 및 면접 전형'), 'ko');
  assert.equal(quoteLang('日本語で行い、個人面接とします。'), 'ja');
  assert.equal(quoteLang('笔试面试'), 'zh');
  assert.equal(quoteLang('собеседование'), 'ru');
});

// ——— вопросы ———

test('вопросы: сначала от программы, потом общие с английским, потом свои', () => {
  const entry = interviewFor(data, 'constructor-university');
  const state = addQuestion(base, 'c:1', '  Почему информатика?  ');
  const { program, general, custom } = questionsFor('constructor-university', entry, state);
  assert.equal(program.length, 1);
  assert.equal(program[0].from, 'program');
  assert.ok(program[0].evidence.includes('technical questions'));
  assert.ok(general.length >= 10 && general.length <= 15);
  assert.ok(general.every(item => item.from === 'general' && item.ru && /^[A-Z]/.test(item.en)));
  assert.equal(new Set(general.map(item => item.id)).size, general.length);
  assert.deepEqual(custom, [{ id: 'c:1', ru: 'Почему информатика?', from: 'custom' }]);
  assert.deepEqual(questionsFor(null, null, base).program, []);
});

// ——— таймер ———

test('таймер: обдумывание → ответ → самопроверка по часам, а не по тикам', () => {
  const start = startSession({ thinkSec: 30, answerSec: 120 }, 0);
  assert.equal(start.phase, 'think');
  assert.equal(remaining(start, 0), 30);
  assert.equal(remaining(start, 29_100), 1);
  const answer = advance(start, 30_000);
  assert.equal(answer.phase, 'answer');
  assert.equal(remaining(answer, 30_000), 120);
  // Вкладку усыпили на 10 минут: обе фазы прошли, ответ занял всё время.
  const late = advance(start, 600_000);
  assert.equal(late.phase, 'review');
  assert.equal(late.usedSec, 120);
  assert.equal(remaining(late, 600_000), 0);
});

test('таймер можно пропустить: время ответа считается от нажатия', () => {
  let session = startSession(undefined, 1000);
  assert.deepEqual([session.thinkSec, session.answerSec], [DEFAULT_SETTINGS.thinkSec, DEFAULT_SETTINGS.answerSec]);
  session = skip(session, 5000);
  assert.equal(session.phase, 'answer');
  assert.equal(remaining(session, 5000), 120);
  session = skip(session, 5000 + 61_400);
  assert.equal(session.phase, 'review');
  assert.equal(session.usedSec, 61);
  assert.equal(skip(session, 999_999), session);
});

test('неизвестная длительность заменяется на значение по умолчанию', () => {
  const session = startSession({ thinkSec: 7, answerSec: 99999 }, 0);
  assert.equal(session.thinkSec, 30);
  assert.equal(session.answerSec, 120);
  assert.equal(startSession({ thinkSec: 90, answerSec: 300 }, 0).answerSec, 300);
});

test('диктор слышит только рубежи, а не каждую секунду', () => {
  const session = skip(startSession({ thinkSec: 30, answerSec: 120 }, 0), 0);
  const keys = new Set();
  const said = [];
  for (let ms = 0; ms <= 120_000; ms += 1000) {
    const mark = milestone(advance(session, ms), ms);
    if (!keys.has(mark.key)) { keys.add(mark.key); said.push(mark.text); }
  }
  assert.deepEqual(said, ['Отвечай: 2 минуты.', 'Осталась минута.', 'Осталось 10 секунд.', 'Ответ закончен. Отметь самопроверку.']);
  const short = skip(startSession({ thinkSec: 15, answerSec: 60 }, 0), 0);
  assert.equal(milestone(short, 0).key, 'answer');
  assert.equal(milestone(short, 45_000).key, 'answer');
  assert.equal(milestone(short, 51_000).key, 'answer:10');
  assert.equal(milestone(startSession({ thinkSec: 15 }, 0), 10_000).key, 'think');
});

test('часы и слова', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(9), '0:09');
  assert.equal(formatClock(125), '2:05');
  assert.equal(spoken(30), '30 секунд');
  assert.equal(spoken(21), '21 секунда');
  assert.equal(spoken(60), '1 минута');
  assert.equal(spoken(120), '2 минуты');
  assert.equal(spoken(300), '5 минут');
  assert.equal(spoken(90), '1 минута 30 секунд');
});

// ——— хранение ———

const answer = (id, extra = {}) => ({ id, questionId: 'g:about', question: 'Расскажи о себе.', date: '2026-11-04', text: 'Я из Душанбе.', usedSec: 70, answerSec: 120, checks: [], ...extra });

test('ответ, отметки и удаление', () => {
  let state = saveAnswer(base, answer('a:1', { programId: 'cambridge' }));
  assert.equal(answersFor(state, 'g:about').length, 1);
  state = setChecks(state, 'a:1', ['answered', 'example', 'bogus', 'example']);
  assert.deepEqual(interviewOf(state).answers[0].checks, ['answered', 'example']);
  assert.equal(interviewOf(state).answers[0].programId, 'cambridge');
  assert.equal(setChecks(state, 'a:missing', ['time']), state);
  state = removeAnswer(state, 'a:1');
  assert.equal(state.interview, undefined, 'пустую запись не храним');
  assert.equal(saveAnswer(base, { ...answer('a:2'), date: 'вчера' }), null);
});

test('ответов не больше предела, текст обрезается', () => {
  let state = base;
  for (let i = 0; i < MAX_ANSWERS + 5; i++) state = saveAnswer(state, answer(`a:${i}`, { text: 'я'.repeat(5000) }));
  const answers = interviewOf(state).answers;
  assert.equal(answers.length, MAX_ANSWERS);
  assert.equal(answers[0].id, 'a:5');
  assert.equal(answers[0].text.length, 3000);
});

test('свои вопросы: пустой не добавляется, повтор не дублируется, предел соблюдён', () => {
  assert.equal(addQuestion(base, 'c:1', '   '), null);
  assert.equal(addQuestion(base, 'bad id', 'Вопрос'), null);
  let state = addQuestion(base, 'c:1', 'Вопрос');
  assert.equal(addQuestion(state, 'c:2', 'Вопрос'), state);
  for (let i = 2; i <= MAX_CUSTOM; i++) state = addQuestion(state, `c:${i}`, `Вопрос ${i}`);
  assert.equal(interviewOf(state).custom.length, MAX_CUSTOM);
  assert.equal(addQuestion(state, 'c:x', 'Ещё'), null);
  state = removeQuestion(state, 'c:1');
  assert.equal(interviewOf(state).custom.length, MAX_CUSTOM - 1);
});

test('настройки времени хранятся, только если отличаются от обычных', () => {
  let state = setSettings(base, { thinkSec: 60 });
  assert.deepEqual(settingsOf(state), { thinkSec: 60, answerSec: 120 });
  state = setSettings(state, { answerSec: 7 });
  assert.equal(settingsOf(state).answerSec, 120);
  assert.equal(setSettings(base, { thinkSec: 30 }).interview, undefined);
});

test('битые ответы отбрасываются по одному и не роняют маршрут', () => {
  const clean = normalizeInterview({ answers: [answer('a:1'), { id: 'a:2' }, answer('a:1'), 'мусор', answer('__proto__')],
    custom: [{ id: 'c:1', text: 'Свой' }, { id: 'x', text: 'без префикса' }], settings: { thinkSec: 15, answerSec: 60 } });
  assert.deepEqual(clean.answers.map(item => item.id), ['a:1']);
  assert.deepEqual(clean.custom, [{ id: 'c:1', text: 'Свой' }]);
  assert.deepEqual(clean.settings, { thinkSec: 15, answerSec: 60 });
  assert.equal(normalizeInterview('мусор'), null);
  assert.equal(normalizeInterview({}), null);
  const state = importState(JSON.stringify({ ...base, goals: ['cambridge'], interview: { answers: 'мусор' } }));
  assert.deepEqual(state.goals, ['cambridge']);
  assert.equal(state.interview, undefined);
});

test('экспорт и импорт переносят ответы; старый файл без репетиций не меняется', () => {
  const old = exportState(base);
  assert.ok(!old.includes('interview'));
  assert.equal(exportState(importState(old)), old);
  const state = saveAnswer(addQuestion(base, 'c:1', 'Свой вопрос'), answer('a:1', { checks: ['time'] }));
  const restored = importState(exportState(state));
  assert.deepEqual(restored.interview, interviewOf(state));
  assert.equal(restored.version, 2);
});

test('ответы переживают перезагрузку через localStorage', () => {
  const store = new Map();
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  const state = saveAnswer(loadRouteState(storage), answer('a:1'));
  assert.ok(saveRouteState(state, storage));
  assert.ok(store.get(ROUTE_STATE_KEY).includes('Я из Душанбе.'));
  assert.equal(interviewOf(loadRouteState(storage)).answers[0].text, 'Я из Душанбе.');
  assert.equal(CHECKS.length, 5);
});

test('общие вопросы не выдают себя за вопросы программы', () => {
  assert.ok(GENERAL_QUESTIONS.every(item => !('evidence' in item)));
});
