// Клиент объяснялки: собирает запрос, спрашивает прокси и разбирает ответ.
//
// Из анкеты наружу уходит ровно то, что названо в причинах ответа по
// одной программе: коды и числа. Анкета целиком, дата рождения и профиль
// сюда не попадают — их здесь просто нет.
const cache = new Map();

export const HEADINGS = ['Почему так', 'Как это обойти', 'Что сделать сейчас'];

export function explainPayload(model) {
  return {
    programId: model.id,
    reasons: model.reasons.map(({ field, status, code, params }) => ({ field, status, code, params: params ?? {} })),
  };
}

// Один и тот же вопрос по одной программе не уходит дважды: пока вкладка
// открыта, ответ берётся отсюда, и перерисовка после правки анкеты его не
// теряет.
export function explainKey(model) {
  return JSON.stringify(explainPayload(model));
}

export const cachedAnswer = (model) => cache.get(explainKey(model)) ?? null;

export class ExplainError extends Error {
  constructor(kind) {
    super(kind);
    this.kind = kind;
  }
}

export const ERROR_TEXT = {
  rate: 'Слишком много запросов. Попробуй через несколько минут.',
  off: 'Объяснение пока недоступно. Ответ выше при этом остаётся верным.',
  network: 'Не получилось связаться. Проверь интернет и попробуй ещё раз.',
  model: 'Не получилось объяснить. Ответ выше при этом остаётся верным.',
};

export async function askExplain(model, { url, fetchImpl = fetch, timeoutMs = 30000 } = {}) {
  const key = explainKey(model);
  if (cache.has(key)) return cache.get(key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(explainPayload(model)),
      signal: controller.signal,
    });
  } catch {
    throw new ExplainError('network');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429) throw new ExplainError('rate');
  if (res.status === 503) throw new ExplainError('off');
  if (!res.ok) throw new ExplainError('model');
  let data;
  try {
    data = await res.json();
  } catch {
    throw new ExplainError('model');
  }
  if (typeof data?.text !== 'string' || !data.text.trim()) throw new ExplainError('model');
  cache.set(key, data.text);
  return data.text;
}

// Ответ модели — текст с тремя строками-заголовками. Разбираем его в
// секции сами и выводим через textContent: разметку из ответа в страницу
// не вставляем никогда.
export function parseAnswer(text) {
  const sections = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const bare = line.replace(/[*#:]+/g, '').trim();
    if (HEADINGS.includes(bare)) {
      current = { heading: bare, lines: [] };
      sections.push(current);
    } else {
      if (!current) {
        current = { heading: null, lines: [] };
        sections.push(current);
      }
      current.lines.push(line.replace(/^[*#]+\s*/, ''));
    }
  }
  return sections;
}
