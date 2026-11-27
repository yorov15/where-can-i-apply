// Кнопка «Спросить ИИ» справа внизу и панель с двумя режимами. Своего запроса
// у неё нет: «Объяснить» нажимает кнопку объяснения на странице программы
// (js/render.js, explainBlock), «Наставник» — «Спросить наставника» на
// «Сегодня» (js/today-view.js). Что уходит на сервер, панель говорит до нажатия.
// Когда показывать кнопку и какой режим открыть — js/lib/ai-fab.js.
import { fabShown, fabMode, explainState, mentorState } from './lib/ai-fab.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

const MENTOR_SENDS = 'Уйдут несделанные дела этой недели, ближайшие сроки, сколько часов в неделю ты готов заниматься, и случайный код устройства. Анкета, баллы и имя не уходят.';

export function setupAiFab({ fab, panel, programBody, todayBody, enabled, mentorOn }) {
  if (!fab || !panel) return { sync() {} };
  const body = panel.querySelector('[data-ai-body]');
  const radios = [...panel.querySelectorAll('input[name="ai-mode"]')];
  // «Спросить» из «Моего пути»: ждём, пока «Сегодня» нарисует блок наставника.
  let pending = 0;

  const mentorBlock = () => todayBody.querySelector('[data-mentor]');
  const lastButton = (box) => [...box.querySelectorAll('button')].pop() ?? null;
  const show = (box) => box?.scrollIntoView({ block: 'center' });
  // Фокус на кнопку возвращает сам <dialog>; aria-expanded меняем сразу, не дожидаясь события close.
  const hide = () => { panel.close(); fab.setAttribute('aria-expanded', 'false'); };
  const action = (text, run) => {
    const node = el('button', 'button', text);
    node.type = 'button';
    node.addEventListener('click', () => { hide(); run(); });
    return node;
  };
  const link = (text, href) => {
    const node = el('a', 'button', text);
    node.href = href;
    node.addEventListener('click', hide);
    return node;
  };

  function explainBody() {
    const box = programBody.querySelector('.explain');
    const ask = box?.querySelector('button');
    const state = explainState({
      program: document.body.dataset.screen === 'program' && location.hash.startsWith('#program/'),
      block: box ? { button: Boolean(ask), disabled: Boolean(ask?.disabled), answer: Boolean(box.querySelector('.explain-answer')) } : null,
    });
    body.append(el('p', null, 'Объяснит простыми словами ответ по программе: почему так и что сделать сейчас.'));
    if (state === 'run') {
      // Та же строка «что уйдёт», что стоит под кнопкой на странице.
      body.append(el('p', 'explain-note', box.querySelector('.explain-note')?.textContent ?? ''),
        action('Объяснить', () => { ask.click(); show(box); }));
    } else if (state === 'shown') {
      body.append(el('p', null, 'Объяснение уже на странице программы.'), action('Показать', () => show(box)));
    } else if (state === 'profile') {
      body.append(el('p', null, 'Объяснение строится по твоей анкете. Заполни её — и кнопка появится.'), link('Заполнить анкету', '#profile'));
    } else {
      body.append(el('p', null, 'Объяснение работает на странице программы. Открой любую программу в каталоге.'), link('Открыть каталог', '#programs'));
    }
  }

  function mentorBody() {
    const box = mentorBlock();
    const ask = box && lastButton(box);
    const state = mentorState({
      screen: document.body.dataset.screen,
      on: mentorOn,
      block: box ? { button: Boolean(ask), disabled: Boolean(ask?.disabled), answer: Boolean(box.querySelector('.route-week-list')) } : null,
    });
    body.append(el('p', null, 'Разложит дела этой недели по дням и подскажет, с чего начать каждое.'));
    if (state === 'run' || state === 'go') {
      body.append(el('p', 'explain-note', MENTOR_SENDS), action('Спросить Неро', state === 'run'
        ? () => { ask.click(); show(box); }
        : () => { pending = Date.now() + 10000; location.hash = 'today'; }));
    } else if (state === 'shown') {
      body.append(el('p', null, 'Ответ Неро — на «Сегодня», в блоке «Неро, ИИ-наставник».'), action('Показать', () => show(box)));
    } else if (state === 'empty') {
      body.append(el('p', null, 'Неро появится на «Сегодня», когда в плане недели будут дела.'));
    } else if (state === 'today') {
      body.append(el('p', null, 'Неро работает в «Моём пути», на «Сегодня».'), link('Открыть «Сегодня»', '#today'));
    } else {
      body.append(el('p', null, 'Неро сейчас выключен.'));
    }
    body.append(el('p', 'fineprint', 'У шага и у черновика свои кнопки: «Спросить Неро» и «Проверить черновик».'));
  }

  function render() {
    body.textContent = '';
    if (radios.find((radio) => radio.checked)?.value === 'mentor') mentorBody();
    else explainBody();
  }

  function sync() {
    const screen = document.body.dataset.screen;
    const shown = fabShown({ screen, landing: Boolean(todayBody.querySelector('.start-space')), enabled });
    fab.hidden = !shown;
    if (!shown && panel.open) hide();
    if (!pending) return;
    if (Date.now() > pending || (screen !== 'today' && screen !== 'route')) pending = 0;
    if (!pending || screen !== 'today') return;
    const box = mentorBlock();
    const ask = box && lastButton(box);
    if (!ask) return;
    pending = 0;
    // Готовый ответ не спрашиваем заново: это съело бы вопрос из дневного предела.
    if (!box.querySelector('.route-week-list') && !ask.disabled) ask.click();
    show(mentorBlock());
  }

  fab.addEventListener('click', () => {
    const mode = fabMode(document.body.dataset.screen);
    for (const radio of radios) radio.checked = radio.value === mode;
    render();
    panel.showModal();
    fab.setAttribute('aria-expanded', 'true');
    radios.find((radio) => radio.checked)?.focus();
  });
  for (const radio of radios) radio.addEventListener('change', render);
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
  sync();
  return { sync };
}
