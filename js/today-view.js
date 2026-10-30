// Экран «Сегодня»: одно дело сейчас, неделя, английский «сейчас → нужно» и
// ближайшие даты. Ничего не считается заново: данные приходят из движка
// маршрута (route.js), недельного плана (weekly.js) и плана экзамена
// (exam-plan.js). Здесь только выбор того, что показать первым.
import { formatDate, plural, daysBetween } from './lib/format.js';
import { safeHttpUrl } from './lib/url.js';
import { renderWeekReview } from './weekly-view.js';
import { GOAL_STATUSES, statusOf, isSent, goalProgress, progressLine } from './goal-status.js';
import { renderTaskOutcome } from './portfolio-view.js';
import { applicationActions } from './application.js';
import { renderOfferActions } from './application-view.js';
import { pendingPractice } from './portfolio-learning.js';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const shift = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const shortName = (name) => String(name ?? '').split(' — ')[0];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

// Что показать на экране. Чистая функция: тесты читают её, а не DOM.
export function todayModel({ route, routeState, weekly, study, today }) {
  const open = (route?.goals ?? [])
    .filter(goal => !isSent(statusOf(routeState, goal.id).status))
    .filter(goal => goal.deadline?.closes && goal.deadline.state !== 'closed' && goal.deadline.closes >= today)
    .sort((a, b) => a.deadline.closes.localeCompare(b.deadline.closes));
  const nearest = open[0] ?? null;

  const week = weekly?.week ?? null;
  const tasks = week?.tasks ?? [];
  const next = tasks.find(task => !task.done) ?? null;
  const doneCount = tasks.filter(task => task.done).length;

  // Уровень — только там, где известны и текущий балл, и нужный: иначе
  // «5.0 → ?» выглядит как обещание, которого у нас нет.
  const levels = (study?.active ?? []).map(({ plan, track }) => ({
    code: plan.code,
    name: track.name,
    test: plan.test,
    current: plan.current,
    target: plan.target,
    recommended: plan.recommended,
    lastDate: plan.lastDate,
    daysLeft: plan.daysLeft,
    expectedDeadline: plan.expectedDeadline,
  }));

  const dates = [];
  for (const task of tasks) {
    if (task.day && task.day >= today && !task.done) dates.push({ date: task.day, title: task.title, note: 'Выбранный день' });
  }
  for (const level of levels) {
    if (level.lastDate && level.lastDate >= today) {
      dates.push({ date: level.lastDate, title: `Последний день сдать ${level.test}`, note: 'Расчёт Nerio от срока подачи' });
    }
  }
  for (const goal of open) {
    dates.push({
      date: goal.deadline.closes,
      title: `Подача в ${shortName(goal.name)}`,
      note: goal.deadline.confidence === 'confirmed' ? 'Подтверждённый срок' : 'Ожидаемый срок',
    });
  }
  dates.sort((a, b) => a.date.localeCompare(b.date));

  const applications = (route?.goals ?? []).map(goal => {
    const entry = statusOf(routeState, goal.id);
    return { id: goal.id, name: shortName(goal.name), status: entry.status,
      line: progressLine(goalProgress(route, goal.id), entry) };
  });

  return {
    offerActions:applicationActions(routeState,today),
    nearest,
    daysToNearest: nearest ? daysBetween(today, nearest.deadline.closes) : null,
    week, tasks, next, doneCount,
    doneMinutes: tasks.filter(task => task.done).reduce((sum, task) => sum + task.minutes, 0),
    levels,
    dates: dates.slice(0, 4),
    applications: applications.some(goal => goal.status !== 'thinking') ? applications : [],
  };
}

function dayPicker(week, task, handlers) {
  const box = el('details', 'route-more');
  box.append(el('summary', null, task.day ? `${DAYS[(new Date(`${task.day}T00:00:00Z`).getUTCDay() + 6) % 7]} · ${formatDate(task.day)}` : 'Выбрать день'));
  const select = el('select');
  select.setAttribute('aria-label', `День: ${task.title}`);
  const none = el('option', null, 'Без дня');
  none.value = '';
  select.append(none);
  for (let i = 0; i < 7; i++) {
    const day = shift(week.start, i);
    const option = el('option', null, `${DAYS[i]} · ${formatDate(day)}`);
    option.value = day;
    select.append(option);
  }
  select.value = task.day ?? '';
  select.addEventListener('change', () => handlers.onTaskDay(week.key, task.taskId, select.value));
  box.append(select);
  return box;
}

function openLink(url, label) {
  const safe = safeHttpUrl(url);
  if (!safe) return null;
  const node = el('a', 'button', label);
  node.href = safe;
  node.target = '_blank';
  node.rel = 'noopener';
  return node;
}

function taskLabel(task,state) {
  const entry=state?.portfolio?.experiences.find(item=>item.id===task.experienceId);
  const step=entry?.workPlan?.steps.find(item=>item.id===task.workStepId);
  const practice=pendingPractice(entry?.workPlan);
  return {title:practice?`Учебная проба: ${practice.lesson.title}`:step?.title??task.title,context:step?entry.title:null};
}

function nowCard(model, props) {
  const {handlers,routeState}=props;
  const { next, week } = model;
  const card = el('section', 'today-now');
  if (!next) {
    card.append(el('p', 'route-detail', 'Дела на эту неделю закончились.'));
    card.append(el('p', null, week?.tasks.length ? 'Всё из плана недели сделано.' : 'Дел на эту неделю пока нет. Добавь программы в «Мой путь».'));
    return card;
  }
  card.append(el('p', 'route-detail', `Сейчас · ${next.minutes} мин`));
  const label=taskLabel(next,routeState);
  card.append(el('h3', 'today-now-title', label.title));
  if(label.context)card.append(el('p','route-detail',`Работа: ${label.context}`));
  if(next.expected)card.append(el('p','route-detail',`Результат шага: ${next.expected}`));
  const entry=routeState.portfolio?.experiences.find(item=>item.id===next.experienceId);
  const practice=Boolean(pendingPractice(entry?.workPlan));
  const needsResult=next.kind==='portfolio'&&!routeState.portfolio?.outcomes.some(item=>item.week===week.key&&item.taskId===next.taskId);
  const prerequisite=el('p','route-detail',practice?'Сначала закончи или отложи учебную пробу.': 'Сначала сохрани результат, затем заверши шаг.');
  prerequisite.hidden=!practice&&!needsResult;
  const done = el('button', 'button button-quiet', 'Готово');
  done.disabled=practice||needsResult;
  const outcome=renderTaskOutcome(week.key,next,props,()=>{done.disabled=false;prerequisite.hidden=true;});
  if(needsResult&&!practice)outcome.open=true;
  card.append(outcome);
  const row = el('div', 'today-actions');
  const open = openLink(next.url, 'Открыть материал');
  if (open) row.append(open);
  done.type = 'button';
  done.addEventListener('click', () => handlers.onWeeklyToggle(week.key, next.taskId));
  row.append(done);
  card.append(row,prerequisite);
  return card;
}

function weekList(model, props) {
  const { handlers } = props;
  const { week, tasks } = model;
  const box = el('section', 'route-week');
  box.dataset.currentWeek = week.key;
  box.append(el('h3', 'route-phase-title', `Эта неделя · ${model.doneCount} из ${tasks.length}`));
  const list = el('ul', 'route-week-list');
  for (const task of tasks) {
    const row = el('li', 'route-week-item');
    row.dataset.weekTask = task.taskId;
    const layout = el('div', task.done ? 'route-step is-done' : 'route-step');
    const check = el('input', 'route-check');
    check.type = 'checkbox';
    check.checked = task.done;
    check.id = `today-${task.taskId}`;
    check.addEventListener('change', () => handlers.onWeeklyToggle(week.key, task.taskId));
    const body = el('div', 'route-step-body');
    const display=taskLabel(task,props.routeState);
    const label = el('label', 'route-step-title', `${display.title} · ${task.minutes>0?`${task.minutes} мин`:'время не указано'}`);
    label.htmlFor = check.id;
    body.append(label, dayPicker(week, task, handlers));
    if(display.context)body.append(el('p','route-detail',`Работа: ${display.context}`));
    if(task.expected)body.append(el('p','route-detail',`Результат шага: ${task.expected}`));
    if(task.taskId!==model.next?.taskId)body.append(renderTaskOutcome(week.key, task, props));
    layout.append(check, body);
    row.append(layout);
    list.append(row);
  }
  box.append(list, el('p', 'route-detail', 'Минуты — время, отведённое в твоём плане недели.'));
  if(week.minutes<week.budget)box.append(el('p','route-detail',`В плане ${week.minutes} из ${week.budget} доступных минут. Следующий шаг работы появится после завершения текущего, если останется время и место в плане.`));
  if(week.minutes>week.budget)box.append(el('p','route-detail',`У отмеченных дел запланировано ${week.minutes} минут — больше нынешнего бюджета ${week.budget} минут. Новые сессии пока не добавлены.`));
  return box;
}

function levelBlock(model) {
  if (!model.levels.length) return null;
  const box = el('section', 'route-week');
  box.append(el('h3', 'route-phase-title', 'Твой уровень'));
  for (const level of model.levels) {
    const row = el('p', 'today-level');
    row.dataset.level = level.code;
    if (level.current != null && level.target != null) {
      row.append(el('strong', null, `${level.test}: ${level.current} → ${level.target}`));
    } else if (level.target != null) {
      row.append(el('strong', null, `${level.test}: ${level.recommended ? 'рекомендуют' : 'нужно'} ${level.target}`), ' · текущий балл не указан');
    } else {
      row.append(el('strong', null, `${level.test}`), ' · нужный балл программа не называет');
    }
    if (level.current != null && level.target != null && level.recommended) row.append(` · ${level.target} — рекомендация вуза`);
    if (level.daysLeft != null) row.append(` · на сдачу ${level.daysLeft} ${plural(level.daysLeft, 'день', 'дня', 'дней')}`);
    box.append(row);
  }
  return box;
}

function datesBlock(model) {
  if (!model.dates.length) return null;
  const box = el('section', 'route-week');
  box.append(el('h3', 'route-phase-title', 'Ближайшие даты'));
  const list = el('ul', 'route-week-list');
  for (const item of model.dates) {
    const row = el('li', 'route-week-item');
    row.append(el('strong', null, formatDate(item.date)), el('span', 'route-detail', ` · ${item.title} · ${item.note}`));
    list.append(row);
  }
  box.append(list);
  return box;
}

function applicationsBlock(model) {
  if (!model.applications.length) return null;
  const box = el('section', 'route-week');
  box.dataset.applications = '';
  box.append(el('h3', 'route-phase-title', 'Заявки'));
  const list = el('ul', 'route-week-list');
  for (const goal of model.applications) {
    const row = el('li', 'route-week-item');
    row.append(el('strong', null, goal.name),
      el('p', 'route-detail', GOAL_STATUSES.find(([code]) => code === goal.status)[1]),
      el('p', 'route-goal-meta', goal.line));
    list.append(row);
  }
  box.append(list);
  return box;
}

export function renderToday(root, props) {
  const { handlers, loading, route } = props;
  root.textContent = '';
  if (loading) {
    root.append(el('p', 'route-detail', 'Собираю план…'));
    return;
  }
  const model = todayModel(props);
  if (!route && !props.weekly?.week.tasks.length && !model.offerActions.length) {
    const hasWorks = Boolean(props.routeState?.portfolio?.experiences.length);
    const box = el('div', 'start-space');
    const statement = el('div', 'start-statement');
    statement.append(el('h2', null, 'Твои работы.\nТвой путь.'), el('p', null, 'Портфолио начинается с того, что тебе интересно. Развивай свои работы и готовь их к поступлению.'));
    const entry = el('section', 'start-entry');
    entry.append(el('h3', null, hasWorks?'Продолжим твой путь?':'С чего начнём?'), el('p', null, hasWorks?'Твои работы сохранены в «Моём пути». Открой нужную, чтобы доработать её или связать с программой.':'Выбери небольшую работу или сохрани то, что уже сделал. Программа поступления пока не нужна.'));
    const path=el('button','button',hasWorks?'Открыть мои работы':'Начать работу');path.type='button';path.addEventListener('click',hasWorks?handlers.onOpenRoute:handlers.onStartWork);entry.append(path);
    const choose = el('button', 'link-button', 'Сначала посмотреть программы →');
    choose.type = 'button';
    choose.addEventListener('click', handlers.onChooseGoals);
    entry.append(choose, el('p', 'start-note', 'Бесплатно, без регистрации. Записи остаются на этом устройстве.'));
    box.append(statement, entry);
    root.append(box);
    const map = el('section', 'path-explainer');
    map.setAttribute('aria-label', 'Как устроен Nerio');
    for (const [title, description, href] of [
      ['Работы', 'Пробуй, получай отзыв, дорабатывай. Сохраняй свой вклад и результат.', '#route'],
      ['Программы', 'Изучи условия и выбери, куда хочешь поступать.', '#programs'],
      ['Заявки', 'Собери материалы под конкретную цель и сохрани отправленную версию.', '#route/applications'],
    ]) { const item = el('a', null);item.href=href;item.append(el('h3', null, title), el('p', null, description));map.append(item); }
    root.append(map);
    return;
  }
  const head = el('header', 'today-head');
  if (model.nearest) {
    head.append(el('p', 'route-detail',
      `До подачи в ${shortName(model.nearest.name)} — ${model.daysToNearest} ${plural(model.daysToNearest, 'день', 'дня', 'дней')}`));
  }
  head.append(el('h2', 'today-title', 'Что сделать сегодня'));
  root.append(head);
  const offers=renderOfferActions(model.offerActions,props);if(offers)root.append(offers);
  const review = props.weekly ? renderWeekReview(props.weekly.review, handlers) : null;
  if (review) root.append(review);
  if (model.week?.tasks.length) root.append(nowCard(model, props));
  else if(!model.offerActions.length)root.append(el('p','route-detail','Дел в плане недели нет. Материалы и ответы доступны в «Моём пути».'));
  if (model.week?.tasks.length) {
    const week = el('details', 'today-more');
    week.append(el('summary', null, 'Вся неделя'), weekList(model, props));root.append(week);
  }
  if(props.weekly?.workBacklog)root.append(el('p','route-detail',`Шагов работ вне плана недели: ${props.weekly.workBacklog}. Проверь доступное время и выбранные дни; лишние работы можно поставить на паузу в «Моём пути».`));
  const reference = el('details', 'today-more');reference.append(el('summary', null, 'Уровень, даты и заявки'));
  for(const block of [levelBlock(model), datesBlock(model), applicationsBlock(model)])if(block)reference.append(block);
  if(reference.children.length>1)root.append(reference);
  const more = el('button', 'button button-quiet', 'Открыть весь путь');
  more.type = 'button';
  more.addEventListener('click', handlers.onOpenRoute);
  root.append(more);
}
