// Экран «Маршрут до оффера»: цель, чего не хватает, неделя и шаги.
// Движок и все правила — в js/route.js; здесь только DOM. Ничего не
// считается второй раз и не выдумывается: тексты шагов приходят готовыми,
// причины — из wording.js, треки — из data/prep/exams.
import { reasonText } from './wording.js';
import { routeText } from './route.js';
import { formatDate, plural } from './lib/format.js';
import { safeHttpUrl } from './lib/url.js';

// Порядок блоков шагов. Совпадает с порядком, который задаёт движок.
const PHASES = [
  ['tests', 'Экзамены'],
  ['inquiry', 'Уточнить у вуза'],
  ['docs', 'Документы'],
  ['money', 'Деньги'],
  ['apply', 'Подача'],
  ['after', 'После подачи'],
];

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
  const left = typeof deadline.daysLeft === 'number' && deadline.daysLeft >= 0
    ? ` · осталось ${deadline.daysLeft} ${plural(deadline.daysLeft, 'день', 'дня', 'дней')}`
    : '';
  return `Срок подачи — ${formatDate(deadline.closes)}${expected}${left}.`;
}

function chips(ids, selected, programs, onGoal) {
  const box = el('div', 'chips');
  for (const id of ids) {
    const program = programs.find((item) => item.id === id);
    if (!program) continue;
    const chip = el('button', 'chip', shortName(program));
    chip.type = 'button';
    chip.setAttribute('aria-pressed', id === selected ? 'true' : 'false');
    chip.addEventListener('click', () => onGoal(id));
    box.append(chip);
  }
  return box;
}

// Цель: сначала программы из «Моего плана», остальные проверенные — под
// раскрывающимся списком. Полный маршрут сейчас не у всех, поэтому список
// честно называется.
function goalBlock({ goal, prepared, planIds, programs, onGoal }) {
  const box = el('div', 'route-goals');
  const preparedIds = prepared.map((entry) => entry.id);
  const fromPlan = planIds.filter((id) => preparedIds.includes(id));
  if (fromPlan.length) {
    box.append(el('p', 'fineprint', 'Цель из плана:'));
    box.append(chips(fromPlan, goal, programs, onGoal));
  }
  const rest = preparedIds.filter((id) => !fromPlan.includes(id));
  if (rest.length) {
    const details = el('details', 'route-all');
    if (!fromPlan.length) details.open = true;
    details.append(el('summary', null, `Все программы с маршрутом (${rest.length})`));
    details.append(chips(rest, goal, programs, onGoal));
    box.append(details);
  }
  return box;
}

function emptyState({ hasPlan, prepared }) {
  const box = el('div', 'route-empty');
  const text = hasPlan || !prepared.length
    ? 'Выбери цель — программу, до которой строится маршрут. Полный маршрут с подготовкой сейчас у проверенных программ из списка ниже; у остальных появятся срок, требования и документы, когда их сверят.'
    : 'Выбери цель из списка ниже.';
  box.append(el('p', null, text));
  if (!prepared.length) {
    box.append(el('p', 'route-detail', 'Маршрут пока не собран: обнови страницу или зайди позже.'));
  }
  return box;
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

function gapList(route) {
  if (!route.gaps.length) {
    const box = el('div', null);
    box.append(el('p', 'route-detail', 'По правилам программы замечаний нет. Шансы поступления сайт не оценивает — смотри сроки, документы и деньги ниже.'));
    return box;
  }
  const box = el('div', null);
  box.append(el('h3', 'route-phase-title', 'Чего не хватает'));
  const list = el('ul', 'route-gaps');
  for (const reason of route.gaps) {
    const text = reasonText(reason);
    const item = el('li', 'route-gap', `${text.title}. ${text.detail ?? ''}`.trim());
    item.dataset.status = reason.status;
    list.append(item);
  }
  box.append(list);
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
      const p = el('p', null, '');
      p.append(node);
      details.append(p);
    }
  }
  if (track.note) details.append(el('p', 'route-detail', track.note));
  return details;
}

function stepRow(step, index, { tracks, onToggle }) {
  const row = el('div', step.done ? 'route-step is-done' : 'route-step');
  const check = el('input', 'route-check');
  check.type = 'checkbox';
  check.id = `route-step-${index}`;
  check.checked = Boolean(step.done);
  check.addEventListener('change', () => onToggle(step.id));
  const body = el('div', 'route-step-body');
  const { short, rest } = splitTitle(step.title);
  const title = el('label', 'route-step-title', short);
  title.htmlFor = check.id;
  body.append(title);
  if (step.due) body.append(el('span', 'route-due', `до ${formatDate(step.due)}`));
  if (step.detail) body.append(el('p', 'route-detail', step.detail));
  if (rest) {
    const more = el('details', 'route-more');
    more.append(el('summary', null, 'Полный текст условия'));
    more.append(el('p', 'route-detail', rest));
    body.append(more);
  }
  const track = step.track ? trackBlock(step, tracks) : null;
  if (track) body.append(track);
  row.append(check, body);
  return row;
}

// Неделя — короткий список: те же шаги, но без полного текста и подготовки,
// иначе она повторяет весь маршрут и человек не видит, что делать сейчас.
function weekRow(step, index, { onToggle }) {
  const row = el('div', step.done ? 'route-step is-done' : 'route-step');
  const check = el('input', 'route-check');
  check.type = 'checkbox';
  check.id = `route-week-${index}`;
  check.checked = Boolean(step.done);
  check.addEventListener('change', () => onToggle(step.id));
  const body = el('div', 'route-step-body');
  const { short } = splitTitle(step.title);
  const title = el('label', 'route-step-title', short);
  title.htmlFor = check.id;
  body.append(title);
  if (step.due) body.append(el('span', 'route-due', `до ${formatDate(step.due)}`));
  row.append(check, body);
  return row;
}

function weekBlock(route, handlers) {
  const box = el('div', null);
  box.append(el('h3', 'route-phase-title', 'Эта неделя'));
  if (!route.week.length) {
    box.append(el('p', 'route-detail', 'На эту неделю дел не осталось. Проверь сроки и документы ниже.'));
    return box;
  }
  const list = el('ul', 'route-week');
  route.week.forEach((step, index) => {
    const item = el('li', 'route-week-item');
    item.append(weekRow(step, index, handlers));
    list.append(item);
  });
  box.append(list);
  return box;
}

function stepsBlock(route, handlers) {
  const box = el('div', null);
  route.steps.forEach((step) => {
    const phase = PHASES.find(([code]) => code === step.phase);
    if (!phase) return;
    let section = box.querySelector(`[data-phase="${phase[0]}"]`);
    if (!section) {
      section = el('div', 'route-phase');
      section.dataset.phase = phase[0];
      section.append(el('h3', 'route-phase-title', phase[1]));
      box.append(section);
    }
    section.append(stepRow(step, step.id, handlers));
  });
  return box;
}

function applyBlock(route) {
  if (!route.applyNotes.length) return null;
  const box = el('div', 'route-phase');
  box.append(el('h3', 'route-phase-title', 'Как подавать'));
  for (const note of route.applyNotes) box.append(el('p', 'route-detail', note));
  return box;
}

function actionsBlock(route, handlers, statusText) {
  const box = el('div', 'route-actions');
  const status = el('p', 'route-status', statusText ?? '');
  status.setAttribute('role', 'status');
  const say = (message) => handlers.onStatus(message ?? '');

  const print = el('button', 'button', 'Печать или PDF');
  print.type = 'button';
  print.addEventListener('click', () => handlers.onPrint());
  box.append(print);

  const parent = el('button', 'button button-quiet', 'Текст для родителей');
  parent.type = 'button';
  parent.addEventListener('click', async () => {
    try { say(await handlers.onParent(routeText(route))); } catch { say('Не получилось подготовить текст.'); }
  });
  box.append(parent);

  const save = el('button', 'button button-quiet', 'Скачать маршрут');
  save.type = 'button';
  save.addEventListener('click', () => say(handlers.onExport()));
  box.append(save);

  const load = el('label', 'button button-quiet', 'Загрузить маршрут');
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'application/json,.json';
  file.hidden = true;
  file.addEventListener('change', async () => {
    const picked = file.files?.[0];
    if (!picked) return;
    try { say(await handlers.onImport(picked)); } catch { say('Не получилось прочитать файл.'); }
  });
  load.append(file);
  box.append(load);

  const clear = el('button', 'link-button', 'Сбросить прогресс');
  clear.type = 'button';
  clear.addEventListener('click', () => say(handlers.onClear()));
  box.append(clear);
  box.append(status);
  return box;
}

export function renderRoute(root, props) {
  const { programs, goal, route, prepared, planIds, tracks, status, handlers } = props;
  root.textContent = '';

  if (!goal && !prepared.length) {
    root.append(emptyState({ hasPlan: planIds.length > 0, prepared }));
    return;
  }

  root.append(goalBlock({ goal, prepared, planIds, programs, onGoal: handlers.onGoal }));
  if (!route) {
    root.append(emptyState({ hasPlan: planIds.length > 0, prepared }));
    return;
  }

  const head = el('div', 'route-goal');
  const name = programs.find((item) => item.id === route.id);
  head.append(el('h3', 'route-goal-name', name?.name?.ru ?? route.id));
  head.append(el('p', 'route-goal-meta', deadlineLine(route.goal)));
  head.append(el('p', 'route-goal-meta', coverageLine(route.goal.coverage)));
  if (route.prepared) {
    head.append(el('p', 'route-goal-note', 'Маршрут сверен: список документов, экзамены и сроки из проверенных условий программы.'));
  } else {
    head.append(el('p', 'route-goal-note', 'Полный маршрут с подготовкой для этой программы появится позже. Пока видны срок, требования, документы и деньги.'));
  }
  for (const note of route.notes ?? []) head.append(el('p', 'route-goal-note', note));
  root.append(head);

  const open = el('button', 'link-button route-open', 'Открыть карточку в каталоге');
  open.type = 'button';
  open.addEventListener('click', () => handlers.onOpen(route.id));
  root.append(open);

  root.append(el('p', 'route-progress', `Сделано ${route.stats.done} из ${route.stats.total} (${route.stats.percent}%)`));
  root.append(gapList(route));
  root.append(weekBlock(route, { tracks, onToggle: handlers.onToggle }));
  root.append(stepsBlock(route, { tracks, onToggle: handlers.onToggle }));
  const apply = applyBlock(route);
  if (apply) root.append(apply);
  root.append(actionsBlock(route, handlers, status));
}
