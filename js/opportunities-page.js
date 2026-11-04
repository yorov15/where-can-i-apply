import { selectOpportunities, opportunityStatus, opportunityCostText, freeRegistrationClosed } from './opportunities.js';
import { cacheReferencePage } from './offline-page.js';

const list = document.getElementById('opportunity-list');
const status = document.getElementById('opportunity-status');
const controls = document.getElementById('opportunity-filters');
const today = () => new Date();
const el = (tag, text, cls) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; return node; };
const date = iso => iso.split('-').reverse().join('.');
const labels = { open: 'Набор идёт', closed: 'Набор завершён', unknown: 'Срок следующего набора не подтверждён', upcoming: 'Набор ещё не начался', 'registration-closed': 'Бесплатная регистрация завершена' };
let items = [];

function card(item) {
  const article = el('article', null, 'journey-panel');
  article.append(el('h2', item.name), el('p', item.organizer, 'fineprint'),
    el('p', `${labels[opportunityStatus(item, today())]}${opportunityStatus(item, today()) === 'open' && freeRegistrationClosed(item, today()) ? ' · бесплатная регистрация завершена' : ''}`, 'journey-meta'), el('p', item.action),
    el('p', `Кому: ${item.eligibility}`), el('p', opportunityCostText(item, today())));
  if (item.freeUntil) article.append(el('p', `Бесплатная регистрация до ${date(item.freeUntil)}. После этого условия меняются — проверь сайт организатора.`));
  if (item.deadline) article.append(el('p', `Подать работу до ${date(item.deadline)}${item.timezone ? ` (${item.timezone})` : ''}.`));
  if (item.note) article.append(el('p', item.note, 'fineprint'));
  const link = el('a', 'Условия на сайте организатора', 'button button-quiet');
  link.href = item.source.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
  article.append(link);
  const source = el('details', null, 'faq');
  source.append(el('summary', `Источник · проверено ${date(item.source.checkedAt)}`));
  for (const quote of item.source.quotes) source.append(el('blockquote', quote));
  article.append(source);
  return article;
}

function render() {
  const found = selectOpportunities(items, { query: controls.elements.query.value, type: controls.elements.type.value,
    openOnly: controls.elements.openOnly.checked, freeOnly: controls.elements.freeOnly.checked, today: today() });
  list.replaceChildren(...found.map(card));
  status.textContent = found.length ? `Показано: ${found.length} из ${items.length}.` : 'Ничего не нашлось. Измени поиск или сними фильтр «Набор идёт».';
}
controls.addEventListener('submit', event => event.preventDefault());
controls.addEventListener('input', render);

async function load() {
  status.textContent = 'Загружаю конкурсы…';
  try {
    const response = await fetch('data/opportunities.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Неверный формат');
    items = data; render();
    cacheReferencePage(['/js/opportunities-page.js', '/js/opportunities.js', '/data/opportunities.json']);
  } catch {
    status.textContent = 'Не удалось загрузить каталог. Проверь соединение и попробуй ещё раз.';
    const retry = el('button', 'Попробовать ещё раз', 'button button-quiet');
    retry.type = 'button'; retry.addEventListener('click', load); list.replaceChildren(retry);
  }
}
addEventListener('pageshow', () => { if (items.length) render(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && items.length) render(); });
load();
