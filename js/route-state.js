// Единое состояние маршрута и выбранных программ. Старые ключи читаются
// только при миграции; неизвестные отметки остаются в экспорте для переноса.
import { SCORE_LIMITS } from './lib/limits.js';
export const ROUTE_STATE_KEY = 'eligibility-route';
export const ROUTE_VERSION = 2;
export const MAX_GOALS = 8;
const PLAN_KEY = 'eligibility-plan';
const DONE_KEY = 'eligibility-plan-done';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeKey = key => typeof key === 'string' && key.length > 0 && key.length <= 200
  && !['__proto__', 'constructor', 'prototype'].includes(key);
const list = value => Array.isArray(value) ? [...new Set(value.filter(safeKey))] : [];
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const read = (storage, key) => { try { return JSON.parse(storage?.getItem(key) ?? 'null'); } catch { return null; } };
const empty = () => ({ version: 2, goals: [], hoursPerWeek: 4, scores: {}, examDates: {}, examFormats: {}, retakeBuffers: {}, done: {}, weekPlan: {}, studyStarted: null, lastReview: null });

function normalize(value) {
  if (!object(value)) return null;
  if (value.version === 1) {
    if ((value.goal != null && typeof value.goal !== 'string') || !Array.isArray(value.done)) return null;
    return { ...empty(), goals: value.goal ? [value.goal] : [],
      done: Object.fromEntries(list(value.done).map(id => [id, null])), migrationNotice: true };
  }
  if (value.version !== 2 || !Array.isArray(value.goals) || !object(value.done)) return null;
  const next = empty();
  next.goals = list(value.goals);
  if ([2, 4, 6, 10].includes(value.hoursPerWeek)) next.hoursPerWeek = value.hoursPerWeek;
  next.done = Object.fromEntries(Object.entries(value.done).filter(([id, date]) => safeKey(id) && (date === null || day(date))));
  next.examDates = Object.fromEntries(Object.entries(object(value.examDates) ? value.examDates : {})
    .filter(([code, date]) => safeKey(code) && day(date)));
  next.examFormats = Object.fromEntries(Object.entries(object(value.examFormats) ? value.examFormats : {}).filter(([code, format]) => safeKey(code) && ['computer','paper','default'].includes(format)));
  next.retakeBuffers = Object.fromEntries(Object.entries(object(value.retakeBuffers) ? value.retakeBuffers : {}).filter(([code, days]) => safeKey(code) && Number.isInteger(days) && days >= 0 && days <= 180));
  for (const [code, scores] of Object.entries(object(value.scores) ? value.scores : {})) {
    if (!safeKey(code) || !Array.isArray(scores)) continue;
    next.scores[code] = scores.filter(score => object(score) && day(score.date)
      && typeof score.overall === 'number' && Number.isFinite(score.overall) && score.overall >= 0)
      .map(score => ({ date: score.date, overall: score.overall, mock: score.mock === true,
        ...(safeKey(score.test) ? { test: score.test } : {}),
        ...(object(score.parts) ? { parts: Object.fromEntries(Object.entries(score.parts)
          .filter(([part, value]) => safeKey(part) && typeof value === 'number' && Number.isFinite(value) && value >= 0)) } : {}) }));
  }
  for (const [week, tasks] of Object.entries(object(value.weekPlan) ? value.weekPlan : {})) {
    if (!/^\d{4}-W\d{2}$/.test(week) || !Array.isArray(tasks)) continue;
    next.weekPlan[week] = tasks.filter(task => object(task) && safeKey(task.taskId))
      .map(task => ({ taskId: task.taskId, ...(day(task.day) ? { day: task.day } : {}), done: task.done === true }));
  }
  next.lastReview = day(value.lastReview) ? value.lastReview : null;
  next.studyStarted = day(value.studyStarted) ? value.studyStarted : null;
  if (value.migrationNotice === true) next.migrationNotice = true;
  return next;
}

const copy = state => normalize(state) ?? empty();

export function loadRouteState(storage) {
  const raw = read(storage, ROUTE_STATE_KEY);
  const next = normalize(raw) ?? empty();
  if (raw?.version !== 2) {
    next.goals = list([...next.goals, ...list(read(storage, PLAN_KEY))]);
    for (const id of list(read(storage, DONE_KEY))) next.done[id] = null;
    if (Object.keys(next.done).length) next.migrationNotice = true;
  }
  return next;
}

export function saveRouteState(state, storage) {
  try {
    const next = copy(state);
    storage?.setItem(ROUTE_STATE_KEY, JSON.stringify(next));
    // Совместимость со старой вкладкой каталога; источник истины — v2.
    storage?.setItem(PLAN_KEY, JSON.stringify(next.goals));
  } catch { /* сохранение не должно ломать страницу */ }
}

export function setGoals(state, ids) {
  const next = copy(state);
  const goals = list(ids);
  // Старый длинный план не обрезаем. Новые цели сверх лимита не добавляем.
  if (goals.length > MAX_GOALS && goals.some(id => !next.goals.includes(id))) return next;
  return { ...next, goals };
}

export function setGoal(state, id) {
  return setGoals(state, id ? [id] : []);
}

export function toggleStep(state, stepId, today = new Date().toISOString().slice(0, 10), aliases = []) {
  const next = copy(state);
  if (!safeKey(stepId) || !day(today)) return next;
  const ids = [stepId, ...aliases.filter(safeKey)];
  const checked = ids.some(id => Object.hasOwn(next.done, id));
  for (const id of ids) delete next.done[id];
  if (!checked) next.done[stepId] = today;
  return next;
}

export function clearProgress(state) {
  const next = copy(state);
  next.done = {};
  for (const tasks of Object.values(next.weekPlan)) for (const task of tasks) task.done = false;
  return next;
}

export function exportState(state) { return JSON.stringify(copy(state)); }
export function importState(text) {
  if (typeof text !== 'string' || text.length > 500_000) return null;
  try { return normalize(JSON.parse(text)); } catch { return null; }
}
export function isDone(state, stepId) {
  return Array.isArray(state?.done) ? state.done.includes(stepId) : object(state?.done) && Object.hasOwn(state.done, stepId);
}

export function reconcileProgress(state, steps) {
  const next = copy(state);
  // Сначала читаем все старые id, затем удаляем: один старый документ
  // мог соответствовать нескольким общим шагам, порядок не должен решать.
  const known = new Set();
  for (const step of steps) {
    const aliases = (step.legacyIds ?? []).filter(safeKey);
    const completed = [step.id, ...aliases].filter(id => Object.hasOwn(next.done, id));
    if (completed.length) {
      const dated = completed.map(id => next.done[id]).filter(day).sort();
      next.done[step.id] = dated[0] ?? null;
      aliases.forEach(id => { if (id !== step.id) known.add(id); });
    }
  }
  known.forEach(id => delete next.done[id]);
  return next;
}

export function setExamPlan(state, code, { date, format, bufferDays }) {
  const next = copy(state);
  if (!safeKey(code)) return next;
  if (date === '') delete next.examDates[code];
  else if (day(date)) next.examDates[code] = date;
  if (['computer','paper','default'].includes(format)) next.examFormats[code] = format;
  if (Number.isInteger(bufferDays) && bufferDays >= 0 && bufferDays <= 180) next.retakeBuffers[code] = bufferDays;
  return next;
}

export function setStudyHours(state, hours) {
  const next = copy(state);
  if ([2,4,6,10].includes(hours)) next.hoursPerWeek = hours;
  return next;
}

export function recordMock(state, code, score, today) {
  const tests={ielts:'IELTS',toefl:'TOEFL_IBT_2026',duolingo:'DUOLINGO',sat:'SAT'};
  if (tests[code]!==score.test) return null;
  const limit = SCORE_LIMITS[score.test];
  if (!safeKey(code) || !limit || !day(score.date) || score.date > today || !Number.isFinite(score.overall)
    || score.overall < limit.min || score.overall > limit.max || Math.abs(score.overall / limit.step - Math.round(score.overall / limit.step)) > 1e-8) return null;
  const partLimit = score.test === 'SAT' ? { min:200, max:800, step:10 } : limit;
  const parts = score.parts ?? {};
  if (Object.values(parts).some(value => !Number.isFinite(value) || value < partLimit.min || value > partLimit.max || Math.abs(value / partLimit.step - Math.round(value / partLimit.step)) > 1e-8)) return null;
  const next = copy(state);
  // One self-report per day and scale; editing it does not inflate the history.
  next.scores[code] = [...(next.scores[code] ?? []).filter(item => item.date !== score.date || item.test !== score.test), { ...score, mock:true }].sort((a,b) => a.date.localeCompare(b.date));
  return next;
}

export function toggleStudyTask(state, week, taskId) {
  const next = copy(state);
  if (!/^\d{4}-W\d{2}$/.test(week) || !safeKey(taskId)) return next;
  const tasks = next.weekPlan[week] ?? [];
  const existing = tasks.find(item => item.taskId === taskId);
  if (existing) existing.done = !existing.done;
  else tasks.push({ taskId, done:true });
  next.weekPlan[week] = tasks;
  return next;
}
