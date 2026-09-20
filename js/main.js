import { loadProfile, saveProfile, emptyProfile, STORAGE_KEY } from './profile.js';
import { readForm, writeForm, onProfileChange, setupProfileBox } from './form.js';
import { loadIndex, loadDetails } from './data.js';
import { renderResults } from './render.js';
import { EXPLAIN_URL } from './config.js';

const form = document.getElementById('profile');
const today = new Date().toISOString().slice(0, 10);

// Два экрана в одном файле: сайт статичный, второй HTML тянул бы за собой
// вторую шапку и второй разбор анкеты. Адрес всё равно настоящий — назад
// в браузере работает.
const answerScreen = document.getElementById('answer');
const catalogScreen = document.getElementById('catalog');
const catalogButton = document.getElementById('open-catalog');

function showCatalog(on) {
  answerScreen.hidden = on;
  catalogScreen.hidden = !on;
}

function openProgram(id) {
  location.hash = 'programs';
  const card = catalogScreen.querySelector(`details.card[data-id="${CSS.escape(id)}"]`);
  if (!card) return;
  card.open = true;
  card.scrollIntoView({ block: 'start' });
}

const nodes = {
  summaryNode: document.getElementById('summary'),
  agendaNode: document.getElementById('agenda'),
  resultsNode: document.getElementById('results'),
  catalogButton,
  onOpenProgram: openProgram,
};

const syncScreen = () => showCatalog(location.hash === '#programs');
addEventListener('hashchange', syncScreen);
syncScreen();

catalogButton.addEventListener('click', () => {
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
  const lead = document.querySelector('.lead');
  if (lead) lead.append(' Исключение — кнопка «Объяснить» в карточке: она отправляет причины ответа по этой одной программе, без анкеты целиком.');
}

let programs = [];
const details = { status: 'loading', programs: {}, retry: fetchDetails };

const saved = loadProfile(localStorage);
writeForm(form, saved);
const profileBox = setupProfileBox(
  {
    box: document.getElementById('profile-box'),
    summary: document.getElementById('profile-summary-text'),
    button: document.getElementById('show-results'),
    target: nodes.summaryNode,
  },
  saved,
);

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
  refresh(empty);
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* приватный режим: стирать нечего */ }
  document.getElementById('profile-box').open = true;
  document.getElementById('clear-status').textContent = 'Анкета стёрта с этого устройства.';
});

loadIndex()
  .then((index) => {
    programs = index.programs ?? [];
    fetchDetails();
  })
  .catch((err) => {
    nodes.resultsNode.textContent = err.message;
  });
