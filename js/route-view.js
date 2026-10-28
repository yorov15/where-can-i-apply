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
import { formatDate, plural, splitTitle } from './lib/format.js';
import { safeHttpUrl } from './lib/url.js';
import { renderStudyPlan } from './study-view.js';
import { renderEssays } from './essay-view.js';
import { GOAL_STATUSES, statusOf, isSent, goalProgress, progressLine } from './goal-status.js';
import { renderPortfolio } from './portfolio-view.js';

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

const clip = (text, max) => {
  const value = String(text ?? '').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
};

function conditionsWarn(route, onRetry) {
  if (route.conditionsLoaded !== false && route.instructionsLoaded !== false && route.tracksLoaded !== false) return null;
  const box = el('div', 'route-warn');
  box.append(el('p', null, route.conditionsLoaded === false
    ? 'Часть условий не загрузилась. Документы и деньги по этим программам могут быть неполными.'
    : route.instructionsLoaded === false ? 'Инструкции к части документов не загрузились. Требования программ сохранены; повтори загрузку.'
      : 'Часть подготовки к экзаменам не загрузилась. Даты и недельный план могут быть неполными; повтори загрузку.'));
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

// Статус заявки по цели и одна строка «что осталось». Статус выбирает человек:
// ничего не отмечается само, потому что подачу на сайте вуза мы не видим.
function statusRow(goal, route, routeState, handlers) {
  const entry = statusOf(routeState, goal.id);
  const box = el('div', 'route-goal-status');
  const select = el('select');
  select.setAttribute('aria-label', `Статус заявки: ${goal.name}`);
  for (const [code, text] of GOAL_STATUSES) {
    const option = el('option', null, text);
    option.value = code;
    select.append(option);
  }
  select.value = entry.status;
  select.addEventListener('change', () => handlers.onGoalStatus(goal.id, select.value));
  box.append(el('span', 'route-detail', 'Статус заявки'), select);
  box.append(el('p', 'route-goal-meta', progressLine(goalProgress(route, goal.id), entry)));
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

function examPlanningBlock(step, track, plan, onChange) {
  const box = el('div', 'route-more');
  box.dataset.exam = plan.code;
  const current = plan.current == null ? 'балл ещё не указан' : plan.current;
  const target = plan.target == null ? 'числовой порог не подтверждён'
    : `${plan.recommended ? 'рекомендуют' : 'нужно'} ${plan.target}`;
  box.append(el('p', null, `Сейчас: ${current} → ${target}.`));
  if (plan.historicalScale) box.append(el('p', 'route-warn', 'Здесь указан TOEFL по прежней шкале 0–120. Для новой сдачи уточни у вуза порог по текущей шкале; напрямую эти баллы не сравниваем.'));
  if (plan.current == null) box.append(el('p', 'route-detail', 'Начни с пробного теста из официальных материалов ниже. Балл сертификата можно указать в анкете.'));
  if (track.parts?.length) box.append(el('p', 'route-detail', `Части: ${track.parts.map(part => part.name).join(', ')}.`));
  if (Object.keys(step.target?.perPart ?? {}).length) box.append(el('p', 'route-detail', `Минимумы по частям: ${Object.entries(step.target.perPart).map(([part,value]) => `${track.parts.find(item => item.code === part)?.name ?? part} — ${value}`).join(', ')}.`));
  const field = (name, label, input, patch) => {
    const wrap = el('label', 'route-detail', `${label} `);
    input.dataset.field = name;
    input.setAttribute('aria-label', label);
    input.addEventListener('change', () => {
      if (input.checkValidity()) onChange?.(plan.code, patch(input.value), name);
    });
    wrap.append(input);
    const p = el('p'); p.append(wrap); box.append(p);
  };
  if (track.resultDays?.computer && track.resultDays?.paper) {
    const select = el('select');
    for (const [value, text] of [['computer','На компьютере'],['paper','На бумаге']]) {
      const option = el('option', null, text); option.value = value; select.append(option);
    }
    select.value = plan.format;
    field('format', 'Формат экзамена', select, format => ({ format }));
  }
  const reserve = el('input'); reserve.type = 'number'; reserve.min = '0'; reserve.max = '180'; reserve.step = '1'; reserve.value = plan.buffer;
  field('buffer', 'Твой запас в днях', reserve, value => ({ bufferDays: Number(value) }));
  const booked = el('input'); booked.type = 'date'; booked.value = plan.booked ?? '';
  field('date', 'Дата, на которую записался', booked, date => ({ date }));
  if (plan.expired) box.append(el('p', 'route-warn', 'Срок подачи уже прошёл. Дату экзамена для этого набора не рассчитываем.'));
  else if (plan.lastDate) {
    box.append(el('p', null, `Ориентир для сдачи: до ${formatDate(plan.lastDate)}${plan.expectedDeadline ? ' (срок подачи ожидаемый)' : ''}.`));
    if (!plan.hasTime) box.append(el('p', 'route-warn', 'Эта дата уже прошла. Уточни у вуза возможность дослать результат или выбери следующий набор.'));
    else box.append(el('p', 'route-detail', plan.canReserveRetake
      ? 'По расчёту есть запас на ожидание результата и повторную попытку. Проверь доступные даты в центре.'
      : plan.buffer === 0 ? 'План без запаса на пересдачу. Дополнительная попытка не заложена.'
      : 'Выбранный запас учтён. Возможность пересдачи не подтверждена — сверь её правила и даты.'));
  } else box.append(el('p', 'route-detail', 'Дату для сдачи пока не рассчитать: не подтверждён срок подачи, время результата или подходящая сессия.'));
  if (plan.booked) box.append(el('p', plan.tooLate || plan.pastBooking ? 'route-warn' : 'route-detail',
    plan.pastBooking ? 'Выбранная дата экзамена уже прошла. Проверь результат и обнови план.'
      : plan.resultDate ? `Результат по опубликованному сроку: ${formatDate(plan.resultDate)}.${plan.tooLate ? ' Это позже срока подачи — уточни, примет ли вуз результат позже.' : ''}`
        : 'Дата сохранена. Выдачу результата для неё здесь пока не удалось рассчитать.'));
  if (track.timingNote) box.append(el('p', 'route-detail', track.timingNote));
  if (track.retakeRule) box.append(el('p', 'route-detail', track.retakeRule.text));
  box.append(el('p', 'route-detail', 'Это ориентир для плана. Срок проверки, доставку баллов вузу и доступные места уточни до регистрации.'));
  const proofs = [['Срок результата', track.resultSource], ['Календарь экзамена', track.sessionsSource], ['Правила пересдачи', track.retakeRule?.source], ['Части экзамена', track.partsSource]];
  for (const [label, proof] of proofs) {
    const source = link(label, proof?.url);
    if (source) { const p = el('p', 'route-detail'); p.append(source, ` · проверено ${formatDate(proof.lastVerified)}`); box.append(p); }
  }
  return box;
}

function stepRow(step, index, { tracks, onToggle, getExamPlan, onExamPlan, compact = false }) {
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
  if (step.due) body.append(el('span', 'route-due', `${step.dueKind==='planning'?'План: к ':step.dueKind==='booked'?'Записан на ':step.dueKind==='exam-plan'?'Расчёт: до ':'до '}${formatDate(step.due)}${step.dueExpected?' · срок подачи ожидаемый':''}`));
  if (!compact) {
    if (step.detail) body.append(el('p', 'route-detail', step.detail));
    if(step.dueKind==='planning') body.append(el('p','route-detail','Дата для твоего плана взята по сроку подачи. Отдельный срок документа или платежа уточни у вуза.'));
    if(step.startBy) body.append(el('p','route-detail',`Начни до ${formatDate(step.startBy)} — расчёт по оценке времени изготовления.`));
    if (step.docSource) {
      const source = link('Источник инструкции', step.docSource.url);
      if (source) {
        const citation = el('p', 'route-detail');
        citation.append(source, ` · проверено ${formatDate(step.docSource.lastVerified)}`);
        body.append(citation);
      }
    }
    if (step.target?.parts) body.append(el('p', 'route-detail', 'У целей есть минимумы по частям экзамена. Сверь их в карточках программ.'));
    if (step.track && tracks?.[step.track] && getExamPlan) body.append(examPlanningBlock(step, tracks[step.track], getExamPlan(step), onExamPlan));
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
  const calendar = el('button', 'button button-quiet', 'Обновить календарь');
  calendar.type = 'button';
  calendar.addEventListener('click', () => say(handlers.onCalendar()));
  box.append(calendar);

  const parent = el('button', 'button button-quiet', 'Скопировать отчёт родителю');
  parent.type = 'button';
  parent.addEventListener('click', async () => {
    try { say(await handlers.onParent(route.parentReport)); } catch { say('Не получилось подготовить текст.'); }
  });
  box.append(parent);

  const parentPrint=el('button','button button-quiet','Отчёт в PDF');
  parentPrint.type='button';
  parentPrint.addEventListener('click',()=>handlers.onParentPrint(route.parentReport));
  box.append(parentPrint);

  const preview=el('details','route-more');
  preview.dataset.parentReport='';
  preview.append(el('summary',null,'Что войдёт в отчёт'));
  for(const line of (route.parentReport??'').split('\n')) preview.append(el('p','route-detail',line));
  box.append(preview);

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

  const clear = el('button', 'link-button', 'Сбросить отметки выполнения');
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
    const library = el('div', 'route-main');
    library.append(renderPortfolio(props));
    root.append(library);
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
  head.append(el('h3', 'route-goal-name', `Цели (${route.goals.length})`));
  for (const goal of route.goals) {
    // Строка цели — имя, срок и «Убрать». Покрытие, заметки и предупреждения
    // под раскрытием: восемь целей иначе занимают весь первый экран.
    const item = el('div', 'route-goal-actions');
    item.dataset.goal = goal.id;
    const open = el('button', 'link-button', goal.name);
    open.type = 'button';
    open.addEventListener('click', () => handlers.onOpen(goal.id));
    const remove = el('button', 'button button-small button-quiet', 'Убрать');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Убрать ${goal.name} из целей`);
    remove.addEventListener('click', () => handlers.onRemoveGoal(goal.id));
    const sent = isSent(statusOf(props.routeState, goal.id).status);
    item.append(open, remove);
    if (!sent) item.append(el('p', 'route-goal-meta', deadlineLine(goal)));
    item.append(statusRow(goal, route, props.routeState, handlers));
    const more = el('details', 'route-more');
    more.append(el('summary', null, 'Что покрывает и что учесть'));
    more.append(el('p', 'route-goal-meta', coverageLine(goal.coverage)));
    if (!goal.prepared) more.append(el('p', 'route-detail', 'Подготовка для этой программы пока не размечена. Сверь требования на её сайте.'));
    if (goal.note) more.append(el('p', 'route-goal-note', goal.note));
    item.append(more);
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
  main.append(renderPortfolio(props));

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

  if (props.weekly) {
    // Дела недели живут на «Сегодня»; здесь только ссылка, чтобы не вести два списка.
    const today = el('button', 'button button-quiet', 'Дела этой недели — на «Сегодня»');
    today.type = 'button';
    today.addEventListener('click', handlers.onOpenToday);
    main.append(today);
  } else main.append(weekBlock(route, handlers));
  const study = renderStudyPlan(props.study, props.routeState, props.today, handlers, Boolean(props.weekly));
  if (study) {
    const wrap = el('details', 'route-phase');
    wrap.append(el('summary', 'route-phase-title', 'Подготовка по неделям'));
    wrap.append(study);
    main.append(wrap);
  }
  root.append(main);

  // ——— разделы-справочники (правая колонка на широком экране) ———
  const side = el('div', 'route-side');
  side.append(phaseBlock(route, { ...handlers, tracks }));
  const applyNotes = applyNotesBlock(route);
  if (applyNotes) side.append(applyNotes);
  const essays=renderEssays(route.goals,props.essays??{},handlers.onRetry);
  if(essays)side.append(essays);
  root.append(side);

  root.append(actionsBlock(route, handlers, status, applyUrl));
}
