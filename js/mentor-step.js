// Наставник у шага маршрута (М2) в браузере: собирает запрос из того, что
// уже есть на экране, — текст шага, его раздел и срок, условия программы и её
// источник, — плюс самое короткое о человеке: страна школы, сколько лет в
// школе и какие экзамены сданы («сдан» или «не сдан», без баллов). Имя, дата
// рождения, баллы и анкета целиком не уходят. Ответ хранится на устройстве,
// пока не поменяется сам шаг или то, что о нём ушло.
export const STEP_KEY = 'nerio-mentor-step';
export const STEP_PER_DAY = 8;
export const STEP_ERRORS = {
  rate: 'На сегодня вопросы к Nero закончились. Завтра можно снова.',
  off: 'Nero сейчас недоступен. Шаг и условия выше — те же, что и с ним.',
  model: 'Nero не дал ответа, который прошёл проверку. Шаг и условия выше — те же, что и с ним.',
  network: 'Нет связи с Nero. Проверь интернет и попробуй позже.',
};
const PHASES = ['tests', 'inquiry', 'docs', 'money', 'apply', 'after'];
const KINDS = ['must', 'workaround', 'money', 'steps', 'note', 'documents'];
// Какие условия программы относятся к шагу каждого раздела.
const PHASE_KINDS = { inquiry: ['workaround', 'must'], docs: ['documents'], money: ['money'], apply: ['steps'], after: ['steps', 'note'] };
const TEST = /^[A-Z0-9_]{2,20}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CONDITIONS = 10;
const BODY_BYTES = 11500;
const SAVED_MAX = 30;

function read(storage) {
  try { const value = JSON.parse(storage.getItem(STEP_KEY) ?? 'null'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
function write(storage, value) {
  try { storage.setItem(STEP_KEY, JSON.stringify(value)); return true; } catch { return false; }
}

export function stepUsage(storage, today) {
  const saved = read(storage);
  return saved.day === today && Number.isInteger(saved.count) ? Math.min(STEP_PER_DAY, Math.max(0, saved.count)) : 0;
}

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max).trim() : '');

// Условия, которые касаются шага: сначала то, из которого шаг собран, потом
// условия того же раздела в порядке файла. Остальное модели не нужно.
function conditionsFor(step, list, max) {
  const exact = new Set([step.conditionText, step.sourceTitle, step.title, ...(step.members ?? []).map((member) => member.requirement)].filter(Boolean));
  const kinds = PHASE_KINDS[step.phase] ?? [];
  const related = (item) => (step.phase === 'tests' ? Boolean(item.test) || ['language', 'exam'].includes(item.field) : kinds.includes(item.kind));
  const usable = (Array.isArray(list) ? list : []).map((item, index) => ({ item, index }))
    .filter(({ item }) => item && KINDS.includes(item.kind) && text(item.ru, 500).length >= 2);
  let chosen = usable.filter(({ item }) => exact.has(item.ru) || related(item));
  // У раздела нет своих условий (например, вуз не перечислил документы):
  // даём главные условия программы, чтобы наставнику было на что опереться.
  if (!chosen.length) chosen = usable.filter(({ item }) => ['must', 'steps'].includes(item.kind));
  return chosen
    .sort((a, b) => Number(!exact.has(a.item.ru)) - Number(!exact.has(b.item.ru)) || a.index - b.index)
    .slice(0, max)
    .map(({ item }) => ({ kind: item.kind, text: text(item.ru, 500) }));
}

function httpsUrl(value) {
  if (typeof value !== 'string' || value.length > 300 || /\s/.test(value)) return null;
  try { return new URL(value).protocol === 'https:' ? value : null; } catch { return null; }
}

// Экзамены — только «сдан» и «не сдан»: сданы те, у которых в анкете есть
// балл; не сданы те, что шаг называет, а в анкете их нет. Самих баллов нет.
function personOf(profile, step) {
  const results = [...(profile?.languageTests ?? []), ...(profile?.exams ?? [])];
  const passed = results.filter((item) => TEST.test(item?.test ?? '') && Number.isFinite(item.score)).map((item) => item.test);
  const named = step.phase === 'tests' ? [...(step.candidates ?? []), step.target?.test, ...(step.options ?? []).map((option) => option.test),
    ...(step.members ?? []).flatMap((member) => (member.options ?? []).map((option) => option.test))] : [];
  const exams = [...new Set(passed)].map((test) => ({ test, status: 'сдан' }));
  for (const test of new Set(named)) if (TEST.test(test ?? '') && !passed.includes(test)) exams.push({ test, status: 'не сдан' });
  const years = profile?.schoolYears;
  return {
    ...(/^[A-Z]{2}$/.test(profile?.schoolCountry ?? '') ? { schoolCountry: profile.schoolCountry } : {}),
    ...(Number.isInteger(years) && years >= 8 && years <= 13 ? { schoolYears: years } : {}),
    exams: exams.slice(0, 8),
  };
}

// programs — [{ name, sourceUrl, conditions }] по программам шага (условия —
// список textConditions, как его отдаёт data/conditions/<id>.json).
export function stepRequest({ step, programs = [], profile = null, deviceId }) {
  const list = programs.filter((program) => text(program?.name, 160).length >= 2).slice(0, 3);
  const per = Math.max(1, Math.floor(MAX_CONDITIONS / Math.max(1, list.length)));
  const detail = text(step.detail, 1200);
  const request = {
    mode: 'mentor-step',
    deviceId,
    step: {
      title: text(step.title, 300),
      ...(detail.length >= 2 ? { detail } : {}),
      phase: PHASES.includes(step.phase) ? step.phase : 'docs',
      ...(DAY.test(step.due ?? '') ? { due: step.due } : {}),
    },
    programs: list.map((program) => {
      const url = httpsUrl(program.sourceUrl);
      return { name: text(program.name, 160), ...(url ? { sourceUrl: url } : {}), conditions: conditionsFor(step, program.conditions, per) };
    }),
    person: personOf(profile, step),
  };
  // Длинные условия на кириллице весят вдвое: лишние снимаем с конца, чтобы
  // запрос не упёрся в предел функции.
  const size = () => new TextEncoder().encode(JSON.stringify(request)).length;
  while (size() > BODY_BYTES) {
    const fat = [...request.programs].reverse().find((program) => program.conditions.length);
    if (!fat) break;
    fat.conditions.pop();
  }
  return request;
}

// Отпечаток запроса без номера устройства: по нему сохранённый ответ узнаёт
// свой шаг. Поменялся шаг, условия или «сдан» — ответ спрашивают заново.
export function stepKey(request) {
  const { deviceId, ...rest } = request;
  let hash = 5381;
  for (const ch of JSON.stringify(rest)) hash = ((hash * 33) ^ ch.codePointAt(0)) >>> 0;
  return hash.toString(36);
}

export function savedStepAnswer(storage, stepId, request) {
  const saved = read(storage).answers?.[stepId];
  return saved && saved.key === stepKey(request) && typeof saved.explain === 'string'
    ? { explain: saved.explain, question: typeof saved.question === 'string' ? saved.question : '' } : null;
}

const validAnswer = (answer) => answer && typeof answer.explain === 'string' && answer.explain.trim() && answer.explain.length <= 600
  && typeof answer.question === 'string' && answer.question.length <= 200;

export async function askStepMentor({ step, programs, profile, today }, { url, storage = localStorage, fetchImpl = fetch, randomId = () => crypto.randomUUID() } = {}) {
  const fail = (kind) => { const error = new Error(kind); error.kind = kind; throw error; };
  if (!url || !step?.id) fail('off');
  const saved = read(storage);
  const deviceId = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(saved.deviceId ?? '') ? saved.deviceId : randomId();
  const request = stepRequest({ step, programs, profile, deviceId });
  if (!request.step.title || !request.programs.length) fail('off');
  const count = stepUsage(storage, today);
  if (count >= STEP_PER_DAY) fail('rate');
  // Попытку считаем до отправки: перезагрузка страницы не даёт лишнего вопроса.
  if (!write(storage, { ...saved, deviceId, day: today, count: count + 1 })) fail('off');
  let response;
  try {
    response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(50000) });
  } catch { fail('network'); }
  let value = null;
  try { value = await response.json(); } catch { /* разбор ниже */ }
  if (!response.ok) fail(response.status === 429 ? 'rate' : value?.error === 'off' ? 'off' : 'model');
  if (!validAnswer(value?.answer)) fail('model');
  const answer = { explain: value.answer.explain.trim(), question: value.answer.question.trim() };
  const latest = read(storage);
  const answers = Object.fromEntries(Object.entries(latest.answers ?? {}).filter(([id]) => id !== step.id).slice(-(SAVED_MAX - 1)));
  answers[step.id] = { key: stepKey(request), ...answer };
  write(storage, { ...latest, answers });
  return answer;
}
