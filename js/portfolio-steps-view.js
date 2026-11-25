// «Портфолио» — четыре шага сценария (docs/PORTFOLIO-SCENARIO.md, раздел 5).
// Шаги видны всегда, ведём по порядку. Шаг выбирается адресом: #route — первый,
// #route/needs, #route/gaps, #route/work (и старый #route/new) — остальные.
import { renderInventory } from './portfolio-inventory-view.js';
import { renderPortfolio } from './portfolio-view.js';

export const PORTFOLIO_STEPS = [
  { id: 'have', hash: '#route', title: 'Что есть' },
  { id: 'needs', hash: '#route/needs', title: 'Что просят' },
  { id: 'gaps', hash: '#route/gaps', title: 'Чего не хватает' },
  { id: 'work', hash: '#route/work', title: 'Работа' },
];

const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };

export function portfolioStep(hash, focusExperience = null) {
  // Переход из «Сегодня» к конкретной работе открывает шаг с работами.
  if (focusExperience || hash === '#route/new') return 'work';
  return PORTFOLIO_STEPS.find(step => step.hash === hash)?.id ?? 'have';
}

function stepStrip(current) {
  const nav = el('nav', 'step-strip');
  nav.setAttribute('aria-label', 'Шаги портфолио');
  const list = el('ol');
  PORTFOLIO_STEPS.forEach((step, index) => {
    const item = el('li'), link = el('a');
    link.href = step.hash;
    link.setAttribute('aria-label', `Шаг ${index + 1}: ${step.title}`);
    if (step.id === current) link.setAttribute('aria-current', 'step');
    link.append(el('b', null, String(index + 1)), el('span', null, step.title));
    item.append(link); list.append(item);
  });
  nav.append(list);
  return nav;
}

// Шаги 2 и 3 ждут данных data/materials и ответа Мурода (раздел 10 сценария).
// Пока честно говорим, где это лежит сейчас.
function waiting(title, text) {
  const box = el('section', 'journey-panel');
  box.append(el('h3', null, title), el('p', 'journey-meta', text));
  const link = el('a', 'link-button', 'Открыть «Подготовку»');
  link.href = '#route/preparation';
  box.append(link);
  return box;
}

export function renderPortfolioSteps(props) {
  const current = portfolioStep(location.hash, props.focusExperience);
  const wrap = el('div');
  wrap.append(stepStrip(current));
  if (current === 'have') wrap.append(renderInventory(props));
  else if (current === 'needs') wrap.append(waiting('Что просят мои цели', 'Таблицу материалов по каждой цели собираем по официальным страницам программ. Пока список нужного для твоих целей — в «Подготовке».'));
  else if (current === 'gaps') wrap.append(waiting('Чего не хватает', 'Список пробелов появится вместе с таблицей материалов. Пока недостающее для твоих целей — в «Подготовке».'));
  else wrap.append(renderPortfolio(props));
  return wrap;
}
