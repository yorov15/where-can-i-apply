import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programModel, programRow, stepTag } from '../js/program-view.js';
import { activeTab } from '../js/tabbar.js';

const today = '2026-10-27';
const me = {
  citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11, graduationYear: 2027,
  birthDate: '2009-03-01', gpa: { value: 4.8, scale: 'TJ_5' }, languageTests: [],
};
const ok = { allow: '*', deny: [], evidence: 'x' };
const free = { noLimit: true, evidence: null, checkedBy: 'assistant', checkedAt: '2026-10-01', note: 'нет' };
const program = {
  id: 'demo',
  name: { ru: 'Демо — бакалавриат' },
  hostCountry: 'KR',
  kind: 'university',
  deadline: { closes: '2027-01-15', confidence: 'confirmed' },
  coverage: { tuition: true, living: true, travel: false },
  eligibility: {
    citizenship: ok, schoolCountry: ok, schoolYears: free, graduationYear: free,
    age: free, gpa: free, language: free,
  },
};

test('подходящая программа: фраза про условия, три факта, шагов нет', () => {
  const view = programModel(programRow(program, me, today), { programs: {}, conditions: {} }, today);
  assert.equal(view.model.bucket, 'yes');
  assert.match(view.lead, /подходит под названные условия/);
  assert.deepEqual(view.facts.map(([name]) => name), ['Срок подачи', 'Что покрывает', 'Взнос за заявку']);
  assert.deepEqual(view.steps, []);
});

test('взнос показывается только после загрузки условий, без выдуманной суммы', () => {
  const row = programRow(program, me, today);
  const waiting = programModel(row, { programs: { demo: { applyUrl: 'https://example.org' } }, conditions: {} }, today);
  assert.equal(waiting.facts[2][1], 'Загружается…');

  const loaded = programModel(row, {
    programs: { demo: { applyUrl: 'https://example.org' } },
    conditions: { demo: [{ ru: 'Плата за заявку', kind: 'money', fee: { amount: 90, currency: 'USD' } }] },
  }, today);
  assert.match(loaded.facts[2][1], /^90\s+долл\. США$/u);

  const none = programModel(row, { programs: { demo: {} }, conditions: { demo: [] } }, today);
  assert.equal(none.facts[2][1], 'Не указана');
});

test('у взноса есть собственные источник и дата, без подмены даты остальных правил', () => {
  const source = { url: 'https://example.org/fees', lastVerified: '2026-10-28' };
  const view = programModel(programRow(program, me, today), {
    programs: { demo: { source: { url: 'https://example.org', lastVerified: '2026-09-01' } } },
    conditions: { demo: [{ ru: 'Плата', kind: 'money', fee: { amount: 0, currency: null, source } }] },
  }, today);
  assert.deepEqual(view.feeSource, source);
  const pending = programModel(programRow(program, me, today), { programs: {}, conditions: {} }, today);
  assert.equal(pending.feeSource, null);
});

test('канал приезжает в деталях до ленивых условий и сохраняет этапы и ограничения', () => {
  const routes = [
    { type: 'school', name: 'Школа', url: null, note: 'Сначала номинация.' },
    { type: 'university', name: 'Портал', url: 'https://example.org/apply', note: 'Затем заявка.' },
  ];
  const view = programModel(programRow(program, me, today), {
    programs: { demo: { applyChannel: { routes } } }, conditions: {},
  }, today);
  assert.deepEqual(view.applyRoutes, routes);
  assert.equal(view.facts[2][1], 'Загружается…');
});

test('неизвестный канал не создаёт строку, опасные ссылки не превращаются в способы подачи', () => {
  for (const applyChannel of [undefined, null, { routes: [] }, { routes: 'unknown' },
    { routes: [{ name: 'Опасный', url: 'javascript:alert(1)' }, { name: '', url: 'https://example.org' }] }]) {
    const view = programModel(programRow(program, me, today), {
      programs: { demo: { applyChannel, applyUrl: 'https://example.org/apply' } }, conditions: {},
    }, today);
    assert.deepEqual(view.applyRoutes, []);
  }
});

test('документы и подача идут в дела, остальное — в «Источники и точные требования»', () => {
  const view = programModel(programRow(program, me, today), {
    programs: { demo: {} },
    conditions: {
      demo: [
        { ru: 'Аттестат с переводом', kind: 'documents' },
        { ru: 'Подать через портал', kind: 'steps' },
        { ru: 'Нужен сертификат', kind: 'must' },
      ],
    },
  }, today);
  assert.deepEqual(view.todo.map((s) => s.key), ['documents', 'steps']);
  assert.deepEqual(view.exact.map((s) => s.key), ['must']);
});

test('метка шага: что закроет вуз, что человек', () => {
  assert.equal(stepTag({ code: 'language.not-measured', status: 'unknown' }), 'Уточнить у вуза');
  assert.equal(stepTag({ code: 'gpa.below-min', status: 'fail' }), 'Не хватает');
  assert.equal(stepTag({ code: 'language.score-missing', status: 'unknown' }), 'Проверить');
});

test('адрес программы подсвечивает вкладку «Куда можно»', () => {
  assert.equal(activeTab('#program/kaist'), 'answer');
  assert.equal(activeTab('#programs'), 'answer');
});
