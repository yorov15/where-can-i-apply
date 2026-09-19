// Единственный файл, который трогает DOM результатов (анкета — form.js).
// Решения о словах и разделах принимают wording.js, summary.js и
// card-model.js; здесь их только рисуют.
import { evaluate } from './verdict.js';
import { deadlineState } from './lib/deadline.js';
import { summaryLines } from './summary.js';
import { cardModel } from './card-model.js';
import { bucketOf } from './wording.js';

const ORDER = { yes: 0, likely: 1, check: 2, no: 3 };

const GROUPS = [
  ['yes', 'Можно подавать'],
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

export function renderResults({ summaryNode, resultsNode }, profile, programs, today, details) {
  const openCards = rememberOpen(resultsNode, 'details.card');
  const openMore = rememberOpen(resultsNode, 'details.more');
  summaryNode.textContent = '';
  resultsNode.textContent = '';

  if (!programs.length) {
    resultsNode.append(el('p', 'empty', 'Программ пока нет. Данные собираются.'));
    return;
  }

  for (const line of summaryLines(profile, programs, today)) summaryNode.append(el('p', 'summary-line', line));
  summaryNode.append(el('p', 'summary-note', 'Ответ — только про то, пустят ли подавать. Отбор, эссе и документы решают отдельно.'));

  const rows = programs.map((program) => ({
    program,
    verdict: evaluate(profile, program, today),
    deadline: deadlineState(program.deadline, today),
  }));

  for (const group of groupRows(rows)) {
    const section = el('section', `group ${group.status}`);
    section.append(el('h2', 'group-title', `${group.title} (${group.rows.length})`));
    for (const row of group.rows) {
      const model = cardModel(row, details.programs?.[row.program.id] ?? null, today);
      section.append(card(model, details, openCards, openMore));
    }
    resultsNode.append(section);
  }
}

function card(model, details, openCards, openMore) {
  const box = el('details', `card ${model.bucket}${model.closed ? ' closed' : ''}`);
  box.dataset.id = model.id;
  box.open = openCards.has(model.id);

  const head = el('summary', 'card-head');
  head.append(
    el('span', 'card-title', model.title),
    el('span', 'card-headline', model.headline),
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

  if (model.applyUrl) {
    const link = el('a', 'button', 'Открыть сайт программы');
    link.href = model.applyUrl;
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
    if (model.sourceUrl) {
      const a = el('a', null, 'Источник');
      a.href = model.sourceUrl;
      a.target = '_blank';
      a.rel = 'noopener';
      foot.append(a);
    }
    body.append(foot);
  }

  box.append(body);
  return box;
}
