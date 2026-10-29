// Статус заявки по каждой цели и строка «что осталось». Чистые функции: экраны
// «Мой путь» и «Сегодня» рисуют то, что вернули они, и ничего не досчитывают.
// Идея — из трекеров Naviance, Scoir и ApplyBoard (docs/PLATFORMS.md): список
// «рассматриваю → подаю → подал» и «чего не хватает» по каждой заявке.
import { formatDate, splitTitle } from './lib/format.js';

export const GOAL_STATUSES = [
  ['thinking', 'Рассматриваю'],
  ['preparing', 'Готовлю документы'],
  ['submitted', 'Подал заявку'],
  ['answered', 'Получил ответ'],
];

const CODES = new Set(GOAL_STATUSES.map(([code]) => code));
export const isGoalStatus = (code) => CODES.has(code);

// Пока человек ничего не выбрал, цель «рассматривается»: это не отметка
// «подал», и срок подачи по ней продолжает считаться.
export function statusOf(state, goalId) {
  const entry = state?.statuses?.[goalId];
  return entry && isGoalStatus(entry.status) ? entry : { status: 'thinking', since: null };
}

// Подана или уже с ответом: отсчёт «до подачи» по такой цели больше не нужен.
export const isSent = (status) => status === 'submitted' || status === 'answered';
export const hasPreparationGoals = (route,state) => (route?.goals??[]).some(goal=>!isSent(statusOf(state,goal.id).status));

// Сколько дел по цели сделано и что не хватает. Общие дела (один IELTS на
// шесть программ) считаются у каждой из программ, куда они входят.
export function goalProgress(route, goalId) {
  const steps = (route?.steps ?? []).filter((step) => step.programIds?.includes(goalId));
  const missing = steps.filter((step) => !step.done)
    .map((step, order) => ({ id: step.id, title: splitTitle(step.title).short, due: step.due ?? null, order }))
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.order - b.order);
  return { total: steps.length, done: steps.length - missing.length, missing };
}

const SHOWN = 2;

// Одна строка под названием цели.
export function progressLine(progress, entry) {
  const { status, since } = entry;
  const when = since ? ` ${formatDate(since)}` : '';
  if (status === 'submitted') return `Заявка подана${when}. Дальше — ответ вуза.`;
  if (status === 'answered') return `Ответ получен${when}.`;
  if (!progress.total) return 'Для этой программы дел в маршруте пока нет. Сверь требования на её сайте.';
  const head = `${progress.done} из ${progress.total} дел`;
  if (!progress.missing.length) return `${head}: всё отмечено.`;
  const shown = progress.missing.slice(0, SHOWN).map((item) => (item.due ? `${item.title} (до ${formatDate(item.due)})` : item.title));
  const rest = progress.missing.length - SHOWN;
  return `${head} · не хватает: ${shown.join('; ')}${rest > 0 ? ` и ещё ${rest}` : ''}`;
}
