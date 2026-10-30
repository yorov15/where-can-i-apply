// Экран «Программа»: одна программа целиком. Список «Куда можно» даёт только
// строку, всё остальное — здесь: срок, что покрывает, взнос, что сделать,
// документы и источники. Данные берутся из тех же cardModel и extraFor, что и
// у списка, поэтому слова и числа на двух экранах не разойдутся.
import { evaluate } from './verdict.js';
import { deadlineState } from './lib/deadline.js';
import { cardModel, extraFor } from './card-model.js';
import { PROGRAM_SIDE_STATES } from './wording.js';
import { feeOf, feeCell } from './cost.js';
import { safeHttpUrl } from './lib/url.js';
import { EXPLAIN_URL } from './config.js';
import { formatDate } from './lib/format.js';
import { statusOf, goalProgress, progressLine } from './goal-status.js';
import {
  splitHeadline, kindLine, explainBlock, skeleton, reasonItem, planButton, bulletList, makeNode as el,
} from './render.js';

// Что в разделе условий — дело человека (собрать документы, подать), а что —
// справка о требованиях. Первое идёт под «Что нужно сделать», второе —
// в свёрнутые «Источники и точные требования».
const TODO_SECTIONS = new Set(['documents', 'steps']);

export const programRow = (program, profile, today) => ({
  program,
  verdict: evaluate(profile, program, today),
  deadline: deadlineState(program.deadline, today),
});

// Метка у шага: чья это работа. Состояния из PROGRAM_SIDE_STATES человек не
// закроет сам — их называет только вуз, поэтому «Уточнить у вуза».
export function stepTag(reason) {
  if (PROGRAM_SIDE_STATES.has(reason.code.split('.')[1])) return 'Уточнить у вуза';
  return reason.status === 'fail' ? 'Не хватает' : 'Проверить';
}

// Что показать на экране. Чистая функция: тесты читают её, а не DOM.
export function programModel(row, details, today) {
  const extra = extraFor(details, row.program.id);
  const model = cardModel(row, extra, today);
  const { verdict, reason } = splitHeadline(model.headline);
  const loading = !model.hasDetails || model.conditionsPending;
  const applicationFee = loading ? null : feeOf(extra);
  const fee = loading ? null : feeCell(applicationFee);
  const lead = model.bucket === 'yes'
    ? 'Твоя анкета подходит под названные условия. Отбор проводит вуз.'
    : reason.charAt(0).toUpperCase() + reason.slice(1);
  return {
    model,
    verdict,
    lead,
    kind: kindLine(row.program),
    feeSource: applicationFee?.source ?? null,
    applyRoutes: (Array.isArray(extra?.applyChannel?.routes) ? extra.applyChannel.routes : [])
      .filter(route => route && typeof route.name === 'string' && route.name.trim()
        && (route.url === null || safeHttpUrl(route.url))),
    facts: [
      ['Срок подачи', model.deadlineLine],
      ['Что покрывает', model.coverageLine],
      ['Взнос за заявку', fee ?? 'Загружается…'],
    ],
    steps: model.reasons.map((reason) => ({ reason, tag: stepTag(reason) })),
    todo: model.sections.filter((section) => TODO_SECTIONS.has(section.key)),
    exact: model.sections.filter((section) => !TODO_SECTIONS.has(section.key)),
  };
}

function link(url, text, className) {
  const href = safeHttpUrl(url);
  if (!href) return null;
  const node = el('a', className, text);
  node.href = href;
  node.target = '_blank';
  node.rel = 'noopener';
  return node;
}

function exactBlock(view, model) {
  const box = el('details', 'program-exact');
  box.append(el('summary', 'summary-more-head', 'Источники и точные требования'));
  for (const section of view.exact) {
    box.append(el('h4', 'card-section-title', section.title), bulletList(section.items, 'card-list'));
  }
  if (model.more.notes.length) box.append(bulletList(model.more.notes, 'card-list'));
  if (model.more.attested.length) {
    box.append(
      el('p', 'reason-label', 'Не ограничивает — проверено по страницам программы:'),
      bulletList(model.more.attested, 'card-list muted'),
    );
  }
  if (view.applyRoutes.length) {
    const heading = el('h4', 'card-section-title', 'Как подавать — порядок и источники');
    heading.dataset.channelSources = '';
    heading.tabIndex = -1;
    box.append(heading);
    for (const route of view.applyRoutes) {
      const item = el('p', 'card-source', `${route.name}. ${route.note ?? ''} Проверено ${formatDate(route.source?.lastVerified)}. `);
      const reference = link(route.source?.url, 'Источник канала');
      if (reference) item.append(reference);
      box.append(item);
    }
  }
  if (model.source) {
    const foot = el('p', model.stale ? 'card-source stale' : 'card-source', `${model.source}. `);
    const source = link(model.sourceUrl, 'Источник');
    if (source) foot.append(source);
    box.append(foot);
  }
  return box;
}

// props: { row, loading, details, plan, route, routeState, today, handlers }.
// row — null, пока программу ищем, или когда такой нет.
export function renderProgram(root, props) {
  const { row, loading, details, plan, route, routeState, today, handlers } = props;
  root.textContent = '';

  const back = el('button', 'link-button', '← Назад');
  back.type = 'button';
  back.addEventListener('click', handlers.onBack);
  root.append(back);

  if (!row) {
    root.append(loading ? skeleton('Программа загружается…') : el('p', 'empty', 'Такой программы на сайте нет. Вернись к списку и выбери из него.'));
    return;
  }

  const view = programModel(row, details, today);
  const { model } = view;
  const id = row.program.id;

  const top = el('p', 'program-top');
  if (!props.guest) top.append(el('span', `card-verdict ${model.bucket}`, view.verdict));
  if (view.kind) top.append(el('span', 'card-meta', view.kind));
  root.append(top, el('h2', 'program-title', model.title));
  if (!props.guest) root.append(el('p', 'program-lead', view.lead));
  else {
    const note = el('section', 'profile-invite');
    note.append(el('p', null, 'Это общие условия программы. Чтобы проверить их для себя, добавь сведения о школе и гражданстве.'));
    const check = el('button', 'button button-quiet', 'Проверить по моей анкете');
    check.type = 'button'; check.addEventListener('click', handlers.onProfile); note.append(check); root.append(note);
  }

  const facts = el('dl', 'facts');
  for (const [name, value] of view.facts) {
    const cell = el('div');
    cell.append(el('dt', null, name), el('dd', null, value));
    facts.append(cell);
  }
  if (view.applyRoutes.length) {
    const cell = el('div', 'program-channel');
    const value = el('dd');
    view.applyRoutes.forEach((route, index) => {
      if (index) value.append(document.createTextNode(' · '));
      value.append(link(route.url, route.name) ?? document.createTextNode(route.name));
    });
    if (view.applyRoutes.some(route => route.note)) {
      const conditions = el('button', 'link-button', 'Порядок и условия');
      conditions.type = 'button';
      conditions.addEventListener('click', () => {
        const exact = root.querySelector('.program-exact');
        exact.open = true;
        const heading = exact.querySelector('[data-channel-sources]');
        heading.scrollIntoView({ block: 'center' });
        heading.focus({ preventScroll: true });
      });
      value.append(document.createTextNode(' · '), conditions);
    }
    cell.append(el('dt', null, 'Как подавать'), value);
    facts.append(cell);
  }
  root.append(facts);
  if (view.feeSource) {
    const reference = link(view.feeSource.url, 'Источник взноса');
    if (reference) {
      const note = el('p', 'card-source', `Взнос проверен ${formatDate(view.feeSource.lastVerified)}. `);
      note.append(reference);
      root.append(note);
    }
  }

  const site = link(model.applyUrl, 'Открыть сайт программы', 'button');
  if (site) root.append(site);

  if (model.conditionsFailed) {
    root.append(el('p', 'details-state', 'Условия программы не загрузились. Проверь интернет и обнови страницу.'));
  }
  if (!model.hasDetails) {
    if (details.status === 'failed') {
      const failed = el('p', 'details-state', 'Подробности не загрузились. Проверь интернет. ');
      const retry = el('button', 'button button-small', 'Попробовать ещё раз');
      retry.type = 'button';
      retry.addEventListener('click', () => details.retry());
      failed.append(retry);
      root.append(failed);
    } else {
      root.append(skeleton('Подробности загружаются…'));
    }
  }

  if ((!props.guest && view.steps.length) || view.todo.length) {
    root.append(el('h3', 'program-section', 'Что нужно сделать'));
    for (const { reason, tag } of props.guest ? [] : view.steps) {
      const step = reasonItem(reason);
      step.prepend(el('span', 'tag', tag));
      root.append(step);
    }
    for (const section of view.todo) {
      root.append(el('h4', 'card-section-title', section.title), bulletList(section.items, 'card-list'));
    }
  }
  if (EXPLAIN_URL && !props.guest) root.append(explainBlock(model));

  root.append(exactBlock(view, model));

  const next = el('section', 'program-plan');
  next.append(el('h3', 'program-section', 'Добавь в свой путь'));
  next.append(el('p', 'route-detail', plan.ids.includes(id)
    ? 'Программа в твоём пути. Сроки и дела — на вкладках «Сегодня» и «Мой путь».'
    : 'Срок и дела по этой программе появятся на вкладках «Сегодня» и «Мой путь».'));
  if (plan.ids.includes(id) && route?.goals.some(goal => goal.id === id)) {
    next.append(el('p', 'route-goal-meta', progressLine(goalProgress(route, id), statusOf(routeState, id))));
  }
  const actions = el('div', 'today-actions');
  const add = planButton(id, plan);
  // Здесь это главное действие экрана, поэтому кнопка полная, а не тихая, как в списке.
  if (!plan.ids.includes(id)) add.classList.remove('button-quiet');
  actions.append(add);
  const today2 = el('button', 'link-button', 'К сегодняшним делам →');
  today2.type = 'button';
  today2.addEventListener('click', handlers.onOpenToday);
  actions.append(today2);
  next.append(actions);
  root.append(next);
}
