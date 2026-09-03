import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate } from '../js/verdict.js';

const load = async (name) =>
  JSON.parse(await readFile(new URL(`./fixtures/programs/${name}.json`, import.meta.url), 'utf8'));

const me = {
  citizenship: 'TJ',
  schoolCountry: 'TJ',
  schoolYears: 11,
  graduationYear: 2027,
  birthDate: '2008-08-09',
  gpa: { value: 4.8, scale: 'TJ_5' },
  languageTests: [{ test: 'IELTS', score: 7.0 }],
};

test('открытая программа даёт зелёный', async () => {
  assert.equal(evaluate(me, await load('otkrytaya')).status, 'yes');
});

test('закрытая программа даёт красный с причиной по гражданству', async () => {
  const got = evaluate(me, await load('zakrytaya'));
  assert.equal(got.status, 'no');
  assert.equal(got.reasons[0].field, 'citizenship');
});

test('дырявая запись даёт жёлтый, а не зелёный', async () => {
  const got = evaluate(me, await load('dyrjavaya'));
  assert.equal(got.status, 'check');
  assert.ok(got.reasons.length >= 1);
});

test('индекс фикстур перечисляет все три программы', async () => {
  const index = JSON.parse(
    await readFile(new URL('./fixtures/index.json', import.meta.url), 'utf8')
  );
  assert.equal(index.programs.length, 3);
});
