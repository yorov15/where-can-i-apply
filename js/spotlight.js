// «Подборка под цель»: до пяти записей портфолио для одной программы, по
// одной строке «что сделал и что вышло». Хранится в состоянии маршрута рядом
// с портфолио и уходит в тот же файл. Пустую подборку не храним, поэтому
// старые файлы и экспорт без неё остаются прежними.
// spotlightText(state, goalId) — чистая функция: её берут и другие экраны
// (памятка для учителя), поэтому DOM здесь не трогаем.
import { EXPERIENCE_KINDS, EXPERIENCE_SKILLS, portfolioOf } from './portfolio.js';
import { safeHttpUrl } from './lib/url.js';

export const SPOTLIGHT_MAX = 5;
export const SPOTLIGHT_MIN = 3;
export const LINE_MAX = 150;
const MAX_GOALS = 20;
const NAME_MAX = 80;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const key = value => typeof value === 'string' && value.length > 0 && value.length <= 200
  && !['__proto__','constructor','prototype'].includes(value);
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
// Знаки считаем по символам, а не по UTF-16: эмодзи — один знак, как в счётчике.
export const lineLength = value => Array.from(value ?? '').length;
const label = (list, code) => list.find(([id]) => id === code)?.[1] ?? null;

function item(value) {
  if (!object(value) || !key(value.experienceId)) return null;
  const line = value.line == null ? '' : typeof value.line === 'string' ? value.line.replace(/\s+/g, ' ').trim() : null;
  return line === null || lineLength(line) > LINE_MAX ? null : {experienceId:value.experienceId,line};
}

// Неверная структура — null (импорт отклоняется целиком, как у портфолио).
// Ссылки на удалённые записи опыта молча отбрасываем: удаление опыта не
// должно ломать файл маршрута.
export function normalizeSpotlight(value, portfolio = null) {
  if (!object(value) || value.version !== 1 || !object(value.goals)) return null;
  const name = value.name == null ? '' : typeof value.name === 'string' && value.name.length <= NAME_MAX ? value.name.trim() : null;
  const entries = Object.entries(value.goals);
  if (name === null || entries.length > MAX_GOALS) return null;
  const known = portfolio ? new Set(portfolio.experiences.map(entry => entry.id)) : null;
  const goals = {};
  for (const [goalId, spot] of entries) {
    if (!key(goalId) || !object(spot) || !Array.isArray(spot.items) || spot.items.length > SPOTLIGHT_MAX || !day(spot.updatedOn)) return null;
    const items = spot.items.map(item);
    if (items.includes(null) || new Set(items.map(entry => entry.experienceId)).size !== items.length) return null;
    const kept = known ? items.filter(entry => known.has(entry.experienceId)) : items;
    if (kept.length) goals[goalId] = {items:kept,updatedOn:spot.updatedOn};
  }
  return {version:1,...(name ? {name} : {}),goals};
}

const stored = state => normalizeSpotlight(state?.spotlight, portfolioOf(state)) ?? {version:1,goals:{}};

export function spotlightOf(state, goalId) {
  return stored(state).goals[goalId] ?? null;
}

export function spotlightName(state) { return stored(state).name ?? ''; }

// items — [{experienceId, line}] в нужном порядке. Пустой список удаляет подборку цели.
export function saveSpotlight(state, goalId, input, today) {
  if (!key(goalId) || !object(input) || !Array.isArray(input.items) || !day(today)) return null;
  const current = stored(state);
  const name = input.name === undefined ? current.name ?? '' : input.name;
  const goals = {...current.goals};
  if (input.items.length) goals[goalId] = {items:input.items,updatedOn:today};
  else delete goals[goalId];
  const next = normalizeSpotlight({version:1,name,goals}, portfolioOf(state));
  if (!next || (goals[goalId] && next.goals[goalId]?.items.length !== input.items.length)) return null;
  const result = {...state};
  if (Object.keys(next.goals).length || next.name) result.spotlight = next;
  else delete result.spotlight;
  return result;
}

// Последний записанный результат работы — когда у самой записи нет «Что получилось».
function latestOutcome(portfolio, id) {
  return portfolio.outcomes.filter(item => item.experienceId === id)
    .sort((a, b) => a.updatedOn.localeCompare(b.updatedOn)).at(-1) ?? null;
}

const clip = (text, max) => {
  const flat = text.replace(/\s+/g, ' ').trim(), chars = Array.from(flat);
  if (chars.length <= max) return flat;
  const cut = chars.slice(0, max - 1).join(''), space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.—-]+$/, '')}…`;
};

// Подсказка для пустой строки: только то, что человек уже записал сам.
export function spotlightHint(state, experienceId) {
  const portfolio = portfolioOf(state), entry = portfolio.experiences.find(item => item.id === experienceId);
  if (!entry) return '';
  const result = entry.result || latestOutcome(portfolio, entry.id)?.text || '';
  if (result) return clip(result, LINE_MAX);
  const skills = (entry.skills ?? []).map(code => label(EXPERIENCE_SKILLS, code)).filter(Boolean);
  return skills.length ? clip(`Навыки: ${skills.join(', ').toLowerCase()}`, LINE_MAX) : '';
}

// Записи подборки в порядке человека, со всем, что попадает на страницу.
export function spotlightEntries(state, goalId) {
  const portfolio = portfolioOf(state), spot = spotlightOf(state, goalId);
  if (!spot) return [];
  return spot.items.map(({experienceId, line}) => {
    const entry = portfolio.experiences.find(item => item.id === experienceId), outcome = latestOutcome(portfolio, experienceId);
    const links = [...new Set([entry.url, outcome?.url].map(value => safeHttpUrl(value ?? '')).filter(Boolean))];
    return {id:entry.id,title:entry.title,kind:label(EXPERIENCE_KINDS, entry.kind),role:entry.role,period:entry.period,line,
      result:entry.result || outcome?.text || '',skills:(entry.skills ?? []).map(code => label(EXPERIENCE_SKILLS, code)).filter(Boolean),links};
  });
}

// Подсказки без оценок: не хватает записей, у записи нет итога.
export function spotlightTips(state, goalId) {
  const entries = spotlightEntries(state, goalId), tips = [];
  if (entries.length < SPOTLIGHT_MIN) tips.push({kind:'more'});
  for (const entry of entries) if (!entry.result) tips.push({kind:'result',id:entry.id,title:entry.title});
  return tips;
}

// Текст подборки. programName — как назвать программу (иначе её id), name —
// подпись; без неё берётся имя, записанное в самой подборке.
export function spotlightText(state, goalId, {programName = null, name = null} = {}) {
  const entries = spotlightEntries(state, goalId);
  if (!entries.length) return '';
  const who = (name ?? spotlightName(state)).trim();
  const lines = [`Подборка работ для: ${programName || goalId}`];
  if (who) lines.push(`Имя: ${who}`);
  entries.forEach((entry, index) => {
    lines.push('', `${index + 1}. ${entry.title}${entry.kind ? ` — ${entry.kind.toLowerCase()}` : ''}`);
    if (entry.line) lines.push(entry.line);
    if (entry.role) lines.push(`Роль: ${entry.role}`);
    if (entry.period) lines.push(`Сроки: ${entry.period}`);
    if (entry.result) lines.push(`Итог: ${entry.result}`);
    if (entry.skills.length) lines.push(`Навыки: ${entry.skills.join(', ').toLowerCase()}`);
    for (const link of entry.links) lines.push(`Ссылка: ${link}`);
  });
  return lines.join('\n');
}

// Что сама программа пишет о внеучебном опыте — подписанные строки условий
// (kind: documents). Своего поля «лимит списка активностей» в данных нет;
// если ограничение есть, оно стоит в этом тексте.
const ACTIVITY = /внекласс|внеучеб|внешкол|список занятий|extracurricular/i;
export function activityNotes(conditions) {
  return Array.isArray(conditions)
    ? conditions.filter(item => item?.kind === 'documents' && typeof item.ru === 'string' && ACTIVITY.test(item.ru)).map(item => item.ru).slice(0, 3)
    : [];
}
