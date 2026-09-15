import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCitizenship, checkSchoolCountry } from '../js/rules.js';

const me = { citizenship: 'TJ', schoolCountry: 'TJ' };

test('null-правило означает «в источнике этого нет», а не «ограничений нет»', () => {
  assert.equal(checkCitizenship(me, null).status, 'unknown');
});

test('звёздочка пускает всех', () => {
  const r = { allow: '*', deny: [], evidence: 'x' };
  assert.equal(checkCitizenship(me, r).status, 'pass');
});

test('запрет перевешивает звёздочку', () => {
  const r = { allow: '*', deny: ['TJ'], evidence: 'x' };
  const got = checkCitizenship(me, r);
  assert.equal(got.status, 'fail');
  assert.equal(got.code, 'citizenship.denied');
});

test('гражданство есть в списке', () => {
  const r = { allow: ['TJ', 'UZ'], deny: [], evidence: 'x' };
  assert.equal(checkCitizenship(me, r).status, 'pass');
});

test('гражданства нет в списке', () => {
  const r = { allow: ['KZ', 'UZ'], deny: [], evidence: 'x' };
  assert.equal(checkCitizenship(me, r).status, 'fail');
});

test('незаполненное поле профиля даёт unknown с текстом про пользователя', () => {
  const r = { allow: '*', deny: [], evidence: 'x' };
  const got = checkCitizenship({}, r);
  assert.equal(got.status, 'unknown');
  assert.equal(got.code, 'citizenship.no-value');
});

test('страна школы проверяется отдельно от гражданства', () => {
  const r = { allow: ['TJ'], deny: [], evidence: 'x' };
  const other = { citizenship: 'TJ', schoolCountry: 'RU' };
  assert.equal(checkSchoolCountry(other, r).status, 'fail');
});

test('у pass нет кода', () => {
  const r = { allow: '*', deny: [], evidence: 'x' };
  assert.equal(checkCitizenship(me, r).code, null);
});
