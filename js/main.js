import { loadProfile, saveProfile, emptyProfile, profileReady, STORAGE_KEY } from './profile.js';
import { readForm, writeForm, onProfileChange, setupProfileBox } from './form.js';
import { setupWizard } from './steps.js';
import { setupCatalogFilter } from './filter.js';
import { loadIndex, loadDetails } from './data.js';
import { renderResults } from './render.js';
import { loadPlan, savePlan, togglePlan, PLAN_KEY, DONE_KEY, loadDone, saveDone } from './plan.js';
import { EXPLAIN_URL } from './config.js';

const form = document.getElementById('profile');
const today = new Date().toISOString().slice(0, 10);

// Два экрана в одном файле: сайт статичный, второй HTML тянул бы за собой
// вторую шапку и второй разбор анкеты. Адрес всё равно настоящий — назад
// в браузере работает.
const answerScreen = document.getElementById('answer');
const catalogScreen = document.getElementById('catalog');
const catalogButton = document.getElementById('open-catalog');

// Пока человек не закончил анкету, ни ответа, ни каталога не видно: ответ
// по пустому профилю — это стена «можно, но сначала», из которой нечего
// вынести. Каталог по прямой ссылке тоже ждёт анкету.
let finished = false;

// Вводная фраза нужна тому, кто пришёл впервые. Когда анкета готова, она
// только отодвигает ответ вниз: на телефоне это пять строк до первого слова.
const lead = document.querySelector('.lead');

function showCatalog(on) {
  answerScreen.hidden = on || !finished;
  catalogScreen.hidden = !on || !finished;
  if (lead) lead.hidden = finished;
}

function openProgram(id) {
  // Карточку, спрятанную фильтром, открыть нельзя: сначала снимаем его.
  catalogFilter.reset();
  location.hash = 'programs';
  const card = catalogScreen.querySelector(`details.card[data-id="${CSS.escape(id)}"]`);
  if (!card) return;
  card.open = true;
  card.scrollIntoView({ block: 'start' });
}

const catalogFilter = setupCatalogFilter({
  root: document.getElementById('catalog-tools'),
  resultsNode: document.getElementById('results'),
});

// План живёт отдельно от анкеты: анкету можно поправить, не потеряв отмеченное.
const plan = {
  ids: loadPlan(localStorage),
  toggle(id) {
    plan.ids = togglePlan(plan.ids, id);
    savePlan(plan.ids, localStorage);
    refresh();
  },
  // Отметки дел: без перерисовки, чтобы раскрытый список не схлопывался.
  done: loadDone(localStorage),
  markDone(key, on) {
    if (on) plan.done.add(key); else plan.done.delete(key);
    saveDone(plan.done, localStorage);
  },
};

const nodes = {
  plan,
  summaryNode: document.getElementById('summary'),
  agendaNode: document.getElementById('agenda'),
  resultsNode: document.getElementById('results'),
  catalogButton,
  onOpenProgram: openProgram,
};

const syncScreen = () => showCatalog(location.hash === '#programs');
addEventListener('hashchange', syncScreen);

catalogButton.addEventListener('click', () => {
  catalogFilter.showBucket(catalogButton.dataset.bucket || 'all');
  location.hash = 'programs';
  catalogScreen.scrollIntoView({ block: 'start' });
});
document.getElementById('back-to-answer').addEventListener('click', () => {
  history.length > 1 ? history.back() : (location.hash = '');
});
document.getElementById('show-results').addEventListener('click', () => {
  if (location.hash === '#programs') location.hash = '';
});

// Шапка обещает, что данные никуда не уходят. Пока объяснялка выключена,
// это правда; когда включена, единственное исключение называется здесь же.
if (EXPLAIN_URL) {
  if (lead) lead.append(' Кнопка «Объяснить» отправляет только причины по одной программе.');
}

let programs = [];
const details = { status: 'loading', programs: {}, retry: fetchDetails };

const saved = loadProfile(localStorage);
writeForm(form, saved);
const box = document.getElementById('profile-box');
const finishButton = document.getElementById('show-results');
const profileBox = setupProfileBox(
  {
    box,
    summary: document.getElementById('profile-summary-text'),
    button: finishButton,
    target: nodes.summaryNode,
  },
  saved,
);

const wizard = setupWizard({
  box,
  form,
  progress: document.getElementById('wizard-progress'),
  progressLabel: document.getElementById('wizard-progress-label'),
  back: document.getElementById('wizard-back'),
  next: document.getElementById('wizard-next'),
  finish: finishButton,
  error: document.getElementById('wizard-error'),
});

// Вернувшегося человека с готовой анкетой мастер не встречает: он сразу
// видит ответ. Новичок идёт по шагам.
finished = profileReady(saved);
if (finished) wizard.end(); else wizard.start();
syncScreen();

// Слушатель на захвате, потому что обработчик из setupProfileBox сворачивает
// анкету безусловно, а при пропущенном обязательном она должна остаться.
finishButton.addEventListener('click', (event) => {
  if (!wizard.active) return;
  if (!wizard.canFinish()) {
    event.stopImmediatePropagation();
    return;
  }
  wizard.end();
  finished = true;
  syncScreen();
}, true);

function refresh(profile = readForm(form)) {
  saveProfile(profile, localStorage);
  profileBox.update(profile);
  renderResults(nodes, profile, programs, today, details);
}

function fetchDetails() {
  details.status = 'loading';
  refresh();
  loadDetails()
    .then((data) => {
      details.programs = data.programs ?? {};
      details.status = 'ready';
    })
    .catch(() => {
      details.status = 'failed';
    })
    .finally(() => refresh());
}

onProfileChange(form, (profile) => refresh(profile));

// refresh() пишет профиль в хранилище, поэтому ключ снимается после него:
// иначе пустая анкета осталась бы лежать под тем же ключом.
document.getElementById('clear-profile').addEventListener('click', () => {
  const empty = emptyProfile();
  writeForm(form, empty);
  plan.ids = [];
  plan.done = new Set();
  refresh(empty);
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PLAN_KEY);
    localStorage.removeItem(DONE_KEY);
  } catch { /* приватный режим: стирать нечего */ }
  box.open = true;
  finished = false;
  location.hash = '';
  wizard.start();
  syncScreen();
  document.getElementById('clear-status').textContent = 'Анкета стёрта с этого устройства.';
});

// Список программ не приехал: без него ответа нет. Человек видит, что
// случилось и что делать, а не сырой текст исключения. Блок стоит вне
// узлов, которые перерисовывает refresh(), поэтому его не сотрёт ввод в анкете.
function showLoadError() {
  const box = document.createElement('div');
  box.className = 'state-error';
  box.setAttribute('role', 'alert');
  const text = document.createElement('p');
  text.textContent = 'Не удалось загрузить список программ. Проверь интернет и попробуй ещё раз.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'button button-small';
  retry.textContent = 'Попробовать ещё раз';
  retry.addEventListener('click', () => location.reload());
  box.append(text, retry);
  document.querySelector('main').prepend(box);
}

// Без сети сайт открывается из копии, сохранённой при прошлом заходе. Сроки
// в ней могли устареть, поэтому об этом сказано прямо.
const offlineNote = document.getElementById('offline');
const showOffline = () => { offlineNote.hidden = navigator.onLine; };
window.addEventListener('online', showOffline);
window.addEventListener('offline', showOffline);
showOffline();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

loadIndex()
  .then((index) => {
    programs = index.programs ?? [];
    fetchDetails();
  })
  .catch(() => {
    showLoadError();
  });
