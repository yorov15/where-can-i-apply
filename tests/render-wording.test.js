import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notLimitedLine } from '../js/render.js';

// За этой строкой стоит подпись человека, проверившего страницу. Раньше
// она звучала как «на странице не сказано ничего про...» — формально
// верно, а читается как «данных нет». На большинстве карточек это была
// единственная строка между вердиктом и списком условий, и человек делал
// ровно тот вывод, который она подсказывала: инструмент пустой.

test('строка говорит про программу, а не про нехватку данных', () => {
  const line = notLimitedLine(['age', 'gpa']);
  assert.match(line, /не ограничивает/);
  assert.doesNotMatch(line, /не сказано|неизвестн|нет данных/);
});

test('перечисляет поля по-русски, а не именами из кода', () => {
  const line = notLimitedLine(['schoolCountry', 'graduationYear']);
  assert.match(line, /страну школы/);
  assert.match(line, /год выпуска/);
  assert.doesNotMatch(line, /schoolCountry|graduationYear/);
});

test('говорит, что за этим стоит проверка, а не молчание источника', () => {
  assert.match(notLimitedLine(['age']), /проверено/);
});

test('незнакомое поле не роняет строку и не теряется', () => {
  assert.match(notLimitedLine(['somethingNew']), /somethingNew/);
});
