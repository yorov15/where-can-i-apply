import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROUTE_STATE_KEY,
  ROUTE_VERSION,
  loadRouteState,
  saveRouteState,
  setGoal,
  toggleStep,
  clearProgress,
  exportState,
  importState,
  isDone,
  buildRoute,
  routeText,
} from '../js/route.js';
import { evaluate } from '../js/verdict.js';

const TODAY = '2026-10-27';

// ——— фикстуры: реалистичные записи, упрощённые до полей, которые читает движок ———

// Тот же школьник, что в tests/verdict.test.js: 11 лет школы, IELTS сдан.
const ME = {
  citizenship: 'TJ',
  schoolCountry: 'TJ',
  schoolYears: 11,
  graduationYear: 2027,
  birthDate: '2008-08-09',
  gpa: { value: 4.8, scale: 'TJ_5' },
  languageTests: [{ test: 'IELTS', score: 7.0 }],
};

// Сертификата нет — по языку будет причина и шаг.
const NO_LANG = { ...ME, languageTests: [] };

const track = (code, name) => ({
  code,
  name,
  format: 'Формат экзамена — официальные факты.',
  scoring: 'Шкала — официальные факты.',
  site: 'https://example.org/exam',
  source: { url: 'https://example.org/exam', lastVerified: '2026-10-27' },
});

const TRACKS = {
  ielts: track('ielts', 'IELTS Academic'),
  toefl: track('toefl', 'TOEFL iBT'),
  sat: track('sat', 'SAT'),
  act: track('act', 'ACT'),
  duolingo: track('duolingo', 'Duolingo English Test'),
};

// KAIST из data/index.json: язык рекомендован, школа — notMeasured,
// срок подтверждён.
const KAIST = {
  id: 'kaist',
  name: { ru: 'KAIST — приём иностранцев на бакалавриат' },
  hostCountry: 'KR',
  kind: 'university',
  coverage: { tuition: true, living: true, travel: null },
  eligibility: {
    citizenship: { allow: '*', deny: ['KR'] },
    schoolCountry: { noLimit: true },
    schoolYears: { notMeasured: true },
    graduationYear: { maxRelative: 'applicationYear' },
    age: { noLimit: true },
    gpa: { noLimit: true },
    language: {
      advisory: true,
      anyOf: [
        { test: 'IELTS', min: 6.5 },
        { test: 'TOEFL_IBT', min: 83 },
        { test: 'TOEFL_IBT_2026', min: 4.5 },
      ],
    },
    exam: null,
  },
  deadline: { opens: '2026-11-10', closes: '2027-01-14', recurring: 'annual', confidence: 'confirmed' },
  workaroundFields: [],
  hasDocuments: true,
};

const conditions = (...items) => items;

const DOC_ONE = 'Нужны официальные выписки (транскрипты) из всех школ, где учился.';
const DOC_TWO = 'Копия паспорта или национального удостоверения личности как подтверждение гражданства.';
const MONEY_TEXT = 'Вступительный взнос платят все, кроме граждан наименее развитых стран по списку ООН. Размер взноса — 80 долларов США.';
const STEPS_TEXT = 'Две волны приёма на осень: ранняя закрывается 22 октября 2026, обычная — 14 января 2027. Сменить волну после оплаты взноса нельзя.';
const NOTE_TEXT = 'Отбор целостный, критерии не раскрываются.';
const WORKAROUND_TEXT = 'Если 11 лет школы не засчитают, спросить вуз о подготовительном годе заранее.';

const KAIST_CONDITIONS = conditions(
  { field: null, kind: 'steps', ru: STEPS_TEXT },
  { field: 'citizenship', kind: 'money', ru: MONEY_TEXT, fee: { amount: 80, currency: 'USD' } },
  { field: null, kind: 'documents', ru: DOC_ONE },
  { field: null, kind: 'documents', ru: DOC_TWO },
  { field: null, kind: 'documents', ru: DOC_TWO }, // дубль: одна галочка, не две
  { field: 'schoolYears', kind: 'note', ru: NOTE_TEXT },
);

const PREPARED = {
  id: 'kaist',
  checked: '2026-10-27',
  tests: ['ielts', 'toefl'],
  note: 'Ранняя волна закрылась 22.10.2026, идёшь в обычную.',
};

const programOf = ({ eligibility, ...rest } = {}) => ({
  ...KAIST,
  ...rest,
  eligibility: { ...KAIST.eligibility, ...(eligibility ?? {}) },
});

const build = (overrides = {}) => buildRoute({
  program: KAIST,
  conditions: KAIST_CONDITIONS,
  profile: ME,
  today: TODAY,
  prepared: null,
  tracks: TRACKS,
  state: null,
  ...overrides,
});

const phaseSteps = (route, phase) => route.steps.filter((step) => step.phase === phase);
const stepOf = (route, kind) => route.steps.find((step) => step.kind === kind);

const store = (initial) => {
  const map = new Map(initial === undefined ? [] : [[ROUTE_STATE_KEY, initial]]);
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
};

const brokenStore = {
  getItem() { throw new Error('приватный режим'); },
  setItem() { throw new Error('приватный режим'); },
};

const EMPTY_STATE = { version: ROUTE_VERSION, goal: null, done: [] };

// ——— состояние ———

test('пустое хранилище даёт пустое состояние своей версии', () => {
  assert.deepEqual(loadRouteState(store()), EMPTY_STATE);
  assert.deepEqual(loadRouteState(undefined), EMPTY_STATE);
});

test('битый JSON, массив и чужая версия дают пустое состояние', () => {
  for (const raw of [
    'не json',
    '[]',
    '{"version":2,"goal":null,"done":[]}',
    '{"version":1,"goal":5,"done":[]}',
    '{"version":1,"goal":null,"done":"x"}',
  ]) {
    assert.deepEqual(loadRouteState(store(raw)), EMPTY_STATE, raw);
  }
});

test('состояние сохраняется и читается обратно', () => {
  const s = store();
  const state = setGoal(toggleStep(loadRouteState(s), 'kaist:apply:abc'), 'kaist');
  saveRouteState(state, s);
  assert.deepEqual(loadRouteState(s), state);
});

test('недоступное хранилище не ломает ни сохранение, ни чтение', () => {
  assert.doesNotThrow(() => saveRouteState(EMPTY_STATE, brokenStore));
  assert.deepEqual(loadRouteState(brokenStore), EMPTY_STATE);
});

test('setGoal меняет цель в новом объекте и не трогает отметки', () => {
  const original = { version: ROUTE_VERSION, goal: null, done: ['a'] };
  const next = setGoal(original, 'kaist');
  assert.equal(next.goal, 'kaist');
  assert.deepEqual(next.done, ['a']);
  assert.equal(original.goal, null);
  assert.notEqual(next, original);
  assert.equal(setGoal(next, null).goal, null);
});

test('toggleStep включает и выключает отметку, исходное состояние цело', () => {
  const original = { version: ROUTE_VERSION, goal: 'kaist', done: ['a'] };
  const added = toggleStep(original, 'b');
  assert.deepEqual(added.done, ['a', 'b']);
  assert.deepEqual(original.done, ['a']);
  assert.notEqual(added.done, original.done);
  assert.deepEqual(toggleStep(added, 'a').done, ['b']);
  assert.deepEqual(toggleStep(added, '').done, ['a', 'b']);
});

test('clearProgress убирает отметки, цель остаётся', () => {
  const original = { version: ROUTE_VERSION, goal: 'kaist', done: ['a', 'b'] };
  const cleared = clearProgress(original);
  assert.deepEqual(cleared.done, []);
  assert.equal(cleared.goal, 'kaist');
  assert.deepEqual(original.done, ['a', 'b']);
  assert.deepEqual(clearProgress(undefined), EMPTY_STATE);
});

test('экспорт и импорт возвращают то же состояние', () => {
  const state = { version: ROUTE_VERSION, goal: 'kaist', done: ['x:test:1', 'kaist:apply:2'] };
  const text = exportState(state);
  assert.deepEqual(JSON.parse(text), state);
  assert.deepEqual(importState(text), state);
});

test('мусор в importState — null, а не половина состояния', () => {
  for (const text of [
    '',
    'не json',
    '[]',
    'null',
    '"строка"',
    '{"version":2,"goal":null,"done":[]}',
    '{"version":1,"goal":5,"done":[]}',
    '{"version":1,"goal":null,"done":"x"}',
  ]) {
    assert.equal(importState(text), null, text);
  }
  assert.equal(importState(null), null);
  assert.equal(importState(undefined), null);
});

test('isDone знает про отметку и не падает на пустом состоянии', () => {
  assert.equal(isDone({ version: ROUTE_VERSION, goal: null, done: ['a'] }, 'a'), true);
  assert.equal(isDone({ version: ROUTE_VERSION, goal: null, done: ['a'] }, 'b'), false);
  assert.equal(isDone(null, 'a'), false);
  assert.equal(isDone(undefined, 'a'), false);
});

// ——— правила 1: подача ———

test('срок объявлен — шаг подачи с датой, дедлайном и подтверждением', () => {
  const route = build();
  const apply = stepOf(route, 'apply');
  assert.equal(apply.title, 'Подать заявку до 14 января 2027');
  assert.equal(apply.due, '2027-01-14');
  assert.equal(apply.detail, 'дата подтверждена');
  assert.equal(apply.phase, 'apply');
  assert.equal(apply.track, null);
  assert.equal(apply.done, false);
  assert.deepEqual(route.goal.deadline, {
    closes: '2027-01-14',
    confidence: 'confirmed',
    state: 'upcoming',
    daysLeft: 79,
  });
});

test('ожидаемая дата помечена как ожидаемая', () => {
  const route = build({ program: programOf({ deadline: { closes: '2027-01-14', confidence: 'expected' } }) });
  assert.equal(stepOf(route, 'apply').detail, 'дата ожидаемая: вуз ещё не объявил её на этот цикл');
  assert.equal(route.goal.deadline.confidence, 'expected');
});

test('срок закрыт — шаг говорит о закрытии, дедлайна у шага нет', () => {
  const route = build({ program: programOf({ deadline: { closes: '2026-09-30', confidence: 'confirmed' } }) });
  const apply = stepOf(route, 'apply');
  assert.equal(apply.title, 'Приём закрыт 30 сентября 2026');
  assert.equal(apply.due, null);
  assert.equal(route.goal.deadline.state, 'closed');
  assert.equal(route.goal.deadline.daysLeft, null);
});

test('срока нет — шаг отправляет следить за страницей приёма', () => {
  const route = build({ program: programOf({ deadline: null }) });
  const apply = stepOf(route, 'apply');
  assert.equal(apply.title, 'Срок подачи не объявлен — следи за страницей приёма');
  assert.equal(apply.due, null);
  assert.deepEqual(route.goal.deadline, { closes: null, confidence: null, state: 'unknown', daysLeft: null });
});

// ——— правила 2: экзамены ———

test('без сертификата — один шаг на поле, варианты через «или», трек первого варианта', () => {
  const route = build({ profile: NO_LANG });
  const tests = phaseSteps(route, 'tests');
  assert.equal(tests.length, 1);
  const step = tests[0];
  assert.equal(step.kind, 'test');
  assert.equal(step.title, 'Сдать IELTS от 6.5');
  assert.match(step.detail, /TOEFL по старой шкале от 83/);
  assert.match(step.detail, / или /);
  assert.match(step.detail, /^Программа советует /);
  assert.equal(step.track, 'ielts');
  assert.equal(step.due, null);
  assert.ok(route.gaps.some((reason) => reason.field === 'language'));
});

test('поле pass — шага нет и причины по нему нет', () => {
  const route = build();
  assert.equal(phaseSteps(route, 'tests').length, 0);
  assert.equal(route.gaps.some((reason) => reason.field === 'language'), false);
});

test('экзамен вуз не требует — шага нет', () => {
  const route = build({
    program: programOf({
      eligibility: { exam: { optional: true, anyOf: [{ test: 'SAT', min: null }] } },
    }),
    profile: { ...ME, exams: [] },
  });
  assert.equal(phaseSteps(route, 'tests').length, 0);
});

test('SAT и ACT: отдельный шаг, порога нет — называется только экзамен', () => {
  const route = build({
    program: programOf({
      eligibility: { exam: { anyOf: [{ test: 'SAT', min: null }, { test: 'ACT', min: null }] } },
    }),
  });
  const tests = phaseSteps(route, 'tests');
  assert.equal(tests.length, 1);
  assert.equal(tests[0].title, 'Сдать SAT');
  assert.equal(tests[0].detail, 'Подойдёт SAT или ACT.');
  assert.equal(tests[0].track, 'sat');
});

test('prepared.tests добавляет шаг только для трека, которого нет в правилах', () => {
  const route = build({
    prepared: { ...PREPARED, tests: ['ielts', 'toefl', 'sat'] },
  });
  const tests = phaseSteps(route, 'tests');
  assert.deepEqual(tests.map((step) => step.track), ['sat']);
  assert.equal(tests[0].title, 'Сдать SAT');
});

test('трек из prepared без загруженного файла шага не даёт: название взять неоткуда', () => {
  const route = build({ prepared: { ...PREPARED, tests: ['mext'] } });
  assert.equal(phaseSteps(route, 'tests').length, 0);
});

test('язык из prepared, названный правилами, не превращается во второй шаг', () => {
  const route = build({ profile: NO_LANG, prepared: PREPARED });
  const tests = phaseSteps(route, 'tests');
  assert.equal(tests.length, 1);
  assert.equal(tests[0].title, 'Сдать IELTS от 6.5');
});

// ——— правило 3: вопросы в приёмную ———

test('11 лет школы при отказе или неизвестности — вопрос в приёмную комиссию', () => {
  const route = build({ program: programOf({ eligibility: { schoolYears: { min: 12 } } }) });
  const inquiry = phaseSteps(route, 'inquiry');
  assert.equal(inquiry.length, 1);
  assert.equal(inquiry[0].title, 'Уточнить у приёмной комиссии, принимают ли 11-летнюю школу');
  assert.equal(inquiry[0].kind, 'inquiry');
  assert.equal(inquiry[0].track, null);
  assert.ok(route.gaps.some((reason) => reason.field === 'schoolYears' && reason.status === 'fail'));
});

test('workaround-условие даёт шаг со своим текстом', () => {
  const route = build({
    program: programOf({ eligibility: { schoolYears: { min: 11 } } }),
    conditions: conditions(
      { field: 'schoolYears', kind: 'workaround', ru: WORKAROUND_TEXT },
      { field: null, kind: 'documents', ru: DOC_ONE },
    ),
  });
  const inquiry = phaseSteps(route, 'inquiry');
  assert.equal(inquiry.length, 1);
  assert.equal(inquiry[0].title, WORKAROUND_TEXT);
});

test('вопрос про 11 лет и workaround идут вместе, вопрос — первым', () => {
  const route = build({
    program: programOf({ eligibility: { schoolYears: { min: 12 } } }),
    conditions: conditions({ field: 'schoolYears', kind: 'workaround', ru: WORKAROUND_TEXT }),
  });
  assert.deepEqual(phaseSteps(route, 'inquiry').map((step) => step.title), [
    'Уточнить у приёмной комиссии, принимают ли 11-летнюю школу',
    WORKAROUND_TEXT,
  ]);
});

test('школа не 11 лет — вопроса про 11-летнюю школу нет', () => {
  const route = build({ profile: { ...ME, schoolYears: 12 } });
  assert.equal(phaseSteps(route, 'inquiry').length, 0);
});

// ——— правило 4: документы ———

test('документы: заголовок — текст условия, повторы не дают второй галочки', () => {
  const docs = phaseSteps(build(), 'docs');
  assert.deepEqual(docs.map((step) => step.title), [DOC_ONE, DOC_TWO]);
  assert.ok(docs.every((step) => step.kind === 'document' && step.phase === 'docs'));
});

test('условий нет — один шаг запросить список документов', () => {
  const route = build({ conditions: [] });
  assert.equal(route.conditionsLoaded, true);
  const docs = phaseSteps(route, 'docs');
  assert.equal(docs.length, 1);
  assert.equal(docs[0].title, 'Запросить список документов на странице приёма');
});

test('условия не приехали — документов не строим, ждём перезагрузки', () => {
  const route = build({ conditions: null });
  assert.equal(route.conditionsLoaded, false);
  assert.equal(phaseSteps(route, 'docs').length, 0);
});

test('заметки и процедура подачи в документы не попадают', () => {
  const titles = phaseSteps(build(), 'docs').map((step) => step.title);
  assert.deepEqual(titles.includes(NOTE_TEXT), false);
  assert.deepEqual(titles.includes(STEPS_TEXT), false);
});

// ——— правило 5: деньги ———

test('деньги: шаг на условие money', () => {
  const money = phaseSteps(build(), 'money');
  assert.equal(money.length, 1);
  assert.equal(money[0].title, MONEY_TEXT);
  assert.equal(money[0].kind, 'fee');
});

test('денег в условиях нет — шаг уточнить плату', () => {
  const route = build({ conditions: [] });
  const money = phaseSteps(route, 'money');
  assert.deepEqual(money.map((step) => step.title), ['Уточнить плату за подачу на странице приёма']);
});

// ——— правило 6: неделя ———

test('неделя: невыполненные дела по фазам, подача при далёком сроке не входит', () => {
  const week = build().week;
  assert.equal(week.length, 4);
  assert.deepEqual(week.map((step) => step.phase), ['inquiry', 'docs', 'docs', 'money']);
  assert.equal(week.some((step) => step.kind === 'apply'), false);
});

test('неделя: за 30 дней до срока подача входит последней', () => {
  const route = build({
    program: programOf({ deadline: { closes: '2026-11-15', confidence: 'confirmed' } }),
  });
  assert.equal(route.goal.deadline.daysLeft, 19);
  assert.equal(route.week.at(-1).kind, 'apply');
  assert.ok(route.week.length <= 5);
});

test('неделя: выполненные дела не попадают, подача тоже', () => {
  const route = build();
  const done = [route.steps[0].id, route.steps[1].id];
  const state = { version: ROUTE_VERSION, goal: 'kaist', done };
  const next = build({ state, program: programOf({ deadline: { closes: '2026-11-15', confidence: 'confirmed' } }) });
  assert.equal(next.week.some((step) => done.includes(step.id)), false);
  assert.equal(next.stats.done, 2);
});

test('неделя: из многих дел берём пять', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ field: null, kind: 'documents', ru: `Документ номер ${i + 1}.` }));
  // Школа не 11 лет: без вопроса в приёмную в неделю попадут только документы.
  const week = build({ profile: { ...ME, schoolYears: 12 }, conditions: conditions(...many) }).week;
  assert.equal(week.length, 5);
  assert.ok(week.every((step) => step.kind === 'document'));
});

// ——— правило 7: счётчик ———

test('stats: всего, сделано, процент — целое число', () => {
  const route = build();
  assert.deepEqual(route.stats, { total: 5, done: 0, percent: 0 });
  const state = { version: ROUTE_VERSION, goal: 'kaist', done: [route.steps[0].id, route.steps[1].id] };
  assert.deepEqual(build({ state }).stats, { total: 5, done: 2, percent: 40 });
});

test('процент округляется до целого: 1 из 3 — 33', () => {
  const route = build({
    profile: { ...ME, schoolYears: 12 },
    conditions: conditions(
      { field: null, kind: 'documents', ru: 'Справка из школы с датой выпуска.' },
      { field: null, kind: 'money', ru: 'Взнос за рассмотрение — 10 долларов США.' },
    ),
  });
  assert.equal(route.stats.total, 3);
  const state = { version: ROUTE_VERSION, goal: 'kaist', done: [route.steps[0].id] };
  const stats = build({
    profile: { ...ME, schoolYears: 12 },
    conditions: conditions(
      { field: null, kind: 'documents', ru: 'Справка из школы с датой выпуска.' },
      { field: null, kind: 'money', ru: 'Взнос за рассмотрение — 10 долларов США.' },
    ),
    state,
  }).stats;
  assert.deepEqual(stats, { total: 3, done: 1, percent: 33 });
  assert.ok(Number.isInteger(stats.percent));
});

// ——— id, состояние внутри маршрута, служебные поля ———

test('id шага стабилен: два вызова дают одинаковые id, формат — программа:вид:хеш', () => {
  const first = build();
  const second = build();
  assert.deepEqual(first.steps.map((step) => step.id), second.steps.map((step) => step.id));
  for (const step of first.steps) {
    assert.match(step.id, /^kaist:(test|inquiry|document|fee|apply):[a-z0-9]+$/);
  }
});

test('состояние связывает галочку с шагом после пересборки', () => {
  const route = build();
  const state = setGoal(toggleStep(loadRouteState(store()), route.steps[0].id), 'kaist');
  const next = build({ state });
  assert.equal(next.steps[0].done, true);
  assert.equal(next.steps[1].done, false);
  assert.equal(next.stats.done, 1);
  assert.equal(isDone(state, next.steps[0].id), true);
});

test('prepared=null: маршрут строится, флаг полный, заметок нет', () => {
  const route = build({ prepared: null });
  assert.equal(route.prepared, false);
  assert.deepEqual(route.notes, []);
  assert.equal(route.steps.length > 0, true);
});

test('prepared с заметкой: флаг полный, заметка и процедура подачи на месте', () => {
  const route = build({ prepared: PREPARED });
  assert.equal(route.prepared, true);
  assert.deepEqual(route.notes, [PREPARED.note]);
  assert.deepEqual(route.applyNotes, [STEPS_TEXT]);
});

test('цель и разрыв берутся из программы и evaluate без своих формулировок', () => {
  const route = build();
  assert.equal(route.id, 'kaist');
  assert.deepEqual(route.goal, {
    name: 'KAIST — приём иностранцев на бакалавриат',
    country: 'KR',
    kind: 'university',
    deadline: { closes: '2027-01-14', confidence: 'confirmed', state: 'upcoming', daysLeft: 79 },
    coverage: { tuition: true, living: true, travel: null },
  });
  assert.deepEqual(route.gaps, evaluate(ME, KAIST, TODAY).reasons);
});

// ——— правило 8: текст для родителя ———

test('текст: цель, срок, чего не хватает, дела недели и счёт', () => {
  const text = routeText(build());
  assert.match(text, /KAIST/);
  assert.match(text, /Срок: до 14 января 2027/);
  assert.match(text, /Чего не хватает: Уточнить у приёмной комиссии/);
  assert.match(text, /Сейчас: 1\. /);
  assert.match(text, /Сделано 0 из 5/);
  assert.ok(text.length <= 1200);
});

test('текст: закрытый и необъявленный срок называются словами', () => {
  const closed = routeText(build({ program: programOf({ deadline: { closes: '2026-09-30', confidence: 'confirmed' } }) }));
  assert.match(closed, /Срок: приём закрыт 30 сентября 2026/);
  const unknown = routeText(build({ program: programOf({ deadline: null }) }));
  assert.match(unknown, /Срок: не объявлен/);
});

test('текст после отметок: «сделано N из M» растёт', () => {
  const route = build();
  const state = { version: ROUTE_VERSION, goal: 'kaist', done: [route.steps[0].id, route.steps[1].id] };
  assert.match(routeText(build({ state })), /Сделано 2 из 5/);
});

test('текст не длиннее 1200 знаков даже на длинных условиях и названии', () => {
  const longProgram = programOf({ name: { ru: 'Очень длинное название программы '.repeat(20) } });
  const longConditions = conditions(
    { field: null, kind: 'documents', ru: 'Длинное описание документа. '.repeat(40) },
    { field: null, kind: 'documents', ru: 'Ещё одно длинное описание. '.repeat(40) },
    { field: 'schoolYears', kind: 'workaround', ru: 'Длинный обходной путь. '.repeat(40) },
  );
  const text = routeText(build({ program: longProgram, conditions: longConditions }));
  assert.ok(text.length <= 1200, `длина ${text.length}`);
  assert.match(text, /Сделано 0 из/);
});
