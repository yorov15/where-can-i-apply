// Чат с Nero: один и тот же вид в панели кнопки «Спросить Nero» и на вкладке
// Nero. Разговор общий: он лежит в sessionStorage и живёт до закрытия вкладки
// браузера. Ответ — только текст (textContent); ссылкой становится лишь
// http(s), которую пропустил safeHttpUrl.
import { CHAT_ON, EXPLAIN_URL } from './config.js';
import { countStep } from './lib/count.js';
import { CHAT_SENDS, CHAT_ERRORS, CHAT_PER_DAY, QUESTION_MAX, chatUsage, questionOk, readHistory, writeHistory, answerParts } from './lib/nero-chat.js';
import { askChat, chatAvailable } from './nero-chat.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

// Общее для всех открытых чатов: идёт ли вопрос, последняя ошибка, черновик.
const state = { busy: false, error: '', draft: '', available: null };
const views = new Set();
let memory = [];
let statusAsked = false;
let serial = 0;

const session = () => { try { return globalThis.sessionStorage ?? null; } catch { return null; } };
const history = () => { const storage = session(); return storage ? readHistory(storage) : memory; };
const keep = (list) => { const storage = session(); if (!storage || !writeHistory(storage, list)) memory = list.slice(-10); };
const usage = (today) => { try { return chatUsage(localStorage, today); } catch { return 0; } };
const redraw = () => { for (const view of [...views]) if (view.box.isConnected) view.update(); else views.delete(view); };

function answerNode(text) {
  const box = el('div');
  String(text).split(/\n+/).filter((line) => line.trim()).forEach((line, index) => {
    const p = el('p');
    if (index === 0) p.append(el('b', null, 'Nero: '));
    for (const part of answerParts(line)) {
      if (!part.url) { p.append(part.text); continue; }
      const link = el('a', null, part.text);
      link.href = part.url;
      link.target = '_blank';
      link.rel = 'noopener';
      p.append(link);
    }
    box.append(p);
  });
  return box;
}

function pairNode(pair) {
  const item = el('li', 'route-week-item');
  const question = el('p');
  question.append(el('b', null, 'Ты: '), pair.q);
  item.append(question, answerNode(pair.a));
  return item;
}

async function send(context) {
  const question = state.draft.trim();
  if (state.busy) return;
  if (!questionOk(question)) { state.error = CHAT_ERRORS.short; redraw(); return; }
  const where = context();
  state.busy = true; state.error = ''; redraw();
  try {
    const answer = await askChat({ question, ...where, history: history() }, { url: EXPLAIN_URL, today: where.today });
    keep([...history(), { q: question, a: answer }]);
    state.draft = '';
    countStep('nero-chat');
  } catch (error) { state.error = CHAT_ERRORS[error.kind] ?? CHAT_ERRORS.model; }
  state.busy = false;
  redraw();
}

// context() → { screen, programId, goalIds, week, today }: что знает экран в момент отправки.
export function neroChat({ context }) {
  const box = el('div');
  box.dataset.neroChat = '';
  if (!CHAT_ON || !EXPLAIN_URL) {
    box.append(el('p', 'route-detail', 'Чат с Nero скоро заработает.'));
    return box;
  }
  if (!statusAsked) {
    statusAsked = true;
    chatAvailable(EXPLAIN_URL).then((available) => { state.available = available; redraw(); });
  }
  const id = `nero-q-${++serial}`;
  const list = el('ol', 'route-week-list');
  list.setAttribute('aria-live', 'polite');
  list.setAttribute('aria-label', 'Разговор с Nero');
  const off = el('p', 'route-detail', CHAT_ERRORS.off);
  const form = el('div');
  const note = el('p', 'explain-note', CHAT_SENDS);
  const label = el('label', null, 'Твой вопрос Nero');
  label.htmlFor = id;
  const input = el('textarea');
  input.id = id;
  input.rows = 3;
  input.maxLength = QUESTION_MAX;
  input.value = state.draft;
  const count = el('p', 'fineprint');
  count.id = `${id}-count`;
  input.setAttribute('aria-describedby', count.id);
  const row = el('div', 'ask-actions');
  const button = el('button', 'button', 'Отправить');
  button.type = 'button';
  row.append(button);
  const status = el('p', 'route-detail');
  status.setAttribute('role', 'status');
  form.append(note, label, input, count, row, status);
  box.append(list, off, form);

  // Новые пары дописываем в конец, а не перерисовываем всё: так экранный
  // диктор зачитает только новый ответ. Разговор хранит 10 пар, старые уходят сверху.
  let shown = [];
  const view = {
    box,
    update() {
      const pairs = history();
      const keys = pairs.map((pair) => `${pair.q}
${pair.a}`);
      const from = shown.length ? keys.lastIndexOf(shown[shown.length - 1]) + 1 : 0;
      if (shown.length && !from) list.textContent = '';
      for (const pair of pairs.slice(from)) list.append(pairNode(pair));
      while (list.children.length > pairs.length) list.firstElementChild.remove();
      shown = keys;
      list.hidden = !pairs.length;
      off.hidden = state.available !== false;
      form.hidden = state.available === false;
      // Что уходит на сервер — видно до первого вопроса.
      note.hidden = pairs.length > 0;
      if (input.value !== state.draft) input.value = state.draft;
      count.textContent = `${input.value.length} из ${QUESTION_MAX} знаков`;
      const left = CHAT_PER_DAY - usage(context().today);
      button.disabled = state.busy || left <= 0;
      button.textContent = state.busy ? 'Nero думает…' : 'Отправить';
      status.textContent = state.busy ? 'Nero думает, до минуты…' : state.error || (left <= 0 ? CHAT_ERRORS.rate : '');
    },
  };
  input.addEventListener('input', () => { state.draft = input.value; count.textContent = `${input.value.length} из ${QUESTION_MAX} знаков`; });
  // Ctrl+Enter (⌘+Enter) отправляет; просто Enter — новая строка, как в любом поле.
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); send(context); } });
  button.addEventListener('click', () => send(context));
  views.add(view);
  view.update();
  return box;
}
