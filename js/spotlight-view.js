// Экран «Подборка под цель»: выбор записей (#route/spotlight/<id>) и чистая
// страница для печати и копирования (#route/spotlight/<id>/page).
// Всё, что попадает в подборку, сохраняется сразу — отдельной кнопки нет.
import { portfolioOf } from './portfolio.js';
import { SPOTLIGHT_MAX, SPOTLIGHT_MIN, LINE_MAX, lineLength, spotlightOf, spotlightName, saveSpotlight,
  spotlightHint, spotlightEntries, spotlightTips, spotlightText, activityNotes } from './spotlight.js';
import { safeHttpUrl } from './lib/url.js';
import { plural } from './lib/format.js';

const PREFIX = '#route/spotlight/';
const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };
const button = (text, cls, run) => { const node = el('button', cls, text); node.type = 'button'; node.addEventListener('click', run); return node; };
const anchor = (text, href, cls = 'link-button') => { const node = el('a', cls, text); node.href = href; return node; };
// Короткое имя: до « — », как в целях «Моего пути».
const nameOf = (programs, id) => { const name = programs.find(item => item.id === id)?.name, full = typeof name === 'string' ? name : name?.ru ?? id; return full.split(' — ')[0]; };
export const spotlightHash = (goalId, page = false) => `${PREFIX.slice(1)}${encodeURIComponent(goalId)}${page ? '/page' : ''}`;

// {goalId, page} или null, если адрес не про подборку.
export function spotlightRoute(hash) {
  if (!hash.startsWith(PREFIX)) return null;
  const [raw, mode] = hash.slice(PREFIX.length).split('/');
  try { const goalId = decodeURIComponent(raw); return goalId ? {goalId, page: mode === 'page'} : null; } catch { return null; }
}

function tipsBlock(state, goalId, handlers) {
  const tips = spotlightTips(state, goalId);
  if (!tips.length) return null;
  const box = el('div', 'journey-reference');box.dataset.spotlightTips = '';
  for (const tip of tips) {
    const line = el('p', 'route-detail');
    if (tip.kind === 'more') line.append(anchor('Добавь ещё работу в портфолио', '#route/new'));
    else line.append(button(`Допиши итог: что получилось · ${tip.title}`, 'link-button', () => handlers.onOpenPortfolio(tip.id)));
    box.append(line);
  }
  return box;
}

// Строки условий программы о внеучебном опыте. Условия едут отдельным файлом.
function programNotes(goalId, details) {
  const box = el('div');box.dataset.spotlightNotes = '';
  const fill = () => {
    const notes = activityNotes(details?.conditions?.[goalId]);
    box.replaceChildren();
    if (!notes.length) return;
    box.className = 'journey-reference';
    box.append(el('p', 'route-goal-meta', 'Что пишет программа о внеучебном опыте:'));
    for (const note of notes) box.append(el('p', 'route-detail', note));
    const url = safeHttpUrl(details.programs?.[goalId]?.source?.url ?? '');
    if (url) { const link = anchor('Источник', url, null);link.target = '_blank';link.rel = 'noopener noreferrer';box.append(link); }
  };
  fill();
  if (details?.conditions?.[goalId] === undefined && details?.ensure) details.ensure(goalId).then(() => { if (box.isConnected) fill(); }).catch(() => {});
  return box;
}

function renderEditor(root, {goalId, props}) {
  const {handlers, programs} = props;
  const box = el('section', 'journey-panel');box.dataset.spotlight = goalId;
  const programName = nameOf(programs, goalId);
  let items = (spotlightOf(handlers.getRouteState(), goalId)?.items ?? []).map(item => ({...item}));
  const say = el('p', 'route-status');say.setAttribute('role', 'status');
  const save = (message = 'Сохранено на устройстве.') => {
    const response = handlers.onSaveSpotlight(goalId, {items, name: nameInput.value});
    say.textContent = response.ok ? message : response.message;
    refreshTips();
    return response.ok;
  };

  const head = el('header', 'journey-head');
  head.append(anchor('← Мой путь', '#route'), el('h3', null, `Подборка для ${programName}`),
    el('p', 'journey-meta', `Отметь до ${SPOTLIGHT_MAX} записей опыта и работ, которые лучше всего показывают тебя этой программе. Порядок меняй стрелками.`));
  box.append(head, programNotes(goalId, props.details));

  const experiences = portfolioOf(handlers.getRouteState()).experiences;
  const form = el('form', 'journey-form');form.addEventListener('submit', event => event.preventDefault());
  const nameLabel = el('label', null, 'Имя на странице · необязательно'), nameInput = el('input');
  nameInput.name = 'name';nameInput.maxLength = 80;nameInput.autocomplete = 'name';nameInput.value = spotlightName(handlers.getRouteState());
  nameInput.addEventListener('change', () => save());nameLabel.append(nameInput);form.append(nameLabel);

  const pick = el('fieldset');pick.append(el('legend', null, `Что войдёт в подборку · до ${SPOTLIGHT_MAX}`));
  if (!experiences.length) pick.append(el('p', 'journey-empty', 'В портфолио пока нет записей.'), anchor('Добавь работу в портфолио', '#route/new'));
  const checks = experiences.map(entry => {
    const label = el('label', 'journey-check'), check = el('input', 'route-check');
    check.type = 'checkbox';check.value = entry.id;check.checked = items.some(item => item.experienceId === entry.id);
    label.append(check, document.createTextNode(entry.title));pick.append(label);
    check.addEventListener('change', () => {
      if (check.checked) items.push({experienceId: entry.id, line: ''});
      else items = items.filter(item => item.experienceId !== entry.id);
      save();drawChosen();limit();
    });
    return check;
  });
  const limit = () => { const full = items.length >= SPOTLIGHT_MAX;for (const check of checks) check.disabled = full && !check.checked; };
  limit();form.append(pick);

  const chosen = el('div');form.append(chosen);
  function drawChosen(focus = null) {
    chosen.replaceChildren();
    if (!items.length) return;
    chosen.append(el('p', 'route-goal-meta', `В подборке ${items.length} ${plural(items.length, 'запись', 'записи', 'записей')}. Строка — до ${LINE_MAX} знаков: это формат Nerio, не требование программы.`));
    items.forEach((item, index) => {
      const entry = experiences.find(value => value.id === item.experienceId);
      const row = el('div', 'journey-card');row.dataset.spotlightItem = item.experienceId;
      row.append(el('p', 'journey-title', `${index + 1}. ${entry.title}`));
      const move = (shift, text) => {
        const node = button(text, 'button button-small button-quiet', () => {
          const target = index + shift;[items[index], items[target]] = [items[target], items[index]];
          save('Порядок сохранён.');drawChosen({id: item.experienceId, shift});
        });
        node.disabled = index + shift < 0 || index + shift >= items.length;
        node.setAttribute('aria-label', `${shift < 0 ? 'Выше' : 'Ниже'}: ${entry.title}`);node.dataset.move = String(shift);
        return node;
      };
      const label = el('label', null, 'Что сделал и что вышло'), input = el('textarea');
      input.rows = 2;input.maxLength = LINE_MAX;input.value = item.line;label.append(input);row.append(label);
      const count = el('p', 'route-detail');row.append(count);
      const hint = spotlightHint(handlers.getRouteState(), item.experienceId), help = el('p', 'route-detail');
      if (hint) help.append(document.createTextNode(`Из записи: «${hint}» `), button('Вставить', 'link-button', () => { input.value = hint;update();save();input.focus(); }));
      else help.textContent = 'В записи пока нет итога и навыков — напиши своими словами.';
      row.append(help);
      const arrows = el('div');arrows.append(move(-1, '↑ Выше'), document.createTextNode(' '), move(1, '↓ Ниже'));row.append(arrows);
      const update = () => {
        item.line = input.value;
        count.textContent = `${lineLength(input.value)} из ${LINE_MAX} знаков`;
        help.hidden = Boolean(input.value.trim());
      };
      input.addEventListener('input', () => { update();save(); });update();
      chosen.append(row);
    });
    if (focus) {
      const row = chosen.querySelector(`[data-spotlight-item="${CSS.escape(focus.id)}"]`);
      (row?.querySelector(`[data-move="${focus.shift}"]:not(:disabled)`) ?? row?.querySelector('[data-move]:not(:disabled)'))?.focus();
    }
  }
  drawChosen();
  box.append(form);
  const open = button('Открыть подборку', 'button', () => { location.hash = spotlightHash(goalId, true); });
  box.append(say, open);
  const tips = tipsBlock(handlers.getRouteState(), goalId, handlers);
  if (tips) box.append(tips);
  // Подсказки зависят от сохранённого: save() перерисовывает их каждый раз.
  function refreshTips() {
    open.disabled = !items.length;
    const next = tipsBlock(handlers.getRouteState(), goalId, handlers), old = box.querySelector('[data-spotlight-tips]');
    if (old) old.remove();if (next) box.append(next);
  }
  open.disabled = !items.length;
  root.append(box);
}

// Лист подборки: одна и та же разметка на экране и на бумаге.
function sheet(state, goalId, programName) {
  const article = el('article');article.dataset.spotlightSheet = '';
  const who = spotlightName(state);
  article.append(el('h2', null, 'Подборка работ'), el('p', 'journey-meta', `Для: ${programName}`));
  if (who) article.append(el('p', 'journey-meta', `Имя: ${who}`));
  spotlightEntries(state, goalId).forEach((entry, index) => {
    const part = el('section', 'journey-card');
    part.append(el('h3', null, `${index + 1}. ${entry.title}`));
    const meta = [entry.kind, entry.period].filter(Boolean).join(' · ');
    if (meta) part.append(el('p', 'journey-meta', meta));
    if (entry.line) part.append(el('p', null, entry.line));
    for (const [title, value] of [['Роль', entry.role], ['Итог', entry.result], ['Навыки', entry.skills.join(', ').toLowerCase()]]) {
      if (!value) continue;
      const line = el('p', 'route-goal-meta');line.append(el('strong', null, `${title}: `), document.createTextNode(value));part.append(line);
    }
    for (const url of entry.links) { const line = el('p', 'route-goal-meta'), link = anchor(url, url, null);link.target = '_blank';link.rel = 'noopener noreferrer';line.append(link);part.append(line); }
    article.append(part);
  });
  return article;
}

// Печать — тем же способом, что отчёт родителю: на время печати в body один
// лист (#parent-print), всё остальное правило @media print прячет.
export function printSheet(node, doc = document, win = window) {
  doc.getElementById('parent-print')?.remove();
  const copy = node.cloneNode(true);copy.id = 'parent-print';copy.hidden = true;
  doc.body.append(copy);doc.body.classList.add('is-parent-print');
  const cleanup = () => { copy.remove();doc.body.classList.remove('is-parent-print'); };
  win.addEventListener('afterprint', cleanup, {once: true});
  return cleanup;
}

// Ctrl+P на открытой странице подборки печатает тоже только лист.
globalThis.addEventListener?.('beforeprint', () => {
  if (document.body.classList.contains('is-parent-print')) return;
  const node = document.querySelector('[data-spotlight-page] [data-spotlight-sheet]');
  if (node && spotlightRoute(location.hash)?.page) printSheet(node);
});

function renderPage(root, {goalId, props}) {
  const {handlers, programs} = props, state = handlers.getRouteState(), programName = nameOf(programs, goalId);
  const box = el('section', 'journey-panel');box.dataset.spotlightPage = goalId;
  const say = el('p', 'route-status');say.setAttribute('role', 'status');
  const bar = el('div', 'journey-actions');
  bar.append(anchor('← К выбору записей', `#${spotlightHash(goalId)}`));
  box.append(bar);
  if (!spotlightEntries(state, goalId).length) {
    box.append(el('p', 'journey-empty', 'В подборке пока нет записей.'), anchor('Выбрать записи', `#${spotlightHash(goalId)}`, 'button'));
    root.append(box);return;
  }
  const page = sheet(state, goalId, programName);
  const print = button('Печать / PDF', 'button', () => { const cleanup = printSheet(page);try { window.print(); } catch { cleanup(); } });
  const copy = button('Скопировать текстом', 'button button-quiet', async () => {
    const text = spotlightText(state, goalId, {programName});
    try { await navigator.clipboard.writeText(text);say.textContent = 'Текст подборки скопирован.'; }
    catch {
      say.textContent = 'Не получилось скопировать. Выдели текст ниже и скопируй сам.';
      box.querySelector('[data-spotlight-plain]')?.remove();
      const area = el('textarea');area.dataset.spotlightPlain = '';area.readOnly = true;area.rows = 10;area.value = text;area.setAttribute('aria-label', 'Текст подборки');
      say.after(area);area.select();
    }
  });
  bar.append(print, copy);
  box.append(say, page);
  const tips = tipsBlock(state, goalId, handlers);
  if (tips) box.append(tips);
  root.append(box);
}

// Рисуем заново, только если сменилась цель, режим, состав портфолио или
// приехал каталог:
// фоновые перерисовки маршрута не должны сбивать ввод строки.
export function renderSpotlight(root, props) {
  const route = spotlightRoute(location.hash);
  if (!route) return false;
  const portfolio = portfolioOf(props.handlers.getRouteState());
  const key = JSON.stringify([route.goalId, route.page, route.page ? props.handlers.getRouteState().spotlight ?? null : null,
    portfolio.experiences.map(entry => [entry.id, entry.updatedOn]), portfolio.outcomes.length, props.programs.length, props.details?.status]);
  if (root.dataset.spotlightKey === key && root.firstElementChild) return true;
  root.replaceChildren();root.dataset.spotlightKey = key;root.dataset.layer = 'spotlight';
  (route.page ? renderPage : renderEditor)(root, {goalId: route.goalId, props});
  // Перешли по ссылке — фокус на заголовок, чтобы клавиатура начала отсюда.
  const heading = root.querySelector('h2, h3');
  if (heading && !root.contains(document.activeElement)) { heading.tabIndex = -1;heading.focus({preventScroll: true}); }
  return true;
}

export function forgetSpotlightView(root) { delete root.dataset.spotlightKey; }

// Ссылки «Собрать подборку» для каждой цели — из раздела «Работы».
export function spotlightLinks(props) {
  const goals = props.handlers.getRouteState().goals;
  if (!goals.length) return null;
  const box = el('details', 'journey-edit');box.dataset.spotlightLinks = '';
  box.append(el('summary', null, 'Подборка под цель'));
  box.append(el('p', 'route-detail', `Выбери ${SPOTLIGHT_MIN}–${SPOTLIGHT_MAX} лучших записей для одной программы и получи их одной страницей.`));
  for (const id of goals) {
    const line = el('p', 'route-goal-meta');
    line.append(anchor(`Собрать подборку: ${nameOf(props.programs, id)}`, `#${spotlightHash(id)}`));
    box.append(line);
  }
  return box;
}
