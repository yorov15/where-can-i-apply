import { loadProfile, saveProfile, emptyProfile, profileReady, STORAGE_KEY } from './profile.js';
import { readForm, writeForm, onProfileChange, setupProfileBox } from './form.js';
import { setupWizard } from './steps.js';
import { setupCatalogFilter } from './filter.js';
import { setupBarHide } from './barscroll.js';
import { setupTabbar } from './tabbar.js';
import { setupPriority } from './priority.js';
import { loadIndex, loadDetails, loadConditions, loadRoute, loadTrack, loadDocument, loadEssaySpec, forgetConditions } from './data.js';
import { renderResults } from './render.js';
import { PLAN_KEY, DONE_KEY, buildEventsIcs } from './plan.js';
import { scheduleRoute, routeCalendarEvents } from './agenda.js';
import { loadRouteState, saveRouteState, setGoals, toggleStep, clearProgress, exportState, importState, ROUTE_STATE_KEY, reconcileProgress, MAX_GOALS, setExamPlan, setStudyHours, recordMock, toggleStudyTask, setGoalStatus } from './route-state.js';
import { examPlan } from './exam-plan.js';
import { buildStudyPlan } from './study-plan.js';
import { prepareCurrentWeek,reviewWeeks,setTaskDay,studyCalendarEvents } from './weekly.js';
import { parentReport,printParentReport } from './parent-report.js';
import { planCost } from './cost.js';
import { buildCombinedRoute } from './route-combined.js';
import { renderRoute } from './route-view.js';
import { EXPLAIN_URL } from './config.js';
import { renderToday } from './today-view.js';
import { renderProgram, programRow } from './program-view.js';
import { saveExperience, removeExperience, saveTaskOutcome, removeTaskOutcome, startPortfolioWork, setPortfolioWorkPaused,
  togglePortfolioWorkStep, savePortfolioBrief, savePortfolioReview } from './portfolio.js';
import { clearPortfolioDrafts } from './portfolio-view.js';

const form = document.getElementById('profile');
const today = new Date().toISOString().slice(0, 10);

// Два экрана в одном файле: сайт статичный, второй HTML тянул бы за собой
// вторую шапку и второй разбор анкеты. Адрес всё равно настоящий — назад
// в браузере работает.
const answerScreen = document.getElementById('answer');
const programScreen = document.getElementById('program');
const programBody = document.getElementById('program-body');
const routeScreen = document.getElementById('route');
const routeBody = document.getElementById('route-body');
const todayScreen = document.getElementById('today');
const todayBody = document.getElementById('today-body');
// Маршрут и «Сегодня» питаются одним состоянием; фокус после перерисовки
// возвращаем на том экране, который сейчас открыт.
const activeBody = () => (todayScreen.hidden ? routeBody : todayBody);

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
  // Уходя на экран программы, запоминаем место в списке: назад человек
  // возвращается к тому же вузу, а не в начало трёхсот строк.
  if (name === 'program' && !answerScreen.hidden) answerScroll = window.scrollY;
  const back = ready && name === 'answer' && answerScreen.hidden;
  answerScreen.hidden = !ready || name !== 'answer';
  programScreen.hidden = !ready || name !== 'program';
  routeScreen.hidden = !ready || name !== 'route';
  todayScreen.hidden = !ready || name !== 'today';
  if (ready && name === 'answer') buildCards();
  if (ready && name === 'program') renderProgramView();
  if (back && answerScroll) requestAnimationFrame(() => window.scrollTo({ top: answerScroll, behavior: 'instant' }));
  if (ready && (name === 'route' || name === 'today')) openRoute();
  if (lead) lead.hidden = finished;
  tabbar.show(finished);
  tabbar.sync();
}

let answerScroll = 0;
const PROGRAM_PREFIX = '#program/';

function screenFromHash() {
  if (location.hash === '#route') return 'route';
  if (location.hash === '#today') return 'today';
  if (location.hash.startsWith(PROGRAM_PREFIX)) return 'program';
  return 'answer';
}

// Прежний адрес #programs и пустой адрес ведут на один и тот же экран.
const openProgram = (id) => { location.hash = PROGRAM_PREFIX.slice(1) + encodeURIComponent(id); };
const openAnswer = () => { location.hash = ''; };

function programIdFromHash() {
  try { return decodeURIComponent(location.hash.slice(PROGRAM_PREFIX.length)); } catch { return ''; }
}

let leftFirstPage = false;
addEventListener('hashchange', () => { leftFirstPage = true; });

// Экран программы живёт по адресу: перерисовываем его, когда меняется анкета,
// план или приезжают подробности.
function renderProgramView() {
  const id = programIdFromHash();
  const program = programs.find((item) => item.id === id);
  renderProgram(programBody, {
    row: program ? programRow(program, readForm(form), today) : null,
    loading: details.status === 'loading' && !programs.length,
    details, plan, route, routeState, today,
    handlers: {
      // Зашёл по прямой ссылке — назад в истории ведёт с сайта, поэтому на список.
      onBack: () => (leftFirstPage ? history.back() : openAnswer()),
      onOpenToday: () => { location.hash = 'today'; },
    },
  });
  // Условия едут отдельным файлом: попросили — и после их прихода рисуем
  // заново. Повтора не будет: после ensure условия уже не «ожидаются».
  if (program && details.programs[id] && details.conditions[id] === undefined) {
    details.ensure(id).then(() => { if (programIdFromHash() === id && !programScreen.hidden) renderProgramView(); });
  }
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
  watch: document.getElementById('catalog-tools'),
  go(name) {
    if (name === 'route' || name === 'today') location.hash = name;
    else if (location.hash) location.hash = '';
    window.scrollTo({ top: 0 });
  },
});

// План живёт отдельно от анкеты: анкету можно поправить, не потеряв отмеченное.
let routeState = loadRouteState(localStorage);
let weeklySnapshot=null;
let routeEssays={};
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
    if (!routeScreen.hidden || !todayScreen.hidden) openRoute();
  },
};

const nodes = {
  plan,
  summaryNode: document.getElementById('summary'),
  agendaNode: document.getElementById('agenda'),
  resultsNode: document.getElementById('results'),
  onOpenProgram: openProgram,
  onOpenRoute: () => { location.hash = 'route'; },
  // Список не на экране — карточки не пересобираем (см. renderResults).
  skipCards: () => answerScreen.hidden && !forceCards,
};

// Карточки списка отстали от анкеты, пока его не было на экране.
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

document.getElementById('show-results').addEventListener('click', () => {
  if (location.hash === '#programs') openAnswer();
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
let routeDocuments = {};
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

function persistPortfolio(next, message) {
  if (!next) return {ok:false,message:'Не удалось сохранить. Проверь ссылку, длину полей и число записей (до 40 опытов и 100 результатов).'};
  if (new TextEncoder().encode(exportState(next)).length > 500_000) return {ok:false,message:'Маршрут слишком большой. Сохрани резервную копию и сократи записи.'};
  if (!saveRouteState(next, localStorage)) return {ok:false,message:'Браузер не сохранил записи. Освободи место или разреши локальное хранение и попробуй снова.'};
  routeState = next;
  return {ok:true,message};
}

function persistWork(next,message) {
  const response=persistPortfolio(next,message);
  if(response.ok)rebuildRoute();
  return response;
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
    rebuildRoute();
    return;
  }
  const ticket = ++routeRequest;
  const ids = [...routeState.goals];
  const selected = ids.map(programById).filter(Boolean);
  if (!selected.length) {
    route = null;
    routeCtx = null;
    rebuildRoute();
    return;
  }
  const codes = [...new Set(selected.flatMap(program => preparedEntry(program.id)?.tests ?? []))];
  const loaded = await Promise.all(codes.map((code) => loadTrack(code)));
  codes.forEach((code, index) => { if (loaded[index]) routeTracks[code] = loaded[index]; });
  await Promise.all(selected.map(program => details.ensure(program.id)));
  const docCodes = [...new Set(selected.flatMap(program => (details.conditions[program.id] ?? [])
    .flatMap(condition => [condition.doc, ...(condition.docExtras ?? []).map(extra => extra.code)]).filter(Boolean)))];
  const documents = await Promise.all(docCodes.map(loadDocument));
  docCodes.forEach((code, index) => { if (documents[index]) routeDocuments[code] = documents[index]; });
  const essayIds=selected.filter(program=>preparedEntry(program.id)?.hasEssays).map(program=>program.id);
  const essaySpecs=await Promise.all(essayIds.map(loadEssaySpec));
  if (ticket !== routeRequest || ids.join(',') !== routeState.goals.join(',')) return;
  routeEssays=Object.fromEntries(essayIds.map((id,index)=>[id,essaySpecs[index]]));
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
    weeklySnapshot=prepareCurrentWeek(routeState,{steps:[],week:[]},null,today);
    if(exportState(routeState)!==exportState(weeklySnapshot.state)){routeState=weeklySnapshot.state;persistRoute();}
    return;
  }
  if (!routeState.studyStarted) { routeState = { ...routeState, studyStarted: today }; persistRoute(); }
  route = buildCombinedRoute({
    contexts: routeCtx,
    profile: readForm(form),
    today,
    tracks: routeTracks,
    documents: routeDocuments,
    state: routeState,
  });
  const plans=Object.fromEntries(route.steps.filter(step=>routeTracks[step.track]).map(step=>[step.id,examForStep(step)]));
  route=scheduleRoute(route,plans,routeDocuments,today);
  route.tracksLoaded=routeCtx.every(context=>(context.prepared?.tests??[]).every(code=>Boolean(routeTracks[code])));
  const study=buildStudyPlan({steps:route.steps,tracks:routeTracks,plans,state:routeState,today});
  weeklySnapshot=prepareCurrentWeek(routeState,route,study,today);
  if(exportState(routeState)!==exportState(weeklySnapshot.state)){routeState=weeklySnapshot.state;persistRoute();}
  route.parentReport=parentReport({route,state:routeState,weekly:weeklySnapshot,cost:planCost(routeCtx.map(context=>context.program),details),today});
}

const showRouteStatus = (message) => {
  routeStatus = message ?? '';
  renderRouteView();
};

function examForStep(step) {
  const goals = route.goals.filter(goal => step.programIds.includes(goal.id) && goal.deadline.closes);
  const open = goals.filter(goal => goal.deadline.state !== 'closed');
  const deadline = (open.length ? open : goals).sort((a,b) => a.deadline.closes.localeCompare(b.deadline.closes))[0]?.deadline;
  return examPlan({ step, track: routeTracks[step.track], state: routeState, profile: readForm(form), today, deadline });
}

function renderRouteView() {
  const plans = Object.fromEntries((route?.steps ?? []).filter(step => routeTracks[step.track]).map(step => [step.id, examForStep(step)]));
  (todayScreen.hidden ? renderRoute : renderToday)(todayScreen.hidden ? routeBody : todayBody, {
    study: route ? buildStudyPlan({ steps:route.steps, tracks:routeTracks, plans, state:routeState, today }) : null,
    routeState, today,
    weekly:weeklySnapshot,
    essays:routeEssays,
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
      getRouteState: () => routeState,
      onSaveExperience(input) { return persistPortfolio(saveExperience(routeState,input,today),'Опыт сохранён.'); },
      onRemoveExperience(id) { return persistPortfolio(removeExperience(routeState,id),'Опыт удалён. Результаты заданий сохранены.'); },
      onSaveTaskOutcome(input) { return persistPortfolio(saveTaskOutcome(routeState,input,today),'Результат сохранён в «Моём пути».'); },
      onRemoveTaskOutcome(week,taskId) { return persistPortfolio(removeTaskOutcome(routeState,week,taskId),'Результат удалён. Галочка задания не изменилась.'); },
      onStartPortfolioWork(input) {
        const response=persistWork(startPortfolioWork(routeState,input,today),'Работа добавлена. Следующий шаг — на «Сегодня», если есть место в плане.');
        return {...response,id:input.id};
      },
      onPausePortfolioWork(id,paused) { return persistWork(setPortfolioWorkPaused(routeState,id,paused,today),paused?'Работа на паузе. Записанные результаты сохранены.':'Работа продолжена. Проверь дела недели.'); },
      onPortfolioWorkStep(id,stepId) {
        const next=togglePortfolioWorkStep(routeState,id,stepId,today);
        if(!next)return {ok:false,message:'Сначала сохрани результат этого шага на «Сегодня». Предыдущие шаги должны быть закончены, работа — снята с паузы.'};
        return persistWork(next,'Отметки шагов обновлены. Результаты сохранены.');
      },
      onSavePortfolioBrief(id,input) { return persistWork(savePortfolioBrief(routeState,id,input,today),'Задача и время обновлены.'); },
      onSavePortfolioReview(id,input) { return persistWork(savePortfolioReview(routeState,id,input,today),'Самопроверка сохранена.'); },
      getExamPlan: examForStep,
      onStudyToggle(week, taskId) {
        routeState=toggleStudyTask(routeState,week,taskId,today);persistRoute();rebuildRoute();renderRouteView();
        const section=activeBody().querySelector(`[data-study-week="${CSS.escape(week)}"]`);
        if (section) section.open=true;
        activeBody().querySelector(`[data-study-task="${CSS.escape(taskId)}"] input`)?.focus();
      },
      onWeeklyToggle(week,taskId) {
        const task=routeState.weekPlan[week]?.find(item=>item.taskId===taskId);
        if(!task)return;
        if(task.kind==='portfolio'){
          const next=togglePortfolioWorkStep(routeState,task.experienceId,task.workStepId,today);
          if(!next){
            renderRouteView();
            const box=activeBody().querySelector(`[data-task-outcome="${CSS.escape(taskId)}"]`);
            if(box){box.open=true;box.querySelector('[role="status"]').textContent='Сначала запиши и сохрани результат этого шага.';box.querySelector('textarea')?.focus();}
            return;
          }
          const response=persistPortfolio(next,'Шаг обновлён.');
          if(!response.ok){
            const box=activeBody().querySelector(`[data-task-outcome="${CSS.escape(taskId)}"]`);
            if(box){box.open=true;box.querySelector('[role="status"]').textContent=response.message;}
            return;
          }
        }
        routeState=toggleStudyTask(routeState,week,taskId,today);
        const wanted=routeState.weekPlan[week].find(item=>item.taskId===taskId).done;
        if(wanted)routeState.carryTasks=routeState.carryTasks.filter(item=>item.taskId!==taskId);
        if(task?.routeId){const step=route.steps.find(item=>item.id===task.routeId);if(step&&step.done!==wanted)routeState=toggleStep(routeState,step.id,today,step.legacyIds);}
        persistRoute();rebuildRoute();renderRouteView();
        activeBody().querySelector(`[data-week-task="${CSS.escape(taskId)}"] input`)?.focus();
      },
      onTaskDay(week,taskId,day) {
        routeState=setTaskDay(routeState,week,taskId,day,today);persistRoute();rebuildRoute();renderRouteView();
        activeBody().querySelector(`[data-week-task="${CSS.escape(taskId)}"] select`)?.focus();
      },
      onReview(taskIds) {routeState=reviewWeeks(routeState,today,taskIds);persistRoute();rebuildRoute();renderRouteView();},
      onMock(code, score) {
        const next=recordMock(routeState,code,score,today);
        if (!next) return 'Проверь дату и шкалу балла.';
        routeState=next;persistRoute();rebuildRoute();renderRouteView();
        activeBody().querySelector(`[data-advice="${CSS.escape(code)}"]`)?.scrollIntoView({block:'nearest'});
        return 'Пробник сохранён.';
      },
      onExamPlan(code, patch, field) {
        routeState = setExamPlan(routeState, code, patch);
        persistRoute();
        rebuildRoute();
        renderRouteView();
        activeBody().querySelector(`[data-exam="${CSS.escape(code)}"] [data-field="${field}"]`)?.focus();
      },
      onChooseGoals() { openAnswer(); },
      onRemoveGoal(id) { plan.toggle(id); },
      onGoalStatus(id, status) {
        routeState = setGoalStatus(routeState, id, status, today);
        persistRoute();
        rebuildRoute();
        renderRouteView();
        activeBody().querySelector(`[data-goal="${CSS.escape(id)}"] select`)?.focus();
      },
      onToggle(stepId) {
        const aliases = route?.steps.find(step => step.id === stepId)?.legacyIds ?? [];
        routeState = toggleStep(routeState, stepId, today, aliases);
        persistRoute();
        rebuildRoute();
        renderRouteView();
        // Перерисовка заменяет узлы: возвращаем фокус на тот же шаг, иначе
        // с клавиатуры после каждой галочки человек оказывается в начале.
        activeBody().querySelector(`[data-step="${CSS.escape(stepId)}"]`)?.focus();
      },
      onPrint() {
        window.print();
      },
      onParentPrint(text) {
        try {printParentReport(text);} catch {showRouteStatus('Браузер не дал открыть печать отчёта.');}
      },
      onCalendar() {
        if (!routeCtx) return 'Срок некуда добавить.';
        const urls = Object.fromEntries(routeCtx.map(context => [context.program.id, details.programs?.[context.program.id]?.applyUrl]));
        const stamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');
        const plans=Object.fromEntries(route.steps.filter(step=>routeTracks[step.track]).map(step=>[step.id,examForStep(step)]));
        const { text, events } = buildEventsIcs([...routeCalendarEvents(route,plans,routeTracks,urls,today),...studyCalendarEvents(routeState,today)], today, stamp);
        if (!events) return 'Подтверждённых или запланированных дат пока нет.';
        try {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
          link.download = 'nerio-marshrut.ics';
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);
          return `Календарь скачан: ${events} событий с напоминаниями за 7 и за 1 день. После изменений импортируй новый файл; проверь, не сохранил ли календарь старые события.`;
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
          if (!window.confirm('Заменить текущий маршрут данными из файла? Цели, прогресс, опыт и результаты заданий будут заменены. Для резервной копии сначала нажми «Скачать маршрут».')) return 'Загрузка отменена. Текущие записи сохранены.';
          if (!saveRouteState(imported, localStorage)) return 'Браузер не сохранил файл. Текущий маршрут не заменён.';
          clearPortfolioDrafts();
          routeState = imported;
          form.elements.hoursPerWeek.value=routeState.hoursPerWeek;
          persistRoute();
          await refreshRoute();
          refresh();
          return 'Маршрут, опыт и результаты заданий загружены.';
        } catch {
          return 'Не получилось прочитать файл.';
        }
      },
      onClear() {
        routeState = clearProgress(routeState);
        persistRoute();
        rebuildRoute();
        renderRouteView();
        return 'Отметки выполнения сброшены. Цели, опыт и результаты заданий сохранены.';
      },
      onOpen(programId) {
        openProgram(programId);
      },
      onOpenRoute() {
        location.hash = 'route';
      },
      onOpenToday() {
        location.hash = 'today';
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
  if(document.body.classList.contains('is-parent-print')) return;
  for (const node of routeBody.querySelectorAll('details')) node.open = true;
});

const saved = loadProfile(localStorage);
writeForm(form, saved);
form.elements.hoursPerWeek.value=routeState.hoursPerWeek;

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
  const hours=Number(form.elements.hoursPerWeek.value);
  if (hours!==routeState.hoursPerWeek) { routeState=setStudyHours(routeState,hours);persistRoute(); }
  saveProfile(profile, localStorage);
  profileBox.update(profile);
  tabbar.setPlanCount(plan.ids.length);
  cardsStale = Boolean(renderResults(nodes, profile, programs, today, details)?.skippedCards);
  if (!programScreen.hidden) renderProgramView();
  // Маршрут строится из анкеты: поправил балл — маршрут и неделя другие.
  if (!routeScreen.hidden || !todayScreen.hidden) {
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
  clearPortfolioDrafts();
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
  weeklySnapshot=null;
  form.elements.hoursPerWeek.value=routeState.hoursPerWeek;
  route = null;
  routeCtx = null;
  routeTracks = {};
  routeDocuments = {};
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
      if (location.hash === '#route' || location.hash === '#today') openRoute();
    });
  })
  .catch(() => {
    showLoadError();
  });
