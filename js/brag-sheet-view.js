// Страница «Шпаргалка для учителя» (#route/recommenders/<id>/sheet): один
// лист для печати и копирования. Ответы правятся в блоке «Рекомендации»;
// здесь только просмотр. Логика текста — brag-sheet.js.
import { recommendersOf, sheetFilled } from './recommenders.js';
import { entriesFor, loadRecommendationSource, openRecommenderSheet } from './recommenders-view.js';
import { bragSheetRoute, bragSheetText, sheetSections, sheetWorks, sheetFrom, entryLine,
  SHEET_TITLE, SHEET_INTRO, SHEET_END } from './brag-sheet.js';
import { printSheet } from './spotlight-view.js';
import { portfolioOf } from './portfolio.js';

const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };
const button = (text, cls, run) => { const node = el('button', cls, text); node.type = 'button'; node.addEventListener('click', run); return node; };

function back() {
  const link = el('a', 'link-button', '← К рекомендациям');
  link.href = '#route/preparation';
  link.addEventListener('click', () => { const id = bragSheetRoute(location.hash); if (id) openRecommenderSheet(id); });
  return link;
}

// Лист: одна и та же разметка на экране и на бумаге.
function sheet(state, person, entries) {
  const article = el('article');
  article.dataset.bragSheet = person.id;
  const from = sheetFrom(state);
  article.append(el('h2', null, SHEET_TITLE),
    el('p', 'journey-meta', `Кому: ${[person.name, person.role].filter(Boolean).join(' · ')}`),
    el('p', 'journey-meta', `От: ${from || '______________________________'}`),
    el('p', null, SHEET_INTRO));
  const part = (title, ...nodes) => { const box = el('section'); box.append(el('h3', null, title), ...nodes); article.append(box); };
  if (entries.length) part('Куда подаюсь', ...entries.map(item => el('p', null, `— ${entryLine(item)}`)));
  for (const section of sheetSections(person.sheet)) {
    part(section.title, ...section.items.map((text, index) => el('p', 'journey-copy', section.numbered ? `${index + 1}. ${text}` : text)));
  }
  const works = sheetWorks(state, entries);
  if (works?.kind === 'spotlight') part('Мои работы', ...works.texts.map(text => el('p', 'journey-copy', text)));
  if (works?.kind === 'titles') part('Мои работы', ...works.titles.map(title => el('p', null, `— ${title}`)));
  article.append(el('p', null, SHEET_END));
  return article;
}

// Ctrl+P на открытой шпаргалке печатает тоже только лист.
globalThis.addEventListener?.('beforeprint', () => {
  if (document.body.classList.contains('is-parent-print')) return;
  const node = document.querySelector('[data-brag-page] [data-brag-sheet]');
  if (node && bragSheetRoute(location.hash)) printSheet(node);
});

function draw(root, id, props) {
  const { handlers, route } = props, state = handlers.getRouteState();
  const person = recommendersOf(state).people.find(item => item.id === id);
  const box = el('section', 'journey-panel');
  box.dataset.bragPage = id;
  const bar = el('div', 'journey-actions');
  bar.append(back());
  box.append(bar);
  if (!person) {
    box.append(el('h2', null, SHEET_TITLE), el('p', 'journey-empty', 'Такого рекомендателя нет на этом устройстве. Добавь человека в «Рекомендациях».'));
    root.append(box); return;
  }
  const entries = entriesFor(person, route?.goals ?? []);
  const say = el('p', 'route-status');
  say.setAttribute('role', 'status');
  const page = sheet(state, person, entries);
  const text = () => bragSheetText({ teacher: person.name, role: person.role, from: sheetFrom(state), entries, sheet: person.sheet, works: sheetWorks(state, entries) });
  const print = button('Печать / PDF', 'button', () => { const cleanup = printSheet(page); try { window.print(); } catch { cleanup(); } });
  const copy = button('Скопировать текстом', 'button button-quiet', async () => {
    const value = text();
    try { await navigator.clipboard.writeText(value); say.textContent = 'Текст шпаргалки скопирован.'; }
    catch {
      say.textContent = 'Не получилось скопировать. Выдели текст ниже и скопируй сам.';
      box.querySelector('[data-brag-plain]')?.remove();
      const area = el('textarea');
      area.dataset.bragPlain = ''; area.readOnly = true; area.rows = 10; area.value = value; area.setAttribute('aria-label', 'Текст шпаргалки');
      say.after(area); area.select();
    }
  });
  bar.append(print, copy);
  box.append(say);
  if (!sheetFilled(person.sheet)) box.append(el('p', 'journey-empty', 'Ответов пока нет: лист повторяет памятку. Ответь на вопросы в «Шпаргалке для учителя» — ссылка «К рекомендациям» вверху.'));
  if (!sheetFrom(state)) box.append(el('p', 'route-detail', 'Имя на листе не указано: впиши его от руки после печати.'));
  box.append(page);
  root.append(box);
}

// Рисуем заново, только если поменялось то, что попадает на лист:
// фоновые перерисовки не должны сбивать фокус и запасное поле копирования.
export function renderBragSheet(root, props) {
  const id = bragSheetRoute(location.hash);
  if (!id) return false;
  const state = props.handlers.getRouteState();
  const person = recommendersOf(state).people.find(item => item.id === id) ?? null;
  const goals = (props.route?.goals ?? []).filter(goal => person?.goals.some(item => item.goalId === goal.id));
  const sources = goals.map(goal => loadRecommendationSource(goal.id));
  const waiting = sources.filter(source => source.status === 'loading');
  if (waiting.length) Promise.allSettled(waiting.map(source => source.promise)).then(() => { if (bragSheetRoute(location.hash) === id) props.handlers.onRedraw?.(); });
  const key = JSON.stringify([id, person, state.spotlight ?? null, portfolioOf(state).experiences.map(entry => [entry.id, entry.updatedOn]),
    goals.map(goal => [goal.id, goal.deadline?.closes, goal.deadline?.state]), sources.map(source => source.status)]);
  delete root.dataset.spotlightKey;
  if (root.dataset.bragKey === key && root.firstElementChild) return true;
  root.replaceChildren(); root.dataset.bragKey = key; root.dataset.layer = 'recommenders';
  draw(root, id, props);
  const heading = root.querySelector('h2');
  if (heading && !root.contains(document.activeElement)) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  return true;
}

export function forgetBragSheetView(root) { delete root.dataset.bragKey; }
