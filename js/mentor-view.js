// Наставник недели и вкладка Nero в «Моём пути» (#route/nero). Наставник
// раскладывает дела недели по дням с «зачем» и «первым шагом»; сами дела,
// минуты и сроки те же, что на «Сегодня»: ответ модели прошёл проверку на
// сервере, а дни ставятся только по кнопке человека. На «Сегодня» от
// наставника осталась одна строка-ссылка сюда.
import { formatDate } from './lib/format.js';
import { statusOf, isSent } from './goal-status.js';
import { MENTOR_ON } from './config.js';
import { neroChat } from './nero-chat-view.js';

export const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const NERO_HASH = '#route/nero';
const shortName = (name) => String(name ?? '').split(' — ')[0];
const dayName = (day) => DAYS[(new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

// Ближайшие даты: выбранные дни дел, последний день сдать экзамен, сроки
// подачи. Их видит «Сегодня» («Уровень и даты») и получает наставник.
export function weekDates({ route, routeState, weekly, study, today }) {
  const dates = [];
  for (const task of weekly?.week?.tasks ?? []) {
    if (task.day && task.day >= today && !task.done) dates.push({ date: task.day, title: task.title, note: 'Выбранный день' });
  }
  for (const { plan, track } of study?.active ?? []) {
    if (plan.lastDate && plan.lastDate >= today) {
      dates.push({ date: plan.lastDate, title: `Последний день сдать ${track.name || plan.test}`, note: 'Расчёт Nerio от срока подачи' });
    }
  }
  const open = (route?.goals ?? [])
    .filter(goal => !isSent(statusOf(routeState, goal.id).status))
    .filter(goal => goal.deadline?.closes && goal.deadline.state !== 'closed' && goal.deadline.closes >= today)
    .sort((a, b) => a.deadline.closes.localeCompare(b.deadline.closes));
  for (const goal of open) {
    dates.push({
      date: goal.deadline.closes,
      title: `Подача в ${shortName(goal.name)}`,
      note: goal.deadline.confidence === 'confirmed' ? 'Подтверждённый срок' : 'Ожидаемый срок',
    });
  }
  return dates.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
}

// model — { week, tasks, dates }: неделя из weekly.js и даты из weekDates.
export function mentorBlock(model, props) {
  const { mentor, handlers } = props;
  const open = model.tasks.filter((task) => !task.done);
  if (!mentor || !open.length) return null;
  const box = el('section', 'route-week');
  box.dataset.mentor = '';
  box.append(el('h3', 'route-phase-title', 'Nero, ИИ-наставник'));
  const status = el('p', 'route-detail');
  status.setAttribute('role', 'status');
  status.tabIndex = -1;
  const ask = el('button', 'button button-quiet', mentor.busy ? 'Nero думает, до минуты…' : mentor.plan ? 'Спросить заново' : 'Спросить Nero');
  ask.type = 'button';
  ask.dataset.mentorAsk = '';
  ask.disabled = mentor.busy || mentor.left <= 0;
  ask.addEventListener('click', () => handlers.onMentorAsk(model.week, model.dates));
  if (!mentor.plan) {
    box.append(el('p', 'route-detail', 'Разложит дела этой недели по дням и подскажет, с чего начать каждое. Дела и сроки считает сайт, Nero их не меняет.'), ask);
  } else {
    box.append(el('p', null, mentor.plan.focus));
    const list = el('ul', 'route-week-list');
    // По порядку дней недели: модель может прислать их вперемешку.
    for (const item of [...mentor.plan.days].sort((a, b) => a.day.localeCompare(b.day))) {
      const row = el('li', 'route-week-item');
      row.append(el('p', 'today-tag', `${dayName(item.day)} · ${formatDate(item.day)}`),
        el('p', 'route-step-title', item.title), el('p', 'route-detail', item.why));
      const first = el('p');
      first.append(el('b', null, 'Первые 15 минут: '), item.firstStep);
      row.append(first);
      list.append(row);
    }
    box.append(list);
    const row = el('div', 'today-actions');
    const current = new Map(model.tasks.map((task) => [task.taskId, task.day ?? '']));
    if (mentor.plan.days.some((item) => current.get(item.taskId) !== item.day)) {
      const apply = el('button', 'button', 'Поставить эти дни');
      apply.type = 'button';
      apply.addEventListener('click', () => handlers.onMentorApply(model.week.key, mentor.plan.days));
      row.append(apply);
    } else status.textContent = 'Дни из совета стоят в плане недели.';
    row.append(ask);
    box.append(row);
  }
  if (mentor.error) status.textContent = mentor.error;
  else if (mentor.left <= 0) status.textContent = 'На сегодня вопросы к Nero закончились.';
  box.append(status);
  return box;
}

// Строка на «Сегодня» вместо блока наставника.
export function neroLink(model, props) {
  if (!props.mentor || !model.tasks.some((task) => !task.done)) return null;
  const link = el('a', 'link-button', 'Nero разложит неделю по дням →');
  link.href = NERO_HASH;
  return link;
}

const HELPS = [
  ['У шага в «Подготовке»', '#route/preparation', 'Кнопка «Спросить Nero» под несделанным шагом: что это за шаг и как его сделать.'],
  ['Проверка черновика эссе', '#route/preparation', 'В «Подготовке», блок «Эссе и мотивационные письма»: вставь черновик и нажми «Проверить черновик».'],
];

// Вкладка Nero: наставник недели во всю ширину, чат и куда ещё зовут Nero.
export function renderNero(root, props) {
  const week = props.weekly?.week ?? null;
  const model = { week, tasks: week?.tasks ?? [], dates: weekDates(props) };
  const page = el('div');
  page.dataset.nero = '';
  const mentor = week ? mentorBlock(model, props) : null;
  if (mentor) page.append(mentor);
  else {
    const box = el('section', 'route-week');
    // Пока план собирается, блока наставника нет: «Разложи мою неделю» из панели ждёт его.
    if (!props.loading) box.dataset.mentor = '';
    const why = props.loading ? 'Собираю план…'
      : !MENTOR_ON ? 'Наставник недели сейчас выключен. Чат и кнопки у шага работают.'
        : model.tasks.length ? 'На этой неделе все дела уже сделаны. Nero разложит новые, когда они появятся.'
          : 'Nero разложит дела недели по дням, когда в плане будут дела. Выбери программы — дела появятся на «Сегодня».';
    box.append(el('h3', 'route-phase-title', 'Nero, ИИ-наставник'), el('p', 'route-detail', why));
    page.append(box);
  }

  const chat = el('section', 'route-week');
  chat.append(el('h3', 'route-phase-title', 'Спросить Nero'),
    el('p', 'route-detail', 'Свой вопрос о плане, сроках или программе. Nero объясняет то, что посчитал сайт, и не меняет план.'),
    neroChat({ context: () => ({ screen: 'path', goalIds: props.routeState?.goals ?? [], week, today: props.today }) }));
  page.append(chat);

  const more = el('section', 'route-week');
  more.append(el('h3', 'route-phase-title', 'Ещё Nero помогает'));
  const list = el('ul', 'route-week-list');
  for (const [title, href, text] of HELPS) {
    const item = el('li', 'route-week-item');
    const link = el('a', 'link-button', title);
    link.href = href;
    item.append(link, el('p', 'route-detail', text));
    list.append(item);
  }
  more.append(list);
  page.append(more);
  root.append(page);
}
