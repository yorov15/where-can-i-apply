// Экран «Рекомендации»: что просит программа, кого ты просишь, статус и
// готовый текст просьбы. Логика — в recommenders.js; здесь только DOM.
//
// Цитат в лёгких файлах условий нет, поэтому для целей ученика (до восьми)
// подгружаем полный файл программы data/programs/<id>.json и запускаем
// детектор в браузере. Общую сборку это не трогает.
import { RECOMMENDER_STATUSES, MAX_LEAD_WEEKS, MAX_RECOMMENDERS, detectRecommendations, needLine, askByDate, leadWeeksOf,
  recommendersOf, saveRecommender, removeRecommender, setRecommenderStatus, setAskedOn, setLeadWeeks, markAsked,
  recommenderActions, requestText, teacherMemo, shortName } from './recommenders.js';
import { formatDate, daysBetween, plural } from './lib/format.js';
import { portfolioOf } from './portfolio.js';

const sources = new Map();
const drafts = new Map();
const openSections = new Set();
let focusPanel = false;

const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };
const button = (text, run, cls = 'button button-quiet') => { const node = el('button', cls, text); node.type = 'button'; node.addEventListener('click', run); return node; };

function remember(node, key) {
  node.open = openSections.has(key);
  node.addEventListener('toggle', () => { if (!node.isConnected) return; if (node.open) openSections.add(key); else openSections.delete(key); });
  return node;
}

// Файл программы → то, что детектор нашёл, и английское название для письма.
export function loadRecommendationSource(id, fetcher = globalThis.fetch) {
  if (!sources.has(id)) {
    const entry = { status: 'loading', found: null, nameEn: null };
    sources.set(id, entry);
    entry.promise = Promise.resolve().then(() => fetcher(`data/programs/${encodeURIComponent(id)}.json`, { cache: 'no-cache' }))
      .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then(program => { entry.found = detectRecommendations(program); entry.nameEn = typeof program?.name?.orig === 'string' ? program.name.orig : null; entry.status = 'ok'; })
      .catch(() => { entry.status = 'error'; });
  }
  return sources.get(id);
}

// Догружает недостающие программы и один раз перерисовывает экран.
function ensureSources(ids, handlers) {
  const fresh = ids.filter(id => !sources.has(id)).map(id => loadRecommendationSource(id).promise);
  if (fresh.length) Promise.allSettled(fresh).then(() => handlers.onRedraw?.());
}

function entriesFor(person, goals) {
  const byId = new Map(goals.map(goal => [goal.id, goal]));
  const mine = person.goals.filter(item => byId.has(item.goalId));
  const pending = mine.filter(item => item.status !== 'sent');
  return (pending.length ? pending : mine).map(item => {
    const goal = byId.get(item.goalId), source = sources.get(goal.id);
    const open = goal.deadline?.closes && goal.deadline.state !== 'closed';
    return { goalId: goal.id, nameRu: shortName(goal.name), nameEn: shortName(source?.nameEn) || null,
      closes: open ? goal.deadline.closes : null, channels: source?.found?.channels ?? [] };
  });
}

function copy(text, say) {
  const done = () => say('Скопировано. Вставь в письмо или мессенджер и допиши подпись.');
  const fail = () => say('Браузер не дал скопировать. Текст можно выделить в «Посмотреть тексты».');
  try { navigator.clipboard.writeText(text).then(done, fail); } catch { fail(); }
}

function askLine(goal, weeks, today) {
  const closes = goal.deadline?.closes;
  if (!closes) return 'Срок подачи не объявлен. Попросить можно заранее.';
  if (goal.deadline.state === 'closed' || closes < today) return `Приём закрыт ${formatDate(closes)}.`;
  const askBy = askByDate(closes, weeks);
  if (askBy >= today) return `Попросить до ${formatDate(askBy)}: за ${weeks} ${plural(weeks, 'неделю', 'недели', 'недель')} до срока подачи ${formatDate(closes)}.`;
  const days = daysBetween(today, closes);
  return `Просить пора: до срока подачи ${days} ${plural(days, 'день', 'дня', 'дней')} (${formatDate(closes)}).`;
}

function goalCard(goal, found, people, weeks, today) {
  const card = el('article', 'journey-action');
  card.dataset.recommendationGoal = goal.id;
  card.append(el('h4', null, shortName(goal.name)), el('p', 'journey-meta', needLine(found)), el('p', 'journey-meta', askLine(goal, weeks, today)));
  const asked = people.flatMap(person => person.goals.filter(item => item.goalId === goal.id)
    .map(item => `${person.name} — ${RECOMMENDER_STATUSES.find(([code]) => code === item.status)[1].toLowerCase()}`));
  if (asked.length) card.append(el('p', 'route-goal-meta', `Кого просишь: ${asked.join('; ')}`));
  const quotes = remember(el('details', 'route-more'), `quotes:${goal.id}`);
  quotes.append(el('summary', null, 'Что пишет программа'));
  for (const item of found.items) {
    const block = el('div', 'journey-reference');
    block.append(el('p', 'route-detail', item.ru));
    if (item.evidence) block.append(el('p', 'journey-meta', `Цитата: «${item.evidence}»`));
    quotes.append(block);
  }
  card.append(quotes);
  return card;
}

function personForm(person, goals, sources, save, say) {
  const key = person?.id ?? 'new';
  const draft = drafts.get(key) ?? { name: person?.name ?? '', role: person?.role ?? '',
    goalIds: person ? person.goals.map(item => item.goalId) : goals.filter(goal => sources.get(goal.id)?.found?.need === 'required').map(goal => goal.id) };
  const form = el('form', 'journey-form');
  form.dataset.recommenderForm = key;
  const field = (title, name, value, required) => {
    const label = el('label', null, title), input = el('input');
    input.type = 'text'; input.name = name; input.value = value; input.maxLength = 120; input.required = required;
    label.append(input); form.append(label); return input;
  };
  const name = field('Как обращаешься к человеку', 'name', draft.name, true);
  const role = field('Предмет или роль · необязательно', 'role', draft.role, false);
  const box = el('fieldset');
  box.append(el('legend', null, 'Для каких программ'));
  const checks = goals.map(goal => {
    const label = el('label', 'journey-check'), check = el('input', 'route-check');
    check.type = 'checkbox'; check.value = goal.id; check.checked = draft.goalIds.includes(goal.id);
    label.append(check, document.createTextNode(shortName(goal.name)));
    box.append(label); return check;
  });
  form.append(box);
  const read = () => ({ name: name.value, role: role.value, goalIds: checks.filter(check => check.checked).map(check => check.value) });
  form.addEventListener('input', () => drafts.set(key, read()));
  form.addEventListener('change', () => drafts.set(key, read()));
  const submit = el('button', 'button', person ? 'Сохранить' : 'Добавить');
  submit.type = 'submit';
  form.append(submit);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = read();
    if (!input.goalIds.length) { say('Отметь хотя бы одну программу.'); return; }
    if (save(state => saveRecommender(state, { ...input, id: person?.id ?? crypto.randomUUID() }), person ? 'Изменения сохранены.' : 'Рекомендатель добавлен.')) {
      drafts.delete(key);
      openSections.delete(`edit:${key}`);
    }
  });
  return form;
}

function personCard(person, props, save, say) {
  const { route, today } = props;
  const goals = route.goals.filter(goal => person.goals.some(item => item.goalId === goal.id));
  const card = remember(el('details', 'journey-card'), `person:${person.id}`);
  card.dataset.recommender = person.id;
  card.append(el('summary', null, person.role ? `${person.name} · ${person.role}` : person.name));
  if (!goals.length) card.append(el('p', 'route-detail', 'Программы этого человека убраны из «Моего пути». Отметь новые в «Изменить».'));
  for (const goal of goals) {
    const item = person.goals.find(entry => entry.goalId === goal.id);
    const label = el('label', null, shortName(goal.name)), select = el('select');
    select.dataset.rk = `status:${person.id}:${goal.id}`;
    for (const [code, text] of RECOMMENDER_STATUSES) { const option = el('option', null, text); option.value = code; select.append(option); }
    select.value = item.status;
    select.addEventListener('change', () => save(state => setRecommenderStatus(state, person.id, goal.id, select.value, today), 'Статус обновлён.'));
    label.append(select);
    card.append(label);
  }
  const date = el('label', null, 'Когда попросил'), input = el('input');
  input.type = 'date'; input.value = person.askedOn ?? ''; input.max = today; input.dataset.rk = `asked:${person.id}`;
  input.addEventListener('change', () => save(state => setAskedOn(state, person.id, input.value), 'Дата сохранена.'));
  date.append(input);
  card.append(date);

  const entries = entriesFor(person, route.goals);
  const experiences = portfolioOf(props.handlers.getRouteState()).experiences;
  const texts = [['Скопировать просьбу', requestText({ teacher: person.name, entries, lang: 'ru' })],
    ['Скопировать по-английски', requestText({ teacher: person.name, entries, lang: 'en' })],
    ['Скопировать памятку', teacherMemo({ entries, experiences })]];
  if (entries.length) {
    const actions = el('div', 'journey-actions');
    for (const [title, text] of texts) actions.append(button(title, () => copy(text, say)));
    card.append(actions);
    const preview = remember(el('details', 'route-more'), `texts:${person.id}`);
    preview.append(el('summary', null, 'Посмотреть тексты'));
    for (const [, text] of texts) preview.append(el('p', 'journey-copy', text));
    card.append(preview);
    if (!experiences.length) card.append(el('p', 'route-detail', 'В памятке нет раздела «Мои работы»: в «Работах» пока нет записей.'));
  }
  const edit = remember(el('details', 'journey-edit'), `edit:${person.id}`);
  edit.append(el('summary', null, 'Изменить'), personForm(person, route.goals, sources, save, say),
    button('Удалить', () => save(state => removeRecommender(state, person.id), `${person.name}: запись удалена.`), 'link-button'));
  card.append(edit);
  return card;
}

export function renderRecommenders(props) {
  const { route, handlers, today } = props;
  if (!route?.goals?.length || !handlers?.getRouteState) return null;
  ensureSources(route.goals.map(goal => goal.id), handlers);
  const panel = el('section', 'journey-panel');
  panel.dataset.recommenders = '';

  function save(change, message) {
    const next = change(handlers.getRouteState());
    const response = next ? handlers.onSaveRecommenders(next, message) : { ok: false, message: 'Не удалось сохранить. Проверь имя и выбранные программы: до 12 человек.' };
    draw(response.message);
    return response.ok;
  }

  function draw(message = '') {
    const focused = document.activeElement?.dataset?.rk;
    panel.replaceChildren();
    const state = handlers.getRouteState(), people = recommendersOf(state).people, weeks = leadWeeksOf(state);
    const head = el('header', 'journey-head');
    head.append(el('p', 'journey-kicker', 'Письма от учителей'), el('h3', null, 'Рекомендации'),
      el('p', 'journey-meta', 'Что просят программы, кого ты просишь и что уже готово. Записи хранятся только на этом устройстве.'));
    head.querySelector('h3').tabIndex = -1;
    panel.append(head);
    const loading = [], failed = [], absent = [], notNeeded = [];
    for (const goal of route.goals) {
      const source = sources.get(goal.id);
      if (!source || source.status === 'loading') loading.push(goal);
      else if (source.status === 'error') failed.push(goal);
      else if (!source.found) absent.push(goal);
      else if (source.found.need === 'notRequired') notNeeded.push(goal);
      else panel.append(goalCard(goal, source.found, people, weeks, today));
    }
    const names = list => list.map(goal => shortName(goal.name)).join(', ');
    if (loading.length) panel.append(el('p', 'route-detail', `Проверяю условия: ${names(loading)}.`));
    if (notNeeded.length) panel.append(el('p', 'route-detail', `Программа пишет, что рекомендации не нужны: ${names(notNeeded)}.`));
    if (absent.length) panel.append(el('p', 'route-detail', `В условиях рекомендаций не нашли: ${names(absent)}. Сверь на сайте программы.`));
    if (failed.length) {
      panel.append(el('p', 'route-warn', `Условия не загрузились: ${names(failed)}.`),
        button('Попробовать ещё раз', () => { failed.forEach(goal => sources.delete(goal.id)); ensureSources(failed.map(goal => goal.id), handlers); draw(); }));
    }

    const lead = el('label', null, 'За сколько недель до срока просить'), weeksInput = el('input');
    weeksInput.type = 'number'; weeksInput.min = '1'; weeksInput.max = String(MAX_LEAD_WEEKS); weeksInput.step = '1'; weeksInput.value = String(weeks);
    weeksInput.inputMode = 'numeric'; weeksInput.dataset.rk = 'weeks';
    weeksInput.addEventListener('change', () => {
      const value = Number(weeksInput.value);
      if (Number.isInteger(value) && value >= 1 && value <= MAX_LEAD_WEEKS) save(state => setLeadWeeks(state, value), 'Срок пересчитан.');
      else draw(`Введи число от 1 до ${MAX_LEAD_WEEKS}.`);
    });
    lead.append(weeksInput);
    panel.append(lead, el('p', 'journey-meta', '«Попросить до» — наш совет, не требование программы. Учителю нужно время: у него много таких просьб.'));

    panel.append(el('h4', null, 'Кого просишь'));
    if (!people.length) panel.append(el('p', 'journey-empty', 'Пока никого. Добавь учителя: здесь появятся статус, дата просьбы и готовый текст письма.'));
    for (const person of people) panel.append(personCard(person, props, save, say));
    if (people.length < MAX_RECOMMENDERS) {
      const add = remember(el('details', 'journey-edit'), 'edit:new');
      add.append(el('summary', null, 'Добавить рекомендателя'), personForm(null, route.goals, sources, save, say));
      panel.append(add);
    }
    const status = el('p', 'route-status', message);
    status.setAttribute('role', 'status');
    panel.append(status);
    if (focused) panel.querySelector(`[data-rk="${CSS.escape(focused)}"]`)?.focus();
  }
  function say(message) { const node = panel.querySelector('.route-status'); if (node) node.textContent = message; }

  draw();
  // Переход с «Сегодня»: фокус ставим, когда условия уже загружены, иначе
  // следующая перерисовка его сбросит.
  if (focusPanel && route.goals.every(goal => sources.get(goal.id)?.status !== 'loading')) {
    focusPanel = false;
    queueMicrotask(() => { if (!panel.isConnected) return; panel.scrollIntoView({ block: 'start' }); panel.querySelector('h3')?.focus(); });
  }
  return panel;
}

// «Сегодня»: одно дело на человека, которого пора попросить. Ничего не
// показываем, если никого не нужно просить на этой неделе.
export function renderRecommenderToday(props) {
  const { route, handlers, today, routeState } = props;
  const actions = recommenderActions(routeState, route?.goals ?? [], today);
  if (!actions.length) return null;
  ensureSources(actions.flatMap(item => item.goalIds), handlers);
  const box = el('section', 'journey-panel');
  box.dataset.recommenderActions = '';
  const head = el('header', 'journey-head');
  head.append(el('p', 'journey-kicker', 'Наш совет: просить заранее'), el('h3', null, 'Рекомендации'));
  box.append(head);
  const status = el('p', 'route-status');
  status.setAttribute('role', 'status');
  const people = recommendersOf(routeState).people;
  for (const item of actions.slice(0, 3)) {
    const row = el('article', 'journey-action');
    row.dataset.state = item.overdue ? 'overdue' : 'upcoming';
    const days = daysBetween(today, item.deadline);
    // Имя пишет человек, склонять его мы не умеем — поэтому «Попроси рекомендацию» отдельно от имени.
    row.append(el('p', 'journey-meta', `Попроси рекомендацию · ${item.goalNames.join(', ')}`), el('h4', null, item.name),
      el('p', 'journey-meta', item.overdue
        ? `Наша дата «попросить до» прошла ${formatDate(item.askBy)}. До подачи ${days} ${plural(days, 'день', 'дня', 'дней')}.`
        : `Попросить до ${formatDate(item.askBy)}. Подача — ${formatDate(item.deadline)}.`));
    const person = people.find(entry => entry.id === item.id);
    const entries = entriesFor({ ...person, goals: person.goals.filter(goal => item.goalIds.includes(goal.goalId)) }, route.goals);
    const row2 = el('div', 'journey-actions');
    row2.append(button('Скопировать просьбу', () => copy(requestText({ teacher: item.name, entries, lang: 'ru' }), message => { status.textContent = message; })),
      button('Попросил', () => {
        const next = markAsked(handlers.getRouteState(), item.id, today);
        const response = next ? handlers.onSaveRecommenders(next, 'Отмечено: попросил.') : { ok: false, message: 'Не удалось сохранить.' };
        status.textContent = response.message;
        if (response.ok) handlers.onRedraw?.();
      }),
      button('Открыть рекомендации', () => { focusPanel = true; location.hash = 'route/preparation'; }, 'link-button'));
    row.append(row2);
    box.append(row);
  }
  if (actions.length > 3) box.append(el('p', 'journey-meta', `Ещё ${actions.length - 3} — в «Моём пути», раздел «Подготовка».`));
  box.append(status);
  return box;
}
