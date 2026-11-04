// Страница «Словарь» (glossary.html): список терминов и поиск по полю без
// перезагрузки. Все слова лежат в js/glossary.js, сеть для поиска не нужна;
// после первого открытия страницу отдаёт из кэша воркер (sw.js).
import { TERMS, GROUPS, searchTerms } from './glossary.js';
import { cacheReferencePage } from './offline-page.js';

const list = document.getElementById('glossary-list');
const input = document.getElementById('glossary-search');
const count = document.getElementById('glossary-count');

function entry(term, open) {
  const box = document.createElement('details');
  box.className = 'faq';
  box.id = term.id;
  box.open = open;
  const summary = document.createElement('summary');
  summary.textContent = `${term.en} — ${term.ru}`;
  const text = document.createElement('p');
  text.textContent = term.text;
  box.append(summary, text);
  return box;
}

const plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'слово'
  : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'слова' : 'слов');

function render() {
  const query = input.value.trim();
  list.textContent = '';
  if (!query) {
    for (const [group, title] of GROUPS) {
      const heading = document.createElement('h2');
      heading.textContent = title;
      list.append(heading, ...TERMS.filter((term) => term.group === group).map((term) => entry(term, false)));
    }
    count.textContent = '';
    return;
  }
  const found = searchTerms(query);
  // Мало совпадений — сразу раскрываем: человек ищет объяснение, а не заголовок.
  list.append(...found.map((term) => entry(term, found.length <= 3)));
  count.textContent = found.length
    ? `Нашлось ${found.length} ${plural(found.length)}.`
    : 'Ничего не нашлось. Попробуй по-английски или по-русски, например «waitlist» или «виза».';
}

function openFromHash() {
  let id = '';
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (!id || !TERMS.some((term) => term.id === id)) return;
  if (input.value) { input.value = ''; render(); }
  const box = document.getElementById(id);
  box.open = true;
  box.scrollIntoView({ block: 'start' });
  box.querySelector('summary').focus({ preventScroll: true });
}

input.addEventListener('input', render);
addEventListener('hashchange', openFromHash);
render();
// Начальная прокрутка браузера к #id может сбросить фокус, заданный модулем.
// После load возвращаем его на summary, чтобы сразу работала клавиатура.
if (document.readyState === 'complete') openFromHash();
else addEventListener('load', () => setTimeout(openFromHash, 0), { once: true });

cacheReferencePage(['/js/glossary-page.js', '/js/glossary.js']);
