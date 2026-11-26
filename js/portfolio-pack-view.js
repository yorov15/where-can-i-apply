// Шаг 4б «Упаковать»: записи под выбранную цель в нужном порядке, строки для
// форм со счётчиком, CV из записей и проверка перед отправкой. Текст Nerio не
// сокращает: счётчик показывает лишнее, резать — дело ученика.
import { portfolioOf, setEntryOrder } from './portfolio.js';
import { recommendersOf } from './recommenders.js';
import { activityLine } from './formats/activity.js';
import { awardLine } from './formats/award.js';
import { cv, ordered } from './formats/cv.js';
import { preflight } from './formats/preflight.js';
import { MISSING_LABELS } from './formats/measure.js';
import { loadPlan, shortName, essaysFor } from './portfolio-plan.js';
import { plural } from './lib/format.js';

const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };
const button = (text, cls, run) => { const node = el('button', cls, text); node.type = 'button'; node.addEventListener('click', run); return node; };
const UNITS = { words: ['слово', 'слова', 'слов'], chars: ['знак', 'знака', 'знаков'] };
const CHECKS = { true: ['tag need-optional', 'Готово'], false: ['tag need-required', 'Поправить'], null: ['tag tag-draft', 'Нечего проверять'] };

let chosen = null;

// Предел строки для цели: из строки таблицы «Список активностей» или «Награды».
export function limitFor(table, goalId, type) {
  const item = table.rows.filter(row => row.type === type).flatMap(row => row.goals).find(part => part.goalId === goalId && part.limit);
  return item ? { unit: item.limit.unit, max: item.limit.max, limitSource: { evidence: item.evidence, url: item.url } } : {};
}

export function packLines(entries, table, goalId) {
  const activity = limitFor(table, goalId, 'activities'), award = limitFor(table, goalId, 'awards');
  return entries.map(entry => ({ entryId: entry.id, ...(entry.level ? awardLine(entry, award) : activityLine(entry, activity)) }));
}

export function counterText(line) {
  const unit = n => plural(n, ...(UNITS[line.unit] ?? UNITS.chars));
  if (!line.max) return `${line.used} ${unit(line.used)} · предел формы не известен`;
  // «из 40 знаков»: после «из» число в родительном падеже — форма как у 5.
  const of = `${line.used} из ${line.max} ${plural(line.max, ...(UNITS[line.unit] ?? UNITS.chars).map((_, i, all) => all[i === 0 ? 1 : 2]))}`;
  return line.over ? `${of} · лишних ${line.over}` : of;
}

function recordTile(entry, line, index, total, move) {
  const item = el('li');
  const tile = el('article', 'record-tile');
  tile.dataset.packEntry = entry.id;
  tile.append(el('span', 'journey-title', `${index + 1}. ${entry.title}`));
  tile.append(el('p', 'route-detail', line.text || 'Строка пустая: добавь роль, что сделал и результат.'));
  tile.append(el('small', line.over ? 'journey-meta is-over' : 'journey-meta', counterText(line)));
  const missing = line.missing.map(code => MISSING_LABELS.find(([id]) => id === code)?.[1]).filter(Boolean);
  if (missing.length) tile.append(el('small', 'journey-meta', `Форма ещё спросит: ${missing.join(', ')}`));
  const actions = el('div', 'ask-actions');
  const up = button('↑ Выше', 'link-button', () => move(index, -1)), down = button('↓ Ниже', 'link-button', () => move(index, 1));
  up.disabled = index === 0; down.disabled = index === total - 1;
  up.setAttribute('aria-label', `Поднять «${entry.title}»`); down.setAttribute('aria-label', `Опустить «${entry.title}»`);
  actions.append(up, down);
  tile.append(actions);
  item.append(tile);
  return item;
}

function copyBox(text) {
  const box = el('details', 'fold');
  box.append(el('summary', null, 'CV из записей'));
  const area = el('textarea');
  area.readOnly = true; area.rows = Math.min(14, text.split('\n').length + 1); area.value = text;
  area.setAttribute('aria-label', 'Текст CV');
  const say = el('p', 'route-status'); say.setAttribute('role', 'status');
  const copy = button('Скопировать', 'button button-quiet', async () => {
    try { await navigator.clipboard.writeText(text); say.textContent = 'Скопировано.'; }
    catch { area.select(); say.textContent = 'Выделил текст — скопируй вручную.'; }
  });
  box.append(area, copy, say);
  return box;
}

function checkList(checks) {
  const list = el('ul', 'pack-list');
  for (const check of checks) {
    const [cls, text] = CHECKS[String(check.ok)];
    const item = el('li', 'route-detail');
    item.append(el('span', cls, text), document.createTextNode(` ${check.ru}`));
    list.append(item);
  }
  return list;
}

export function renderPack(props) {
  const box = el('section', 'journey-panel');
  box.dataset.pack = '';
  const head = el('header', 'journey-head');
  head.append(el('h3', null, 'Упаковать под цель'), el('p', 'journey-meta', 'Расставь записи по силе: первая — самая важная. Строки собраны из твоих слов, Nerio их не сокращает.'));
  box.append(head);
  const goals = props.routeState?.goals ?? [];
  if (!goals.length) { box.append(el('p', 'journey-empty', 'Упаковка идёт под цель. Выбери программы в каталоге.')); return box; }
  const wait = el('p', 'journey-meta', 'Загружаю требования программ…');
  wait.setAttribute('role', 'status');
  box.append(wait);
  const body = el('div');
  box.append(body);
  loadPlan(props).then(plan => {
    wait.remove();
    if (!plan.goals.includes(chosen)) chosen = plan.goals.includes(plan.mode?.goalId) ? plan.mode.goalId : plan.goals[0];
    const draw = (message = '') => {
      body.replaceChildren();
      const state = props.handlers.getRouteState();
      const portfolio = portfolioOf(state);
      const chips = el('div', 'chips');
      chips.setAttribute('aria-label', 'Цель');
      for (const id of plan.goals) {
        const chip = button(shortName(plan.cards[id]), 'chip', () => { chosen = id; draw(); });
        chip.setAttribute('aria-pressed', String(id === chosen));
        chips.append(chip);
      }
      body.append(chips);
      const entries = ordered(portfolio.experiences, portfolio.order?.[chosen] ?? []);
      if (!entries.length) {
        body.append(el('p', 'journey-empty', 'Записей пока нет. Начни с шага 1 «Что есть».'));
        const back = el('a', 'button', 'К шагу 1');
        back.href = '#route';
        body.append(back);
        return;
      }
      const lines = packLines(entries, plan.table, chosen);
      const move = (index, step) => {
        const ids = entries.map(entry => entry.id);
        [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
        const next = setEntryOrder(props.handlers.getRouteState(), chosen, ids);
        const response = next ? props.handlers.onSavePortfolio(next, 'Порядок сохранён.') : { ok: false, message: 'Не удалось сохранить порядок.' };
        draw(response.message);
      };
      body.append(el('h4', null, `Записи для ${shortName(plan.cards[chosen])} · ${entries.length}`));
      const list = el('ol', 'pack-list');
      entries.forEach((entry, index) => list.append(recordTile(entry, lines[index], index, entries.length, move)));
      body.append(list);
      const say = el('p', 'route-status'); say.setAttribute('role', 'status'); say.textContent = message;
      body.append(say);
      body.append(copyBox(cv(entries, { order: portfolio.order?.[chosen] ?? [] }).text));
      body.append(el('h4', null, 'Проверка перед отправкой'));
      // Под цель идут все записи в порядке на экране: ученик видит ровно то, что проверяем.
      body.append(checkList(preflight({ goalId: chosen, table: plan.table, entries, order: entries.map(entry => entry.id),
        recommenders: recommendersOf(state), lines, essays: essaysFor(state, chosen) })));
      const sent = el('a', 'button', 'Отметить отправку в «Заявках»');
      sent.href = '#route/applications';
      body.append(sent);
    };
    draw();
  }).catch(() => { wait.textContent = 'Не удалось загрузить требования. Обнови страницу.'; });
  return box;
}
