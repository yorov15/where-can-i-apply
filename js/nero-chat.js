// Чат с Nero: сеть. Запрос собирает js/lib/nero-chat.js; здесь — код
// устройства, проверка «включён ли чат» и сам вопрос к функции.
import { MENTOR_KEY } from './mentor.js';
import { STEP_KEY } from './mentor-step.js';
import { ESSAY_DEVICE_KEY } from './essay.js';
import { CHAT_PER_DAY, CHAT_USAGE_KEY, chatRequest, chatErrorKind, chatAnswer, chatUsage, questionOk, reserveChat } from './lib/nero-chat.js';

const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const json = (storage, key) => { try { const value = JSON.parse(storage.getItem(key) ?? 'null'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; } };

// Тот же случайный код, что у наставника недели (nerio-mentor). Нет его —
// берём код наставника у шага или проверки черновика, иначе новый; и кладём
// к наставнику недели, чтобы дальше все ходили с одним.
export function chatDeviceId(storage, randomId = () => crypto.randomUUID()) {
  const mentor = json(storage, MENTOR_KEY);
  if (UUID.test(mentor.deviceId ?? '')) return mentor.deviceId;
  let essay = '';
  try { essay = storage.getItem(ESSAY_DEVICE_KEY) ?? ''; } catch { /* нет хранилища */ }
  const id = [json(storage, STEP_KEY).deviceId, essay].find((value) => UUID.test(value ?? '')) ?? randomId();
  try { storage.setItem(MENTOR_KEY, JSON.stringify({ ...mentor, deviceId: id })); } catch { /* код останется на этот вопрос */ }
  return id;
}

export async function chatAvailable(url, fetchImpl = fetch) {
  if (!url) return false;
  try {
    const response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'chat-status' }), signal: AbortSignal.timeout(10000) });
    return response.ok && (await response.json()).available === true;
  } catch { return false; }
}

// context — { question, screen, programId, goalIds, week, history }.
export async function askChat(context, { url, today, storage = localStorage, fetchImpl = fetch, randomId } = {}) {
  const fail = (kind) => { const error = new Error(kind); error.kind = kind; throw error; };
  if (!questionOk(context.question)) fail('short');
  if (!url) fail('off');
  const request = chatRequest({ ...context, deviceId: chatDeviceId(storage, randomId) });
  if (chatUsage(storage, today) >= CHAT_PER_DAY) fail('rate');
  // Хранилище не записало попытку — без него предел не удержать.
  if (!reserveChat(storage, today)) fail('off');
  let response;
  try {
    response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(50000) });
  } catch { fail('network'); }
  let value = null;
  try { value = await response.json(); } catch { /* разбор ниже */ }
  if (!response.ok || value?.error) {
    const kind = chatErrorKind(response.status, value);
    // Сервер сказал «предел»: до конца дня кнопка «Отправить» не нужна.
    if (kind === 'rate') try { storage.setItem(CHAT_USAGE_KEY, JSON.stringify({ day: today, count: CHAT_PER_DAY })); } catch { /* только подсказка */ }
    fail(kind);
  }
  const answer = chatAnswer(value);
  if (!answer) fail('model');
  return answer;
}
