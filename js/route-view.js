// Экран «Маршрут до оффера»: цель, прогресс, неделя и шаги по разделам.
// Движок и все правила — в js/route.js; здесь только DOM. Ничего не
// считается второй раз и не выдумывается: тексты шагов приходят готовыми,
// причины — из wording.js, треки — из data/prep/exams.
//
// Порядок на экране выбран по пользе: сверху то, что человек делает сейчас
// (цель, неделя, прогресс), ниже — справочник (документы, деньги, подача).
// Разделы справочника — раскрывающиеся: иначе экран превращается в стену
// текста, и «что делать» теряется среди «что вообще бывает».
import { reasonText } from './wording.js';
import { routeText } from './route.js';
import { formatDate, plural } from './lib/format.js';
import { safeHttpUrl } from './lib/url.js';

const PHASES = [
  ['tests', 'Экзамены'],
  ['inquiry', 'Уточнить у вуза'],
  ['docs', 'Документы'],
  ['money', 'Деньги'],
  ['apply', 'Подача'],
  ['after', 'После подачи'],
];

const PHASE_HINT = {
  tests: 'что сдать и когда',
  inquiry: 'что спросить у приёмной комиссии',
  docs: 'что собрать в папку',
  money: 'сколько заплатить',
  apply: 'куда и когда отправить',
  after: 'что будет после заявки',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const shortName = (program) => (program?.name?.ru ?? program?.id ?? '').split(' — ')[0];

function link(text, url, className) {
  const safe = safeHttpUrl(url);
  if (!safe) return null;
  const node = el('a', className, text);
  node.href = safe;
  node.target = '_blank';
  node.rel = 'noopener';
  return node;
}

function coverageLine(coverage) {
  const covered = [];
  if (coverage?.tuition === true) covered.push('обучение');
  if (coverage?.living === true) covered.push('проживание');
  if (coverage?.travel === true) covered.push('дорогу');
  if (!covered.length) return 'Что покрывает программа — в карточке.';
  return `Покрывает: ${covered.join(', ')}. Полные условия — в карточке.`;
}

function deadlineLine(goal) {
  const deadline = goal.deadline ?? {};
  if (!deadline.closes) return 'Срок подачи не объявлен — следи за страницей приёма.';
  if (deadline.state === 'closed') return `Приём закрыт ${formatDate(deadline.closes)}.`;
  const expected = deadline.confidence === 'confirmed' ? '' : ' (дата ожидаемая)';
  const soon = deadline.state === 'upcoming' ? 'Приём ещё не открыт. ' : '';
  const left = typeof deadline.daysLeft === 'number' && deadline.daysLeft >= 0
    ? ` · осталось ${deadline.daysLeft} ${plural(deadline.daysLeft, 'день', 'дня', 'дней')}`
    : '';
  return `${soon}Срок подачи — ${formatDate(deadline.closes)}${expected}${left}.`;
}

// Заголовки условий бывают абзацем: в шаге показываем первую фразу, полный
// текст — под раскрытием. Ничего не выкидываем: текст условия остаётся.
const SHORT_TITLE = 110;

function splitTitle(title) {
  const text = String(title ?? '').trim();
  if (text.length <= SHORT_TITLE) return { short: text, rest: '' };
  const cut = text.slice(0, SHORT_TITLE);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '), cut.lastIndexOf(', '));
  const at = stop > 40 ? stop + 1 : cut.lastIndexOf(' ');
  const short = text.slice(0, at > 0 ? at : SHORT_TITLE).trim();
  return { short: short.endsWith('.') || short.endsWith('…') ? short : `${short}…`, rest: text };
}

const clip = (text, max) => {
  const value = String(text ?? '').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
};

// Цель — выпадающий список: 26 кнопок в две строки занимали весь первый
// экран, а нужна одна цель. Сначала программы из плана, остальные — ниже.
function goalSelect({ goal, prepared, planIds, programs, onGoal }) {
  const box = el('div', 'route-goal-pick');
  const label = el('label', 'fineprint', 'Цель');
  label.htmlFor = 'route-goal';
  const select = el('select', 'route-select');
  select.id = 'route-goal';
  const preparedIds = prepared.map((entry) => entry.id);
  const fromPlan = planIds.filter((id) => preparedIds.includes(id));
  const rest = preparedIds.filter((id) => !fromPlan.includes(id));
  const addOption = (parent, id) => {
    const program = programs.find((item) => item.id === id);
    const option = el('option', null, shortName(program));
    option.value = id;
    if (id === goal) option.selected = true;
    parent.append(option);
  };
  if (!goal) {
    const empty = el('option', null, 'Выбери программу');
    empty.value = '';
    empty.disabled = true;
    empty.selected = true;
    select.append(empty);
  }
  if (fromPlan.length) {
    const group = el('optgroup');
    group.label = 'Из плана';
    for (const id of fromPlan) addOption(group, id);
    select.append(group);
  }
  if (rest.length) {
    const group = el('optgroup');
    group.label = 'Все программы с маршрутом';
    for (const id of rest) addOption(group, id);
    select.append(group);
  }
  select.addEventListener('change', () => { if (select.value) onGoal(select.value); });
  box.append(label, select);
  return box;
}

function conditionsWarn(route, onRetry) {
  if (route.conditionsLoaded !== false) return null;
  const box = el('div', 'route-warn');
  box.append(el('p', null, 'Условия программы не загрузились: документы и деньги не показаны, поэтому маршрут неполный.'));
  const retry = el('button', 'button button-quiet', 'Повторить');
  retry.type = 'button';
  retry.addEventListener('click', () => onRetry?.());
  box.append(retry);
  return box;
}

function gapBlock(route) {
  if (!route.gaps.length) return null;
  const box = el('details', 'route-gaps-box');
  // Одна-две причины — это ответ на «почему я ещё не готов»; прятать его за
  // тапом незачем. Длинный список — уже справочник, его лучше свернуть.
  if (route.gaps.length <= 2) box.open = true;
  box.append(el('summary', 'route-phase-title', `Чего не хватает (${route.gaps.length})`));
  const list = el('ul', 'route-gaps');
  for (const reason of route.gaps) {
    const text = reasonText(reason);
    const item = el('li', 'route-gap', `${text.title}. ${text.detail ?? ''}`.trim());
    item.dataset.status = reason.status;
    list.append(item);
  }
  box.append(list);
  for (const note of route.gapNotes ?? []) box.append(el('p', 'route-detail', note));
  return box;
}

function trackBlock(step, tracks) {
  const track = tracks[step.track];
  if (!track) return null;
  const details = el('details', 'route-track');
  details.append(el('summary', null, `Как подготовиться: ${track.name}`));
  if (track.format) details.append(el('p', null, track.format));
  if (track.scoring) details.append(el('p', null, track.scoring));
  if (track.register) {
    const node = link('Записаться на экзамен', track.register);
    if (node) {
      const p = el('p');
      p.append(node);
      details.append(p);
    }
  }
  for (const item of track.freePrep ?? []) {
    const node = link(item.label, item.url);
    if (node) {
      const p = el('p');
      p.append(node);
      details.append(p);
    }
  }
  if (track.note) details.append(el('p', 'route-detail', track.note));
  const source = link('Источник', track.source?.url);
  if (source) {
    const p = el('p', 'route-detail', 'Сверено: ');
    p.append(source);
    p.append(document.createTextNode(track.source?.lastVerified ? ` · ${formatDate(track.source.lastVerified)}` : ''));
    details.append(p);
  }
  return details;
}

function stepRow(step, index, { tracks, onToggle, compact = false }) {
  const row = el('div', step.done ? 'route-step is-done' : 'route-step');
  const check = el('input', 'route-check');
  check.type = 'checkbox';
  check.id = `route-step-${index}`;
  check.dataset.step = step.id;
  check.checked = Boolean(step.done);
  check.addEventListener('change', () => onToggle(step.id));
  const body = el('div', 'route-step-body');
  // В неделе нужен короткий заголовок: там строка одна на дело, а не абзац.
  const parts = compact ? { short: clip(step.title, 72), rest: '' } : splitTitle(step.title);
  const label = el('label', 'route-step-title', parts.short);
  label.htmlFor = check.id;
  body.append(label);
  if (step.due) body.append(el('span', 'route-due', `до ${formatDate(step.due)}`));
  if (!compact) {
    if (step.detail) body.append(el('p', 'route-detail', step.detail));
    if (parts.rest) {
      const more = el('details', 'route-more');
      more.append(el('summary', null, 'Читать полностью'));
      more.append(el('p', 'route-detail', parts.rest));
      body.append(more);
    }
    const track = step.track ? trackBlock(step, tracks) : null;
    if (track) body.append(track);
  }
  row.append(check, body);
  return row;
}

// «Эта неделя» — не второй маршрут, а первые дела: первое выделено, как
// «сейчас», остальные просто список. Полный текст и подготовка — ниже, в
// разделах.
function weekBlock(route, handlers) {
  const box = el('section', 'route-week');
  box.append(el('h3', 'route-phase-title', 'Эта неделя'));
  if (!route.week.length) {
    box.append(el('p', 'route-detail', route.stats.done === route.stats.total
      ? 'Все шаги отмечены. Проверь срок подачи ниже.'
      : 'Недельные дела пока не составлены. Проверь экзамены, документы и сроки в полном маршруте ниже.'));
    return box;
  }
  const list = el('ol', 'route-week-list');
  route.week.forEach((step, index) => {
    const item = el('li', index === 0 ? 'route-week-item route-week-now' : 'route-week-item');
    item.append(stepRow(step, `week-${index}`, { tracks: null, onToggle: handlers.onToggle, compact: true }));
    list.append(item);
  });
  box.append(list);
  return box;
}

// Разделы-справочники: по умолчанию открыт только тот, где есть ближайшее
// несделанное дело. Так экран не заставляет прокручивать документы, чтобы
// увидеть экзамены.
function phaseBlock(route, handlers) {
  const box = el('div', 'route-phases');
  const firstUndone = route.steps.find((step) => !step.done);
  const rows = [];
  for (const [code, title] of PHASES) {
    const steps = route.steps.filter((step) => step.phase === code);
    if (!steps.length) continue;
    const done = steps.filter((step) => step.done).length;
    const details = el('details', 'route-phase');
    details.dataset.phase = code;
    if (firstUndone && steps.some((step) => !step.done) && !rows.some((item) => item.open)) details.open = true;
    const summary = el('summary', 'route-phase-title', `${title} · ${done} из ${steps.length}`);
    summary.append(el('span', 'route-phase-hint', PHASE_HINT[code] ?? ''));
    details.append(summary);
    for (const step of steps) details.append(stepRow(step, step.id, handlers));
    box.append(details);
    rows.push(details);
  }
  return box;
}

function applyNotesBlock(route) {
  if (!route.applyNotes.length) return null;
  const details = el('details', 'route-more');
  details.append(el('summary', null, 'Как проходит подача'));
  for (const note of route.applyNotes) details.append(el('p', 'route-detail', note));
  return details;
}

function actionsBlock(route, handlers, statusText, applyUrl) {
  const box = el('div', 'route-actions');
  const status = el('p', 'route-status', statusText ?? '');
  status.setAttribute('role', 'status');
  const say = (message) => handlers.onStatus(message ?? '');

  if (applyUrl) {
    const site = link('Сайт программы', applyUrl, 'button');
    if (site) box.append(site);
  }

  const calendar = el('button', 'button button-quiet', 'Срок в календарь');
  calendar.type = 'button';
  calendar.addEventListener('click', () => say(handlers.onCalendar()));
  box.append(calendar);

  const parent = el('button', 'button button-quiet', 'Текст для родителей');
  parent.type = 'button';
  parent.addEventListener('click', async () => {
    try { say(await handlers.onParent(routeText(route))); } catch { say('Не получилось подготовить текст.'); }
  });
  box.append(parent);

  const print = el('button', 'button button-quiet', 'Печать или PDF');
  print.type = 'button';
  print.addEventListener('click', () => handlers.onPrint());
  box.append(print);

  const more = el('details', 'route-more');
  more.append(el('summary', null, 'Сохранить маршрут или сбросить прогресс'));
  const save = el('button', 'button button-quiet', 'Скачать маршрут');
  save.type = 'button';
  save.addEventListener('click', () => say(handlers.onExport()));
  more.append(save);

  const load = el('button', 'button button-quiet', 'Загрузить маршрут');
  load.type = 'button';
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'application/json,.json';
  file.hidden = true;
  file.addEventListener('change', async () => {
    const picked = file.files?.[0];
    if (!picked) return;
    try { say(await handlers.onImport(picked)); } catch { say('Не получилось прочитать файл.'); }
  });
  more.append(file, load);
  load.addEventListener('click', () => file.click());

  const clear = el('button', 'link-button', 'Сбросить прогресс');
  clear.type = 'button';
  clear.addEventListener('click', () => say(handlers.onClear()));
  more.append(clear);
  box.append(more);
  box.append(status);
  return box;
}

function emptyNotice({ prepared, failed, onRetry }) {
  const box = el('div', failed ? 'route-warn' : 'route-empty');
  if (failed) {
    box.append(el('p', null, 'Маршрут не загрузился. Проверь интернет и попробуй ещё раз.'));
    const retry = el('button', 'button button-quiet', 'Попробовать ещё раз');
    retry.type = 'button';
    retry.addEventListener('click', () => onRetry?.());
    box.append(retry);
    return box;
  }
  box.append(el('p', null, prepared.length
    ? 'Выбери цель — программу, до которой строится маршрут. Полный маршрут сейчас у проверенных программ из списка.'
    : 'Маршрут пока не собран: обнови страницу или зайди позже.'));
  return box;
}

export function renderRoute(root, props) {
  const { programs, goal, route, prepared, planIds, tracks, status, loading, applyUrl, handlers } = props;
  root.textContent = '';

  if (loading) {
    const box = el('div', 'route-empty');
    box.append(el('p', null, 'Собираю маршрут…'));
    root.append(box);
    return;
  }

  const failed = Boolean(goal && prepared.length === 0);
  if (!goal && !prepared.length) {
    root.append(emptyNotice({ prepared, failed: false, onRetry: handlers.onRetry }));
    return;
  }

  if (!route) {
    root.append(goalSelect({ goal, prepared, planIds, programs, onGoal: handlers.onGoal }));
    root.append(emptyNotice({ prepared, failed, onRetry: handlers.onRetry }));
    return;
  }

  const program = programs.find((item) => item.id === route.id);
  const entry = prepared.find((item) => item.id === route.id) ?? null;

  // ——— цель и прогресс (левая колонка на широком экране) ———
  const main = el('div', 'route-main');
  const head = el('header', 'route-head');
  head.append(goalSelect({ goal, prepared, planIds, programs, onGoal: handlers.onGoal }));
  head.append(el('h3', 'route-goal-name', program?.name?.ru ?? route.id));
  head.append(el('p', 'route-goal-meta', deadlineLine(route.goal)));
  head.append(el('p', 'route-goal-meta', coverageLine(route.goal.coverage)));
  let note;
  if (!route.conditionsLoaded) note = 'Маршрут сверен не полностью: условия программы не загрузились.';
  else if (route.prepared && entry?.checked) note = `Сверено ${formatDate(entry.checked)}: документы, экзамены и сроки — из условий программы.`;
  else if (route.prepared) note = 'Маршрут сверен: документы, экзамены и сроки — из условий программы.';
  else note = 'Полный маршрут с подготовкой для этой программы появится позже. Пока видны срок, требования, документы и деньги.';
  head.append(el('p', 'route-goal-note', note));
  const actions = el('div', 'route-goal-actions');
  const open = el('button', 'button button-quiet route-open', 'Карточка программы');
  open.type = 'button';
  open.addEventListener('click', () => handlers.onOpen(route.id));
  actions.append(open);
  head.append(actions);
  main.append(head);

  const progress = el('progress', 'route-bar');
  progress.max = route.stats.total || 1;
  progress.value = route.stats.done;
  progress.setAttribute('aria-label', `Сделано ${route.stats.done} из ${route.stats.total}`);
  main.append(progress);
  main.append(el('p', 'route-progress', `Сделано ${route.stats.done} из ${route.stats.total} · ${route.stats.percent}%`));

  const warn = conditionsWarn(route, handlers.onRetry);
  if (warn) main.append(warn);
  const gaps = gapBlock(route);
  if (gaps) main.append(gaps);

  main.append(weekBlock(route, handlers));
  root.append(main);

  // ——— разделы-справочники (правая колонка на широком экране) ———
  const side = el('div', 'route-side');
  side.append(phaseBlock(route, { ...handlers, tracks }));
  const applyNotes = applyNotesBlock(route);
  if (applyNotes) side.append(applyNotes);
  root.append(side);

  root.append(actionsBlock(route, handlers, status, applyUrl));
}
