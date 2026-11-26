// Шаг 2 «Что просят мои цели»: сверху по плитке на цель с плашками материалов,
// ниже — общий список того, что готовить, с цитатой и ссылкой у каждого требования.
// Одинаковое у нескольких целей слито в одну строку (materials-plan.js).
import { formatDate } from './lib/format.js';
import { loadPlan, typeLabel, needLabel, needTone, shortName } from './portfolio-plan.js';

const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };
const UNITS = { words: 'слов', chars: 'знаков', pages: 'стр.', minutes: 'мин', items: 'пунктов' };
const WHO = { teacher: 'учитель', counselor: 'школьный консультант', principal: 'директор', any: 'любой рекомендатель' };

export const limitText = limit => limit ? `до ${limit.max} ${UNITS[limit.unit] ?? ''}`.trim() : '';

function outLink(url, text) {
  const link = el('a', null, text);
  link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
  return link;
}

function goalTile(program, cells, columns, status) {
  const tile = el('article', 'record-tile');
  tile.dataset.goalNeeds = program.id;
  tile.append(el('span', 'journey-title', shortName(program)));
  const closes = program.deadline?.closes;
  tile.append(el('small', 'journey-meta', closes ? `Срок ${formatDate(closes)}` : 'Срок не известен'));
  const tags = el('span', 'record-tags');
  if (status !== 'ok') {
    tags.append(el('span', 'tag tag-draft', needLabel(status === 'failed' ? 'failed' : 'unchecked')));
    tile.append(tags);
    const open = el('a', 'link-button', 'Открыть программу');
    open.href = `#program/${encodeURIComponent(program.id)}`;
    tile.append(open);
    return tile;
  }
  const asked = columns.filter(type => ['required', 'some', 'optional'].includes(cells[type]));
  for (const type of asked) tags.append(el('span', needTone(cells[type]), typeLabel(type)));
  if (!asked.length) tags.append(el('span', 'tag tag-draft', 'Материалов не просит'));
  tile.append(tags);
  return tile;
}

function rowBlock(row, programs) {
  const box = el('details', 'fold');
  box.dataset.material = row.key;
  const summary = el('summary');
  const who = row.type === 'recommendation' && row.goals[0].who ? ` · ${WHO[row.goals[0].who]}` : '';
  summary.append(document.createTextNode(`${typeLabel(row.type)}${who}${row.count > 1 ? ` · ${row.count}` : ''} `), el('span', needTone(row.need), needLabel(row.need)));
  box.append(summary);
  const names = [...new Set(row.goals.map(item => item.goalId))].map(id => shortName(programs.find(program => program.id === id)));
  box.append(el('p', 'journey-meta', `${row.shared ? 'Общее для' : 'Для'}: ${names.join(', ')}${row.closes ? ` · первый срок ${formatDate(row.closes)}` : ''}`));
  for (const item of row.goals) {
    const part = el('div', 'record-editor');
    part.append(el('h4', null, shortName(programs.find(program => program.id === item.goalId))));
    const facts = [needLabel(item.need), limitText(item.limit), item.language ? `язык: ${item.language}` : ''].filter(Boolean).join(' · ');
    part.append(el('p', 'route-detail', `${item.ru}${facts ? ` (${facts})` : ''}`));
    if (item.prompt) part.append(el('p', 'route-goal-meta', `Тема: ${item.prompt}`));
    const quote = el('blockquote', 'route-detail', `«${item.evidence}»`);
    part.append(quote);
    const source = el('p', 'journey-meta');
    source.append(outLink(item.url, 'Страница программы'), document.createTextNode(` · проверено ${formatDate(item.lastVerified)}`));
    part.append(source);
    box.append(part);
  }
  return box;
}

export function renderNeeds(props) {
  const box = el('section', 'journey-panel');
  box.dataset.needs = '';
  const head = el('header', 'journey-head');
  head.append(el('h3', null, 'Что просят мои цели'), el('p', 'journey-meta', 'Собрано по официальным страницам программ. Открой строку — там цитата и ссылка.'));
  box.append(head);
  const goals = props.routeState?.goals ?? [];
  if (!goals.length) {
    box.append(el('p', 'journey-empty', 'Целей пока нет. Выбери программы в каталоге — здесь появится, что они просят.'));
    const catalog = el('a', 'button', 'Открыть каталог');
    catalog.href = '#programs';
    box.append(catalog);
    return box;
  }
  const wait = el('p', 'journey-meta', 'Загружаю требования программ…');
  wait.setAttribute('role', 'status');
  box.append(wait);
  loadPlan(props).then(({ table }) => {
    wait.remove();
    const grid = el('div', 'record-grid');
    for (const id of goals) {
      const program = props.programs.find(item => item.id === id);
      if (!program) continue;
      const status = table.failed.some(item => item.goalId === id) ? 'failed' : table.unchecked.some(item => item.goalId === id) ? 'unchecked' : 'ok';
      grid.append(goalTile(program, table.cells[id], table.columns, status));
    }
    box.append(grid);
    if (table.failed.length) box.append(el('p', 'route-warn', 'Часть требований не загрузилась. Проверь интернет и открой шаг ещё раз.'));
    if (table.rows.length) {
      box.append(el('h4', null, `Что готовить · ${table.rows.length}`));
      for (const row of table.rows) box.append(rowBlock(row, props.programs));
    } else box.append(el('p', 'journey-empty', 'По твоим целям мы ещё не собрали материалы. Сверь требования на страницах программ.'));
    const next = el('a', 'button', 'Дальше: чего не хватает');
    next.href = '#route/gaps';
    box.append(next);
  });
  return box;
}
