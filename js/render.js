// Единственный файл, который трогает DOM результатов (анкета — form.js).
// Решения о словах и разделах принимают wording.js, summary.js и
// card-model.js; здесь их только рисуют.
import { evaluate } from './verdict.js';
import { deadlineState } from './lib/deadline.js';
import { summaryLines, readySummary } from './summary.js';
import { cardModel } from './card-model.js';
import { bucketOf } from './wording.js';
import { agenda } from './agenda.js';
import { timeLeft, formatDate, dateTile, plural } from './lib/format.js';
import { safeHttpUrl } from './lib/url.js';
import { refreshFilter, countryName } from './filter.js';
import { kindLabel } from './lib/kinds.js';
import { EXPLAIN_URL } from './config.js';
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

// Пересчёт идёт на каждое нажатие в анкете. Без этого все раскрытые
// карточки захлопывались бы, пока человек правит балл.
function rememberOpen(node, selector) {
  return new Set([...node.querySelectorAll(`${selector}[open]`)].map((d) => d.dataset.id));
}

// Календарь сроков: строка на программу, без раскрытия. Подробности
// лежат в каталоге — сюда человек пришёл за датами, а не за чтением.
// Первый экран — только самые близкие сроки; остальное под «Ещё».
const AGENDA_VISIBLE = 5;

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
  const { summaryNode, agendaNode, resultsNode, catalogButton, onOpenProgram } = nodes;
  const openCards = rememberOpen(resultsNode, 'details.card');
  const openMore = rememberOpen(resultsNode, 'details.more');
  summaryNode.textContent = '';
  agendaNode.textContent = '';
  resultsNode.textContent = '';

  if (!programs.length) {
    resultsNode.append(el('p', 'empty', 'Программ пока нет. Данные собираются.'));
    return;
  }

  // Наверху одна главная строка. Что улучшить и на что обратить внимание —
  // под «Подробнее»: это нужно не каждому и не с первого взгляда.
  const [headline, ...extra] = summaryLines(profile, programs, today);
  const ready = readySummary(profile, programs, today);
  if (ready.count) {
    summaryNode.append(readyStat(ready));
  } else {
    summaryNode.append(el('p', 'summary-line', headline));
  }
  if (extra.length) {
    const more = el('details', 'summary-more');
    more.append(el('summary', 'summary-more-head', 'Подробнее: что улучшить'));
    for (const line of extra) more.append(el('p', 'summary-line', line));
    summaryNode.append(more);
  }
  summaryNode.append(el('p', 'summary-note', 'Это «пустят ли подавать», а не «возьмут ли»: шансы сайт не оценивает. Всё сверяй с сайтом программы.'));

  const rows = programs.map((program) => ({
    program,
    verdict: evaluate(profile, program, today),
    deadline: deadlineState(program.deadline, today),
  }));

  const soon = agenda(rows, today);
  if (soon.length) agendaNode.append(agendaBlock(soon, today, onOpenProgram));

  for (const group of groupRows(rows)) {
    const section = el('section', `group ${group.status}`);
    const title = el('h2', 'group-title', `${group.title} (${group.rows.length})`);
    title.dataset.base = group.title;
    section.append(title);
    for (const row of group.rows) {
      const model = cardModel(row, details.programs?.[row.program.id] ?? null, today);
      // «Тип · страна» — что это за программа и где; без типа (данных ещё
      // нет) остаётся одна страна, без выдуманной подписи.
      const kindLine = [kindLabel(row.program.kind), row.program.hostCountry && countryName(row.program.hostCountry)]
        .filter(Boolean)
        .join(' · ');
      const node = card(model, details, openCards, openMore, kindLine);
      // По этим полям фильтр каталога решает, показать карточку или спрятать.
      node.dataset.title = model.title;
      node.dataset.orig = row.program.name?.orig ?? '';
      node.dataset.country = row.program.hostCountry ?? '';
      node.dataset.kind = row.program.kind ?? '';
      node.dataset.bucket = model.bucket;
      section.append(node);
    }
    resultsNode.append(section);
  }
  refreshFilter(programs);

  catalogButton.textContent = `Все программы (${rows.length})`;
  catalogButton.hidden = false;
}

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
function explainBlock(model) {
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
    el('p', 'explain-note', 'Уйдут только причины ответа по этой программе и названные в них цифры — без анкеты целиком и без даты рождения.'),
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

// Главный ответ крупно: число программ и ближайший срок. Число то же, что в
// первой строке сводки (обе берут readySummary), поэтому они не разойдутся.
function readyStat({ count, next }) {
  const box = el('div', 'summary-stat');
  box.append(
    el('span', 'summary-number', String(count)),
    el('span', 'summary-label', `${plural(count, 'программа подходит', 'программы подходят', 'программ подходят')} по условиям`),
  );
  if (next) {
    const line = el('p', 'summary-next');
    line.append('Ближайший срок: ', el('strong', '', formatDate(next.date)), ` · ${next.name}`);
    box.append(line);
  }
  return box;
}

// Пока подробности едут по сети, вместо пустоты стоит заготовка будущего
// списка. Текст остаётся для экранного диктора: глазами его не видно.
function skeleton(label) {
  const box = el('div', 'skeleton-lines');
  box.setAttribute('role', 'status');
  box.append(el('span', 'sr-only', label));
  for (let i = 0; i < 3; i += 1) box.append(el('span', 'skeleton'));
  return box;
}

function card(model, details, openCards, openMore, kindLine) {
  const box = el('details', `card ${model.bucket}${model.closed ? ' closed' : ''}`);
  box.dataset.id = model.id;
  box.open = openCards.has(model.id);

  const { verdict, reason } = splitHeadline(model.headline);
  const head = el('summary', 'card-head');
  const metas = el('span', 'card-metas');
  metas.append(el('span', 'card-meta', model.deadlineLine), el('span', 'card-meta card-meta-cover', model.coverageLine));
  head.append(
    el('span', 'card-verdict', verdict),
    ...(kindLine ? [el('span', 'card-kind', kindLine)] : []),
    el('span', 'card-title', model.title),
    ...reason.split(' · ').filter(Boolean).map((part, i) => el('span', i ? 'card-reason card-reason-tail' : 'card-reason', part)),
    metas,
  );
  box.append(head);

  const body = el('div', 'card-body');

  // Главное действие — сразу под шапкой, а не после списков условий.
  const applyUrl = safeHttpUrl(model.applyUrl);
  if (applyUrl) {
    const link = el('a', 'button', 'Открыть сайт программы');
    link.href = applyUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    body.append(link);
  }

  if (model.reasons.length) {
    body.append(el('h4', 'card-section-title', 'Почему так'));
    for (const reason of model.reasons) {
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
      body.append(item);
    }
    if (EXPLAIN_URL) body.append(explainBlock(model));
  }

  if (!model.hasDetails) {
    if (details.status === 'failed') {
      const failed = el('p', 'details-state', 'Подробности не загрузились. Проверь интернет. ');
      const retry = el('button', 'button button-small', 'Попробовать ещё раз');
      retry.type = 'button';
      retry.addEventListener('click', () => details.retry());
      failed.append(retry);
      body.append(failed);
    } else {
      body.append(skeleton('Подробности загружаются…'));
    }
  }

  for (const section of model.sections) {
    body.append(el('h4', 'card-section-title', section.title), list(section.items, 'card-list'));
  }

  if (model.more.notes.length || model.more.attested.length) {
    const more = el('details', 'more');
    more.dataset.id = model.id;
    more.open = openMore.has(model.id);
    more.append(el('summary', 'more-head', 'Ещё'));
    if (model.more.notes.length) more.append(list(model.more.notes, 'card-list'));
    if (model.more.attested.length) {
      more.append(el('p', 'reason-label', 'Не ограничивает — проверено по страницам программы:'), list(model.more.attested, 'card-list muted'));
    }
    body.append(more);
  }

  if (model.source) {
    const foot = el('p', 'card-source', `${model.source}. `);
    const sourceUrl = safeHttpUrl(model.sourceUrl);
    if (sourceUrl) {
      const a = el('a', null, 'Источник');
      a.href = sourceUrl;
      a.target = '_blank';
      a.rel = 'noopener';
      foot.append(a);
    }
    body.append(foot);
  }

  box.append(body);
  return box;
}
