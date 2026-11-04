import test from 'node:test';
import assert from 'node:assert/strict';
import { balanceWarnings, visibleBalance, MAX_WARNINGS } from '../js/balance.js';
import { hideBalance, exportState, importState, loadRouteState, saveRouteState, MAX_BALANCE_HIDDEN } from '../js/route-state.js';

const TODAY = '2026-11-04';
const IELTS_TOEFL = { anyOf: [{ test: 'IELTS', min: 6 }, { test: 'TOEFL_IBT', min: 80 }, { test: 'TOEFL_IBT_2026', min: 4 }] };

// Программа без перекосов по умолчанию: язык не нужен, учёба покрыта,
// сроки разные, страны разные.
let seq = 0;
function program(over = {}) {
  seq += 1;
  return {
    id: over.id ?? `p${seq}`,
    name: { ru: `Программа ${over.id ?? seq} — полное имя` },
    hostCountry: over.hostCountry ?? `C${seq}`,
    coverage: { tuition: true, living: null, travel: null, ...(over.coverage ?? {}) },
    eligibility: { language: over.language ?? null, exam: over.exam ?? null },
    deadline: over.deadline ?? { closes: null, confidence: 'expected' },
  };
}
const state = (over = {}) => ({ version: 2, goals: [], done: {}, statuses: {}, examDates: {}, ...over });
const rules = (warnings) => warnings.map((item) => item.rule);

test('одна цель — никаких предупреждений', () => {
  const goals = [program({ language: IELTS_TOEFL, coverage: { tuition: false } })];
  assert.deepEqual(balanceWarnings({ goals, profile: {}, state: state(), today: TODAY }), []);
});

test('экзамен: все цели ждут один экзамен, которого нет в анкете', () => {
  const goals = [program({ id: 'a', language: IELTS_TOEFL }), program({ id: 'b', language: { anyOf: [{ test: 'IELTS', min: 6.5 }, { test: 'DUOLINGO', min: 110 }] } })];
  const [exam] = balanceWarnings({ goals, profile: { languageTests: [] }, state: state(), today: TODAY });
  assert.equal(exam.rule, 'exam');
  assert.deepEqual(exam.programIds, ['a', 'b']);
  assert.match(exam.text, /^Обе цели ждут один и тот же экзамен — подойдёт IELTS\./);
  assert.match(exam.basis, /условий программ/);
  assert.doesNotMatch(`${exam.text}${exam.action}`, /!|шанс|вероятн/i);
});

test('экзамен: общий список вариантов — «IELTS или TOEFL», две шкалы TOEFL — один экзамен', () => {
  const goals = [program({ language: IELTS_TOEFL }), program({ language: { anyOf: [{ test: 'TOEFL_IBT_2026', min: 4 }, { test: 'IELTS', min: 6 }] } }), program({ language: IELTS_TOEFL })];
  const [exam] = balanceWarnings({ goals, profile: {}, state: state(), today: TODAY });
  assert.match(exam.text, /^Все 3 цели ждут один и тот же экзамен — подойдёт IELTS или TOEFL\./);
});

test('экзамен: «почти все» — с четырёх целей хватает всех, кроме одной', () => {
  const sat = { anyOf: [{ test: 'SAT', min: null }] };
  const goals = [program({ exam: sat }), program({ exam: sat }), program({ exam: sat }), program({})];
  const [exam] = balanceWarnings({ goals, profile: {}, state: state(), today: TODAY });
  assert.equal(exam.rule, 'exam');
  assert.match(exam.text, /^3 из 4 целей ждут один и тот же экзамен — подойдёт SAT\./);
  // При трёх целях «все, кроме одной» не считается.
  const three = balanceWarnings({ goals: [program({ exam: sat }), program({ exam: sat }), program({})], profile: {}, state: state(), today: TODAY });
  assert.ok(!rules(three).includes('exam'));
});

test('экзамен: сданный сертификат или записанная дата снимают предупреждение', () => {
  const goals = [program({ language: IELTS_TOEFL }), program({ language: IELTS_TOEFL })];
  const passed = balanceWarnings({ goals, profile: { languageTests: [{ test: 'TOEFL_IBT_2026', score: null }] }, state: state(), today: TODAY });
  assert.ok(!rules(passed).includes('exam'));
  const booked = balanceWarnings({ goals, profile: {}, state: state({ examDates: { ielts: '2026-12-05' } }), today: TODAY });
  assert.ok(!rules(booked).includes('exam'));
});

test('экзамен: необязательный, рекомендованный, заменяемый и «не измерено» — не требование', () => {
  const soft = [{ ...IELTS_TOEFL, optional: true }, { ...IELTS_TOEFL, advisory: true }, { ...IELTS_TOEFL, alternative: true }, { notMeasured: true }];
  for (const language of soft) {
    const goals = [program({ language }), program({ language })];
    assert.ok(!rules(balanceWarnings({ goals, profile: {}, state: state(), today: TODAY })).includes('exam'), JSON.stringify(language));
  }
});

test('экзамен и сроки: поданные цели не считаются', () => {
  const goals = [program({ id: 's1', language: IELTS_TOEFL }), program({ id: 's2', language: IELTS_TOEFL })];
  const sent = state({ statuses: { s1: { status: 'submitted', since: TODAY } } });
  assert.ok(!rules(balanceWarnings({ goals, profile: {}, state: sent, today: TODAY })).includes('exam'));
});

test('сроки: три цели в семь дней подряд, даже через границу недели', () => {
  const goals = ['2026-12-31', '2027-01-02', '2027-01-06', '2027-03-01'].map((closes) => program({ deadline: { closes, confidence: 'confirmed' } }));
  const [cluster] = balanceWarnings({ goals, profile: {}, state: state(), today: TODAY });
  assert.equal(cluster.rule, 'deadlines');
  assert.equal(cluster.programIds.length, 3);
  assert.match(cluster.text, /^Сроки 3 целей — в одну неделю: с 31 декабря 2026 по 6 января 2027\.$/);
  assert.equal(cluster.basis, 'По срокам из условий программ.');
});

test('сроки: восемь дней — уже не одна неделя; прошедшие сроки не считаются', () => {
  const spread = ['2027-01-01', '2027-01-05', '2027-01-08'].map((closes) => program({ deadline: { closes } }));
  assert.ok(!rules(balanceWarnings({ goals: spread, profile: {}, state: state(), today: TODAY })).includes('deadlines'));
  const past = ['2026-10-01', '2026-10-02', '2026-10-03'].map((closes) => program({ deadline: { closes } }));
  assert.ok(!rules(balanceWarnings({ goals: past, profile: {}, state: state(), today: TODAY })).includes('deadlines'));
});

test('сроки: ожидаемые даты помечены, один день назван одним днём', () => {
  const goals = [1, 2, 3].map(() => program({ deadline: { closes: '2027-01-15', confidence: 'expected' } }));
  const [cluster] = balanceWarnings({ goals, profile: {}, state: state(), today: TODAY });
  assert.match(cluster.text, /в один день, 15 января 2027/);
  assert.match(cluster.basis, /ожидаемая/);
});

test('покрытие: все цели без оплаты учёбы — предупреждение', () => {
  const goals = [program({ coverage: { tuition: false } }), program({ coverage: { tuition: false } })];
  const [coverage] = balanceWarnings({ goals, profile: {}, state: state(), today: TODAY });
  assert.equal(coverage.rule, 'coverage');
  assert.match(coverage.text, /Ни одна из двух целей не покрывает плату за учёбу/);
  assert.match(coverage.basis, /финансировании программ/);
});

test('покрытие: неизвестно ≠ нет', () => {
  const unknown = [program({ coverage: { tuition: false } }), program({ coverage: { tuition: null } })];
  assert.ok(!rules(balanceWarnings({ goals: unknown, profile: {}, state: state(), today: TODAY })).includes('coverage'));
  const allUnknown = [program({ coverage: { tuition: null } }), { ...program({}), coverage: undefined }];
  assert.ok(!rules(balanceWarnings({ goals: allUnknown, profile: {}, state: state(), today: TODAY })).includes('coverage'));
  const oneCovered = [program({ coverage: { tuition: false } }), program({ coverage: { tuition: true } })];
  assert.ok(!rules(balanceWarnings({ goals: oneCovered, profile: {}, state: state(), today: TODAY })).includes('coverage'));
});

test('страна: три цели в одной стране — предупреждение, две — нет, без страны — нет', () => {
  const three = [1, 2, 3].map(() => program({ hostCountry: 'KR' }));
  const [country] = balanceWarnings({ goals: three, profile: {}, state: state(), today: TODAY });
  assert.equal(country.rule, 'country');
  assert.match(country.text, /^Все 3 цели — в одной стране: Южная Корея\.$/);
  const two = [1, 2].map(() => program({ hostCountry: 'KR' }));
  assert.ok(!rules(balanceWarnings({ goals: two, profile: {}, state: state(), today: TODAY })).includes('country'));
  const none = [1, 2, 3].map(() => ({ ...program({}), hostCountry: null }));
  assert.ok(!rules(balanceWarnings({ goals: none, profile: {}, state: state(), today: TODAY })).includes('country'));
});

test('порядок и предел: экзамен, сроки, покрытие, страна — не больше четырёх', () => {
  const goals = [1, 2, 3].map(() => program({ hostCountry: 'JP', language: IELTS_TOEFL, coverage: { tuition: false }, deadline: { closes: '2027-01-10', confidence: 'confirmed' } }));
  const warnings = balanceWarnings({ goals, profile: {}, state: state(), today: TODAY });
  assert.deepEqual(rules(warnings), ['exam', 'deadlines', 'coverage', 'country']);
  assert.ok(warnings.length <= MAX_WARNINGS);
  for (const item of warnings) {
    assert.ok(item.text && item.action && item.basis, item.rule);
    assert.deepEqual(item.programNames, goals.map((goal) => goal.name.ru.split(' — ')[0]));
    assert.doesNotMatch(`${item.text} ${item.action} ${item.basis}`, /!|шанс|вероятн|%/i);
  }
});

test('ключ предупреждения меняется вместе с набором целей', () => {
  const a = program({ id: 'x', coverage: { tuition: false } });
  const b = program({ id: 'y', coverage: { tuition: false } });
  const c = program({ id: 'z', coverage: { tuition: false } });
  const [first] = balanceWarnings({ goals: [a, b], profile: {}, state: state(), today: TODAY });
  const [same] = balanceWarnings({ goals: [b, a], profile: {}, state: state(), today: TODAY });
  const [other] = balanceWarnings({ goals: [a, b, c], profile: {}, state: state(), today: TODAY });
  assert.equal(first.id, same.id);
  assert.notEqual(first.id, other.id);
  assert.ok(first.id.length <= 200);
});

test('скрытие: «Понятно, скрыть» убирает одно предупреждение, остальные остаются', () => {
  const goals = [1, 2, 3].map(() => program({ hostCountry: 'JP', coverage: { tuition: false } }));
  const warnings = balanceWarnings({ goals, profile: {}, state: state(), today: TODAY });
  assert.deepEqual(rules(warnings), ['coverage', 'country']);
  const next = hideBalance(state(), warnings[0].id);
  assert.deepEqual(next.balanceHidden, [warnings[0].id]);
  assert.deepEqual(rules(visibleBalance(warnings, next)), ['country']);
  // Повторное скрытие не дублирует ключ.
  assert.deepEqual(hideBalance(next, warnings[0].id).balanceHidden, [warnings[0].id]);
});

test('хранение: пустой список не хранится, экспорт и импорт сохраняют скрытые', () => {
  assert.ok(!('balanceHidden' in JSON.parse(exportState(state()))));
  assert.ok(!('balanceHidden' in importState(JSON.stringify(state({ balanceHidden: [] })))));
  const hidden = hideBalance(state({ goals: ['a'] }), 'coverage:tuition:abc');
  const back = importState(exportState(hidden));
  assert.deepEqual(back.balanceHidden, ['coverage:tuition:abc']);
  const store = new Map();
  const storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  assert.ok(saveRouteState(hidden, storage));
  assert.deepEqual(loadRouteState(storage).balanceHidden, ['coverage:tuition:abc']);
});

test('хранение: битые ключи отбрасываются, список ограничен', () => {
  const back = importState(JSON.stringify(state({ balanceHidden: ['ok', 7, '', '__proto__', 'ok'] })));
  assert.deepEqual(back.balanceHidden, ['ok']);
  let many = state();
  for (let i = 0; i < MAX_BALANCE_HIDDEN + 5; i += 1) many = hideBalance(many, `k${i}`);
  assert.equal(many.balanceHidden.length, MAX_BALANCE_HIDDEN);
  assert.equal(many.balanceHidden.at(-1), `k${MAX_BALANCE_HIDDEN + 4}`);
});
