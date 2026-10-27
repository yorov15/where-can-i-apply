// Экран «Сегодня»: одно дело сейчас, неделя, английский «сейчас → нужно» и
// ближайшие даты. Ничего не считается заново: данные приходят из движка
// маршрута (route.js), недельного плана (weekly.js) и плана экзамена
// (exam-plan.js). Здесь только выбор того, что показать первым.
import { formatDate, plural, daysBetween } from './lib/format.js';
import { safeHttpUrl } from './lib/url.js';
import { renderWeekReview } from './weekly-view.js';

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
export function todayModel({ route, weekly, study, today }) {
  const open = (route?.goals ?? [])
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

  return {
    nearest,
    daysToNearest: nearest ? daysBetween(today, nearest.deadline.closes) : null,
    week, tasks, next, doneCount,
    doneMinutes: tasks.filter(task => task.done).reduce((sum, task) => sum + task.minutes, 0),
    levels,
    dates: dates.slice(0, 4),
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

function nowCard(model, handlers) {
  const { next, week } = model;
  const card = el('section', 'today-now');
  if (!next) {
    card.append(el('p', 'route-detail', 'Дела на эту неделю закончились.'));
    card.append(el('p', null, week?.tasks.length ? 'Всё из плана недели сделано.' : 'Дел на эту неделю пока нет. Добавь программы в «Мой путь».'));
    return card;
  }
  card.append(el('p', 'route-detail', `Сейчас · ${next.minutes} мин`));
  card.append(el('h3', 'today-now-title', next.title));
  const row = el('div', 'today-actions');
  const open = openLink(next.url, 'Открыть материал');
  if (open) row.append(open);
  const done = el('button', 'button button-quiet', 'Готово');
  done.type = 'button';
  done.addEventListener('click', () => handlers.onWeeklyToggle(week.key, next.taskId));
  row.append(done);
  card.append(row);
  return card;
}

function weekList(model, handlers) {
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
    const label = el('label', 'route-step-title', `${task.title} · ${task.minutes} мин`);
    label.htmlFor = check.id;
    body.append(label, dayPicker(week, task, handlers));
    layout.append(check, body);
    row.append(layout);
    list.append(row);
  }
  box.append(list, el('p', 'route-detail', 'Минуты — время, которое ты выбрал на подготовку. Это не обещание роста балла.'));
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

export function renderToday(root, props) {
  const { handlers, loading, route } = props;
  root.textContent = '';
  if (loading) {
    root.append(el('p', 'route-detail', 'Собираю план…'));
    return;
  }
  if (!route) {
    const box = el('div', 'route-empty');
    box.append(el('p', null, 'Пока нет целей. Выбери программы, и здесь появится, что делать сегодня.'));
    const choose = el('button', 'button', 'Выбрать программы');
    choose.type = 'button';
    choose.addEventListener('click', handlers.onChooseGoals);
    box.append(choose);
    root.append(box);
    return;
  }
  const model = todayModel(props);
  const head = el('header', 'today-head');
  if (model.nearest) {
    head.append(el('p', 'route-detail',
      `До подачи в ${shortName(model.nearest.name)} — ${model.daysToNearest} ${plural(model.daysToNearest, 'день', 'дня', 'дней')}`));
  }
  head.append(el('h2', 'today-title', 'Что сделать сегодня'));
  root.append(head);
  const review = props.weekly ? renderWeekReview(props.weekly.review, handlers) : null;
  if (review) root.append(review);
  if (model.week) root.append(nowCard(model, handlers));
  if (model.week?.tasks.length) root.append(weekList(model, handlers));
  const level = levelBlock(model);
  if (level) root.append(level);
  const dates = datesBlock(model);
  if (dates) root.append(dates);
  const more = el('button', 'button button-quiet', 'Открыть весь путь');
  more.type = 'button';
  more.addEventListener('click', handlers.onOpenRoute);
  root.append(more);
}
