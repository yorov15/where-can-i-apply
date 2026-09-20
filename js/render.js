// Единственный файл, который трогает DOM результатов (анкета — form.js).
// Решения о словах и разделах принимают wording.js, summary.js и
// card-model.js; здесь их только рисуют.
import { evaluate } from './verdict.js';
import { deadlineState } from './lib/deadline.js';
import { summaryLines } from './summary.js';
import { cardModel } from './card-model.js';
import { bucketOf } from './wording.js';
import { agenda } from './agenda.js';
import { timeLeft, formatDate } from './lib/format.js';
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
function agendaBlock(groups, today, onOpenProgram) {
  const box = el('div', 'agenda');
  box.append(el('h2', 'agenda-title', 'Ближайшие сроки'));

  for (const group of groups) {
    box.append(el('h3', 'agenda-horizon', group.title));
    const ul = el('ul', 'agenda-list');
    for (const row of group.rows) {
      const item = el('li');
      const line = el('button', 'agenda-item');
      line.type = 'button';
      const closes = row.program.deadline?.closes;
      line.append(el('span', 'agenda-name', row.program.name?.ru ?? row.program.id));
      line.append(el('span', 'agenda-when', closes
        ? `до ${formatDate(closes)} · ${timeLeft(today, closes)}`
        : 'дату программа не назвала'));
      line.addEventListener('click', () => onOpenProgram(row.program.id));
      item.append(line);
      ul.append(item);
    }
    box.append(ul);
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

  for (const line of summaryLines(profile, programs, today)) summaryNode.append(el('p', 'summary-line', line));
  summaryNode.append(el('p', 'summary-note', 'Это ответ на вопрос «пустят ли подавать», а не «возьмут ли». Шансы поступления сайт не оценивает: отбор, эссе и документы решают сами программы. Всё сверяй с сайтом программы.'));

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
    button.textContent = 'Думаю…';
    status.textContent = '';
    try {
      const { text, fallback } = await askExplain(model, { url: EXPLAIN_URL });
      wrap.textContent = '';
      wrap.append(answerNodes(text, fallback));
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Попробовать ещё раз';
      status.textContent = ERROR_TEXT[error.kind] ?? ERROR_TEXT.model;
    }
  });
  return wrap;
}

function card(model, details, openCards, openMore, kindLine) {
  const box = el('details', `card ${model.bucket}${model.closed ? ' closed' : ''}`);
  box.dataset.id = model.id;
  box.open = openCards.has(model.id);

  const { verdict, reason } = splitHeadline(model.headline);
  const head = el('summary', 'card-head');
  head.append(
    el('span', 'card-verdict', verdict),
    ...(kindLine ? [el('span', 'card-kind', kindLine)] : []),
    el('span', 'card-title', model.title),
    ...reason.split(' · ').filter(Boolean).map((part, i) => el('span', i ? 'card-reason card-reason-tail' : 'card-reason', part)),
    el('span', 'card-meta', model.deadlineLine),
    el('span', 'card-meta', model.coverageLine),
  );
  box.append(head);

  const body = el('div', 'card-body');

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
      body.append(el('p', 'details-state', 'Подробности загружаются…'));
    }
  }

  for (const section of model.sections) {
    body.append(el('h4', 'card-section-title', section.title), list(section.items, 'card-list'));
  }

  const applyUrl = safeHttpUrl(model.applyUrl);
  if (applyUrl) {
    const link = el('a', 'button', 'Открыть сайт программы');
    link.href = applyUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    body.append(link);
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
