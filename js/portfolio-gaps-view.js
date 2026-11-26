// Шаг 3 «Чего не хватает»: пробелы по целям плитками, у каждой — счёт,
// срок и одно действие. Требование вуза несёт цитату, совет Nerio помечен.
import { loadPlan, gapLabel, dueLine, gapAction, shortName } from './portfolio-plan.js';
import { openRecord } from './portfolio-inventory-view.js';

const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };

function gapTile(gap, today, cards) {
  const tile = el('article', gap.done ? 'record-tile is-done' : 'record-tile');
  tile.dataset.gap = gap.id;
  const tags = el('span', 'record-tags');
  tags.append(el('span', 'tag', gapLabel(gap.kind)));
  if (gap.advice) tags.append(el('span', 'tag tag-draft', 'Совет Nerio'));
  tile.append(tags);
  if (Number.isInteger(gap.need)) tile.append(el('b', null, `${gap.have ?? 0} из ${gap.need}`));
  const names = gap.goalIds.map(id => shortName(cards[id])).filter(Boolean);
  if (names.length) tile.append(el('span', 'journey-title', names.join(', ')));
  tile.append(el('p', 'route-detail', gap.ru));
  const due = dueLine(gap, today);
  if (due) tile.append(el('small', 'journey-meta', due));
  if (gap.evidence) {
    const source = el('details', 'journey-edit');
    source.append(el('summary', null, 'Откуда это'), el('blockquote', 'route-detail', `«${gap.evidence}»`));
    const link = el('a', null, 'Страница программы');
    link.href = gap.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    source.append(link);
    tile.append(source);
  }
  const action = gap.done ? null : gapAction(gap);
  if (action) {
    const link = el('a', 'link-button', action.text);
    link.href = action.href;
    if (action.entryId) link.addEventListener('click', () => openRecord(action.entryId));
    tile.append(link);
  }
  return tile;
}

export function renderGaps(props) {
  const box = el('section', 'journey-panel');
  box.dataset.gaps = '';
  const head = el('header', 'journey-head');
  head.append(el('h3', null, 'Чего не хватает'), el('p', 'journey-meta', 'Дела по твоим целям, сначала самые срочные. «Совет Nerio» — наша подсказка, а не требование вуза.'));
  box.append(head);
  if (!(props.routeState?.goals ?? []).length) {
    box.append(el('p', 'journey-empty', 'Пробелы считаются от целей. Выбери программы в каталоге.'));
    return box;
  }
  const wait = el('p', 'journey-meta', 'Считаю, чего не хватает…');
  wait.setAttribute('role', 'status');
  box.append(wait);
  loadPlan(props).then(({ gaps, cards }) => {
    wait.remove();
    const open = gaps.filter(gap => !gap.done), done = gaps.filter(gap => gap.done);
    if (!open.length) box.append(el('p', 'journey-empty', 'Сейчас пробелов не видно. Переходи к упаковке записей под цель.'));
    else {
      const grid = el('div', 'record-grid');
      for (const gap of open) grid.append(gapTile(gap, props.today, cards));
      box.append(grid);
    }
    if (done.length) {
      box.append(el('h4', null, `Уже закрыто · ${done.length}`));
      const grid = el('div', 'record-grid');
      for (const gap of done) grid.append(gapTile(gap, props.today, cards));
      box.append(grid);
    }
    const next = el('a', 'button', 'Дальше: работа и упаковка');
    next.href = '#route/work';
    box.append(next);
  }).catch(() => { wait.textContent = 'Не удалось посчитать пробелы. Обнови страницу.'; });
  return box;
}
