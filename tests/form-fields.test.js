// Поля анкеты живут в двух местах: разметка в index.html и границы в
// js/lib/limits.js. Ни одна из сторон не знает про другую, а расхождение не
// безобидно: applyLimits обращается к f[`score-${test}`] и падает на null,
// если в разметке поля нет. Человек увидит не ошибку в поле, а мёртвую форму.
//
// Тест сторожит именно этот стык — по обоим направлениям.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SCORE_LIMITS } from '../js/lib/limits.js';
import { LANG_TESTS, EXAM_TESTS } from '../js/form.js';
import { COUNTRY } from '../js/profile.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');

const names = (prefix) =>
  new Set([...html.matchAll(new RegExp(`name="${prefix}-([A-Z_0-9]+)"`, 'g'))].map((m) => m[1]));

const hasBoxes = names('has');
const scoreBoxes = names('score');

test('у каждого экзамена из limits.js есть поле в разметке', () => {
  const missing = Object.keys(SCORE_LIMITS).filter((t) => !scoreBoxes.has(t) || !hasBoxes.has(t));
  assert.deepEqual(missing, [], 'в index.html нет полей для этих экзаменов');
});

test('в разметке нет полей экзаменов, которых не знает limits.js', () => {
  const extra = [...scoreBoxes].filter((t) => !(t in SCORE_LIMITS));
  assert.deepEqual(extra, [], 'эти поля анкета не прочитает: их нет в SCORE_LIMITS');
  const extraBoxes = [...hasBoxes].filter((t) => !(t in SCORE_LIMITS));
  assert.deepEqual(extraBoxes, []);
});

test('анкета спрашивает балл только у экзаменов из своих списков', () => {
  const asked = new Set([...LANG_TESTS, ...EXAM_TESTS]);
  for (const test of asked) {
    assert.ok(test in SCORE_LIMITS, `${test} нет в SCORE_LIMITS — scoreProblem не проверит балл`);
    assert.ok(scoreBoxes.has(test), `${test} нет в разметке — applyLimits упадёт`);
  }
  assert.deepEqual([...scoreBoxes].filter((t) => !asked.has(t)), [], 'поле есть, но form.js его не читает');
});

// Границы продублированы в разметке ради подсказки мобильной клавиатуре.
// applyLimits их перезапишет, но расхождение означает, что до первого
// вызова JS человек видит в поле не те стрелки.
test('границы в разметке совпадают с limits.js', () => {
  for (const [test, limit] of Object.entries(SCORE_LIMITS)) {
    const tag = html.match(new RegExp(`<input type="number" name="score-${test}"[^>]*>`))?.[0];
    assert.ok(tag, `нет поля score-${test}`);
    assert.match(tag, new RegExp(`min="${limit.min}"`), `min у ${test}`);
    assert.match(tag, new RegExp(`max="${limit.max}"`), `max у ${test}`);
    assert.match(tag, new RegExp(`step="${limit.step}"`), `step у ${test}`);
  }
});

// Гражданство и страна школы читаются из одной разметки, а подписываются
// словарём в profile.js. Незанесённый код не ломает форму — он тихо
// показывается в итоговой строке как «US» вместо «США».
test('каждое гражданство из разметки есть в словаре стран', () => {
  const select = html.match(/<select name="citizenship">([\s\S]*?)<\/select>/)?.[1];
  assert.ok(select, 'не нашёл список гражданства');
  const codes = [...select.matchAll(/value="([A-Z]{2})"/g)].map((m) => m[1]);
  assert.ok(codes.length >= 6);
  assert.deepEqual(codes.filter((c) => !(c in COUNTRY)), [], 'эти коды покажутся человеку как есть');
});

test('США и Россия есть среди гражданств', () => {
  const select = html.match(/<select name="citizenship">([\s\S]*?)<\/select>/)?.[1];
  assert.match(select, /value="US">США</);
  assert.match(select, /value="RU">Россия</);
});
