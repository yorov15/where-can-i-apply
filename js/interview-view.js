// Экран «Репетиция собеседования» и кнопка входа в неё. Логика и тексты
// вопросов — в interview.js; здесь только DOM, таймер и запись голоса.
//
// Голос записывается через MediaRecorder только для прослушивания в этой
// вкладке: запись не уходит в сеть, не попадает в состояние и экспорт и
// пропадает, когда начат новый ответ или вкладка закрыта.
import { formatDate } from './lib/format.js';
import {
  interviewFor, quoteLang, questionsFor, startSession, advance, skip, remaining, milestone, formatClock, spoken,
  CHECKS, THINK_CHOICES, ANSWER_CHOICES, settingsOf, setSettings, saveAnswer, setChecks, removeAnswer,
  addQuestion, removeQuestion, answersFor, interviewOf,
} from './interview.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function button(text, className = 'button', onClick) {
  const node = el('button', className, text);
  node.type = 'button';
  if (onClick) node.addEventListener('click', onClick);
  return node;
}
const newId = prefix => `${prefix}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const interviewHash = id => id ? `#route/interview/${encodeURIComponent(id)}` : '#route/interview';

// ——— данные ———
let data = null;
let loading = null;
export function loadInterviewData() {
  if (data) return Promise.resolve(data);
  if (!loading) {
    loading = fetch('data/interview.json', { cache: 'no-cache' })
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then(value => { data = value; return value; })
      .catch(() => { loading = null; return null; });
  }
  return loading;
}

// Цитата-основание: дословно, с языком, пересказом и источником.
function basis(entry) {
  const box = el('div', 'journey-reference');
  const [quote] = entry.quotes;
  const copy = el('p', 'journey-copy', `«${quote.evidence}»`);
  copy.lang = quoteLang(quote.evidence);
  box.append(copy);
  if (quote.ru) box.append(el('p', 'journey-meta', quote.ru));
  if (entry.url) {
    const source = el('p', 'card-source', entry.lastVerified ? `Проверено ${formatDate(entry.lastVerified)}. ` : '');
    const link = el('a', null, 'Источник');
    link.href = entry.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    source.append(link);
    box.append(source);
  }
  return box;
}

// Кнопка входа на экране программы и у цели в «Моём пути». Пока данные не
// приехали, блока нет; у программы без цитаты он так и не появится.
export function interviewEntry(programId, { compact = false } = {}) {
  const box = el(compact ? 'div' : 'section', compact ? null : 'program-plan');
  box.hidden = true;
  loadInterviewData().then(value => {
    const entry = interviewFor(value, programId);
    if (!entry) return;
    const open = el('a', compact ? 'button button-small button-quiet' : 'button', 'Потренировать собеседование');
    open.href = interviewHash(programId);
    if (compact) {
      const quote = el('p', 'route-goal-meta', `В условиях есть собеседование: «${entry.quotes[0].evidence}»`);
      quote.lang = quoteLang(entry.quotes[0].evidence);
      box.append(quote, open);
    } else {
      box.append(el('h3', 'program-section', 'Собеседование'), el('p', 'route-detail', 'В условиях программы сказано:'), basis(entry), open);
    }
    box.hidden = false;
  });
  return box;
}

// ——— репетиция ———
// Текущая попытка живёт в памяти модуля, а не в DOM: фоновая перерисовка
// «Моего пути» не сбрасывает таймер и набранный текст.
let live = null;
let view = null;
let timer = null;

function stopRecording() {
  const audio = live?.audio;
  if (audio?.recorder && audio.recorder.state !== 'inactive') audio.recorder.stop();
  audio?.stream?.getTracks().forEach(track => track.stop());
}
function endLive() {
  stopRecording();
  if (live?.audio?.url) URL.revokeObjectURL(live.audio.url);
  live = null;
  clearInterval(timer);
  timer = null;
}

function begin(question, programId) {
  const state = view.props.getRouteState();
  endLive();
  live = { question, programId: programId || null, session: startSession(settingsOf(state), Date.now()), text: '', answerId: null, audio: {}, spoken: null, status: '' };
  draw({ focus: 'question' });
}

// Попытка дошла до самопроверки — ответ сохраняется сразу.
function settle() {
  if (!live) return;
  live.session = advance(live.session, Date.now());
  if (live.session.phase === 'review') stopRecording();
  if (live.session.phase !== 'review' || live.answerId) return;
  live.answerId = newId('a');
  store(saveAnswer(view.props.getRouteState(), {
    id: live.answerId, questionId: live.question.id, question: live.question.ru,
    ...(live.programId ? { programId: live.programId } : {}),
    date: view.props.today, text: live.text, usedSec: live.session.usedSec, answerSec: live.session.answerSec, checks: [],
  }), 'Ответ сохранён в этом браузере.');
}

function store(next, message) {
  const response = view.props.onSave(next, message);
  if (live) live.status = response.message;
  return response;
}

function tick() {
  if (!live || !view?.root.isConnected || !view.root.querySelector('[data-interview-live]')) { clearInterval(timer); timer = null; return; }
  const phase = live.session.phase;
  settle();
  if (live.session.phase !== phase) { draw({ focus: live.session.phase }); return; }
  const now = Date.now();
  const clock = view.root.querySelector('[data-interview-clock]');
  if (clock) clock.textContent = formatClock(remaining(live.session, now));
  announce(now);
}

// Диктору — только рубежи: смена фазы, минута, 10 секунд.
function announce(now) {
  const region = view.root.querySelector('[data-interview-announce]');
  const mark = milestone(live.session, now);
  if (region && mark.key !== live.spoken) { live.spoken = mark.key; region.textContent = mark.text; }
}

// Перерисовка без явной цели фокуса возвращает его туда, где он был:
// на ту же кнопку (по data-focus или тексту) или в поле ответа.
function draw({ focus } = {}) {
  if (!view) return;
  const active = view.root.contains(document.activeElement) ? document.activeElement : null;
  const was = active && { tag: active.tagName, key: active.dataset.focus, text: active.textContent, label: active.getAttribute('aria-label') };
  renderInterview(view.root, view.props);
  let target = focus === 'answer' ? view.root.querySelector('[data-interview-text]')
    : focus ? view.root.querySelector('[data-interview-heading]') : null;
  if (!target && was) {
    target = [...view.root.querySelectorAll(was.key ? `[data-focus="${was.key}"]` : was.tag)]
      .find(node => was.key || (node.textContent === was.text && node.getAttribute('aria-label') === was.label)) ?? null;
  }
  target?.focus();
}

const LABEL = { program: 'От программы', general: 'Общий вопрос, не от программы', custom: 'Твой вопрос' };

function livePanel() {
  const { question, session } = live;
  const panel = el('section', 'journey-panel');
  panel.dataset.interviewLive = '';
  const head = el('header', 'journey-head');
  const title = el('h3', null, question.ru);
  title.tabIndex = -1;
  // На самопроверке фокус уходит на её заголовок, а не на вопрос.
  if (session.phase !== 'review') title.dataset.interviewHeading = '';
  head.append(el('span', 'tag', LABEL[question.from]), title);
  if (question.en) { const en = el('p', 'journey-meta', question.en); en.lang = 'en'; head.append(en); }
  if (question.evidence) { const quote = el('p', 'journey-meta', `Из условий: «${question.evidence}»`); quote.lang = quoteLang(question.evidence); head.append(quote); }
  panel.append(head);
  const region = el('p', 'sr-only');
  region.setAttribute('aria-live', 'polite');
  region.dataset.interviewAnnounce = '';
  panel.append(region);
  const now = Date.now();

  if (session.phase !== 'review') {
    const line = el('p', 'summary-count', session.phase === 'think' ? 'Обдумай ответ · ' : 'Отвечай · ');
    const clock = el('strong', null, formatClock(remaining(session, now)));
    clock.setAttribute('role', 'timer');
    clock.dataset.interviewClock = '';
    line.append(clock);
    panel.append(line);
  }
  if (session.phase === 'think') {
    panel.append(el('p', 'route-detail', 'Набросай в голове: ответ, один пример, что ты из этого вынес.'));
    const actions = el('div', 'today-actions');
    actions.append(button('Начать отвечать', 'button', () => { live.session = skip(live.session, Date.now()); draw({ focus: 'answer' }); }),
      button('Отменить', 'button button-quiet', () => { endLive(); draw({ focus: 'list' }); }));
    panel.append(actions);
  }
  if (session.phase === 'answer') {
    panel.append(answerField('Твой ответ: тезисы или полный текст'), recorder());
    const actions = el('div', 'today-actions');
    actions.append(button('Закончить ответ', 'button', () => { live.session = skip(live.session, Date.now()); settle(); draw({ focus: 'review' }); }));
    panel.append(actions);
  }
  if (session.phase === 'review') panel.append(...review());
  const status = el('p', 'journey-meta', live.status);
  status.setAttribute('aria-live', 'polite');
  panel.append(status);
  // Сразу после перерисовки диктор слышит текущую фазу один раз.
  queueMicrotask(() => { if (live && view) { live.spoken = null; announce(Date.now()); } });
  if (session.phase !== 'review' && !timer) timer = setInterval(tick, 500);
  return panel;
}

function answerField(labelText) {
  const label = el('label', null, labelText);
  const area = el('textarea');
  area.rows = 8;
  area.maxLength = 3000;
  area.value = live.text;
  area.dataset.interviewText = '';
  area.addEventListener('input', () => { live.text = area.value; });
  label.append(area);
  return label;
}

function recorder() {
  const box = el('div', 'journey-actions');
  const supported = typeof MediaRecorder === 'function' && Boolean(navigator.mediaDevices?.getUserMedia);
  if (!supported) {
    box.append(el('p', 'journey-meta', 'Запись голоса в этом браузере недоступна. Отвечай вслух или текстом.'));
    return box;
  }
  const audio = live.audio;
  if (audio.recorder?.state === 'recording') {
    const stop = button('Остановить запись', 'button button-quiet', () => { stopRecording(); });
    stop.dataset.focus = 'record';
    box.append(stop, el('p', 'journey-meta', 'Идёт запись голоса.'));
    return box;
  }
  const start = button(audio.url ? 'Записать заново' : 'Записать голос', 'button button-quiet', startRecording);
  start.dataset.focus = 'record';
  box.append(start,
    el('p', 'journey-meta', 'Запись можно послушать только в этой вкладке. Она никуда не отправляется и не сохраняется.'));
  return box;
}

async function startRecording() {
  const current = live;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (live !== current || live.session.phase !== 'answer') { stream.getTracks().forEach(track => track.stop()); return; }
    if (current.audio.url) URL.revokeObjectURL(current.audio.url);
    const recorder = new MediaRecorder(stream), chunks = [];
    current.audio = { stream, recorder };
    recorder.addEventListener('dataavailable', event => { if (event.data.size) chunks.push(event.data); });
    recorder.addEventListener('stop', () => {
      stream.getTracks().forEach(track => track.stop());
      if (live !== current) return;
      current.audio = chunks.length ? { url: URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })) } : {};
      // Плеер появляется на самопроверке; фокус остаётся там, где был.
      draw();
    });
    recorder.start();
    current.status = '';
  } catch {
    current.status = 'Микрофон недоступен. Разреши доступ в браузере или отвечай текстом.';
  }
  if (live === current) draw();
}

function review() {
  const { session } = live;
  const head = el('h4', null, 'Самопроверка');
  head.tabIndex = -1;
  head.dataset.interviewHeading = '';
  const nodes = [head, el('p', 'journey-meta', `Ответ занял ${formatClock(session.usedSec ?? 0)} из ${formatClock(session.answerSec)}.`)];
  if (live.audio.url) {
    const player = el('audio');
    player.controls = true;
    player.src = live.audio.url;
    player.setAttribute('aria-label', 'Твоя запись');
    nodes.push(player);
  }
  const saved = interviewOf(view.props.getRouteState()).answers.find(item => item.id === live.answerId);
  const form = el('fieldset', 'journey-form');
  form.append(el('legend', null, 'Отметь честно, что получилось'));
  for (const [key, text] of CHECKS) {
    const label = el('label', 'journey-check');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = Boolean(saved?.checks.includes(key));
    box.disabled = !saved;
    box.addEventListener('change', () => {
      const checks = [...form.querySelectorAll('input:checked')].map(input => input.value);
      const response = store(setChecks(view.props.getRouteState(), live.answerId, checks), 'Отметки сохранены.');
      const status = view.root.querySelector('[data-interview-live] [aria-live]:not([data-interview-announce])');
      if (status) status.textContent = response.message;
    });
    box.value = key;
    label.append(box, el('span', null, text));
    form.append(label);
  }
  const done = saved ? saved.checks.length : 0;
  nodes.push(form);
  if (live.text.trim()) {
    const details = el('details', 'journey-edit');
    details.append(el('summary', null, 'Мой текст'), el('p', 'journey-copy', live.text));
    nodes.push(details);
  }
  nodes.push(el('p', 'route-detail', done === CHECKS.length
    ? 'Все пункты на месте. Попробуй другой вопрос.'
    : 'Ответь ещё раз и поправь то, что не отметил.'));
  const actions = el('div', 'today-actions');
  actions.append(button('Ответить ещё раз', 'button', () => begin(live.question, live.programId)),
    button('Другой вопрос', 'button button-quiet', () => { endLive(); draw({ focus: 'list' }); }));
  nodes.push(actions);
  return nodes;
}

function questionItem(question, programId, state) {
  const item = el('article', 'journey-card');
  item.append(el('span', 'tag', LABEL[question.from]), el('p', 'journey-title', question.ru));
  if (question.en) { const en = el('p', 'journey-meta', question.en); en.lang = 'en'; item.append(en); }
  if (question.evidence) {
    const quote = el('details', 'journey-edit');
    const copy = el('p', 'journey-copy', `«${question.evidence}»`);
    copy.lang = quoteLang(question.evidence);
    quote.append(el('summary', null, 'Цитата из условий'), copy);
    item.append(quote);
  }
  const count = answersFor(state, question.id).length;
  const actions = el('div', 'today-actions');
  const train = button('Тренировать', 'button button-small', () => begin(question, programId));
  train.setAttribute('aria-label', `Тренировать: ${question.ru}`);
  actions.append(train);
  if (question.from === 'custom') {
    const remove = button('Убрать вопрос', 'button button-small button-quiet', () => {
      store(removeQuestion(view.props.getRouteState(), question.id), 'Вопрос убран.');
      draw({ focus: 'list' });
    });
    remove.setAttribute('aria-label', `Убрать вопрос: ${question.ru}`);
    actions.append(remove);
  }
  if (count) item.append(el('p', 'journey-meta', `Ответов: ${count}`));
  item.append(actions);
  return item;
}

function settingsForm(state) {
  const form = el('div', 'journey-actions');
  const current = settingsOf(state);
  const pickers = [
    ['thinkSec', 'Время подумать', THINK_CHOICES],
    ['answerSec', 'Время на ответ', ANSWER_CHOICES],
  ];
  for (const [key, text, choices] of pickers) {
    const label = el('label', null, text);
    const select = el('select');
    for (const value of choices) {
      const option = el('option', null, spoken(value));
      option.value = String(value);
      option.selected = value === current[key];
      select.append(option);
    }
    select.addEventListener('change', () => { view.props.onSave(setSettings(view.props.getRouteState(), { [key]: Number(select.value) }), ''); });
    label.append(select);
    form.append(label);
  }
  return form;
}

function customForm() {
  const form = el('form', 'journey-form');
  const label = el('label', null, 'Свой вопрос');
  const input = el('input');
  input.type = 'text';
  input.maxLength = 300;
  input.required = true;
  label.append(input);
  const status = el('p', 'journey-meta');
  status.setAttribute('aria-live', 'polite');
  const add = el('button', 'button button-small', 'Добавить вопрос');
  add.type = 'submit';
  form.append(label, add, status);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const next = addQuestion(view.props.getRouteState(), newId('c'), input.value);
    if (!next) { status.textContent = 'Не добавлено: впиши вопрос. Своих вопросов — до 30.'; return; }
    const response = view.props.onSave(next, 'Вопрос добавлен.');
    if (!response.ok) { status.textContent = response.message; return; }
    draw();
    view.root.querySelector('[data-interview-custom] input')?.focus();
  });
  form.dataset.interviewCustom = '';
  return form;
}

function pastAnswers(state) {
  const answers = interviewOf(state).answers;
  if (!answers.length) return null;
  const box = el('details', 'journey-card');
  box.append(el('summary', null, `Мои ответы (${answers.length})`));
  for (const answer of [...answers].reverse().slice(0, 30)) {
    const item = el('div', 'journey-reference');
    const time = answer.usedSec != null && answer.answerSec ? ` · ${formatClock(answer.usedSec)} из ${formatClock(answer.answerSec)}` : '';
    item.append(el('p', 'journey-meta', `${formatDate(answer.date)}${time} · самопроверка ${answer.checks.length} из ${CHECKS.length}`),
      el('p', 'journey-title', answer.question),
      el('p', 'journey-copy', answer.text.trim() || 'Текста нет: отвечал вслух.'));
    const remove = button('Удалить ответ', 'button button-small button-quiet', () => {
      if (!confirm('Удалить этот ответ?')) return;
      view.props.onSave(removeAnswer(view.props.getRouteState(), answer.id), 'Ответ удалён.');
      draw();
    });
    item.append(remove);
    box.append(item);
  }
  return box;
}

// props: programId, programName, goals [{id, name}], today, getRouteState(), onSave(next, message) → {ok, message}
export function renderInterview(root, props) {
  view = { root, props };
  root.textContent = '';
  if (live && live.programId !== (props.programId || null)) endLive();
  settle();
  const state = props.getRouteState();
  const intro = el('header', 'section-heading');
  intro.append(el('h3', null, 'Репетиция собеседования'),
    el('p', null, 'Вопрос, время подумать, время ответить и короткая самопроверка. Ответы хранятся только в этом браузере.'));
  root.append(intro);
  if (!data) {
    root.append(el('p', 'route-detail', 'Загружаю вопросы…'));
    loadInterviewData().then(() => { if (view?.root === root && root.isConnected) { if (!data) data = { programs: {} }; draw(); } });
    return;
  }
  const entry = props.programId ? interviewFor(data, props.programId) : null;
  if (props.programId) {
    const about = el('section', 'journey-reference');
    about.append(el('span', 'tag', 'Для программы'), el('p', 'journey-title', props.programName || props.programId));
    if (entry) about.append(el('p', 'route-detail', 'В условиях программы сказано:'), basis(entry));
    else about.append(el('p', 'route-detail', 'В условиях этой программы нет цитаты про собеседование. Сверь на её сайте, будет ли оно, а пока тренируйся на общих вопросах.'));
    const all = el('a', 'link-button', 'Тренироваться без программы');
    all.href = interviewHash(null);
    about.append(all);
    root.append(about);
  } else {
    const goals = (props.goals ?? []).filter(goal => interviewFor(data, goal.id));
    if (goals.length) {
      const list = el('section', 'journey-reference');
      list.append(el('h4', null, 'Цели с собеседованием'));
      for (const goal of goals) {
        const link = el('a', 'link-button', goal.name);
        link.href = interviewHash(goal.id);
        list.append(el('p', null), link);
      }
      root.append(list);
    }
  }
  if (live) { root.append(livePanel()); return; }

  const anchor = el('h4', null, 'Выбери вопрос');
  anchor.tabIndex = -1;
  anchor.dataset.interviewHeading = '';
  root.append(settingsForm(state), anchor);
  const questions = questionsFor(props.programId, entry, state);
  if (questions.program.length) {
    root.append(el('p', 'route-detail', 'Сначала то, что программа сама говорит о собеседовании. Подготовь ответ по этой теме.'));
    for (const question of questions.program) root.append(questionItem(question, props.programId, state));
  }
  const general = el('section');
  general.append(el('h4', null, 'Общие вопросы для тренировки, не от программы'),
    el('p', 'route-detail', 'Их нет в условиях программ. Это частые вопросы на собеседованиях; английский вариант рядом, потому что многие собеседования идут на английском.'));
  for (const question of questions.general) general.append(questionItem(question, props.programId || null, state));
  root.append(general);
  const custom = el('section');
  custom.append(el('h4', null, 'Свои вопросы'));
  for (const question of questions.custom) custom.append(questionItem(question, props.programId || null, state));
  custom.append(customForm());
  root.append(custom);
  const past = pastAnswers(state);
  if (past) root.append(past);
}

// Для тестов и для main.js: идёт ли сейчас попытка (её нельзя сбивать
// фоновой перерисовкой).
export const interviewLive = () => Boolean(live && live.session.phase !== 'review');
