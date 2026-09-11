import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notLimitedItems } from '../js/render.js';

// За каждой строкой стоит подпись человека, проверившего страницу, и его
// собственные слова. Раньше это была одна строка «не ограничивает:
// страну школы, годы школы, возраст», а слова вырезались ещё при сборке —
// и человек читал карточку как «данных нет», хотя данные были собраны.

const program = {
  eligibility: {
    schoolCountry: { noLimit: true, note: 'таджикский аттестат назван в таблице по странам' },
    age: { noLimit: true },
  },
};

test('каждое поле — отдельной строкой', () => {
  assert.equal(notLimitedItems(program, ['schoolCountry', 'age']).length, 2);
});

test('несёт слова человека, а не общую фразу', () => {
  const [line] = notLimitedItems(program, ['schoolCountry']);
  assert.match(line, /таджикский аттестат назван в таблице по странам/);
});

test('поле называет по-русски, а не именем из кода', () => {
  const [line] = notLimitedItems(program, ['schoolCountry']);
  assert.match(line, /^Страна школы:/);
  assert.doesNotMatch(line, /schoolCountry/);
});

test('без заметки говорит «не ограничено», а не молчит', () => {
  assert.deepEqual(notLimitedItems(program, ['age']), ['Возраст: не ограничено']);
});

test('не говорит про нехватку данных', () => {
  for (const line of notLimitedItems(program, ['schoolCountry', 'age'])) {
    assert.doesNotMatch(line, /не сказано|неизвестн|нет данных/);
  }
});

test('незнакомое поле не роняет строку и не теряется', () => {
  assert.match(notLimitedItems({ eligibility: {} }, ['somethingNew'])[0], /somethingNew/);
});
