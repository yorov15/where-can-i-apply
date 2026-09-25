import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkExam } from '../js/rules.js';
import { evaluate } from '../js/verdict.js';
import { reasonText } from '../js/wording.js';

const need = (min = 1400) => ({ anyOf: [{ test: 'SAT', min }, { test: 'ACT', min: 32 }], evidence: 'x' });
const me = (...exams) => ({ exams });

test('нет правила про экзамен — экзамен на ответ не влияет', () => {
  assert.equal(checkExam(me(), null).status, 'pass');
});

test('экзамен необязателен (test-optional) — pass', () => {
  assert.equal(checkExam(me(), { optional: true, anyOf: [{ test: 'SAT', min: null }], evidence: 'x' }).status, 'pass');
});

test('балл SAT достаточный — pass', () => {
  assert.equal(checkExam(me({ test: 'SAT', score: 1450 }), need()).status, 'pass');
});

test('ACT засчитывается вместо SAT', () => {
  assert.equal(checkExam(me({ test: 'ACT', score: 33 }), need()).status, 'pass');
});

test('балл ниже порога — fail', () => {
  const out = checkExam(me({ test: 'SAT', score: 1200 }), need());
  assert.equal(out.status, 'fail');
  assert.equal(out.code, 'exam.below');
});

test('ниже порога, но порог только ориентир — unknown', () => {
  const out = checkExam(me({ test: 'SAT', score: 1200 }), { ...need(), advisory: true });
  assert.equal(out.status, 'unknown');
  assert.equal(out.code, 'exam.below-advisory');
});

test('экзамена нет — unknown: его можно сдать', () => {
  const out = checkExam(me(), need());
  assert.equal(out.status, 'unknown');
  assert.equal(out.code, 'exam.no-certificate');
});

test('экзамен отмечен без балла — просим вписать', () => {
  assert.equal(checkExam(me({ test: 'SAT', score: null }), need()).code, 'exam.score-missing');
});

test('порога нет, экзамен есть — хватает отметки', () => {
  const rule = { anyOf: [{ test: 'SAT', min: null }, { test: 'ACT', min: null }], evidence: 'x' };
  assert.equal(checkExam(me({ test: 'SAT', score: null }), rule).status, 'pass');
  assert.equal(checkExam(me(), rule).code, 'exam.no-certificate');
});

test('вердикт: экзамен без порога виден в причинах и читается по-русски', () => {
  const program = { eligibility: { exam: { anyOf: [{ test: 'SAT', min: null }, { test: 'ACT', min: null }], evidence: 'x' } } };
  const verdict = evaluate({ exams: [] }, program, '2026-09-26');
  const reason = verdict.reasons.find((x) => x.field === 'exam');
  assert.ok(reason);
  const text = reasonText(reason);
  assert.match(text.short, /SAT или ACT/);
  assert.equal(text.title, 'Экзамен');
});

test('тексты для всех состояний экзамена есть', () => {
  const options = [{ test: 'SAT', min: 1400 }, { test: 'ACT', min: null }];
  for (const code of ['exam.score-missing', 'exam.below', 'exam.below-advisory', 'exam.no-certificate', 'exam.by-institution', 'exam.not-measured']) {
    const text = reasonText({ code, params: { options, marked: ['SAT'] } });
    assert.ok(text.short && text.detail, code);
  }
});
