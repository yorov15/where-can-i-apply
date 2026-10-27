// Единственный файл, который трогает DOM результатов (анкета — form.js).
// Решения о словах и разделах принимают wording.js, summary.js и
// card-model.js; здесь их только рисуют.
import { evaluate } from './verdict.js';
import { deadlineState } from './lib/deadline.js';
import { summaryLines } from './summary.js';
import { cardModel, extraFor } from './card-model.js';
import { bucketOf } from './wording.js';
import { agenda } from './agenda.js';
import { timeLeft, formatDate, dateTile, plural } from './lib/format.js';
import { safeHttpUrl } from './lib/url.js';
import { isStale, STALE_DAYS } from './lib/dates.js';
import { refreshFilter, countryName } from './filter.js';
import { kindLabel } from './lib/kinds.js';
import { EXPLAIN_URL } from './config.js';
import { planPrograms, planText, buildIcs } from './plan.js';
import { compareTable } from './compare.js';
import { orderByPriority, hasPriorities } from './lib/priority.js';
import { planCost, costText } from './cost.js';
import { askExplain, cachedAnswer, parseAnswer, ERROR_TEXT } from './explain.js';

const ORDER = { yes: 0, likely: 1, check: 2, no: 3 };

const GROUPS = [
  ['yes', 'Подходишь по условиям'],
  ['likely', 'Похоже, можно — программа не называет чисел'],
  ['check', 'Можно, если доделаешь'],
  ['no', 'Сейчас нельзя'],
];

// Порядок выдачи: сначала открытые программы, куда подать можно, и
// внутри — по близости срока. Вынесено из renderResults, чтобы порядок
// проверялся тестом, а не глазами.
//
// Закрытый приём уезжает вниз, но не краснеет: опоздать и не пройти по
// возрасту — разные вещи с разными действиями. Программы без даты идут
// после тех, у кого срок известен: торопить нечем.
export function sortRows(rows) {
  return rows.sort((a, b) => {
    const closed = (a.deadline === 'closed') - (b.deadline === 'closed');
    if (closed !== 0) return closed;

    const verdict = ORDER[bucketOf(a.verdict)] - ORDER[bucketOf(b.verdict)];
    if (verdict !== 0) return verdict;

    const left = a.program.deadline?.closes ?? '';
    const right = b.program.deadline?.closes ?? '';
    if (left && right) return left < right ? -1 : left > right ? 1 : 0;
    return (left ? 0 : 1) - (right ? 0 : 1);
  });
}

export function groupRows(rows) {
  sortRows(rows);
  return GROUPS
    .map(([status, title]) => ({ status, title, rows: rows.filter((row) => bucketOf(row.verdict) === status) }))
    .filter((group) => group.rows.length);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// headline() отдаёт «Вердикт: причина» одной строкой (wording.js не
// трогаем). В карточке вердикт — плашка, а причина — отдельная строка под
// названием. Без двоеточия («Подходишь по условиям») причины нет.
export function splitHeadline(text) {
  const at = text.indexOf(': ');
  if (at === -1) return { verdict: text, reason: '' };
  return { verdict: text.slice(0, at), reason: text.slice(at + 2) };
}

function list(items, className) {
  const ul = el('ul', className);
  for (const item of items) ul.append(el('li', null, item));
  return ul;
}

// Календарь сроков: строка на программу, без раскрытия. Подробности
// лежат в каталоге — сюда человек пришёл за датами, а не за чтением.
// Первый экран — только самые близкие сроки; остальное под «Ещё».
const AGENDA_VISIBLE = 3;

// Строка календаря читается в два столбца: слева «до какого числа», справа
// «сколько осталось». Остаток считает format.js; для прошедшей даты он
// отдаёт null, и правого столбца тогда нет.
export function agendaParts(closes, today) {
  if (!closes) return { when: 'дату программа не назвала', left: null };
  return { when: `до ${formatDate(closes)}`, left: timeLeft(today, closes) };
}

function agendaGroups(groups, today, onOpenProgram) {
  const frag = document.createDocumentFragment();
  for (const group of groups) {
    frag.append(el('h3', 'agenda-horizon', group.title));
    const ul = el('ul', 'agenda-list');
    for (const row of group.rows) {
      const item = el('li');
      const line = el('button', 'agenda-item');
      line.type = 'button';
      const { when, left } = agendaParts(row.program.deadline?.closes, today);
      const tile = row.program.deadline?.closes ? dateTile(row.program.deadline.closes) : { day: '—', month: '' };
      const date = el('span', 'agenda-date');
      date.setAttribute('aria-hidden', 'true');
      date.append(el('span', 'agenda-day', tile.day), el('span', 'agenda-month', tile.month));
      const meta = el('span', 'agenda-meta');
      meta.append(el('span', 'agenda-when', when));
      if (left) meta.append(el('span', 'agenda-left', left));
      line.append(date, el('span', 'agenda-name', row.program.name?.ru ?? row.program.id), meta);
      line.addEventListener('click', () => onOpenProgram(row.program.id));
      item.append(line);
      ul.append(item);
    }
    frag.append(ul);
  }
  return frag;
}

// Таблица «программы в столбцах, признаки в строках»; на телефоне
// прокручивается вбок, первый столбец с названиями признаков остаётся.
function compareBlock(entries, details, today) {
  const { columns, rows } = compareTable(entries, details, today);
  const group = el('details', 'agenda-more');
  group.append(el('summary', 'agenda-more-head', `Сравнить программы плана (${columns.length})`));
  const wrap = el('div', 'compare');
  const table = el('table');
  const head = el('tr');
  head.append(el('td'), ...columns.map((c) => Object.assign(el('th', null, c.title), { scope: 'col' })));
  const thead = el('thead');
  thead.append(head);
  table.append(thead);
  const body = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    tr.append(Object.assign(el('th', null, row.label), { scope: 'row' }));
    for (const cell of row.cells) {
      const td = el('td');
      const href = safeHttpUrl(cell.href);
      if (href) {
        const a = el('a', null, cell.text);
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener';
        td.append(a);
      } else {
        td.textContent = cell.text;
      }
      tr.append(td);
    }
    body.append(tr);
  }
  table.append(body);
  wrap.append(table);
  group.append(wrap);
  return group;
}

// «Мой план»: отмеченные программы по срокам и два действия, ради которых
// план нужен — календарь с напоминаниями и текст для родителей или учителя.
function planBlock(planned, today, details, onOpenProgram, plan, entries, onOpenRoute) {
  const box = el('div', 'agenda');
  box.append(el('h2', 'agenda-title', `Мой план (${planned.length})`));
  const rows = [...planned]
    .sort((a, b) => (a.deadline?.closes ?? '9999') < (b.deadline?.closes ?? '9999') ? -1 : 1)
    .map((program) => ({ program }));
  box.append(agendaGroups([{ title: 'По срокам', rows }], today, onOpenProgram));
  const cost = costText(planCost(planned, details));
  if (cost) box.append(el('p', 'summary-line', cost));
  box.append(el('p', 'hint', 'Все дела и отметки — в общем маршруте. Здесь выбирай цели и сравнивай программы.'));
  if (entries.length > 1) box.append(compareBlock(entries, details, today));

  const old = planned.filter((p) => isStale(details.programs?.[p.id]?.source?.lastVerified, today));
  if (old.length) {
    box.append(el('p', 'card-source stale', `Данные давние (проверялись больше ${STALE_DAYS} дней назад): ${old.map((p) => p.name?.ru ?? p.id).join('; ')}. Сверь сроки на сайтах этих программ.`));
  }

  const urls = Object.fromEntries(Object.entries(details.programs ?? {}).map(([id, d]) => [id, d.applyUrl]));
  const status = el('p', 'plan-status');
  status.setAttribute('role', 'status');

  const calendar = el('button', 'button button-quiet', 'Сроки в календарь');
  calendar.type = 'button';
  calendar.addEventListener('click', () => {
    const stamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');
    const { text, events } = buildIcs(planned, today, stamp, urls);
    if (!events) {
      status.textContent = 'В плане нет программ с открытым сроком: добавлять в календарь нечего.';
      return;
    }
    const link = el('a');
    link.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    link.download = 'plan-postupleniya.ics';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    status.textContent = `Файл скачан: ${events} ${plural(events, 'срок', 'срока', 'сроков')} с напоминанием за неделю и за день. Открой его — и они окажутся в календаре телефона.`;
  });

  const copy = el('button', 'button button-quiet', 'Скопировать список');
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(planText(planned, today, urls));
      status.textContent = 'Скопировано. Можно вставить в мессенджер.';
    } catch {
      status.textContent = 'Браузер не дал скопировать. Открой карточки программ по одной.';
    }
  });

  const actions = el('div', 'plan-actions');
  // Маршрут — это действия, а не карточки: на телефоне до него доходит
  // нижняя вкладка, на широком экране её нет, поэтому нужна кнопка.
  if (onOpenRoute) {
    const route = el('button', 'button', 'Маршрут до оффера');
    route.type = 'button';
    route.addEventListener('click', () => onOpenRoute());
    actions.append(route);
  }
  actions.append(calendar, copy);
  box.append(actions, status);
  return box;
}

function agendaBlock(groups, today, onOpenProgram) {
  const box = el('div', 'agenda');
  box.append(el('h2', 'agenda-title', 'Ближайшие сроки'));

  const head = [];
  const rest = [];
  let left = AGENDA_VISIBLE;
  for (const group of groups) {
    const take = group.rows.slice(0, Math.max(left, 0));
    const other = group.rows.slice(take.length);
    left -= take.length;
    if (take.length) head.push({ ...group, rows: take });
    if (other.length) rest.push({ ...group, rows: other });
  }
  box.append(agendaGroups(head, today, onOpenProgram));

  if (rest.length) {
    const count = rest.reduce((n, g) => n + g.rows.length, 0);
    const more = el('details', 'agenda-more');
    more.append(el('summary', 'agenda-more-head', `Ещё ${count} ${plural(count, 'программа', 'программы', 'программ')} с подходящими условиями`));
    more.append(agendaGroups(rest, today, onOpenProgram));
    box.append(more);
  }
  return box;
}

export function renderResults(nodes, profile, programs, today, details) {
  const { summaryNode, agendaNode, resultsNode, onOpenProgram, onOpenRoute } = nodes;
  const plan = nodes.plan;
  // Пока экран «Куда можно» не виден, карточки не пересобираем: это 300+ узлов
  // на каждое нажатие в анкете, а увидит их человек только при возврате.
  // Прежние карточки остаются как есть, main.js построит свежие при показе.
  const skipCards = Boolean(nodes.skipCards?.()) && programs.length > 0;
  summaryNode.textContent = '';
  agendaNode.textContent = '';
  if (!skipCards) resultsNode.textContent = '';

  if (!programs.length) {
    resultsNode.append(el('p', 'empty', 'Программ пока нет. Данные собираются.'));
    return;
  }

  const rows = programs.map((program) => ({
    program,
    verdict: evaluate(profile, program, today),
    deadline: deadlineState(program.deadline, today),
  }));

  // Наверху одна строка с двумя числами. Что улучшить — под «Подробнее»:
  // это нужно не каждому и не с первого взгляда.
  summaryNode.append(countLine(rows));
  const [, ...extra] = summaryLines(profile, programs, today);
  if (extra.length) {
    const more = el('details', 'summary-more');
    more.append(el('summary', 'summary-more-head', 'Подробнее: что улучшить'));
    for (const line of extra) more.append(el('p', 'summary-line', line));
    summaryNode.append(more);
  }

  // План, сравнение и сроки живут на вкладке «Мой путь», в свёрнутом блоке.
  const planned = planPrograms(programs, plan.ids);
  if (planned.length) agendaNode.append(planBlock(planned, today, details, onOpenProgram, plan, rows.filter((r) => plan.ids.includes(r.program.id)), onOpenRoute));
  const soon = agenda(rows, today);
  if (soon.length) agendaNode.append(agendaBlock(soon, today, onOpenProgram));
  if (agendaNode.parentElement) agendaNode.parentElement.hidden = !agendaNode.childElementCount;

  // Порядок внутри каждой группы — по приоритетам человека: свои страны и
  // направления сверху. На ответ «пустят ли» это не влияет, поэтому
  // группы остаются те же, меняется только порядок внутри.
  const priorities = { countries: profile.priorityCountries ?? [], majors: profile.priorityMajors ?? [] };
  const sorted = hasPriorities(priorities);
  if (!skipCards && sorted) {
    resultsNode.append(el('p', 'hint',
      'Сверху — программы из выбранных тобой стран и направлений, в том порядке, в каком ты их поставил.'));
  }

  for (const group of skipCards ? [] : groupRows(rows)) {
    const section = el('section', `group ${group.status}`);
    const title = el('h2', 'group-title', `${group.title} (${group.rows.length})`);
    title.dataset.base = group.title;
    section.append(title);
    for (const row of (sorted ? orderByPriority(group.rows, priorities) : group.rows)) {
      section.append(card(row, today, details, plan));
    }
    resultsNode.append(section);
  }
  if (!skipCards) refreshFilter(programs);
  return { skippedCards: skipCards };
}

// «Тип · страна» — что это за программа и где; без типа (данных ещё нет)
// остаётся одна страна, без выдуманной подписи.
export const kindLine = (program) => [kindLabel(program.kind), program.hostCountry && countryName(program.hostCountry)]
  .filter(Boolean)
  .join(' · ');

function answerNodes(text, fallback = false) {
  const box = el('div', 'explain-answer');
  for (const section of parseAnswer(text)) {
    if (section.heading) box.append(el('h5', 'explain-heading', section.heading));
    for (const line of section.lines) box.append(el('p', 'explain-line', line));
  }
  box.append(el('p', 'explain-note', fallback
    ? 'ИИ сейчас занят, поэтому это короткая справка, собранная из данных карточки. Сверься с сайтом программы.'
    : 'Пояснение написано ИИ по данным этой карточки. Он может ошибаться: сверься с сайтом программы.'));
  return box;
}

// Кнопка есть только когда в config.js указан адрес прокси. Что уходит
// наружу, сказано рядом с кнопкой: человек решает, нажимать ли, зная это.
export function explainBlock(model) {
  const wrap = el('div', 'explain');
  // Ответ модели приходит в уже стоящий блок: экранный диктор его зачитает.
  wrap.setAttribute('aria-live', 'polite');
  const cached = cachedAnswer(model);
  if (cached) {
    wrap.append(answerNodes(cached));
    return wrap;
  }
  const button = el('button', 'button button-small', 'Объяснить простыми словами (ИИ)');
  button.type = 'button';
  const status = el('p', 'explain-note');
  wrap.append(
    button,
    el('p', 'explain-note', model.reasons.length
      ? 'Уйдут только причины ответа по этой программе и названные в них цифры — без анкеты целиком и без даты рождения.'
      : 'Уйдёт только название программы — без анкеты и без даты рождения.'),
    status,
  );
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Думаю…';
    status.textContent = '';
    try {
      const { text, fallback } = await askExplain(model, { url: EXPLAIN_URL });
      wrap.textContent = '';
      wrap.append(answerNodes(text, fallback));
    } catch (error) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = 'Попробовать ещё раз';
      status.textContent = ERROR_TEXT[error.kind] ?? ERROR_TEXT.model;
    }
  });
  return wrap;
}

// Главный ответ одной строкой: сколько программ подходит по условиям и сколько
// ещё нужно проверить или доделать. Считаются только открытые программы; число
// «подходят» то же, что в readySummary и в первой строке «Подробнее».
export function countLine(rows) {
  const open = rows.filter((row) => row.deadline !== 'closed');
  const yes = open.filter((row) => bucketOf(row.verdict) === 'yes').length;
  const rest = open.filter((row) => ['likely', 'check'].includes(bucketOf(row.verdict))).length;
  const line = el('p', 'summary-count');
  line.append(el('strong', null, String(yes)), ` ${plural(yes, 'подходит', 'подходят', 'подходят')} по условиям`);
  if (rest) line.append(' · ', el('strong', null, String(rest)), ' нужно проверить или доделать');
  return line;
}

// Пока подробности едут по сети, вместо пустоты стоит заготовка будущего
// списка. Текст остаётся для экранного диктора: глазами его не видно.
export function skeleton(label) {
  const box = el('div', 'skeleton-lines');
  box.setAttribute('role', 'status');
  box.append(el('span', 'sr-only', label));
  for (let i = 0; i < 3; i += 1) box.append(el('span', 'skeleton'));
  return box;
}

// Одна строка списка. Подробности — на экране программы (js/program-view.js):
// список читается как перечень, а не как стена из раскрывающихся блоков.
function card(row, today, details, plan) {
  const id = row.program.id;
  const model = cardModel(row, extraFor(details, id), today);
  const box = el('article', `card ${model.bucket}${model.closed ? ' closed' : ''}`);
  box.dataset.id = id;
  // По этим полям фильтр каталога решает, показать карточку или спрятать.
  box.dataset.plan = plan.ids.includes(id) ? '1' : '0';
  box.dataset.title = model.title;
  box.dataset.orig = row.program.name?.orig ?? '';
  box.dataset.country = row.program.hostCountry ?? '';
  box.dataset.kind = row.program.kind ?? '';
  box.dataset.bucket = model.bucket;

  const { verdict, reason } = splitHeadline(model.headline);
  const href = programHref(id);
  const title = el('h3', 'card-title');
  const name = el('a', null, model.title);
  name.href = href;
  title.append(name);
  const meta = [kindLine(row.program), model.coverageLine, model.deadlineLine].filter(Boolean).join(' · ');
  box.append(el('span', 'card-verdict', verdict), title, el('p', 'card-meta', meta));
  const why = reason.split(' · ')[0];
  if (why) box.append(el('p', 'card-reason', why));

  const actions = el('div', 'card-actions');
  const open = el('a', 'card-open', 'Открыть программу →');
  open.href = href;
  actions.append(open, planButton(id, plan));
  box.append(actions);
  return box;
}

export const programHref = (id) => `#program/${encodeURIComponent(id)}`;

// Одна кнопка на списке и на экране программы. Перерисовка заменяет узлы, поэтому
// фокус возвращаем на ту же кнопку: иначе с клавиатуры человек оказывается в начале.
export function planButton(id, plan) {
  const inPlan = plan.ids.includes(id);
  const mark = el('button', 'button button-small button-quiet plan-toggle', inPlan ? '✓ В моём пути' : 'В мой путь');
  mark.type = 'button';
  mark.setAttribute('aria-pressed', String(inPlan));
  if (!inPlan && plan.ids.length >= plan.limit) {
    mark.disabled = true;
    mark.textContent = `В пути уже ${plan.ids.length}`;
    mark.title = 'Убери одну цель из «Моего пути», чтобы добавить другую.';
  }
  mark.addEventListener('click', () => {
    plan.toggle(id);
    // Тот же id есть и в скрытом списке, и на экране программы: берём видимую кнопку.
    const same = document.querySelectorAll(`.card[data-id="${CSS.escape(id)}"] .plan-toggle, .program-plan .plan-toggle`);
    [...same].find((node) => node.offsetParent !== null)?.focus();
  });
  return mark;
}

// Одна причина на экране программы: название, что именно не так, как обойти
// и что пишет сама программа.
export function reasonItem(reason) {
  const item = el('div', `reason ${reason.status}`);
  const line = el('p', 'reason-text');
  line.append(el('strong', null, `${reason.title}. `), document.createTextNode(reason.detail));
  item.append(line);
  if (reason.workarounds.length) {
    item.append(el('p', 'reason-label', 'Как обойти:'), list(reason.workarounds, 'reason-list'));
  }
  if (reason.says.length) {
    item.append(el('p', 'reason-label', 'Что пишет программа:'), list(reason.says, 'reason-list'));
  }
  if (reason.noWorkaround) {
    item.append(el('p', 'reason-muted', 'Обходного пути программа не называет. Если сомневаешься — напиши в приёмную комиссию.'));
  }
  if (reason.seeBelow) item.append(el('p', 'reason-muted', 'Подробности — в условиях программы ниже.'));
  return item;
}

export { list as bulletList, el as makeNode };
