// Шаги 2 и 3 портфолио: что просят выбранные цели и чего не хватает.
// Чистые функции без DOM. Контракт с экраном — docs/A2-CONTRACT.md.
//
// Требование программы всегда несёт цитату и ссылку. Всё, что придумал
// Nerio (три записи, история для эссе, пороги режимов), помечено advice:
// это совет, а не требование вуза.
import { daysBetween } from './lib/format.js';

export const MATERIAL_TYPES = [['essay', 'Эссе'], ['recommendation', 'Рекомендации'], ['activities', 'Список активностей'],
  ['cv', 'CV'], ['awards', 'Награды'], ['portfolio', 'Портфолио работ'], ['studyPlan', 'Учебный план'],
  ['video', 'Видео'], ['interview', 'Собеседование'], ['certificates', 'Сертификаты'], ['other', 'Другое']];
export const NEED_LABELS = [['required', 'Нужно'], ['some', 'Нужно не всем'], ['optional', 'По желанию'],
  ['notStated', 'Программа не пишет'], ['unchecked', 'Не проверяли'], ['failed', 'Не загрузилось']];
export const LEVEL_LABELS = [['school', 'школа'], ['district', 'район или город'], ['national', 'страна'], ['international', 'мир']];
export const GAP_KINDS = [['recommenders', 'Рекомендации'], ['proof', 'Подтверждение'], ['records', 'Записи'],
  ['awards', 'Награды'], ['story', 'История для эссе'], ['unchecked', 'Не проверяли']];

// Правило Nerio, не требование вузов: сценарий §4, вопрос 1 §10.
export const PACK_DAYS = 70;
export const GROW_DAYS = 183;
export const ENOUGH_RECORDS = 3;

const ORDER = MATERIAL_TYPES.map(([code]) => code);
const RANK = { required: 0, some: 1, optional: 2 };
const SHARED = new Set(['activities', 'cv', 'awards', 'certificates']);
const PROOF_TYPES = new Set(['awards', 'certificates']);
const strongest = needs => needs.reduce((best, need) => RANK[need] < RANK[best] ? need : best);
const earliest = dates => dates.filter(Boolean).sort()[0] ?? null;
const closesOf = (cards, goalId) => cards?.[goalId]?.deadline?.closes ?? null;
const shift = (iso, days) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const byDate = (a, b) => a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? -1 : 1;

function rowKey(item, goalId, index) {
  if (SHARED.has(item.type)) return item.type;
  if (item.type === 'recommendation') return `recommendation:${item.who ?? 'any'}`;
  return `${item.type}:${goalId}:${index}`;
}

// Сетка «цель × тип» и список материалов, одинаковое слито.
export function materialsTable({ goals = [], materials = new Map(), cards = {}, urls = {} } = {}) {
  const cells = {}, unchecked = [], failed = [], byKey = new Map();
  const ids = [...new Set(goals)];
  for (const goalId of ids) {
    const loaded = materials.get(goalId) ?? { status: 'missing', file: null };
    const url = urls[goalId] ?? null;
    if (loaded.status !== 'ok') {
      const mark = loaded.status === 'failed' ? 'failed' : 'unchecked';
      cells[goalId] = Object.fromEntries(ORDER.map(type => [type, mark]));
      (mark === 'failed' ? failed : unchecked).push({ goalId, url });
      continue;
    }
    const { items, notStated } = loaded.file;
    cells[goalId] = Object.fromEntries(ORDER.map(type => {
      const needs = items.filter(item => item.type === type).map(item => item.need);
      return [type, needs.length ? strongest(needs) : notStated.includes(type) ? 'notStated' : 'unchecked'];
    }));
    const closes = closesOf(cards, goalId);
    items.forEach((item, index) => {
      const key = rowKey(item, goalId, index);
      const row = byKey.get(key) ?? { key, type: item.type, entries: [] };
      row.entries.push({ goalId, closes, need: item.need, count: item.count, limit: item.limit, prompt: item.prompt, who: item.who,
        language: item.language, via: item.via, ru: item.ru, evidence: item.evidence, url: item.url, lastVerified: item.lastVerified });
      byKey.set(key, row);
    });
  }
  const rows = [...byKey.values()].map(({ key, type, entries }) => {
    const counts = entries.map(entry => entry.count).filter(Number.isInteger);
    return { key, type, need: strongest(entries.map(entry => entry.need)), count: counts.length ? Math.max(...counts) : null,
      closes: earliest(entries.map(entry => entry.closes)), shared: new Set(entries.map(entry => entry.goalId)).size > 1, goals: entries };
  }).sort((a, b) => byDate(a.closes, b.closes) || RANK[a.need] - RANK[b.need] || ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  const columns = ORDER.filter(type => rows.some(row => row.type === type));
  return { columns, cells, rows, unchecked, failed };
}

// Режим по самому раннему будущему сроку среди целей.
export function portfolioMode({ goals = [], cards = {}, today } = {}) {
  const next = [...new Set(goals)].map(goalId => ({ goalId, closes: closesOf(cards, goalId) }))
    .filter(item => item.closes && item.closes >= today).sort((a, b) => byDate(a.closes, b.closes))[0];
  if (!next) return null;
  const days = daysBetween(today, next.closes);
  return { mode: days < PACK_DAYS ? 'pack' : days <= GROW_DAYS ? 'one' : 'grow', goalId: next.goalId, closes: next.closes, days };
}

const filled = entry => Boolean(entry?.actions || entry?.result);
const hasProof = entry => Boolean(entry?.url) || Boolean(entry?.proof && entry.proof !== 'none');
const linked = (entry, goalIds) => (entry.goals ?? []).some(goal => goalIds.includes(goal.goalId));

function gap(fields) {
  return { goalIds: [], closes: null, due: null, have: null, need: null, done: false, evidence: null, url: null,
    advice: false, entryId: null, ...fields };
}

// Дела шага 3. Закрытые пробелы со счётом тоже возвращаются, с done: true.
export function materialGaps({ table, portfolio, recommenders, stories = [], mode = null, today, leadWeeks = 6 } = {}) {
  const gaps = [];
  const entries = portfolio?.experiences ?? [];
  const people = recommenders?.people ?? [];
  const rowsOf = type => table.rows.filter(row => row.type === type);
  const needed = row => row.goals.filter(item => item.need !== 'optional');

  // Рекомендации — по цели: «на Harvard выбрано 1 из 3».
  const letters = new Map();
  for (const row of rowsOf('recommendation')) {
    for (const item of needed(row)) {
      const goal = letters.get(item.goalId) ?? { need: 0, items: [] };
      goal.need += item.count ?? 1;
      goal.items.push(item);
      letters.set(item.goalId, goal);
    }
  }
  for (const [goalId, goal] of letters) {
    const when = goal.items[0].closes;
    const have = people.filter(person => person.goals.some(item => item.goalId === goalId)).length;
    const first = goal.items[0];
    gaps.push(gap({ id: `gap:recommenders:${goalId}`, kind: 'recommenders', goalIds: [goalId], closes: when,
      due: when ? shift(when, -7 * leadWeeks) : null, have, need: goal.need, done: have >= goal.need,
      ru: goal.items.map(item => item.ru).join(' '), evidence: first.evidence, url: first.url }));
  }

  // Подтверждения: цель засчитывает награды или сертификаты, а запись под неё — без подтверждения.
  for (const row of table.rows.filter(row => PROOF_TYPES.has(row.type))) {
    const goalIds = needed(row).map(item => item.goalId);
    if (!goalIds.length) continue;
    for (const entry of entries.filter(entry => linked(entry, goalIds) && !hasProof(entry))) {
      const id = `gap:proof:${entry.id}`;
      if (gaps.some(item => item.id === id)) continue;
      const source = needed(row)[0];
      gaps.push(gap({ id, kind: 'proof', goalIds, closes: row.closes, entryId: entry.id,
        ru: `У записи «${entry.title}» нет подтверждения, а цель просит: ${source.ru}`, evidence: source.evidence, url: source.url }));
    }
  }

  // Новые работы: не больше одной, и не в режиме «упаковать».
  const work = [];
  if (mode && mode !== 'pack') {
    const awardRow = rowsOf('awards').find(row => needed(row).length);
    if (awardRow) {
      const have = entries.filter(entry => entry.level).length;
      const source = needed(awardRow)[0];
      work.push(gap({ id: 'gap:awards', kind: 'awards', goalIds: needed(awardRow).map(item => item.goalId), closes: awardRow.closes,
        have, need: 1, done: have >= 1, ru: 'Цель засчитывает награды. Можно поискать открытый конкурс в каталоге со сроком раньше срока цели.',
        evidence: source.evidence, url: source.url }));
    }
    const have = entries.filter(filled).length;
    work.push(gap({ id: 'gap:records', kind: 'records', goalIds: [...new Set(table.rows.flatMap(row => row.goals.map(item => item.goalId)))],
      have, need: ENOUGH_RECORDS, done: have >= ENOUGH_RECORDS, advice: true,
      ru: `Совет Nerio: хотя бы ${ENOUGH_RECORDS} заполненные записи — что сделал и что получилось.` }));
  }
  const openWork = work.find(item => !item.done);
  gaps.push(...work.filter(item => item.done || item === openWork));

  // История для эссе.
  const essays = rowsOf('essay').filter(row => needed(row).length);
  if (essays.length) {
    const goalIds = [...new Set(essays.flatMap(row => needed(row).map(item => item.goalId)))];
    const have = stories.length;
    gaps.push(gap({ id: 'gap:story', kind: 'story', goalIds, closes: earliest(essays.map(row => row.closes)), have, need: 1,
      done: have >= 1, advice: true, ru: 'Совет Nerio: до эссе запиши хотя бы одну историю из своих записей.' }));
  }

  for (const { goalId, url } of table.unchecked) {
    gaps.push(gap({ id: `gap:unchecked:${goalId}`, kind: 'unchecked', goalIds: [goalId], url,
      ru: 'Nerio ещё не проверял, какие материалы просит эта программа. Открой её страницу.' }));
  }

  return gaps.sort((a, b) => Number(a.done) - Number(b.done) || byDate(a.due, b.due) || byDate(a.closes, b.closes));
}
