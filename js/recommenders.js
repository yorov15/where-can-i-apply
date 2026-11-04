// Рекомендательные письма: где программа их просит, кого ты просишь и когда.
// Чистые функции без DOM. Экран — recommenders-view.js.
//
// Детектор читает пункты условий с kind «documents» — тот же список, из
// которого собирается раздел документов. Признак письма берём из русского
// текста пункта (его писали мы, по цитате), а цитату показываем дословно.
// Число писем — только если оно стоит в самой цитате.
import { formatDate, daysBetween } from './lib/format.js';
import { statusOf, isSent } from './goal-status.js';

export const RECOMMENDER_STATUSES = [
  ['planned', 'Ещё не попросил'],
  ['asked', 'Попросил'],
  ['agreed', 'Согласился'],
  ['sent', 'Отправил письмо'],
];
export const DEFAULT_LEAD_WEEKS = 6;
export const MAX_LEAD_WEEKS = 20;
export const MAX_RECOMMENDERS = 12;
export const REMIND_DAYS = 7;
const MAX_GOALS = 8;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeKey = key => typeof key === 'string' && key.length > 0 && key.length <= 200
  && !['__proto__', 'constructor', 'prototype'].includes(key);
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const line = (value, max) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const isStatus = code => RECOMMENDER_STATUSES.some(([id]) => id === code);
const shift = (iso, days) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const shortName = name => String(name ?? '').split(' — ')[0].trim();

// ——— детектор ———

// Слово о письме. «Рекомендаци» ловит и «рекомендация», и «рекомендации».
const LETTER = /рекомендательн|рекомендаци|референс/i;
// Не письмо о тебе: «по рекомендации вуза/посольства», «настоятельная
// рекомендация» сдать экзамен, «оценивают наравне с … рекомендациями».
const NOT_LETTER = [/саморекомендац\S*/gi, /по\s+рекомендации\s+\S+/gi, /настоятельн\S*\s+рекомендаци\S*/gi, /наравне\s+с[^.;]*/gi];
const NOT_REQUIRED = /не\s+требуются|не\s+используются|не\s+рассматриваются|просят\s+не\s+присылать/i;
// «Вторую можно добавить по желанию» — первое письмо всё равно нужно.
const EXTRA_OPTIONAL = /(?:вторую|третью|ещё\s+одну)[^.;]{0,40}(?:по\s+желанию|можно)/i;
const CONDITIONAL = /только\s+(?:при|для|если)|для\s+стипендии|если\s+потребуется|может\s+(?:её\s+|ее\s+)?(?:потребовать|запросить)|некоторые\s+направления|для\s+отдельных\s+программ|для\s+school\s+of|для\s+пути\s+без|отдельным\s+абитуриентам/i;
const OPTIONAL = /по\s+желанию|необязательн|не\s+обязательн|на\s+выбор|если\s+есть|при\s+наличии|если\s+применимо|добровольно|может\s+дополнительно|можно\s+добавить|дополнительн\S*\s+рекомендаци|прочие\s+документы/i;
const QUOTE_MENTIONS = /recommend|referee|reference|teacher\s+evaluation|推荐|推薦/i;

const NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };
const NOUN = String.raw`(?:letters?\s+of\s+(?:recommendation|reference)|(?:recommendation|reference)\s+letters?|teacher\s+evaluations?|recommendations?|references?|referees?|recommenders?)\b`;
const WORD = String.raw`(?:a|an|one|two|three|four|five)`;
// «two recommendation letters», «one counselor recommendation», «up to two …».
const BEFORE = new RegExp(String.raw`\b(at\s+least\s+|up\s+to\s+)?(${WORD})\s+((?:[\w()/-]+\s+){0,3}?)${NOUN}`, 'gi');
// «Teacher recommendations: Two are required», «… Please request at least two.»
const AFTER = new RegExp(String.raw`${NOUN}[^.]{0,40}?\b(at\s+least\s+|up\s+to\s+)?(one|two|three|four|five)(?=\s+(?:are|is)\b|\s*\.|\s*$)`, 'gi');
const PAREN = new RegExp(String.raw`${NOUN}\s*\((\d)\)`, 'gi');
const CHINESE = /推荐信\s*(\d|一|二|两)\s*份/;

const modifier = text => /least/i.test(text ?? '') ? 'atLeast' : /up/i.test(text ?? '') ? 'upTo' : 'exact';

// Число писем из одной цитаты. Цифры без скобок не берём: в списках
// документов это номер пункта («12 Letter of Recommendation»).
export function countInQuote(quote) {
  const text = String(quote ?? '');
  const chinese = text.match(CHINESE);
  if (chinese) return { n: { 一: 1, 二: 2, 两: 2 }[chinese[1]] ?? Number(chinese[1]), mod: 'exact' };
  const totals = [], parts = [];
  for (const match of text.matchAll(PAREN)) totals.push({ n: Number(match[1]), mod: 'exact' });
  for (const match of text.matchAll(AFTER)) totals.push({ n: NUMBERS[match[2].toLowerCase()], mod: modifier(match[1]) });
  for (const match of text.matchAll(BEFORE)) {
    const item = { n: NUMBERS[match[2].toLowerCase()], mod: modifier(match[1]) };
    // Без уточнения («two recommendation letters») — это итог; с уточнением
    // («one counselor recommendation and two teacher …») — части итога.
    const qualified = Boolean(match[3].trim());
    // «an essay or recommendation letters» — не число писем.
    if (qualified && /^an?$/i.test(match[2])) continue;
    (qualified ? parts : totals).push(item);
  }
  const n0 = totals.filter(item => item.n > 0 && item.n <= 5);
  if (n0.length) return n0.reduce((best, item) => item.n > best.n ? item : best);
  const p0 = parts.filter(item => item.n > 0 && item.n <= 5);
  if (!p0.length) return null;
  return { n: p0.reduce((sum, item) => sum + item.n, 0), mod: p0.some(item => item.mod === 'upTo') ? 'upTo' : p0.some(item => item.mod === 'atLeast') ? 'atLeast' : 'exact' };
}

function needOf(text) {
  if (NOT_REQUIRED.test(text)) return 'notRequired';
  if (OPTIONAL.test(text) && !EXTRA_OPTIONAL.test(text)) return 'optional';
  if (CONDITIONAL.test(text)) return 'conditional';
  return 'required';
}

// Куда отправлять письмо — только если это сказано в тексте пункта.
const CHANNELS = [
  ['commonapp', /common\s*app/i],
  ['ucas', /ucas/i],
  ['mail', /почтой/i],
  ['sealed', /запечатан/i],
  ['portal', /онлайн|через\s+(?:онлайн-)?систем|по\s+ссылке|через\s+портал|(?<!не\s)загружа/i],
];

export function isLetterCondition(condition, kinds = ['documents']) {
  if (!kinds.includes(condition?.kind) || typeof condition.ru !== 'string') return false;
  const text = NOT_LETTER.reduce((rest, pattern) => rest.replace(pattern, ' '), condition.ru);
  return LETTER.test(text);
}

// Запасной путь: письмо названо только в общем пункте «нужно» или «шаги».
// Берём его, лишь когда о письме говорит и сама цитата.
const fallback = condition => isLetterCondition(condition, ['must', 'steps']) && QUOTE_MENTIONS.test(condition.evidence ?? '');

// Что программа говорит о рекомендательных письмах, или null, если ничего.
// need: required → conditional → optional → notRequired (по самому строгому пункту).
export function detectRecommendations(program) {
  const conditions = program?.textConditions ?? [];
  let picked = conditions.filter(condition => isLetterCondition(condition));
  if (!picked.length) picked = conditions.filter(fallback);
  const items = picked.map(condition => {
    const count = countInQuote(condition.evidence);
    return { ru: condition.ru, evidence: typeof condition.evidence === 'string' ? condition.evidence : '',
      need: needOf(condition.ru), count, quoteMentions: QUOTE_MENTIONS.test(condition.evidence ?? '') };
  });
  if (!items.length) return null;
  const order = ['required', 'conditional', 'optional', 'notRequired'];
  const need = order.find(code => items.some(item => item.need === code));
  // Общее число — только когда каждый обязательный пункт назвал своё число.
  // Иначе «2» из одного пункта выглядело бы итогом, а консультант из другого
  // пункта потерялся бы.
  const main = items.filter(item => item.need === need);
  const count = main.every(item => item.count) && need !== 'notRequired'
    ? main.length === 1 ? main[0].count : { n: main.reduce((sum, item) => sum + item.count.n, 0), mod: main.some(item => item.count.mod !== 'exact') ? 'atLeast' : 'exact' }
    : null;
  const text = items.filter(item => item.need !== 'notRequired').map(item => item.ru).join(' ');
  let channels = CHANNELS.filter(([, pattern]) => pattern.test(text)).map(([code]) => code);
  // Common App и UCAS — сами онлайн-системы; третий способ к ним не добавляем.
  if (channels.includes('commonapp') || channels.includes('ucas')) channels = channels.filter(code => code !== 'portal');
  return { need, count, items, channels };
}

export function countLine(count) {
  if (!count) return null;
  if (count.mod === 'upTo') return `до ${count.n} ${count.n === 1 ? 'письма' : 'писем'}`;
  const word = count.n === 1 ? 'письмо' : count.n < 5 ? 'письма' : 'писем';
  return `${count.mod === 'atLeast' ? 'минимум ' : ''}${count.n} ${word}`;
}

export function needLine(found) {
  if (!found) return 'В условиях рекомендаций не нашли. Сверь на сайте программы.';
  const count = countLine(found.count);
  if (found.need === 'notRequired') return 'Программа пишет, что рекомендации не нужны.';
  if (found.need === 'optional') return count ? `По желанию: ${count}.` : 'По желанию.';
  if (found.need === 'conditional') return count ? `Только в отдельных случаях: ${count}. Смотри условие ниже.` : 'Только в отдельных случаях. Смотри условие ниже.';
  return count ? `Нужно ${count}.` : 'Нужны. Сколько — смотри условие ниже: в цитате числа нет.';
}

// ——— хранение ———

function person(value) {
  if (!object(value) || !safeKey(value.id)) return null;
  const name = line(value.name, 120);
  if (!name) return null;
  const seen = new Set();
  const goals = (Array.isArray(value.goals) ? value.goals : []).filter(item => object(item) && safeKey(item.goalId)
    && !seen.has(item.goalId) && seen.add(item.goalId)).slice(0, MAX_GOALS)
    .map(item => ({ goalId: item.goalId, status: isStatus(item.status) ? item.status : 'planned' }));
  const entry = { id: value.id, name, role: line(value.role, 120), askedOn: day(value.askedOn) ? value.askedOn : null, goals };
  const sheet = normalizeSheet(value.sheet);
  if (sheet) entry.sheet = sheet;
  return entry;
}

// ——— шпаргалка для учителя ———
// Ответы ученика, общие для человека (не для программы). Каждое поле
// необязательное; пустые не храним, совсем пустую шпаргалку — тоже.
export const SHEET_MAX = 300;
export const SHEET_FIELDS = ['study', 'quality1', 'quality2', 'quality3', 'proud', 'more'];
export const sheetLength = value => Array.from(String(value ?? '')).length;

// Переносы строк оставляем (их ставит человек), лишние пробелы и пустые
// строки убираем. Слишком длинное обрезаем по знакам, а не выбрасываем.
function sheetText(value) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\r\n?/g, '\n').split('\n').map(part => part.replace(/[ \t\f\v\u00a0]+/g, ' ').trim())
    .filter(Boolean).join('\n');
  return Array.from(text).slice(0, SHEET_MAX).join('').trim();
}

export function normalizeSheet(value) {
  if (!object(value)) return null;
  const sheet = {};
  for (const field of SHEET_FIELDS) { const text = sheetText(value[field]); if (text) sheet[field] = text; }
  return Object.keys(sheet).length ? sheet : null;
}
export const sheetFilled = sheet => Boolean(normalizeSheet(sheet));

// input — ответы формы целиком; пустые поля стирают прежние ответы.
export function setRecommenderSheet(state, id, input) {
  const section = recommendersOf(state);
  const entry = section.people.find(item => item.id === id);
  if (!entry || !object(input)) return null;
  const next = { ...entry };
  const sheet = normalizeSheet(input);
  if (sheet) next.sheet = sheet; else delete next.sheet;
  return withSection(state, { ...section, people: section.people.map(item => item.id === id ? next : item) });
}

// Раздел мягкий: испорченную запись отбрасываем, а не весь маршрут — иначе
// одна строка в файле стёрла бы цели и работы при загрузке.
export function normalizeRecommenders(value) {
  if (!object(value)) return null;
  const ids = new Set();
  const people = (Array.isArray(value.people) ? value.people : []).map(person)
    .filter(item => item && !ids.has(item.id) && ids.add(item.id)).slice(0, MAX_RECOMMENDERS);
  const section = { people };
  if (Number.isInteger(value.leadWeeks) && value.leadWeeks >= 1 && value.leadWeeks <= MAX_LEAD_WEEKS && value.leadWeeks !== DEFAULT_LEAD_WEEKS) section.leadWeeks = value.leadWeeks;
  return people.length || section.leadWeeks ? section : null;
}

export function recommendersOf(state) {
  return normalizeRecommenders(state?.recommenders) ?? { people: [] };
}
export const leadWeeksOf = state => recommendersOf(state).leadWeeks ?? DEFAULT_LEAD_WEEKS;

function withSection(state, section) {
  const next = { ...state };
  const clean = normalizeRecommenders(section);
  if (clean) next.recommenders = clean; else delete next.recommenders;
  return next;
}

// Новый или изменённый рекомендатель: { id, name, role, goalIds }. У целей,
// которые уже были, статус сохраняется; новые — «ещё не попросил».
// null — если ввод не годится.
export function saveRecommender(state, input) {
  const section = recommendersOf(state);
  const old = section.people.find(item => item.id === input?.id);
  const goalIds = Array.isArray(input?.goalIds) ? input.goalIds : [];
  const entry = person({ ...old, id: input?.id, name: input?.name, role: input?.role,
    goals: goalIds.map(goalId => old?.goals.find(item => item.goalId === goalId) ?? { goalId, status: 'planned' }) });
  if (!entry) return null;
  if (!old && section.people.length >= MAX_RECOMMENDERS) return null;
  const people = old ? section.people.map(item => item.id === entry.id ? entry : item) : [...section.people, entry];
  return withSection(state, { ...section, people });
}

export function removeRecommender(state, id) {
  const section = recommendersOf(state);
  return withSection(state, { ...section, people: section.people.filter(item => item.id !== id) });
}

// Статус по одной цели. «Попросил» и дальше без даты просьбы — ставим сегодня.
export function setRecommenderStatus(state, id, goalId, status, today) {
  const section = recommendersOf(state);
  if (!isStatus(status) || !day(today)) return null;
  const entry = section.people.find(item => item.id === id);
  if (!entry || !entry.goals.some(goal => goal.goalId === goalId)) return null;
  const goals = entry.goals.map(goal => goal.goalId === goalId ? { ...goal, status } : goal);
  const askedOn = entry.askedOn ?? (status === 'planned' ? null : today);
  return withSection(state, { ...section, people: section.people.map(item => item.id === id ? { ...entry, goals, askedOn } : item) });
}

// «Попросил» сразу по всем целям, где ещё не просил (кнопка на «Сегодня»).
export function markAsked(state, id, today) {
  const section = recommendersOf(state);
  const entry = section.people.find(item => item.id === id);
  if (!entry || !day(today)) return null;
  const goals = entry.goals.map(goal => goal.status === 'planned' ? { ...goal, status: 'asked' } : goal);
  return withSection(state, { ...section, people: section.people.map(item => item.id === id ? { ...entry, goals, askedOn: entry.askedOn ?? today } : item) });
}

export function setAskedOn(state, id, date) {
  const section = recommendersOf(state);
  if (date !== '' && !day(date)) return null;
  const entry = section.people.find(item => item.id === id);
  if (!entry) return null;
  return withSection(state, { ...section, people: section.people.map(item => item.id === id ? { ...entry, askedOn: date || null } : item) });
}

export function setLeadWeeks(state, weeks) {
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > MAX_LEAD_WEEKS) return null;
  const section = recommendersOf(state);
  return withSection(state, { ...section, leadWeeks: weeks });
}

// ——— сроки ———

// Наш совет: попросить за N недель до срока подачи. Не требование программы.
export function askByDate(closes, weeks = DEFAULT_LEAD_WEEKS) {
  return day(closes) && Number.isInteger(weeks) ? shift(closes, -7 * weeks) : null;
}

const openGoal = (goal, state, today) => goal?.deadline?.closes && goal.deadline.state !== 'closed'
  && goal.deadline.closes >= today && !isSent(statusOf(state, goal.id).status);

// Дела для «Сегодня»: одно на человека, которого ещё не попросил, если до
// нашей даты «попроси до» неделя или меньше (или она уже прошла).
export function recommenderActions(state, goals, today) {
  if (!day(today)) return [];
  const weeks = leadWeeksOf(state);
  const byId = new Map((goals ?? []).map(goal => [goal.id, goal]));
  return recommendersOf(state).people.flatMap(entry => {
    const pending = entry.goals.filter(item => item.status === 'planned').map(item => byId.get(item.goalId))
      .filter(goal => openGoal(goal, state, today));
    if (!pending.length) return [];
    const askBy = pending.map(goal => askByDate(goal.deadline.closes, weeks)).sort()[0];
    if (daysBetween(today, askBy) > REMIND_DAYS) return [];
    const deadline = pending.map(goal => goal.deadline.closes).sort()[0];
    return [{ id: entry.id, name: entry.name, goalIds: pending.map(goal => goal.id),
      goalNames: pending.map(goal => shortName(goal.name)), askBy, deadline, overdue: askBy < today }];
  }).sort((a, b) => a.askBy.localeCompare(b.askBy));
}

// ——— тексты ———

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const formatDateEn = iso => { const [y, m, d] = iso.split('-').map(Number); return `${MONTHS_EN[m - 1]} ${d}, ${y}`; };
const CHANNEL_TEXT = {
  commonapp: ['через Common App', 'through the Common App'],
  ucas: ['через UCAS', 'through UCAS'],
  mail: ['почтой', 'by post'],
  sealed: ['в запечатанном конверте с подписью', 'in a sealed envelope signed by you'],
  portal: ['через онлайн-систему программы', "through the program's online system"],
};
export function channelText(channels, lang = 'ru') {
  const index = lang === 'en' ? 1 : 0;
  const parts = (channels ?? []).filter(code => CHANNEL_TEXT[code]).map(code => CHANNEL_TEXT[code][index]);
  return parts.length ? parts.join(', ') : null;
}

// entries: [{ nameRu, nameEn, closes, channels }] — программы, для которых
// просишь письмо. Подпись оставлена пустой: имени ученика мы не храним.
export function requestText({ teacher, entries, lang = 'ru' }) {
  const list = (entries ?? []).filter(item => item && (item.nameRu || item.nameEn));
  if (lang === 'en') {
    const name = item => item.nameEn || item.nameRu;
    const when = item => item.closes ? `deadline ${formatDateEn(item.closes)}` : 'deadline not announced yet';
    const how = item => channelText(item.channels, 'en') ? `send ${channelText(item.channels, 'en')}` : 'I will confirm how to send it';
    const body = list.length === 1
      ? [`I am applying to ${name(list[0])} (${when(list[0])}). The program asks for a recommendation letter. Would you be willing to write one for me?`,
        `How to send it: ${channelText(list[0].channels, 'en') ?? 'I will confirm and let you know.'}`]
      : ['I am applying to these programs, and they ask for a recommendation letter:',
        list.map(item => `- ${name(item)}: ${when(item)}; ${how(item)}`).join('\n'),
        'Would you be willing to write one for me?'];
    return [`Dear ${teacher || '[name]'},`, ...body,
      'I will send you a short note on what I have done and where I am applying.',
      'Thank you,\n[your name, grade]'].join('\n\n');
  }
  const name = item => item.nameRu || item.nameEn;
  const when = item => item.closes ? `срок подачи ${formatDate(item.closes)}` : 'срок подачи ещё не объявлен';
  const how = item => channelText(item.channels, 'ru') ? `отправлять ${channelText(item.channels, 'ru')}` : 'куда отправлять — уточню и пришлю';
  const body = list.length === 1
    ? [`Я подаю документы в ${name(list[0])}, ${when(list[0])}. Программа просит рекомендательное письмо. Сможете написать его для меня?`,
      `Куда отправлять: ${channelText(list[0].channels, 'ru') ?? 'уточню и пришлю.'}`]
    : ['Я подаю документы в несколько программ, и они просят рекомендательное письмо:',
      list.map(item => `— ${name(item)}: ${when(item)}; ${how(item)}`).join('\n'),
      'Сможете написать его для меня?'];
  return [`Здравствуйте, ${teacher || '[имя]'}!`, ...body,
    'Пришлю короткую памятку: мои работы и программы, куда я подаюсь.',
    'Спасибо!\n[имя и фамилия, класс]'].join('\n\n');
}

// Памятка для учителя. «Мои работы» — только названия записей из
// портфолио ученика; нет записей — раздела нет.
export function teacherMemo({ entries, experiences }) {
  const lines = ['Памятка для рекомендации', '', 'Куда подаюсь:'];
  for (const item of entries ?? []) {
    const how = channelText(item.channels, 'ru');
    lines.push(`— ${item.nameRu || item.nameEn}: ${item.closes ? `до ${formatDate(item.closes)}` : 'срок ещё не объявлен'}${how ? `, отправлять ${how}` : ''}`);
  }
  const done = (experiences ?? []).filter(entry => entry?.title);
  if (done.length) {
    lines.push('', 'Мои работы:');
    for (const entry of done.slice(0, 15)) lines.push(`— ${entry.title}${entry.period ? ` (${entry.period})` : ''}`);
  }
  lines.push('', 'Если нужно что-то ещё — спросите, пришлю.');
  return lines.join('\n');
}
