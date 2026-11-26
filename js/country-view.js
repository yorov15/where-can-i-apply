// Страница страны и список стран. Всё на уже проверенных данных программ:
// сроки, покрытие, экзамены и годы школы. Визы, стоимости жизни и мест
// сдачи экзаменов в Таджикистане в данных пока нет
// (docs/PLAN-DATA-AND-SITE-2026-11-26.md, 2.4–2.5), и страница так и пишет.
import { evaluate } from './verdict.js';
import { deadlineState } from './lib/deadline.js';
import { formatDate, dateTile, plural, timeLeft, joinAnd } from './lib/format.js';
import { countryName } from './filter.js';
import { testName } from './wording.js';
import { groupRows, makeNode as el } from './render.js';

export const countryHref = (code) => `#country/${encodeURIComponent(code)}`;

// Строка подразделов «Каталога»: та же на списке программ, странах и конкурсах.
export function catalogNav(current) {
  const nav = el('nav', 'path-nav');
  nav.setAttribute('aria-label', 'Разделы каталога');
  for (const [key, text, href] of [['programs', 'Программы', '#programs'], ['countries', 'Страны', '#countries'], ['opportunities', 'Конкурсы и олимпиады', 'opportunities.html']]) {
    const link = el('a', null, text);
    link.href = href;
    if (key === current) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  return nav;
}

export function countryList(programs) {
  const count = new Map();
  for (const program of programs) {
    if (program.hostCountry) count.set(program.hostCountry, (count.get(program.hostCountry) ?? 0) + 1);
  }
  return [...count].map(([code, total]) => ({ code, name: countryName(code), total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ru'));
}

// Обе шкалы TOEFL для сводки — один экзамен: человеку важно, какой сдавать.
const family = (test) => (test.startsWith('TOEFL') ? 'TOEFL' : testName(test));
const tests = (rule) => (Array.isArray(rule?.anyOf) ? rule.anyOf.map((option) => option?.test).filter((test) => typeof test === 'string') : []);

// Чистая функция: тесты читают её, а не DOM.
export function countryStats(programs, code, today) {
  const list = programs.filter((program) => program.hostCountry === code);
  const coverage = { tuition: 0, living: 0, travel: 0, unknown: 0 };
  const exams = new Map();
  const school = { free: 0, eleven: 0, twelve: 0, unclear: 0 };
  let ahead = 0;
  let nearest = null;
  let noLanguage = 0;
  for (const program of list) {
    const c = program.coverage ?? {};
    for (const key of ['tuition', 'living', 'travel']) if (c[key] === true) coverage[key] += 1;
    if ([c.tuition, c.living, c.travel].some((value) => value == null)) coverage.unknown += 1;
    const state = deadlineState(program.deadline, today);
    if (state !== 'closed' && state !== 'unknown') {
      ahead += 1;
      if (!nearest || program.deadline.closes < nearest.deadline.closes) nearest = program;
    }
    const language = program.eligibility?.language;
    const exam = program.eligibility?.exam;
    if (language?.noLimit) noLanguage += 1;
    // SAT «по желанию» или «вместо другого» условием не считаем.
    const named = [...tests(language), ...(exam?.optional || exam?.alternative ? [] : tests(exam))];
    for (const name of new Set(named.map(family))) exams.set(name, (exams.get(name) ?? 0) + 1);
    const years = program.eligibility?.schoolYears;
    if (years?.noLimit) school.free += 1;
    else if (Number.isInteger(years?.min)) school[years.min <= 11 ? 'eleven' : 'twelve'] += 1;
    else school.unclear += 1;
  }
  return {
    code, name: countryName(code), total: list.length, list, ahead, nearest, coverage, noLanguage, school,
    exams: [...exams].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  };
}

const programs_ = (n) => plural(n, 'программа', 'программы', 'программ');
const inPrograms = (n) => plural(n, 'программе', 'программах', 'программах');

export function coverageText({ coverage: c, total }) {
  const base = `Учёбу покрывают ${c.tuition} из ${total}, жильё — ${c.living}, перелёт — ${c.travel}.`;
  return c.unknown ? `${base} У ${c.unknown} ${plural(c.unknown, 'программы', 'программ', 'программ')} что-то из этого не указано.` : base;
}

export function examText({ exams, noLanguage }) {
  const named = exams.slice(0, 5).map(([name, count]) => `${name} — ${count}`);
  const head = named.length ? `Условием называют: ${joinAnd(named)}.` : 'Экзамен условием не называет ни одна программа.';
  return noLanguage ? `${head} Сертификат по языку не нужен в ${noLanguage} ${inPrograms(noLanguage)}.` : head;
}

export function schoolText({ school }) {
  const parts = [
    [school.free, 'число лет школы не ограничивают'],
    [school.eleven, 'хватит 11 лет'],
    [school.twelve, 'нужно 12 лет'],
    [school.unclear, 'не сказано или решает вуз'],
  ].filter(([count]) => count).map(([count, text]) => `${text} — ${count}`);
  const line = `${parts.join('; ')}.`;
  return line.charAt(0).toUpperCase() + line.slice(1);
}

// Без анкеты вердиктов нет, порядок — по сроку: сначала те, где срок впереди,
// потом без даты, в конце закрытые.
const RANK = { closed: 2, unknown: 1 };
export const byDate = (a, b) => (RANK[a.deadline] ?? 0) - (RANK[b.deadline] ?? 0)
  || (a.program.deadline?.closes ?? '').localeCompare(b.program.deadline?.closes ?? '');

function programLine(row, today) {
  const { program } = row;
  const closes = program.deadline?.closes ?? null;
  const item = el('li');
  const line = el('a', 'agenda-item');
  line.href = `#program/${encodeURIComponent(program.id)}`;
  const tile = closes ? dateTile(closes) : { day: '—', month: '' };
  const date = el('span', 'agenda-date');
  date.setAttribute('aria-hidden', 'true');
  date.append(el('span', 'agenda-day', tile.day), el('span', 'agenda-month', tile.month));
  const meta = el('span', 'agenda-meta');
  const state = row.deadline;
  meta.append(el('span', 'agenda-when', state === 'unknown' ? 'дату не назвали' : state === 'closed' ? 'приём закрыт' : `до ${formatDate(closes)}`));
  const left = state === 'closed' || state === 'unknown' ? null : timeLeft(today, closes);
  if (left) meta.append(el('span', 'agenda-left', left));
  line.append(date, el('span', 'agenda-name', program.name?.ru ?? program.id), meta);
  item.append(line);
  return item;
}

function heading(title, lead) {
  const page = el('header', 'page-heading');
  page.append(el('h2', null, title), el('p', null, lead));
  return page;
}

// props: { code, programs, profile, guest, today, loading }.
export function renderCountry(root, { code, programs, profile, guest, today, loading }) {
  root.textContent = '';
  root.append(catalogNav('countries'));
  const stats = countryStats(programs, code, today);
  if (!stats.total) {
    root.append(el('p', 'empty', loading ? 'Загружаю программы…' : 'Программ из этой страны на сайте пока нет.'));
    return;
  }
  root.append(heading(stats.name, `${stats.total} ${programs_(stats.total)} на сайте. Условия и сроки — с официальных страниц.`));
  const facts = el('dl', 'facts');
  const nearest = stats.nearest
    ? `${formatDate(stats.nearest.deadline.closes)} — ${stats.nearest.name?.ru ?? stats.nearest.id}`
    : 'Открытых сроков сейчас нет';
  for (const [name, value] of [['Срок впереди', `у ${stats.ahead} из ${stats.total}`], ['Ближайший срок', nearest], ['Всё покрывают', `${stats.list.filter((p) => p.coverage?.tuition && p.coverage?.living && p.coverage?.travel).length} из ${stats.total}`]]) {
    const cell = el('div');
    cell.append(el('dt', null, name), el('dd', null, value));
    facts.append(cell);
  }
  root.append(facts);
  for (const [title, text] of [['Что покрывают стипендии', coverageText(stats)], ['Экзамены', examText(stats)], ['Годы школы', schoolText(stats)]]) {
    root.append(el('h3', 'program-section', title), el('p', null, text));
  }
  root.append(el('p', 'empty', 'Визу, стоимость жизни и где сдавать экзамены из Таджикистана сайт пока не собрал. Их сверяй на сайтах посольства и программы.'));

  const rows = stats.list.map((program) => ({
    program, verdict: evaluate(profile, program, today), deadline: deadlineState(program.deadline, today),
  }));
  const groups = guest ? [{ title: `Программы (${rows.length})`, rows: rows.sort(byDate) }]
    : groupRows(rows).map((group) => ({ title: `${group.title} (${group.rows.length})`, rows: group.rows }));
  for (const group of groups) {
    root.append(el('h3', 'program-section', group.title));
    const list = el('ul', 'agenda-list');
    for (const row of group.rows) list.append(programLine(row, today));
    root.append(list);
  }
}

export function renderCountries(root, { programs, loading }) {
  root.textContent = '';
  root.append(catalogNav('countries'));
  const countries = countryList(programs);
  if (!countries.length) {
    root.append(el('p', 'empty', loading ? 'Загружаю программы…' : 'Программ пока нет.'));
    return;
  }
  root.append(heading('Страны', `${countries.length} ${plural(countries.length, 'страна', 'страны', 'стран')}. В каждой — что покрывают стипендии, какие экзамены просят и все программы страны.`));
  const nav = el('nav', 'link-grid');
  nav.setAttribute('aria-label', 'Страны');
  for (const country of countries) {
    const link = el('a', null, `${country.name} — ${country.total}`);
    link.href = countryHref(country.code);
    nav.append(link);
  }
  root.append(nav);
}
