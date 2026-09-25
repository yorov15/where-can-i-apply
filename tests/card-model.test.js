import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardModel } from '../js/card-model.js';

const today = '2026-09-14';
const fail = { field: 'schoolYears', status: 'fail', code: 'schoolYears.below-min', params: { min: 12, mine: 11 } };
const vague = { field: 'gpa', status: 'unknown', code: 'gpa.not-measured', params: {} };
const program = {
  id: 'apu',
  name: { ru: 'APU' },
  deadline: null,
  coverage: { tuition: null, living: false, travel: null },
  workaroundFields: ['schoolYears'],
  eligibility: { age: { noLimit: true, note: 'возраст не ограничен', checkedBy: 'assistant' } },
};
const extra = {
  coverageNote: 'Скидка 30–100%',
  applyUrl: 'https://apu.example/apply',
  source: { url: 'https://apu.example', lastVerified: '2026-09-13', approvedBy: 'assistant' },
  textConditions: [
    { ru: 'Главное: 12 лет школы', field: 'schoolYears', kind: 'note' },
    { ru: 'Другие пути: IB или проверка вуза', field: 'schoolYears', kind: 'workaround' },
    { ru: 'Балл смотрят целиком', field: 'gpa', kind: 'note' },
    { ru: 'Нужно записанное интервью', field: null, kind: 'must' },
    { ru: 'Взнос за общежитие 243 600 иен', field: null, kind: 'money' },
    { ru: 'Подача онлайн', field: null, kind: 'steps' },
    { ru: 'Кредитов нет', field: null, kind: 'note' },
  ],
};
const row = (reasons, status) => ({ program, verdict: { status, reasons, attested: ['age'] }, deadline: 'unknown' });

test('обходной путь стоит под отказом, а не в общем списке', () => {
  const model = cardModel(row([fail], 'no'), extra, today);
  assert.deepEqual(model.reasons[0].workarounds, ['Другие пути: IB или проверка вуза']);
  assert.equal(model.reasons[0].noWorkaround, false);
  assert.ok(!model.more.notes.includes('Другие пути: IB или проверка вуза'));
});

test('у размытого требования — слова программы про это поле', () => {
  const model = cardModel(row([vague], 'check'), extra, today);
  assert.deepEqual(model.reasons[0].says, ['Балл смотрят целиком']);
});

test('у требования к частям экзамена показаны сами цифры программы', () => {
  const parts = { field: 'language', status: 'unknown', code: 'language.parts-unknown', params: { test: 'IELTS', min: 6 } };
  const withNumbers = {
    ...extra,
    textConditions: [{ ru: 'Письмо не ниже 6.0, остальные части не ниже 5.5', field: 'language', kind: 'must' }],
  };
  const model = cardModel(row([parts], 'check'), withNumbers, today);
  assert.deepEqual(model.reasons[0].says, ['Письмо не ниже 6.0, остальные части не ниже 5.5']);
});

test('отказ без обходного пути говорит об этом честно', () => {
  const noWay = { ...extra, textConditions: extra.textConditions.filter((c) => c.kind !== 'workaround') };
  assert.equal(cardModel(row([fail], 'no'), noWay, today).reasons[0].noWorkaround, true);
});

test('без деталей не утверждает, что обходного пути нет', () => {
  const model = cardModel(row([fail], 'no'), null, today);
  assert.equal(model.hasDetails, false);
  assert.equal(model.reasons[0].noWorkaround, false);
  assert.deepEqual(model.sections, []);
});

test('разделы по kind, каждое условие один раз', () => {
  const model = cardModel(row([fail], 'no'), extra, today);
  const byKey = Object.fromEntries(model.sections.map((s) => [s.key, s.items]));
  assert.deepEqual(byKey.must, ['Нужно записанное интервью']);
  assert.deepEqual(byKey.money, ['Скидка 30–100%', 'Взнос за общежитие 243 600 иен']);
  assert.deepEqual(byKey.steps, ['Подача онлайн']);
  const all = [
    ...model.reasons.flatMap((r) => [...r.workarounds, ...r.says]),
    ...model.sections.flatMap((s) => s.items),
    ...model.more.notes,
  ];
  assert.equal(new Set(all).size, all.length);
});

test('неразмеченные условия идут одним списком', () => {
  const raw = { ...extra, textConditions: [{ ru: 'Старое условие без тегов' }] };
  const model = cardModel(row([], 'yes'), raw, today);
  assert.deepEqual(model.sections.find((s) => s.key === 'untagged').items, ['Старое условие без тегов']);
});

test('шапка карточки и подвал', () => {
  const model = cardModel(row([fail], 'no'), extra, today);
  assert.equal(model.headline, 'Пока нельзя: нужно 12 лет школы, у тебя 11 · есть обходной путь');
  assert.equal(model.deadlineLine, 'Сроки программа не объявила');
  assert.equal(model.coverageLine, 'Жильё — за свой счёт');
  assert.equal(model.source, 'Проверено по сайту программы 13 сентября 2026, проверял ассистент');
  assert.equal(model.applyUrl, 'https://apu.example/apply');
});

test('«не ограничивает» только на незакрытых карточках', () => {
  assert.deepEqual(cardModel(row([], 'yes'), extra, today).more.attested, ['Возраст: возраст не ограничен (проверил ассистент)']);
  assert.deepEqual(cardModel(row([fail], 'no'), extra, today).more.attested, []);
});

test('давняя проверка (старше 60 дней) помечается в карточке', () => {
  const fresh = cardModel(row([], 'yes'), extra, '2026-09-14');
  assert.equal(fresh.stale, false);
  assert.doesNotMatch(fresh.source, /давние/);
  const old = cardModel(row([], 'yes'), extra, '2026-12-01');
  assert.equal(old.stale, true);
  assert.match(old.source, /Данные давние: сверь условия и сроки на сайте/);
});
