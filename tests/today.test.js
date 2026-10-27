import test from 'node:test';
import assert from 'node:assert/strict';
import { todayModel } from '../js/today-view.js';

const today = '2026-10-27';
const goal = (id, closes, extra = {}) => ({ id, name: `${id} — программа`, deadline: { closes, state: 'open', confidence: 'confirmed', ...extra } });
const task = (taskId, done, extra = {}) => ({ taskId, title: `Дело ${taskId}`, minutes: 45, done, day: null, url: null, ...extra });

test('ближайший срок — самый ранний из открытых, закрытые не считаются', () => {
  const model = todayModel({
    route: { goals: [goal('b', '2027-01-23'), goal('a', '2027-01-14'), goal('old', '2026-09-01', { state: 'closed' })] },
    weekly: null, study: null, today,
  });
  assert.equal(model.nearest.id, 'a');
  assert.equal(model.daysToNearest, 79);
});

test('«сейчас» — первое невыполненное дело недели', () => {
  const model = todayModel({
    route: { goals: [] },
    weekly: { week: { key: 'w', start: '2026-10-26', tasks: [task('1', true), task('2', false), task('3', false)] } },
    study: null, today,
  });
  assert.equal(model.next.taskId, '2');
  assert.equal(model.doneCount, 1);
  assert.equal(model.doneMinutes, 45);
});

test('даты: выбранные дни, последний день экзамена и подача, по возрастанию, не больше четырёх', () => {
  const model = todayModel({
    route: { goals: [goal('a', '2027-01-14'), goal('b', '2027-01-23', { confidence: 'expected' })] },
    weekly: { week: { key: 'w', start: '2026-10-26', tasks: [task('1', false, { day: '2026-10-28' }), task('2', true, { day: '2026-10-27' })] } },
    study: { active: [{ plan: { code: 'ielts', test: 'IELTS', current: 5, target: 6.5, lastDate: '2026-12-01' }, track: { name: 'IELTS' } }] },
    today,
  });
  assert.deepEqual(model.dates.map(item => item.date), ['2026-10-28', '2026-12-01', '2027-01-14', '2027-01-23']);
  assert.equal(model.dates[3].note, 'Ожидаемый срок');
  assert.equal(model.dates[1].note, 'Расчёт Nerio от срока подачи');
});

test('без маршрута и недели модель пустая, а не падает', () => {
  const model = todayModel({ route: null, weekly: null, study: null, today });
  assert.equal(model.nearest, null);
  assert.equal(model.next, null);
  assert.deepEqual(model.dates, []);
});
