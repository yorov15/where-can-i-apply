// Материалы заявки по программам: data/materials/<id>.json, по файлу на цель.
// Грузим только когда открыт шаг портфолио, который их показывает: в индекс
// и детали они не входят. Цитаты проверяет tools/materials.py при сборке
// ветки, здесь — только форма, чтобы битый файл не уронил экран.
//
// Три исхода на цель, и путать их нельзя:
// ok      — файл есть;
// missing — 404, программу не проверяли;
// failed  — сеть, ошибка сервера или битый файл: проверяли, но показать
//           сейчас не можем. «Не проверяли» тут было бы неправдой.
export const TYPES = ['essay', 'recommendation', 'activities', 'cv', 'awards', 'portfolio',
  'studyPlan', 'video', 'interview', 'certificates', 'other'];
export const NEEDS = ['required', 'optional', 'some'];
const UNITS = ['words', 'chars', 'pages', 'minutes', 'items'];
const WHO = ['teacher', 'counselor', 'principal', 'any'];
const VIA = ['form', 'upload', 'platform', 'mail', 'email'];

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,99}$/.test(value);
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const optionalText = value => value === null || text(value);
const oneOf = (list, value) => value === null || list.includes(value);
const positive = value => Number.isInteger(value) && value > 0;

function item(value) {
  if (!object(value) || !TYPES.includes(value.type) || !NEEDS.includes(value.need)) return null;
  const count = value.count ?? null, limit = value.limit ?? null;
  if (count !== null && !positive(count)) return null;
  if (limit !== null && (!object(limit) || !UNITS.includes(limit.unit) || !positive(limit.max))) return null;
  const prompt = value.prompt ?? null, who = value.who ?? null, language = value.language ?? null, via = value.via ?? null;
  if (!optionalText(prompt) || !oneOf(WHO, who) || !optionalText(language) || !oneOf(VIA, via)) return null;
  if (who !== null && value.type !== 'recommendation') return null;
  if (!text(value.ru) || !text(value.evidence) || !object(value.source)) return null;
  const { url, lastVerified } = value.source;
  if (!text(url) || !/^https?:\/\//.test(url) || !day(lastVerified)) return null;
  return { type: value.type, need: value.need, count, limit: limit && { unit: limit.unit, max: limit.max },
    prompt, who, language, via, ru: value.ru, evidence: value.evidence, url, lastVerified };
}

// Файл или null. Источник ужимаем до url и даты: хеш экрану не нужен.
export function normalizeMaterials(value) {
  if (!object(value) || !id(value.id) || !Array.isArray(value.items)) return null;
  const items = value.items.map(item);
  if (items.includes(null)) return null;
  const notStated = value.notStated ?? [];
  if (!Array.isArray(notStated) || notStated.some(type => !TYPES.includes(type))) return null;
  const note = value.note ?? null;
  if (!optionalText(note)) return null;
  return { id: value.id, checkedAt: day(value.checkedAt) ? value.checkedAt : null, items, notStated: [...new Set(notStated)], note };
}

const fetchFile = path => fetch(path, { cache: 'no-cache' });
const known = new Map();

async function loadOne(goalId, get) {
  if (known.has(goalId)) return known.get(goalId);
  let result;
  try {
    const res = await get(`data/materials/${goalId}.json`);
    if (res.status === 404) result = { status: 'missing', file: null };
    else if (!res.ok) result = { status: 'failed', file: null };
    else {
      const file = normalizeMaterials(await res.json());
      result = file && file.id === goalId ? { status: 'ok', file } : { status: 'failed', file: null };
    }
  } catch {
    result = { status: 'failed', file: null };
  }
  if (result.status !== 'failed') known.set(goalId, result);
  return result;
}

// Map<goalId, {status, file}>. ok и missing помним до перезагрузки,
// failed при следующем вызове пробуем снова.
export async function loadMaterials(goalIds, get = fetchFile) {
  const ids = [...new Set(goalIds)].filter(id);
  const results = await Promise.all(ids.map(goalId => loadOne(goalId, get)));
  return new Map(ids.map((goalId, i) => [goalId, results[i]]));
}

export const forgetMaterials = () => known.clear();
