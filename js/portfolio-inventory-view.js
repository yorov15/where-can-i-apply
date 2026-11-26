// Шаг 1 «Что у меня уже есть»: один вопрос на экран, «да» — черновик из трёх
// строк, ниже — плитки всех записей. Полная запись открывается под плитками.
import { PROOF_KINDS, EXPERIENCE_KINDS, answerSurvey } from './portfolio.js';
import { INVENTORY, nextQuestion, surveyProgress, inventoryOf } from './portfolio-inventory.js';
import { experienceForm } from './portfolio-view.js';

const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };
const button = (text, cls, run) => { const node = el('button', cls, text); node.type = 'button'; node.addEventListener('click', run); return node; };

// Отложенные вопросы и открытая запись живут до перезагрузки, как черновики форм.
const skipped = new Set();
let saying = null;
let opened = null;
// Кнопка «Открыть запись» с шага 3 ведёт на шаг 1 и сразу раскрывает нужную запись.
export function openRecord(id) { opened = id; }

function input(form, title, name, { max, required = false, placeholder = '' }) {
  const label = el('label', null, title), field = el('input');
  field.name = name; field.maxLength = max; field.required = required; field.placeholder = placeholder;
  label.append(field); form.append(label); return field;
}

function draftForm(question, props, done) {
  const form = el('form', 'journey-form');
  const title = input(form, 'Как это назвать?', 'title', { max: 160, required: true, placeholder: question.title });
  input(form, 'Что делал лично ты? · необязательно', 'role', { max: 1000 });
  input(form, 'Когда и как долго? · необязательно', 'period', { max: 120, placeholder: 'Например: 2024 — сейчас, 3 часа в неделю' });
  const proof = el('fieldset', 'proof-pick');
  proof.append(el('legend', null, 'Чем можно подтвердить?'));
  for (const [code, text] of PROOF_KINDS) {
    const label = el('label', 'chip'), radio = el('input');
    radio.type = 'radio'; radio.name = 'proof'; radio.value = code; radio.checked = code === 'none';
    label.append(radio, document.createTextNode(text)); proof.append(label);
  }
  form.append(proof);
  const say = el('p', 'route-status'); say.setAttribute('role', 'status');
  const actions = el('div', 'ask-actions');
  const save = el('button', 'button', 'Сохранить черновик'); save.type = 'submit';
  actions.append(save, button('Отмена', 'button button-quiet', () => done(null)));
  form.append(actions, say);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const response = props.handlers.onSaveExperience({ ...data, id: crypto.randomUUID(), kind: question.kind, goals: [] });
    say.textContent = response.message;
    if (!response.ok) return;
    const answered = answerSurvey(props.handlers.getRouteState(), question.id, 'yes');
    if (answered) props.handlers.onSavePortfolio(answered, response.message);
    done(`Черновик «${data.title.trim()}» сохранён.`);
  });
  queueMicrotask(() => title.focus());
  return form;
}

function askCard(props, portfolio, redraw) {
  const question = nextQuestion(portfolio, skipped);
  const card = el('div', 'ask-card');
  const { answered, total } = surveyProgress(portfolio);
  if (!question) {
    card.append(el('p', 'ask-count', answered === total ? `Все ${total} вопросов пройдены` : 'Отложенные вопросы — до следующего раза'));
    card.append(el('p', 'ask-question', 'Если вспомнишь ещё что-то, добавь запись вручную.'));
    const again = button('Пройти вопросы заново', 'link-button', () => {
      skipped.clear();
      const next = answerSurvey(props.handlers.getRouteState(), null);
      if (next) props.handlers.onSavePortfolio(next, 'Вопросы снова открыты. Готовые записи остались.');
      redraw('Вопросы снова открыты. Готовые записи остались.');
    });
    card.append(again);
    return card;
  }
  const number = INVENTORY.indexOf(question) + 1;
  card.append(el('p', 'ask-count', `Вопрос ${number} из ${total}`), el('p', 'ask-question', question.question), el('p', 'journey-meta', question.hint));
  const actions = el('div', 'ask-actions');
  const yes = button('Да, есть', 'button', () => {
    actions.replaceWith(draftForm(question, props, message => redraw(message ?? '')));
  });
  const no = button('Нет', 'button button-quiet', () => {
    const next = answerSurvey(props.handlers.getRouteState(), question.id, 'no');
    const response = next ? props.handlers.onSavePortfolio(next, 'Вопрос убран.') : { ok: false, message: 'Не удалось сохранить ответ.' };
    redraw(response.ok ? '' : response.message);
  });
  const later = button('Отложить', 'link-button', () => { skipped.add(question.id); redraw(''); });
  actions.append(yes, no, later);
  card.append(actions);
  return card;
}

function tile(item, redraw) {
  const { entry, draft, proof } = item;
  const node = el('button', 'record-tile');
  node.type = 'button'; node.dataset.record = entry.id;
  node.setAttribute('aria-expanded', String(opened === entry.id));
  node.append(el('span', 'journey-title', entry.title));
  const kind = EXPERIENCE_KINDS.find(([code]) => code === entry.kind)?.[1];
  node.append(el('small', 'journey-meta', [kind, entry.period].filter(Boolean).join(' · ')));
  const tags = el('span', 'record-tags');
  tags.append(el('span', draft ? 'tag tag-draft' : 'tag', draft ? 'Черновик' : 'Заполнено'), el('span', proof ? 'tag' : 'tag tag-draft', proof ? 'Подтверждение есть' : 'Без подтверждения'));
  node.append(tags);
  node.addEventListener('click', () => { opened = opened === entry.id ? null : entry.id; redraw(''); });
  return node;
}

export function renderInventory(props) {
  const box = el('section', 'journey-panel');
  box.dataset.inventory = '';
  function draw(message = '') {
    if (message) saying = message;
    box.replaceChildren();
    const { portfolio, records } = inventoryOf(props.handlers.getRouteState());
    if (opened && !records.some(item => item.entry.id === opened) && opened !== 'new') opened = null;
    const head = el('header', 'journey-head');
    head.append(el('h3', null, 'Что у меня уже есть'), el('p', 'journey-meta', 'Отвечай «да» или «нет». На «да» запишем черновик из трёх строк, подробности добавишь потом. Пустой страницы не будет.'));
    box.append(head, askCard(props, portfolio, draw));
    const listHead = el('h4', null, records.length ? `Мои записи · ${records.length}` : 'Записей пока нет');
    box.append(listHead);
    if (records.length) {
      const drafts = records.filter(item => item.draft).length, noProof = records.filter(item => !item.proof).length;
      box.append(el('p', 'journey-meta', `Черновиков: ${drafts}. Без подтверждения: ${noProof}.`));
      const grid = el('div', 'record-grid');
      for (const item of records) grid.append(tile(item, draw));
      box.append(grid);
    }
    const editing = opened === 'new' ? null : records.find(item => item.entry.id === opened)?.entry;
    if (opened) {
      const panel = el('div', 'record-editor');
      panel.append(el('h4', null, editing ? `Запись: ${editing.title}` : 'Новая запись'));
      panel.append(experienceForm(editing ?? null, props, (id, text) => { opened = id; draw(text); }));
      panel.append(button('Закрыть', 'button button-quiet', () => { opened = null; draw(''); }));
      box.append(panel);
    } else box.append(button('Добавить запись вручную', 'button button-quiet', () => { opened = 'new'; draw(''); }));
    const say = el('p', 'route-status'); say.setAttribute('role', 'status'); say.textContent = saying ?? ''; saying = null;
    box.append(say);
  }
  draw();
  return box;
}
