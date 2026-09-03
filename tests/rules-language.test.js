import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLanguage } from '../js/rules.js';

const need = { anyOf: [{ test: 'IELTS', min: 6.0 }, { test: 'TOEFL_IBT', min: 72 }], evidence: 'x' };

test('балл выше порога — проходит', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 7.0 }] };
  assert.equal(checkLanguage(me, need).status, 'pass');
});

test('хватает любого одного из перечисленных', () => {
  const me = { languageTests: [{ test: 'TOEFL_IBT', score: 90 }] };
  assert.equal(checkLanguage(me, need).status, 'pass');
});

test('сертификата нет вовсе — надо проверить, а не отказ', () => {
  const me = { languageTests: [] };
  const got = checkLanguage(me, need);
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /можно сдать/);
});

test('сертификат отмечен без результата — надо проверить', () => {
  const me = { languageTests: [{ test: 'IELTS', score: null }] };
  const got = checkLanguage(me, need);
  assert.equal(got.status, 'unknown');
  assert.match(got.message, /без результата/);
});

test('сертификат есть, но балл ниже — отказ', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 5.0 }] };
  assert.equal(checkLanguage(me, need).status, 'fail');
});

test('один сертификат ниже порога, другой выше — проходит', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 5.0 }, { test: 'TOEFL_IBT', score: 90 }] };
  assert.equal(checkLanguage(me, need).status, 'pass');
});

test('пустой список требований — проходит', () => {
  const me = { languageTests: [] };
  assert.equal(checkLanguage(me, { anyOf: [], evidence: 'No language requirement' }).status, 'pass');
});

test('отсутствие правила даёт unknown', () => {
  const me = { languageTests: [{ test: 'IELTS', score: 7.0 }] };
  assert.equal(checkLanguage(me, null).status, 'unknown');
});
