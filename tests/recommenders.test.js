import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectRecommendations, countInQuote, countLine, needLine, normalizeRecommenders, recommendersOf, saveRecommender,
  removeRecommender, setRecommenderStatus, setAskedOn, setLeadWeeks, leadWeeksOf, markAsked, askByDate, recommenderActions,
  requestText, teacherMemo, DEFAULT_LEAD_WEEKS } from '../js/recommenders.js';
import { importState, exportState, loadRouteState } from '../js/route-state.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const program = id => JSON.parse(readFileSync(join(root, 'data/programs', `${id}.json`), 'utf8'));
const doc = (ru, evidence = '') => ({ ru, evidence, kind: 'documents', field: null });
const base = () => ({ version: 2, goals: ['a', 'b', 'c'], hoursPerWeek: 4, scores: {}, examDates: {}, examFormats: {}, retakeBuffers: {}, done: {}, weekPlan: {}, carryTasks: [], studyStarted: null, lastReview: null, statuses: {} });
const goal = (id, closes, extra = {}) => ({ id, name: `${id.toUpperCase()} — описание`, deadline: { closes, state: 'open', confidence: 'confirmed' }, ...extra });

// ——— детектор на настоящих данных ———

test('находит письма и число из цитаты: Colby 3, Macalester 2, Bard 2, NYU 1', () => {
  assert.deepEqual(detectRecommendations(program('colby-college')).count, { n: 3, mod: 'exact' });
  assert.deepEqual(detectRecommendations(program('macalester-college')).count, { n: 2, mod: 'exact' });
  assert.deepEqual(detectRecommendations(program('bard-college')).count, { n: 2, mod: 'exact' });
  const nyu = detectRecommendations(program('nyu'));
  assert.equal(nyu.need, 'required');
  assert.deepEqual(nyu.count, { n: 1, mod: 'exact' });
  assert.ok(nyu.items.every(item => item.evidence.length > 0), 'у каждого пункта есть цитата');
});

test('числа нет в цитате — числа нет и в ответе', () => {
  // Йель: «from two teachers and one counselor» — не «N letters», считать не беремся.
  const yale = detectRecommendations(program('yale-college'));
  assert.equal(yale.need, 'required');
  assert.equal(yale.count, null);
  assert.match(needLine(yale), /в цитате числа нет/);
});

test('особые условия: скидка APU, отдельные программы McGill, «может потребовать» King Saud', () => {
  const apu = detectRecommendations(program('apu-japan'));
  assert.equal(apu.need, 'conditional');
  assert.match(apu.items[0].ru, /только при заявке на скидку/);
  assert.equal(detectRecommendations(program('mcgill')).need, 'conditional');
  assert.equal(detectRecommendations(program('king-saud')).need, 'conditional');
});

test('по желанию: KAIST «до 2 писем», а у NYU Shanghai первое письмо обязательно', () => {
  const kaist = detectRecommendations(program('kaist'));
  assert.equal(kaist.need, 'optional');
  assert.equal(countLine(kaist.count), 'до 2 писем');
  const shanghai = detectRecommendations(program('nyu-shanghai'));
  assert.equal(shanghai.need, 'required');
  assert.deepEqual(shanghai.count, { n: 1, mod: 'exact' });
});

test('«не требуются» — отдельный ответ, а «не нужно просить отсрочку» — нет', () => {
  assert.equal(detectRecommendations(program('penn-state')).need, 'notRequired');
  assert.equal(detectRecommendations(program('lmu')).need, 'notRequired');
  assert.equal(detectRecommendations(program('columbia-university')).need, 'required');
});

test('ложные срабатывания отброшены: MEXT «по рекомендации посольства», ECNU саморекомендация, Amherst', () => {
  assert.equal(detectRecommendations(program('mext-japan')), null);
  assert.equal(detectRecommendations(program('ecnu')), null);
  assert.equal(detectRecommendations(program('amherst-college')), null);
  // У Tufts пункт про эссе («оценивают наравне с … рекомендациями») не считается письмом.
  const tufts = detectRecommendations(program('tufts-university'));
  assert.ok(tufts.items.every(item => !/^Эссе/.test(item.ru)));
});

test('запасной путь: у Nottingham Ningbo письмо названо только в общем пункте, и цитата о нём', () => {
  const found = detectRecommendations(program('nottingham-ningbo'));
  assert.equal(found.need, 'required');
  assert.deepEqual(found.count, { n: 1, mod: 'exact' });
  // KFUPM: в русском тексте письмо есть, а цитата про собеседование — не берём.
  assert.equal(detectRecommendations(program('kfupm')), null);
});

test('куда отправлять — только из текста: Hokkaido почтой и в конверте, Common App без «онлайн»', () => {
  assert.deepEqual(detectRecommendations(program('hokkaido-mjsp')).channels, ['mail', 'sealed']);
  assert.deepEqual(detectRecommendations(program('tufts-university')).channels, ['commonapp']);
  assert.deepEqual(detectRecommendations(program('cambridge')).channels, ['ucas']);
  assert.deepEqual(detectRecommendations(program('harvard-college')).channels, []);
});

test('по всему каталогу находится больше сотни программ, и у каждого пункта есть цитата', () => {
  let found = 0;
  for (const file of readdirSync(join(root, 'data/programs'))) {
    const data = JSON.parse(readFileSync(join(root, 'data/programs', file), 'utf8'));
    const result = detectRecommendations(data);
    if (!result) continue;
    found += 1;
    for (const item of result.items) assert.ok(item.evidence, `${data.id}: пункт без цитаты`);
  }
  assert.ok(found >= 110 && found <= 160, `нашлось ${found}`);
});

// ——— число из цитаты ———

test('countInQuote: итог, части, «минимум», скобки, китайский и номера пунктов', () => {
  assert.deepEqual(countInQuote('We require one counselor recommendation and two teacher recommendations.'), { n: 3, mod: 'exact' });
  assert.deepEqual(countInQuote('We require three letters of recommendation for each applicant: one from your school counselor and two from teachers'), { n: 3, mod: 'exact' });
  assert.deepEqual(countInQuote('Teacher recommendations: Two are required.'), { n: 2, mod: 'exact' });
  assert.deepEqual(countInQuote('Teacher recommendations Please request at least two.'), { n: 2, mod: 'atLeast' });
  assert.deepEqual(countInQuote('At least one Letter of Reference is required.'), { n: 1, mod: 'atLeast' });
  assert.deepEqual(countInQuote('Teacher Recommendations (2)'), { n: 2, mod: 'exact' });
  assert.deepEqual(countInQuote('推荐信2份，由申请人所在学校出具'), { n: 2, mod: 'exact' });
  assert.equal(countInQuote('12 Letter of Recommendation (Form 5)'), null);
  assert.equal(countInQuote('some study fields require also an essay or recommendation letters'), null);
  assert.equal(countInQuote(''), null);
});

test('детектор на синтетике: порядок строгости и пустой ответ', () => {
  assert.equal(detectRecommendations({ textConditions: [doc('Паспорт', 'Passport')] }), null);
  const mixed = detectRecommendations({ textConditions: [doc('Рекомендация — по желанию', 'Optional recommendation'), doc('Рекомендация учителя', 'One teacher recommendation')] });
  assert.equal(mixed.need, 'required');
  assert.deepEqual(mixed.count, { n: 1, mod: 'exact' });
  const note = detectRecommendations({ textConditions: [{ ru: 'Рекомендации не рассматриваются', evidence: 'Recommendation letters are not considered', kind: 'note' }] });
  assert.equal(note, null, 'пункты-заметки детектор не читает');
});

// ——— хранение ———

test('старое состояние без рекомендателей экспортируется байт в байт как раньше', () => {
  const text = JSON.stringify(base());
  assert.equal(exportState(importState(text)), exportState(JSON.parse(text)));
  assert.equal(Object.hasOwn(importState(text), 'recommenders'), false);
});

test('рекомендатели переживают экспорт и импорт; испорченная запись не стирает маршрут', () => {
  let state = saveRecommender(base(), { id: 'p1', name: '  Гульнора   Рахимовна ', role: 'учитель математики', goalIds: ['a', 'b'] });
  state = setRecommenderStatus(state, 'p1', 'a', 'agreed', '2026-11-04');
  const back = importState(exportState(state));
  assert.deepEqual(back.recommenders, { people: [{ id: 'p1', name: 'Гульнора Рахимовна', role: 'учитель математики', askedOn: '2026-11-04',
    goals: [{ goalId: 'a', status: 'agreed' }, { goalId: 'b', status: 'planned' }] }] });
  const broken = JSON.parse(exportState(state));
  broken.recommenders.people.push({ id: '', name: 'x' }, { id: 'p2' }, 'строка');
  broken.recommenders.leadWeeks = 99;
  const loaded = loadRouteState({ getItem: () => JSON.stringify(broken) });
  assert.deepEqual(loaded.goals, ['a', 'b', 'c']);
  assert.equal(loaded.recommenders.people.length, 1);
  assert.equal(Object.hasOwn(loaded.recommenders, 'leadWeeks'), false);
  assert.equal(normalizeRecommenders('мусор'), null);
});

test('изменение целей сохраняет статусы, удаление последнего убирает раздел', () => {
  let state = saveRecommender(base(), { id: 'p1', name: 'А', role: '', goalIds: ['a'] });
  state = setRecommenderStatus(state, 'p1', 'a', 'sent', '2026-11-04');
  state = saveRecommender(state, { id: 'p1', name: 'А', role: 'физика', goalIds: ['a', 'c'] });
  assert.deepEqual(recommendersOf(state).people[0].goals, [{ goalId: 'a', status: 'sent' }, { goalId: 'c', status: 'planned' }]);
  assert.equal(saveRecommender(state, { id: 'p2', name: '   ', goalIds: ['a'] }), null);
  assert.equal(setRecommenderStatus(state, 'p1', 'b', 'asked', '2026-11-04'), null, 'цели b у человека нет');
  state = removeRecommender(state, 'p1');
  assert.equal(Object.hasOwn(state, 'recommenders'), false);
});

test('дата просьбы: ставится при «попросил», меняется руками и очищается', () => {
  let state = saveRecommender(base(), { id: 'p1', name: 'А', goalIds: ['a', 'b'] });
  assert.equal(recommendersOf(state).people[0].askedOn, null);
  state = markAsked(state, 'p1', '2026-11-04');
  assert.equal(recommendersOf(state).people[0].askedOn, '2026-11-04');
  assert.deepEqual(recommendersOf(state).people[0].goals.map(item => item.status), ['asked', 'asked']);
  state = setAskedOn(state, 'p1', '2026-10-30');
  assert.equal(recommendersOf(state).people[0].askedOn, '2026-10-30');
  assert.equal(setAskedOn(state, 'p1', '30.10.2026'), null);
  assert.equal(recommendersOf(setAskedOn(state, 'p1', '')).people[0].askedOn, null);
});

test('недели «заранее»: по умолчанию 6, меняются от 1 до 20, 6 не хранится', () => {
  const state = saveRecommender(base(), { id: 'p1', name: 'А', goalIds: ['a'] });
  assert.equal(leadWeeksOf(state), DEFAULT_LEAD_WEEKS);
  assert.equal(leadWeeksOf(setLeadWeeks(state, 10)), 10);
  assert.equal(setLeadWeeks(state, 0), null);
  assert.equal(setLeadWeeks(state, 21), null);
  assert.equal(Object.hasOwn(setLeadWeeks(setLeadWeeks(state, 10), 6).recommenders, 'leadWeeks'), false);
});

// ——— «Сегодня» ———

test('askByDate: срок минус N недель', () => {
  assert.equal(askByDate('2027-01-01'), '2026-11-20');
  assert.equal(askByDate('2027-01-01', 2), '2026-12-18');
  assert.equal(askByDate(null), null);
});

test('дело на «Сегодня» — за 7 дней до нашей даты и позже, одно на человека', () => {
  let state = saveRecommender(base(), { id: 'p1', name: 'Гульнора Рахимовна', goalIds: ['a', 'b'] });
  state = saveRecommender(state, { id: 'p2', name: 'Фарход', goalIds: ['c'] });
  const goals = [goal('a', '2026-12-19'), goal('b', '2027-01-01'), goal('c', '2027-03-01')];
  const actions = recommenderActions(state, goals, '2026-11-04');
  assert.equal(actions.length, 1, 'Фарходу просить рано: до 18 января');
  assert.deepEqual(actions[0], { id: 'p1', name: 'Гульнора Рахимовна', goalIds: ['a', 'b'], goalNames: ['A', 'B'],
    askBy: '2026-11-07', deadline: '2026-12-19', overdue: false });
  assert.equal(recommenderActions(state, goals, '2026-10-30').length, 0, 'за 8 дней ещё рано');
  assert.equal(recommenderActions(state, goals, '2026-11-10')[0].overdue, true);
});

test('без спама: попросил, подал заявку, закрытый срок или нет срока — дела нет', () => {
  const state = saveRecommender(base(), { id: 'p1', name: 'А', goalIds: ['a'] });
  const today = '2026-11-04';
  assert.equal(recommenderActions(markAsked(state, 'p1', today), [goal('a', '2026-12-01')], today).length, 0);
  assert.equal(recommenderActions({ ...state, statuses: { a: { status: 'submitted', since: today } } }, [goal('a', '2026-12-01')], today).length, 0);
  assert.equal(recommenderActions(state, [goal('a', '2026-12-01', { deadline: { closes: '2026-12-01', state: 'closed' } })], today).length, 0);
  assert.equal(recommenderActions(state, [goal('a', null)], today).length, 0);
  assert.equal(recommenderActions(state, [], today).length, 0, 'цель убрана из пути');
});

// ——— тексты ———

const one = [{ nameRu: 'Гарвардский колледж', nameEn: 'Harvard College', closes: '2027-01-01', channels: ['commonapp'] }];
const two = [...one, { nameRu: 'Стипендия Китая', nameEn: 'Chinese Government Scholarship', closes: '2026-12-19', channels: [] }];

test('просьба по-русски: программа, срок, куда отправлять или «уточню и пришлю»', () => {
  const text = requestText({ teacher: 'Гульнора Рахимовна', entries: one, lang: 'ru' });
  assert.match(text, /^Здравствуйте, Гульнора Рахимовна!/);
  assert.match(text, /Гарвардский колледж, срок подачи 1 января 2027/);
  assert.match(text, /Куда отправлять: через Common App/);
  const many = requestText({ teacher: 'Гульнора Рахимовна', entries: two, lang: 'ru' });
  assert.match(many, /— Стипендия Китая: срок подачи 19 декабря 2026; куда отправлять — уточню и пришлю/);
  assert.match(many, /— Гарвардский колледж: срок подачи 1 января 2027; отправлять через Common App/);
  assert.doesNotMatch(text + many, /шанс|вероятн|уважаем|с глубоким/i);
  assert.ok(text.length < 600, 'письмо короткое');
});

test('просьба по-английски: английское название и дата', () => {
  const text = requestText({ teacher: 'Ms. Smith', entries: one, lang: 'en' });
  assert.match(text, /^Dear Ms\. Smith,/);
  assert.match(text, /Harvard College \(deadline January 1, 2027\)/);
  assert.match(text, /How to send it: through the Common App/);
  const unknown = requestText({ teacher: 'Ms. Smith', entries: [{ nameRu: 'Китай', nameEn: null, closes: null, channels: [] }], lang: 'en' });
  assert.match(unknown, /deadline not announced yet/);
  assert.match(unknown, /I will confirm and let you know/);
});

test('памятка: программы и сроки; «Мои работы» — только названия записей портфолио', () => {
  const memo = teacherMemo({ entries: two, experiences: [{ title: 'Школьная метеостанция', period: '2025–2026' }, { title: 'Олимпиада по физике' }] });
  assert.match(memo, /— Гарвардский колледж: до 1 января 2027, отправлять через Common App/);
  assert.match(memo, /Мои работы:\n— Школьная метеостанция \(2025–2026\)\n— Олимпиада по физике/);
  assert.doesNotMatch(teacherMemo({ entries: one, experiences: [] }), /Мои работы/);
});
