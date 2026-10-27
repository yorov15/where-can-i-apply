import { loadProfile, saveProfile, emptyProfile, profileReady, STORAGE_KEY } from './profile.js';
import { readForm, writeForm, onProfileChange, setupProfileBox } from './form.js';
import { setupWizard } from './steps.js';
import { setupCatalogFilter } from './filter.js';
import { setupBarHide } from './barscroll.js';
import { setupTabbar } from './tabbar.js';
import { setupPriority } from './priority.js';
import { loadIndex, loadDetails, loadConditions, loadRoute, loadTrack, forgetConditions } from './data.js';
import { renderResults } from './render.js';
import { PLAN_KEY, DONE_KEY, buildIcs } from './plan.js';
import { loadRouteState, saveRouteState, setGoals, toggleStep, clearProgress, exportState, importState, ROUTE_STATE_KEY, reconcileProgress, MAX_GOALS } from './route-state.js';
import { buildCombinedRoute } from './route-combined.js';
import { renderRoute } from './route-view.js';
import { EXPLAIN_URL } from './config.js';

const form = document.getElementById('profile');
const today = new Date().toISOString().slice(0, 10);

// Два экрана в одном файле: сайт статичный, второй HTML тянул бы за собой
// вторую шапку и второй разбор анкеты. Адрес всё равно настоящий — назад
// в браузере работает.
const answerScreen = document.getElementById('answer');
const catalogScreen = document.getElementById('catalog');
const routeScreen = document.getElementById('route');
const routeBody = document.getElementById('route-body');
const catalogButton = document.getElementById('open-catalog');

// Пока человек не закончил анкету, ни ответа, ни каталога не видно: ответ
// по пустому профилю — это стена «можно, но сначала», из которой нечего
// вынести. Каталог по прямой ссылке тоже ждёт анкету.
let finished = false;

// Вводная фраза нужна тому, кто пришёл впервые. Когда анкета готова, она
// только отодвигает ответ вниз: на телефоне это пять строк до первого слова.
const lead = document.querySelector('.lead');

function showScreen(name) {
  const ready = finished;
  // Пока анкета не готова, маршрута нет: адрес #route не должен оставлять
  // человека на пустом экране.
  if (!ready) name = 'answer';
  document.body.dataset.screen = name;
  answerScreen.hidden = !ready || name !== 'answer';
  catalogScreen.hidden = !ready || name !== 'catalog';
  routeScreen.hidden = !ready || name !== 'route';
  if (ready && name === 'catalog') buildCards();
  if (ready && name === 'route') openRoute();
  if (lead) lead.hidden = finished;
  tabbar.show(finished);
  tabbar.sync();
}

function screenFromHash() {
  if (location.hash === '#route') return 'route';
  if (location.hash === '#programs') return 'catalog';
  return 'answer';
}

function openProgram(id) {
  // Карточка может ещё не существовать: пока каталог закрыт, их не строят.
  buildCards();
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
setupBarHide(document.querySelector('.catalog-bar'));

// Нижняя панель вкладок (телефон). Экраны переключаются адресом, как и кнопками.
const tabbar = setupTabbar({
  bar: document.getElementById('tabbar'),
  hash: () => location.hash,
  bucket: () => document.querySelector('#catalog-tools .chip[aria-pressed="true"]')?.dataset.bucket,
  watch: document.getElementById('catalog-tools'),
  go(name) {
    if (name === 'answer') {
      if (location.hash) location.hash = '';
    } else if (name === 'route') {
      location.hash = 'route';
    } else {
      catalogFilter.showBucket(name === 'plan' ? 'plan' : 'all');
      location.hash = 'programs';
    }
    window.scrollTo({ top: 0 });
  },
});

// План живёт отдельно от анкеты: анкету можно поправить, не потеряв отмеченное.
let routeState = loadRouteState(localStorage);
const plan = {
  ids: [...routeState.goals],
  limit: MAX_GOALS,
  toggle(id) {
    routeState = setGoals(routeState, plan.ids.includes(id)
      ? plan.ids.filter(goal => goal !== id) : [...plan.ids, id]);
    persistRoute();
    refresh();
    // План показывает дела и плату за подачу — и то и другое берётся из
    // условий. Только что отмеченную программу надо дочитать: иначе её
    // строка в плане была бы пустой до раскрытия карточки.
    if (plan.ids.includes(id)) details.ensure(id).then(() => refresh());
    if (!routeScreen.hidden) openRoute();
  },
};

const nodes = {
  plan,
  summaryNode: document.getElementById('summary'),
  agendaNode: document.getElementById('agenda'),
  resultsNode: document.getElementById('results'),
  catalogButton,
  onOpenProgram: openProgram,
  onOpenRoute: () => { location.hash = 'route'; },
  // Каталог закрыт — карточки не пересобираем (см. renderResults).
  skipCards: () => catalogScreen.hidden && !forceCards,
};

// Карточки каталога отстали от анкеты, пока каталог был закрыт.
let cardsStale = false;
let forceCards = false;
function buildCards() {
  if (!cardsStale) return;
  forceCards = true;
  try { refresh(); } finally { forceCards = false; }
}

// На широком экране фильтры лежат в боковой колонке, а не прячутся под
// «Ещё фильтры»: место есть, а лишний тап не нужен.
const wide = matchMedia('(min-width: 64rem)');
const openFilters = () => { if (wide.matches) document.querySelector('.catalog-more')?.setAttribute('open', ''); };
openFilters();
wide.addEventListener?.('change', openFilters);

const syncScreen = () => showScreen(screenFromHash());
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

// programs — лёгкие детали по всем программам; conditions — условия тех,
// которые уже раскрывали. Значение null значит «файл не приехал»: это не то
// же самое, что «условий нет», и карточка их различает (js/card-model.js).
const details = {
  status: 'loading',
  programs: {},
  conditions: {},
  retry: fetchDetails,
  // Возвращает промис, по которому карточка перерисовывает себя: файл
  // условий едет по требованию, а не вместе со всеми деталями.
  ensure(id) {
    if (details.conditions[id] !== undefined) return Promise.resolve();
    return loadConditions(id).then((list) => { details.conditions[id] = list ?? null; });
  },
};

// ——— Маршрут до оффера ———
// Цель и галочки живут рядом с планом, в localStorage; ничего не уходит
// наружу. Полный маршрут есть только у программ из data/route.json: у
// остальных показываем срок, требования и что уточнить у вуза.
let routeData = null;
let routeDataLoading = null;
let routeTracks = {};
let routeCtx = null;
let route = null;
let routeStatus = '';
let routeLoading = false;
let routeRequest = 0;

const programById = (id) => programs.find((program) => program.id === id);

function loadRouteData() {
  if (!routeDataLoading) {
    routeDataLoading = loadRoute()
      .then((data) => { routeData = data; })
      .catch(() => { routeData = null; });
  }
  return routeDataLoading;
}

function persistRoute() {
  plan.ids = [...routeState.goals];
  saveRouteState(routeState, localStorage);
}

function preparedEntry(id) {
  return routeData?.prepared?.find((entry) => entry.id === id) ?? null;
}

// Новичку цель выбирать не из чего: берём первую программу из плана, у
// которой маршрут сверен. План пуст — оставляем выбор человеку.
async function openRoute() {
  if (!routeData) await loadRouteData();
  // Возврат на вкладку не должен показывать «Собираю маршрут…» на готовом
  // маршруте: скелетон только когда для этой цели ничего не собрано.
  const stale = !route || route.id !== routeState.goals.join(',') || !routeCtx;
  routeLoading = stale;
  if (stale) renderRouteView();
  await refreshRoute();
  routeLoading = false;
  renderRouteView();
}

async function refreshRoute() {
  if (!routeData) {
    route = null;
    routeCtx = null;
    return;
  }
  const ticket = ++routeRequest;
  const ids = [...routeState.goals];
  const selected = ids.map(programById).filter(Boolean);
  if (!selected.length) {
    route = null;
    routeCtx = null;
    return;
  }
  const codes = [...new Set(selected.flatMap(program => preparedEntry(program.id)?.tests ?? []))];
  const loaded = await Promise.all(codes.map((code) => loadTrack(code)));
  codes.forEach((code, index) => { if (loaded[index]) routeTracks[code] = loaded[index]; });
  await Promise.all(selected.map(program => details.ensure(program.id)));
  if (ticket !== routeRequest || ids.join(',') !== routeState.goals.join(',')) return;
  routeCtx = selected.map(program => ({ program, conditions: details.conditions[program.id] ?? null, prepared: preparedEntry(program.id) }));
  rebuildRoute();
  routeState = reconcileProgress(routeState, route.steps);
  if (routeState.migrationNotice) {
    const remaining = Object.keys(routeState.done).filter(id => !route.steps.some(step => step.id === id));
    routeStatus = remaining.length
      ? 'Часть старых отметок пока не сопоставлена. Они сохранены в файле маршрута; проверь прогресс.'
      : 'Старые отметки перенесены. Даты старых выполнений неизвестны.';
    delete routeState.migrationNotice;
  }
  persistRoute();
  rebuildRoute();
}

function rebuildRoute() {
  if (!routeCtx) {
    route = null;
    return;
  }
  route = buildCombinedRoute({
    contexts: routeCtx,
    profile: readForm(form),
    today,
    tracks: routeTracks,
    state: routeState,
  });
}

const showRouteStatus = (message) => {
  routeStatus = message ?? '';
  renderRouteView();
};

function renderRouteView() {
  renderRoute(routeBody, {
    programs,
    goal: routeState.goals[0] ?? null,
    route,
    prepared: routeData?.prepared ?? [],
    planIds: plan.ids,
    tracks: routeTracks,
    status: routeStatus,
    loading: routeLoading,
    applyUrl: routeState.goals.length === 1 ? details.programs?.[routeState.goals[0]]?.applyUrl ?? null : null,
    handlers: {
      onChooseGoals() { location.hash = 'programs'; },
      onRemoveGoal(id) { plan.toggle(id); },
      onToggle(stepId) {
        const aliases = route?.steps.find(step => step.id === stepId)?.legacyIds ?? [];
        routeState = toggleStep(routeState, stepId, today, aliases);
        persistRoute();
        rebuildRoute();
        renderRouteView();
        // Перерисовка заменяет узлы: возвращаем фокус на тот же шаг, иначе
        // с клавиатуры после каждой галочки человек оказывается в начале.
        routeBody.querySelector(`[data-step="${CSS.escape(stepId)}"]`)?.focus();
      },
      onPrint() {
        window.print();
      },
      onCalendar() {
        if (!routeCtx) return 'Срок некуда добавить.';
        const urls = Object.fromEntries(routeCtx.map(context => [context.program.id, details.programs?.[context.program.id]?.applyUrl]));
        const stamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');
        const { text, events } = buildIcs(routeCtx.map(context => context.program), today, stamp, urls);
        if (!events) return 'Срок подачи не объявлен — в календарь добавлять нечего.';
        try {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
          link.download = 'nerio-marshrut.ics';
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);
          return 'Файл скачан: открыл — и срок с напоминанием за неделю и за день в календаре.';
        } catch {
          return 'Браузер не дал скачать файл календаря.';
        }
      },
      onParent(text) {
        return navigator.clipboard.writeText(text).then(
          () => 'Скопировано. Можно вставить в мессенджер.',
          () => 'Браузер не дал скопировать.',
        );
      },
      onExport() {
        try {
          const text = exportState(routeState);
          const blob = new Blob([text], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const node = document.createElement('a');
          node.href = url;
          node.download = 'nerio-route.json';
          document.body.append(node);
          node.click();
          node.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          return 'Маршрут сохранён в файл.';
        } catch {
          return 'Браузер не дал сохранить файл.';
        }
      },
      async onImport(picked) {
        try {
          if (picked.size > 500_000) return 'Файл слишком большой для маршрута Nerio.';
          const imported = importState(await picked.text());
          if (!imported) return 'Это не файл маршрута Nerio.';
          routeState = imported;
          persistRoute();
          await refreshRoute();
          refresh();
          return 'Маршрут загружен.';
        } catch {
          return 'Не получилось прочитать файл.';
        }
      },
      onClear() {
        routeState = clearProgress(routeState);
        persistRoute();
        rebuildRoute();
        renderRouteView();
        return 'Прогресс стёрт, цели остались.';
      },
      onOpen(programId) {
        openProgram(programId);
      },
      onOpenRoute() {
        location.hash = 'route';
      },
      async onRetry() {
        if (!routeData) {
          routeDataLoading = null;
          await loadRouteData();
        }
        for (const goalId of routeState.goals) {
          details.conditions[goalId] = undefined;
          forgetConditions(goalId);
        }
        await refreshRoute();
        routeStatus = routeData ? 'Попробовал ещё раз.' : 'Файл маршрута не загрузился: проверь интернет.';
        renderRouteView();
      },
      onStatus: showRouteStatus,
    },
  });
}

// Перед печатью раскрываем подробности шагов: на бумаге закрытое
// раскрытие — это пропавший текст условия.
addEventListener('beforeprint', () => {
  for (const node of routeBody.querySelectorAll('details')) node.open = true;
});

const saved = loadProfile(localStorage);
writeForm(form, saved);

// Приоритеты: кнопки стран строятся по данным, а не по списку в коде —
// незачем показывать страну, программ которой на сайте нет. До загрузки
// данных в блоке пусто, и это честно: выбирать пока не из чего.
const priority = setupPriority({
  form,
  countriesNode: document.getElementById('priority-countries'),
  majorsNode: document.getElementById('priority-majors'),
  countries: [],
  onPick: () => refresh(),
});
priority.set(saved);
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
  tabbar.setPlanCount(plan.ids.length);
  cardsStale = Boolean(renderResults(nodes, profile, programs, today, details)?.skippedCards);
  // Маршрут строится из анкеты: поправил балл — маршрут и неделя другие.
  if (!routeScreen.hidden) {
    rebuildRoute();
    renderRouteView();
  }
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
    .then(() => {
      // «Мой план» показывает дела и плату за подачу — и то и другое берётся
      // из условий. Для отмеченных программ их надо попросить сразу, иначе
      // план был бы пустым до тех пор, пока карточку не раскроют. Обычно
      // отмеченных программ единицы.
      return Promise.all(plan.ids.filter((id) => details.programs[id]).map((id) => details.ensure(id)));
    })
    .then(() => refresh());
}

onProfileChange(form, (profile) => refresh(profile));

// refresh() пишет профиль в хранилище, поэтому ключ снимается после него:
// иначе пустая анкета осталась бы лежать под тем же ключом.
document.getElementById('clear-profile').addEventListener('click', () => {
  const empty = emptyProfile();
  writeForm(form, empty);
  plan.ids = [];
  refresh(empty);
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PLAN_KEY);
    localStorage.removeItem(DONE_KEY);
    localStorage.removeItem(ROUTE_STATE_KEY);
  } catch { /* приватный режим: стирать нечего */ }
  routeState = loadRouteState(localStorage);
  route = null;
  routeCtx = null;
  routeTracks = {};
  routeStatus = '';
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
    priority.setCountries(
      [...new Set(programs.map((program) => program.hostCountry).filter(Boolean))].sort(),
      programs,
    );
    priority.setMajorCounts(programs);
    // Выбранная раньше страна могла пропасть из данных — например, программу
    // сняли. Об этом надо сказать: молча потерять выбор человека нельзя.
    const lost = priority.lost();
    const lostNote = document.getElementById('priority-lost');
    if (lost.length) {
      lostNote.textContent = `Из выбранного больше нет в данных: ${lost.join(', ')}. Убери его из приоритетов или выбери заново.`;
      lostNote.hidden = false;
    }
    fetchDetails();
    // Маршрут — отдельный маленький файл: если человек пришёл сразу на
    // #route, к моменту нажатия он уже приехал.
    loadRouteData().then(() => {
      if (location.hash === '#route') openRoute();
    });
  })
  .catch(() => {
    showLoadError();
  });
