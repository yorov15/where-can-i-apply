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

function conditionsWarn(route, onRetry) {
  if (route.conditionsLoaded !== false && route.instructionsLoaded !== false) return null;
  const box = el('div', 'route-warn');
  box.append(el('p', null, route.conditionsLoaded === false
    ? 'Часть условий не загрузилась. Документы и деньги по этим программам могут быть неполными.'
    : 'Инструкции к части документов не загрузились. Требования программ сохранены; повтори загрузку.'));
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
    const item = el('li', 'route-gap', `${reason.programName ? `${shortName({ name: { ru: reason.programName } })}. ` : ''}${text.title}. ${text.detail ?? ''}`.trim());
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
  const parts = compact ? { short: step.title, rest: '' } : splitTitle(step.title);
  const label = el('label', 'route-step-title', parts.short);
  label.htmlFor = check.id;
  body.append(label);
  if (step.members?.length) body.append(el('p', 'route-detail',
    `Для: ${step.members.map(member => shortName({ name: { ru: member.name } })).join(', ')}`));
  if (step.due) body.append(el('span', 'route-due', `до ${formatDate(step.due)}`));
  if (!compact) {
    if (step.detail) body.append(el('p', 'route-detail', step.detail));
    if (step.docSource) {
      const source = link('Источник инструкции', step.docSource.url);
      if (source) {
        const citation = el('p', 'route-detail');
        citation.append(source, ` · проверено ${formatDate(step.docSource.lastVerified)}`);
        body.append(citation);
      }
    }
    if (step.target?.parts) body.append(el('p', 'route-detail', 'У целей есть минимумы по частям экзамена. Сверь их в карточках программ.'));
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

  if (route) {
  const calendar = el('button', 'button button-quiet', 'Сроки в календарь');
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
  }

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
  box.append(el('p', null, 'Добавь программы в «Мой план» из каталога. Здесь будут общие экзамены, документы и сроки.'));
  return box;
}

export function renderRoute(root, props) {
  const { programs, route, planIds, tracks, status, loading, applyUrl, handlers } = props;
  root.textContent = '';

  if (loading) {
    const box = el('div', 'route-empty');
    box.append(el('p', null, 'Собираю маршрут…'));
    root.append(box);
    return;
  }

  if (!route) {
    root.append(emptyNotice({ prepared: [], failed: planIds.length > 0, onRetry: handlers.onRetry }));
    const choose = el('button', 'button', 'Выбрать программы');
    choose.type = 'button';
    choose.addEventListener('click', handlers.onChooseGoals);
    for (const id of planIds.filter(id => !programs.some(program => program.id === id))) {
      const remove = el('button', 'button button-quiet', `Убрать недоступную цель: ${id}`);
      remove.type = 'button';
      remove.addEventListener('click', () => handlers.onRemoveGoal(id));
      root.append(remove);
    }
    root.append(choose, actionsBlock(null, handlers, status, null));
    return;
  }

  // ——— цель и прогресс (левая колонка на широком экране) ———
  const main = el('div', 'route-main');
  const head = el('header', 'route-head');
  head.append(el('h3', 'route-goal-name', `Цели из моего плана (${route.goals.length})`));
  for (const goal of route.goals) {
    const item = el('div', 'route-goal-actions');
    item.dataset.goal = goal.id;
    const open = el('button', 'link-button', goal.name);
    open.type = 'button';
    open.addEventListener('click', () => handlers.onOpen(goal.id));
    const remove = el('button', 'button button-small button-quiet', 'Убрать');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Убрать ${goal.name} из целей`);
    remove.addEventListener('click', () => handlers.onRemoveGoal(goal.id));
    item.append(open, remove, el('p', 'route-goal-meta', deadlineLine(goal)),
      el('p', 'route-goal-meta', coverageLine(goal.coverage)));
    if (!goal.prepared) item.append(el('p', 'route-detail', 'Подготовка для этой программы пока не размечена. Сверь требования на её сайте.'));
    if (goal.note) item.append(el('p', 'route-goal-note', goal.note));
    if (!goal.conditionsLoaded) item.append(el('p', 'route-warn', 'Условия этой программы не загрузились. Нажми «Повторить» ниже.'));
    head.append(item);
  }
  if (planIds.length > route.goals.length) head.append(el('p', 'route-warn', 'Часть целей больше не найдена в каталоге. Их id сохранены в файле маршрута.'));
  for (const id of planIds.filter(id => !programs.some(program => program.id === id))) {
    const remove = el('button', 'button button-quiet', `Убрать недоступную цель: ${id}`);
    remove.type = 'button';
    remove.addEventListener('click', () => handlers.onRemoveGoal(id));
    head.append(remove);
  }
  const choose = el('button', 'button button-quiet', 'Выбрать ещё программы');
  choose.type = 'button';
  choose.addEventListener('click', handlers.onChooseGoals);
  head.append(choose);
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
