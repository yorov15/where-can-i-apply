// Чат с Nero: чистая логика без DOM и сети. Тело запроса, суточный предел на
// устройстве, история в sessionStorage, тексты ошибок и разбор ссылок в ответе.
// Тесты — tests/nero-chat.test.js. Сеть — js/nero-chat.js, вид — js/nero-chat-view.js.
import { safeHttpUrl } from './url.js';

export const CHAT_USAGE_KEY = 'nerio-chat-usage';
export const CHAT_HISTORY_KEY = 'nerio-chat';
export const CHAT_PER_DAY = 20;
export const QUESTION_MIN = 3;
export const QUESTION_MAX = 500;
// Сколько пар хранит вкладка и сколько прошлых пар уходит с вопросом.
export const HISTORY_KEEP = 10;
export const HISTORY_SENT = 3;
const ANSWER_MAX = 4000;
const SCREENS = ['program', 'today', 'path', 'catalog', 'other'];
const ID = /^[\w:.-]{1,80}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const CHAT_SENDS = 'Уйдут: твой вопрос, экран, id программы и целей, дела недели, три прошлых вопроса и ответа, случайный код устройства. Анкета, имя и баллы не уходят.';
export const CHAT_ERRORS = {
  rate: 'На сегодня вопросы к Nero закончились. Завтра можно снова.',
  off: 'Чат с Nero сейчас недоступен. Быстрые кнопки и вкладка Nero работают.',
  model: 'Nero не дал ответа, который прошёл проверку. Попробуй спросить иначе.',
  network: 'Нет связи с Nero. Проверь интернет и попробуй позже.',
  bad: `Nero не принял вопрос. Напиши его от ${QUESTION_MIN} до ${QUESTION_MAX} знаков.`,
  big: 'Вопрос вместе с прошлыми ответами вышел слишком длинным. Спроси короче.',
  short: `Вопрос — от ${QUESTION_MIN} до ${QUESTION_MAX} знаков.`,
};

const clip = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max).trim() : '');

// body.dataset.screen → экран для сервера. «Мой путь» (#route/…) — 'path',
// список программ — 'catalog'.
export function chatScreen(screen) {
  if (screen === 'program' || screen === 'today') return screen;
  if (screen === 'route') return 'path';
  if (screen === 'answer') return 'catalog';
  return 'other';
}

export function questionOk(text) {
  const value = typeof text === 'string' ? text.trim() : '';
  return value.length >= QUESTION_MIN && value.length <= QUESTION_MAX;
}

export function chatUsage(storage, today) {
  try {
    const saved = JSON.parse(storage.getItem(CHAT_USAGE_KEY) ?? 'null');
    return saved?.day === today && Number.isInteger(saved.count) ? Math.min(CHAT_PER_DAY, Math.max(0, saved.count)) : 0;
  } catch { return 0; }
}

// Попытку считаем до отправки, как у наставника: перезагрузка не даёт лишнего вопроса.
export function reserveChat(storage, today) {
  const count = chatUsage(storage, today);
  if (count >= CHAT_PER_DAY) return false;
  try {
    const value = JSON.stringify({ day: today, count: count + 1 });
    storage.setItem(CHAT_USAGE_KEY, value);
    return storage.getItem(CHAT_USAGE_KEY) === value;
  } catch { return false; }
}

// Тело запроса: только поля контракта и в их пределах.
export function chatRequest({ question, screen, programId, goalIds = [], week = null, history = [], deviceId }) {
  const where = SCREENS.includes(screen) ? screen : 'other';
  const tasks = (Array.isArray(week?.tasks) ? week.tasks : []).filter((task) => clip(task?.title, 160)).slice(0, 12)
    .map((task) => ({
      title: clip(task.title, 160),
      minutes: Math.min(600, Math.max(0, Math.round(Number(task.minutes) || 0))),
      done: Boolean(task.done),
      ...(DAY.test(task.day ?? '') ? { day: task.day } : {}),
    }));
  const past = (Array.isArray(history) ? history : []).filter((pair) => clip(pair?.q, QUESTION_MAX) && clip(pair?.a, 1200))
    .slice(-HISTORY_SENT).map((pair) => ({ q: clip(pair.q, QUESTION_MAX), a: clip(pair.a, 1200) }));
  return {
    mode: 'chat',
    deviceId,
    question: clip(question, QUESTION_MAX),
    screen: where,
    ...(where === 'program' && ID.test(programId ?? '') ? { programId } : {}),
    goalIds: [...new Set((Array.isArray(goalIds) ? goalIds : []).filter((id) => ID.test(id ?? '')))].slice(0, 10),
    ...(tasks.length ? { week: tasks } : {}),
    ...(past.length ? { history: past } : {}),
  };
}

// Ответ сервера → вид ошибки. Сервер шлёт: 400 bad-request, 413 too-big,
// 429 rate, 503 off или model, 403 — чужой адрес сайта. Неизвестное — как отказ модели.
export function chatErrorKind(status, value) {
  const error = value?.error;
  if (status === 429 || error === 'rate') return 'rate';
  if (status === 413 || error === 'too-big') return 'big';
  if (status === 403 || error === 'off') return 'off';
  if (status === 400 || error === 'bad-request' || error === 'bad') return 'bad';
  return 'model';
}

export function chatAnswer(value) {
  const text = typeof value?.answer === 'string' ? value.answer.trim() : '';
  return text && text.length <= ANSWER_MAX ? text : null;
}

export function readHistory(storage) {
  try {
    const list = JSON.parse(storage.getItem(CHAT_HISTORY_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((pair) => typeof pair?.q === 'string' && typeof pair?.a === 'string').slice(-HISTORY_KEEP) : [];
  } catch { return []; }
}

export function writeHistory(storage, list) {
  try { storage.setItem(CHAT_HISTORY_KEY, JSON.stringify(list.slice(-HISTORY_KEEP))); return true; } catch { return false; }
}

// Ответ → куски текста и ссылок. Ссылкой становится только http(s), которую
// пропустил safeHttpUrl; точку или скобку в конце оставляем тексту.
export function answerParts(text) {
  const parts = [];
  const source = String(text ?? '');
  let last = 0;
  for (const match of source.matchAll(/https?:\/\/[^\s<>"«»]+/gi)) {
    let raw = match[0];
    const tail = raw.match(/[.,;:!?)\]]+$/)?.[0] ?? '';
    raw = raw.slice(0, raw.length - tail.length);
    const url = safeHttpUrl(raw);
    if (!url) continue;
    if (match.index > last) parts.push({ text: source.slice(last, match.index) });
    parts.push({ text: raw, url });
    last = match.index + raw.length;
  }
  if (last < source.length) parts.push({ text: source.slice(last) });
  return parts;
}
