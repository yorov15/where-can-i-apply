// Подсказки к терминам приёма в карточке программы и в «Моём пути».
// Термин становится кнопкой с тем же текстом: textContent блока не меняется,
// цитата остаётся дословной. По нажатию в конце блока появляется короткое
// объяснение; повторное нажатие или Escape его убирает. Без наведения:
// работает с клавиатуры и пальцем.
import { segmentText, termById, termHref, NOTE } from './glossary.js';

// Внутри ссылок, кнопок, подписей полей и заголовков раскрывашек кнопку не
// ставим: вложенные интерактивные элементы ломают клавиатуру и диктор.
const SKIP = 'a, button, label, summary, select, option, textarea, input, [contenteditable], .term-note, script, style';

let counter = 0;

function closeNote(button) {
  document.getElementById(button.getAttribute('aria-controls'))?.remove();
  button.setAttribute('aria-expanded', 'false');
}

function openNote(button, block) {
  const term = termById(button.dataset.term);
  if (!term) return;
  counter += 1;
  const note = document.createElement('span');
  note.className = 'term-note fineprint';
  note.id = `term-note-${counter}`;
  note.setAttribute('role', 'note');
  const name = document.createElement('strong');
  name.textContent = term.en;
  const more = document.createElement('a');
  more.href = termHref(term.id);
  more.textContent = 'Весь словарь';
  note.append(name, ` — ${term.ru}. ${term.text} ${NOTE} `, more);
  note.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeNote(button);
    button.focus();
  });
  // Объяснение — в конец абзаца или пункта списка, где стоит слово.
  const host = button.closest('li, p');
  (host && block.contains(host) ? host : block).append(note);
  button.setAttribute('aria-controls', note.id);
  button.setAttribute('aria-expanded', 'true');
}

function termButton(segment, block) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'term';
  button.dataset.term = segment.id;
  button.textContent = segment.text;
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', `${segment.text} — что это значит`);
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-expanded') === 'true') closeNote(button);
    else openNote(button, block);
  });
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') closeNote(button);
  });
  return button;
}

function annotateBlock(block) {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.data.trim() && !node.parentElement.closest(SKIP)
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  // Один набор на весь блок: термин получает подсказку только в первом месте.
  const seen = new Set();
  for (const node of texts) {
    const parts = segmentText(node.data, seen);
    if (!parts.some((part) => part.id)) continue;
    const fragment = document.createDocumentFragment();
    for (const part of parts) fragment.append(part.id ? termButton(part, block) : document.createTextNode(part.text));
    node.replaceWith(fragment);
  }
}

// root — экран; selector — какие элементы считать блоками. Вложенный блок
// входит во внешний: «первое вхождение» считается по внешнему. Список —
// один блок: слово, повторённое в пяти пунктах, подсвечено один раз.
export function annotateTerms(root, selector = 'ul, ol, .reason, p') {
  if (!root) return;
  for (const block of root.querySelectorAll(selector)) {
    if (block.dataset.terms) continue;
    const outer = block.parentElement?.closest(selector);
    if (outer && root.contains(outer)) continue;
    block.dataset.terms = '1';
    if (!block.closest(SKIP)) annotateBlock(block);
  }
}
