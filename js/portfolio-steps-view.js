// «Портфолио» — четыре шага сценария (docs/PORTFOLIO-SCENARIO.md, раздел 5).
// Шаги видны всегда, ведём по порядку. Шаг выбирается адресом: #route — первый,
// #route/needs, #route/gaps — второй и третий, #route/work (и старый #route/new)
// и #route/pack — четвёртый: новая работа или упаковка готового.
import { renderInventory } from './portfolio-inventory-view.js';
import { renderPortfolio } from './portfolio-view.js';
import { renderNeeds } from './portfolio-needs-view.js';
import { renderGaps } from './portfolio-gaps-view.js';
import { renderPack } from './portfolio-pack-view.js';
import { portfolioMode } from './materials-plan.js';
import { goalCards, modeLine } from './portfolio-plan.js';

export const PORTFOLIO_STEPS = [
  { id: 'have', hash: '#route', title: 'Что есть' },
  { id: 'needs', hash: '#route/needs', title: 'Что просят' },
  { id: 'gaps', hash: '#route/gaps', title: 'Чего не хватает' },
  { id: 'work', hash: '#route/work', title: 'Работа' },
];

const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };

export function portfolioStep(hash, focusExperience = null) {
  // Переход из «Сегодня» к конкретной работе открывает шаг с работами.
  if (focusExperience || hash === '#route/new' || hash === '#route/pack') return 'work';
  return PORTFOLIO_STEPS.find(step => step.hash === hash)?.id ?? 'have';
}

// Внутри шага 4: упаковка, если адрес #route/pack, иначе новая работа.
export const workView = (hash, focusExperience = null) => !focusExperience && hash === '#route/pack' ? 'pack' : 'work';

function stepStrip(current, mode) {
  const nav = el('nav', 'step-strip');
  nav.setAttribute('aria-label', 'Шаги портфолио');
  const list = el('ol');
  PORTFOLIO_STEPS.forEach((step, index) => {
    const item = el('li'), link = el('a');
    // Когда до срока мало времени, шаг 4 сразу открывает упаковку.
    link.href = step.id === 'work' && mode === 'pack' ? '#route/pack' : step.hash;
    link.setAttribute('aria-label', `Шаг ${index + 1}: ${step.title}`);
    if (step.id === current) link.setAttribute('aria-current', 'step');
    link.append(el('b', null, String(index + 1)), el('span', null, step.title));
    item.append(link); list.append(item);
  });
  nav.append(list);
  return nav;
}

function modeBanner(line) {
  const box = el('p', 'route-detail');
  box.dataset.mode = line.mode;
  box.append(el('span', 'pill', line.lead), document.createTextNode(` ${line.text}`));
  return box;
}

function workSwitch(view) {
  const nav = el('nav', 'chips');
  nav.setAttribute('aria-label', 'Что делать на шаге 4');
  for (const [id, hash, title] of [['work', '#route/work', 'Новая работа'], ['pack', '#route/pack', 'Упаковать']]) {
    const link = el('a', 'chip', title);
    link.href = hash;
    if (id === view) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  return nav;
}

export function renderPortfolioSteps(props) {
  const current = portfolioStep(location.hash, props.focusExperience);
  const goals = (props.routeState?.goals ?? []).filter(id => props.programs?.some(item => item.id === id));
  const mode = goals.length ? portfolioMode({ goals, cards: goalCards(props.programs, goals), today: props.today }) : null;
  const line = modeLine(mode, props.programs ?? []);
  const wrap = el('div');
  if (line) wrap.append(modeBanner(line));
  wrap.append(stepStrip(current, mode?.mode));
  if (current === 'have') wrap.append(renderInventory(props));
  else if (current === 'needs') wrap.append(renderNeeds(props));
  else if (current === 'gaps') wrap.append(renderGaps(props));
  else {
    const view = workView(location.hash, props.focusExperience);
    wrap.append(workSwitch(view), view === 'pack' ? renderPack(props) : renderPortfolio(props));
  }
  return wrap;
}
