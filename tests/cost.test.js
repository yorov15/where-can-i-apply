import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money, feeOf, feeCell, planCost, costText } from '../js/cost.js';

const prog = (id, name) => ({ id, name: { ru: name } });
const withFee = (fee) => ({ textConditions: [{ ru: 'x', kind: 'money' }, { ru: 'плата', kind: 'money', fee }] });
const details = {
  programs: {
    mit: withFee({ amount: 75, currency: 'USD' }),
    cornell: withFee({ amount: 85, currency: 'USD' }),
    ntu: withFee({ amount: 25, currency: 'SGD' }),
    bowdoin: withFee({ amount: 70, currency: 'USD', waivedForAid: true }),
    gist: withFee({ amount: 0, currency: 'KRW' }),
    yale: { textConditions: [{ ru: 'без платы в данных', kind: 'money' }] },
  },
};
const planned = [
  prog('mit', 'MIT — приём на бакалавриат'), prog('cornell', 'Корнелл — помощь'), prog('ntu', 'NTU — Сингапур'),
  prog('bowdoin', 'Боудин — помощь'), prog('gist', 'GIST — стипендия'), prog('yale', 'Йель — помощь'), prog('nodata', 'Без данных'),
];

test('сумма пишется с пробелами тысяч и названием валюты', () => {
  assert.equal(money(10000, 'KZT'), '10 000 тенге');
  assert.equal(money(75, 'USD'), '75 долл. США');
  assert.equal(money(5, 'XXX'), '5 XXX');
});

test('плата берётся из первой размеченной условия; нет разметки — null', () => {
  assert.deepEqual(feeOf(details.programs.mit), { amount: 75, currency: 'USD' });
  assert.equal(feeOf(details.programs.yale), null);
  assert.equal(feeOf(null), null);
});

test('ячейка сравнения: нет платы, не указана, сумма, снимается', () => {
  assert.equal(feeCell(null), 'Не указана');
  assert.equal(feeCell({ amount: 0, currency: 'KRW' }), 'Нет');
  assert.equal(feeCell({ amount: 75, currency: 'USD' }), '75 долл. США');
  assert.match(feeCell({ amount: 70, currency: 'USD', waivedForAid: true }), /снимается при заявке на помощь/);
});

test('итог: валюты не смешиваются и не переводятся, снимаемая и нулевая плата не входят', () => {
  const cost = planCost(planned, details);
  assert.deepEqual(cost.totals, [{ currency: 'USD', amount: 160 }, { currency: 'SGD', amount: 25 }]);
  assert.deepEqual(cost.paid, ['MIT', 'Корнелл', 'NTU']);
  assert.deepEqual(cost.free, ['GIST']);
  assert.equal(cost.waived.length, 1);
  assert.match(cost.waived[0], /^Боудин \(70/);
  assert.deepEqual(cost.unknown, ['Йель', 'Без данных']);
});

test('текст: честно говорит про неизвестное и не считает его нулём', () => {
  const text = costText(planCost(planned, details));
  assert.match(text, /Плата за подачу: 160 долл\. США \+ 25 сингапурских долл\. \(MIT, Корнелл, NTU\)\./);
  assert.match(text, /Без платы: GIST\./);
  assert.match(text, /снимают сами.*Боудин/);
  assert.match(text, /этих программ на собранных страницах не нашли, итог может быть больше: Йель, Без данных\./);
});

test('одна программа без данных — единственное число; пустой план — пустая строка', () => {
  assert.match(costText(planCost([prog('nodata', 'Без данных')], details)), /Плату этой программы/);
  assert.equal(costText(planCost([], details)), '');
});
