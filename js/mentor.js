// Наставник в браузере: собирает запрос из того, что уже посчитал движок
// (дела недели и ближайшие сроки), отправляет его функции и хранит ответ на
// устройстве до конца недели. Анкета, имя и баллы в запрос не попадают.
export const MENTOR_KEY = 'nerio-mentor';
export const MENTOR_PER_DAY = 5;
export const MENTOR_ERRORS = {
  rate: 'На сегодня вопросы к наставнику закончились. Завтра можно снова.',
  off: 'Наставник сейчас недоступен. Дела недели и сроки ниже работают как обычно.',
  model: 'Наставник не дал ответа, который прошёл проверку. Дела недели ниже — те же, что и с ним.',
  network: 'Нет связи с наставником. Проверь интернет и попробуй позже.',
  empty: 'На этой неделе все дела уже сделаны.',
};
const ID = /^[\w:.-]{1,80}$/;

function read(storage) {
  try { const value = JSON.parse(storage.getItem(MENTOR_KEY) ?? 'null'); return value && typeof value === 'object' ? value : {}; } catch { return {}; }
}
function write(storage, value) {
  try { storage.setItem(MENTOR_KEY, JSON.stringify(value)); return true; } catch { return false; }
}

export function mentorUsage(storage, today) {
  const saved = read(storage);
  return saved.day === today && Number.isInteger(saved.count) ? Math.min(MENTOR_PER_DAY, Math.max(0, saved.count)) : 0;
}

// Запрос — только несделанные дела недели и сроки, которые сайт уже показал.
export function mentorRequest({ week, dates = [], today, hoursPerWeek, deviceId, programsOf = () => '' }) {
  const tasks = (week?.tasks ?? []).filter((task) => !task.done && ID.test(task.taskId) && task.title).slice(0, 8)
    .map((task) => ({
      taskId: task.taskId,
      title: [String(task.title).trim(), programsOf(task)].filter(Boolean).join(' · ').slice(0, 160),
      kind: /^[a-z-]{1,24}$/.test(task.kind ?? '') ? task.kind : 'action',
      minutes: Math.min(600, Math.max(5, Math.round(task.minutes ?? 30))),
      ...(task.day && task.day >= week.start && task.day <= week.end ? { day: task.day } : {}),
    }));
  const deadlines = dates.filter((item) => item.note !== 'Выбранный день' && item.date >= today).slice(0, 6)
    .map((item) => ({ title: String(item.title).slice(0, 160), date: item.date }));
  return { mode: 'mentor-week', deviceId, today, hoursPerWeek: Math.min(40, Math.max(1, Number(hoursPerWeek) || 4)), tasks, deadlines };
}

// Сохранённый ответ этой недели, только по делам, которые ещё не сделаны.
export function savedMentorPlan(storage, week) {
  const saved = read(storage);
  if (!week || saved.week !== week.key || !saved.plan) return null;
  const open = new Map((week.tasks ?? []).filter((task) => !task.done).map((task) => [task.taskId, task]));
  const days = (saved.plan.days ?? []).filter((item) => open.has(item.taskId)).map((item) => ({ ...item, title: open.get(item.taskId).title }));
  return days.length ? { focus: saved.plan.focus, days } : null;
}

const validPlan = (plan, request) => {
  const ids = new Set(request.tasks.map((task) => task.taskId));
  const line = (text) => typeof text === 'string' && text.length > 0 && text.length <= 240;
  return plan && line(plan.focus) && Array.isArray(plan.days) && plan.days.length === ids.size
    && plan.days.every((item) => ids.has(item.taskId) && /^\d{4}-\d{2}-\d{2}$/.test(item.day) && line(item.why) && line(item.firstStep));
};

export async function askMentor({ week, dates, today, hoursPerWeek, programsOf }, { url, storage = localStorage, fetchImpl = fetch, randomId = () => crypto.randomUUID() } = {}) {
  const fail = (kind) => { const error = new Error(kind); error.kind = kind; throw error; };
  if (!url) fail('off');
  const saved = read(storage);
  const deviceId = ID.test(saved.deviceId ?? '') && /^[a-f0-9-]{36}$/i.test(saved.deviceId) ? saved.deviceId : randomId();
  const request = mentorRequest({ week, dates, today, hoursPerWeek, deviceId, programsOf });
  if (!request.tasks.length) fail('empty');
  const count = mentorUsage(storage, today);
  if (count >= MENTOR_PER_DAY) fail('rate');
  // Попытку считаем до отправки: перезагрузка страницы не даёт лишнего вопроса.
  if (!write(storage, { ...saved, deviceId, day: today, count: count + 1 })) fail('off');
  let response;
  try {
    response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(50000) });
  } catch { fail('network'); }
  let value = null;
  try { value = await response.json(); } catch { /* разбор ниже */ }
  if (!response.ok) fail(response.status === 429 ? 'rate' : value?.error === 'off' ? 'off' : 'model');
  if (!validPlan(value?.plan, request)) fail('model');
  write(storage, { ...read(storage), week: week.key, plan: value.plan });
  return value.plan;
}

export function forgetMentorPlan(storage) {
  const saved = read(storage);
  delete saved.plan; delete saved.week;
  write(storage, saved);
}
