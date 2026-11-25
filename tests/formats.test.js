import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measure, count, MISSING_LABELS } from '../js/formats/measure.js';
import { activityLine } from '../js/formats/activity.js';
import { awardLine } from '../js/formats/award.js';
import { cv } from '../js/formats/cv.js';
import { preflight } from '../js/formats/preflight.js';

const club = { id: 'e1', kind: 'community', title: 'Шахматный клуб', role: 'Организовал клуб.', actions: 'Набрал 12 учеников;',
  result: 'Турнир раз в месяц', period: '2025–2026', hoursPerWeek: 3, weeksPerYear: 30, grades: [10, 11], goals: [{ goalId: 'alpha', why: '' }] };
const olympiad = { id: 'e2', kind: 'study', title: 'Олимпиада по физике', place: '2 место', level: 'district', period: '2025',
  proof: 'certificate', actions: 'Решил задачи', result: 'Диплом', goals: [{ goalId: 'alpha', why: '' }] };

test('счётчик: символы Юникода, слова, лишнее и источник предела', () => {
  assert.equal(count('Ёж 🙂', 'chars'), 4);
  assert.equal(count('  два   слова ', 'words'), 2);
  const source = { evidence: 'up to 150 characters', url: 'https://example.org/form' };
  const over = measure('a'.repeat(160), { unit: 'chars', max: 150, limitSource: source });
  assert.deepEqual([over.used, over.over, over.max], [160, 10, 150]);
  assert.deepEqual(over.limitSource, source);
  const free = measure('текст', { limitSource: source });
  assert.deepEqual([free.max, free.over, free.limitSource], [null, 0, null], 'без предела нет и источника');
});

test('строка активности склеивает поля ученика и ничего не дописывает', () => {
  const line = activityLine(club, { unit: 'chars', max: 150 });
  assert.equal(line.text, 'Организовал клуб. Набрал 12 учеников. Турнир раз в месяц');
  assert.deepEqual(line.missing, []);
  assert.equal(line.over, 0);
  const empty = activityLine({ title: 'Черновик' });
  assert.equal(empty.text, '');
  assert.deepEqual(empty.missing, ['role', 'actions', 'result', 'hours', 'weeks', 'grades']);
  const codes = MISSING_LABELS.map(([code]) => code);
  assert.ok(empty.missing.every(code => codes.includes(code)), 'у каждого кода есть подпись');
});

test('строка награды: место, уровень, когда; без подтверждения — в missing', () => {
  assert.equal(awardLine(olympiad).text, 'Олимпиада по физике, 2 место, уровень: район или город, 2025');
  assert.deepEqual(awardLine(olympiad).missing, []);
  assert.deepEqual(awardLine({ title: 'Грамота', proof: 'none' }).missing, ['level', 'place', 'period', 'proof']);
});

test('CV: награды отдельно, порядок под цель, остальные следом', () => {
  const extra = { id: 'e3', kind: 'community', title: 'Субботник', role: 'Участник' };
  const result = cv([club, olympiad, extra], { order: ['e3', 'e2'] });
  assert.deepEqual(result.sections.map(section => section.title), ['Награды', 'Инициатива']);
  assert.deepEqual(result.sections[1].lines.map(item => item.entryId), ['e3', 'e1']);
  assert.match(result.text, /^Награды\n• Олимпиада по физике \(2025\)/);
});

test('проверка перед отправкой: пять правил, null — нечего проверять', () => {
  const table = { rows: [{ type: 'recommendation', goals: [{ goalId: 'alpha', need: 'required', count: 2 }] }] };
  const recommenders = { people: [{ id: 'p1', goals: [{ goalId: 'alpha', status: 'sent' }] }, { id: 'p2', goals: [{ goalId: 'alpha', status: 'agreed' }] }] };
  // Сравнение по точному названию записи: падежи («олимпиаде») не ловит.
  const essay = 'Шахматный клуб. Олимпиада по физике. Субботник. Всё это я делал в школе.';
  const extra = { id: 'e3', kind: 'community', title: 'Субботник', goals: [{ goalId: 'alpha', why: '' }] };
  const checks = preflight({ goalId: 'alpha', table, entries: [club, olympiad, extra], recommenders,
    lines: [{ entryId: 'e1', over: 0 }, { entryId: 'e2', over: 5 }], essays: [essay] });
  const by = Object.fromEntries(checks.map(item => [item.rule, item]));
  assert.deepEqual(Object.keys(by), ['limits', 'content', 'essayOverlap', 'proof', 'recommenders']);
  assert.deepEqual([by.limits.ok, by.limits.entryIds], [false, ['e2']]);
  assert.deepEqual([by.content.ok, by.content.entryIds], [false, ['e3']]);
  assert.equal(by.essayOverlap.ok, false);
  assert.equal(by.proof.ok, true);
  assert.equal(by.recommenders.ok, false);
  assert.equal(by.recommenders.ru, 'Письма отправлены: 1 из 2.');
  const blank = preflight({ goalId: 'beta', table, entries: [club] });
  assert.ok(blank.every(item => item.ok === null), 'без строк, записей, эссе и писем проверять нечего');
});
