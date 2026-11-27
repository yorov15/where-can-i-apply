// Кнопка «Спросить Nero» справа внизу и панель-чат. В панели: быстрые кнопки
// по экрану, разговор с Nero (js/nero-chat-view.js, тот же, что на вкладке
// Nero) и ссылка на вкладку. Быстрые кнопки своего запроса не шлют:
// «Объясни мне эту программу» нажимает кнопку объяснения на странице
// программы (js/render.js, explainBlock), «Разложи мою неделю» открывает
// вкладку Nero и нажимает «Спросить Nero» у наставника (js/mentor-view.js).
// Когда показывать кнопку и какие быстрые кнопки дать — js/lib/ai-fab.js.
import { fabShown, quickActions, explainState, weekState } from './lib/ai-fab.js';
import { chatScreen } from './lib/nero-chat.js';
import { neroChat } from './nero-chat-view.js';
import { NERO_HASH } from './mentor-view.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

const PROGRAM = '#program/';

// chatContext() → { goalIds, week, today } из состояния сайта в момент вопроса.
export function setupAiFab({ fab, panel, programBody, todayBody, routeBody, enabled, mentorOn, chatContext }) {
  if (!fab || !panel) return { sync() {} };
  const body = panel.querySelector('[data-ai-body]');
  // «Разложи мою неделю» не с вкладки Nero: ждём, пока вкладка нарисует наставника.
  // fresh — вкладка перерисовалась после нажатия: старый блок с прошлого захода не годится.
  let pending = 0;
  let fresh = false;

  const show = (box) => box?.scrollIntoView({ block: 'center' });
  // Фокус на кнопку возвращает сам <dialog>; aria-expanded меняем сразу, не дожидаясь события close.
  const hide = () => { panel.close(); fab.setAttribute('aria-expanded', 'false'); };
  const quick = (text, run) => {
    const node = el('button', 'button button-quiet', text);
    node.type = 'button';
    node.addEventListener('click', () => { hide(); run(); });
    return node;
  };
  const link = (text, href) => {
    const node = el('a', 'link-button', text);
    node.href = href;
    node.addEventListener('click', hide);
    return node;
  };
  const programId = () => {
    if (!location.hash.startsWith(PROGRAM)) return '';
    try { return decodeURIComponent(location.hash.slice(PROGRAM.length)); } catch { return ''; }
  };

  // Блок наставника на вкладке Nero. Пока вкладка грузится, его нет — ждём.
  const mentorBox = () => routeBody?.querySelector('[data-mentor]') ?? null;
  const runWeek = () => {
    const box = mentorBox();
    const ask = box?.querySelector('[data-mentor-ask]');
    const state = weekState(box && { button: Boolean(ask), disabled: Boolean(ask?.disabled), answer: Boolean(box.querySelector('.route-week-list')) });
    if (state === 'wait') return false;
    if (state === 'run') ask.click();
    show(mentorBox());
    return true;
  };

  function explainAction(row, notes) {
    const box = programBody.querySelector('.explain');
    const ask = box?.querySelector('button');
    const state = explainState({
      program: true,
      block: box ? { button: Boolean(ask), disabled: Boolean(ask?.disabled), answer: Boolean(box.querySelector('.explain-answer')) } : null,
    });
    if (state === 'profile') {
      notes.append(el('p', 'fineprint', 'Объяснение строится по твоей анкете. Заполни её — и Nero объяснит эту программу.'), link('Заполнить анкету', '#profile'));
      return;
    }
    row.append(quick('Объясни мне эту программу', state === 'run' ? () => { ask.click(); show(box); } : () => show(box)));
    // Та же строка «что уйдёт», что стоит под кнопкой на странице.
    if (state === 'run') notes.append(el('p', 'fineprint', `Для объяснения: ${box.querySelector('.explain-note')?.textContent ?? ''}`));
  }

  function render() {
    body.textContent = '';
    const screen = document.body.dataset.screen;
    const row = el('div', 'ask-actions');
    const notes = el('div');
    for (const action of quickActions({ screen, program: screen === 'program' && location.hash.startsWith(PROGRAM), mentorOn })) {
      if (action === 'explain') explainAction(row, notes);
      if (action === 'week') {
        row.append(quick('Разложи мою неделю', () => {
          if (location.hash === NERO_HASH && runWeek()) return;
          pending = Date.now() + 10000;
          fresh = false;
          if (location.hash !== NERO_HASH) location.hash = NERO_HASH.slice(1);
        }));
      }
    }
    if (row.children.length) body.append(row);
    if (notes.children.length) body.append(notes);
    body.append(neroChat({ context: () => ({ ...chatContext(), screen: chatScreen(document.body.dataset.screen), programId: programId() }) }));
    if (location.hash !== NERO_HASH) body.append(link('Открыть вкладку Nero', NERO_HASH));
  }

  function sync() {
    const screen = document.body.dataset.screen;
    const shown = fabShown({ screen, landing: Boolean(todayBody.querySelector('.start-space')), enabled });
    fab.hidden = !shown;
    if (!shown && panel.open) hide();
    if (!pending) return;
    if (Date.now() > pending) { pending = 0; return; }
    // Адрес ещё не сменился — ждём; ушли с вкладки на другой раздел — забываем.
    if (screen !== 'route') return;
    if (location.hash !== NERO_HASH) { pending = 0; return; }
    if (fresh && runWeek()) pending = 0;
  }

  fab.addEventListener('click', () => {
    render();
    panel.showModal();
    fab.setAttribute('aria-expanded', 'true');
    // Фокус — на первую быструю кнопку, иначе в поле вопроса, иначе на первую ссылку или «Закрыть».
    (body.querySelector('.ask-actions button, textarea, a') ?? panel.querySelector('[data-ai-close]'))?.focus();
  });
  panel.querySelector('[data-ai-close]').addEventListener('click', hide);
  // Нажатие мимо панели, по затемнению, тоже закрывает её. Esc закрывает сам <dialog>.
  panel.addEventListener('click', (event) => {
    if (event.target !== panel) return;
    const r = panel.getBoundingClientRect();
    if (event.clientY < r.top || event.clientY > r.bottom || event.clientX < r.left || event.clientX > r.right) hide();
  });
  // Esc закрывает <dialog> сам. Браузер без возврата фокуса оставил бы его на body.
  panel.addEventListener('close', () => {
    fab.setAttribute('aria-expanded', 'false');
    if (!fab.hidden && (!document.activeElement || document.activeElement === document.body)) fab.focus();
  });

  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['data-screen'] });
  new MutationObserver(sync).observe(todayBody, { childList: true });
  if (routeBody) new MutationObserver(() => { fresh = true; sync(); }).observe(routeBody, { childList: true });
  sync();
  return { sync };
}
