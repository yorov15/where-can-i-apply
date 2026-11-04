// «Шпаргалка для учителя»: один лист, по которому учителю легче написать
// письмо с конкретными случаями. Ответы хранятся у рекомендателя
// (recommenders.js, поле sheet). Здесь — только текст и адрес страницы, без DOM.
//
// Сроки и способ отправки берутся из тех же записей, что и памятка
// (entries в recommenders-view.js), — своих фактов о программах здесь нет.
import { formatDate } from './lib/format.js';
import { normalizeSheet, channelText } from './recommenders.js';
import { spotlightOf, spotlightText, spotlightName } from './spotlight.js';
import { portfolioOf } from './portfolio.js';

const PREFIX = '#route/recommenders/';
export const bragSheetHash = personId => `${PREFIX.slice(1)}${encodeURIComponent(personId)}/sheet`;

// id рекомендателя или null, если адрес не про шпаргалку.
export function bragSheetRoute(hash) {
  if (typeof hash !== 'string' || !hash.startsWith(PREFIX)) return null;
  const [raw, mode, extra] = hash.slice(PREFIX.length).split('/');
  if (mode !== 'sheet' || extra !== undefined) return null;
  try { return decodeURIComponent(raw) || null; } catch { return null; }
}

// Подписи полей формы и разделов листа. Пример — подсказка под полем.
export const SHEET_FORM = [
  { field: 'study', label: 'Что хочу изучать и почему',
    hint: 'Например: информатику — в кружке сделали бота с расписанием уроков, хочу научиться делать такие вещи для всего города.' },
  { field: 'quality1', label: 'Качество 1 и случай',
    hint: 'Например: упорство — задачу с олимпиады разбирали после уроков три дня, пока не решили.' },
  { field: 'quality2', label: 'Качество 2 и случай',
    hint: 'Например: помощь другим — объясняю соседу по парте дроби, за контрольную у соседа теперь 4 вместо 3.' },
  { field: 'quality3', label: 'Качество 3 и случай · по желанию',
    hint: 'Например: любопытство — спросить, откуда взялась формула, и найти вывод в учебнике для старших классов.' },
  { field: 'proud', label: 'Чем горжусь в этом предмете',
    hint: 'Например: доклад о водных ресурсах Таджикистана взяли на школьную конференцию.' },
  { field: 'more', label: 'Что ещё важно знать · по желанию',
    hint: 'Обстоятельства и трудности, если хочется о них сказать. Например: с 8 класса помогаю семье в магазине после уроков.' },
];

const QUALITIES = ['quality1', 'quality2', 'quality3'];
export const SHEET_SECTIONS = [
  { title: 'Что хочу изучать и почему', fields: ['study'] },
  { title: 'Что вы видели на уроках', fields: QUALITIES, numbered: true },
  { title: 'Чем горжусь в вашем предмете', fields: ['proud'] },
  { title: 'Что ещё важно знать', fields: ['more'] },
];
export const SHEET_TITLE = 'Шпаргалка для рекомендации';
export const SHEET_INTRO = 'Здесь факты и случаи для письма. Если что-то помнится иначе, опирайтесь на свою память.';
export const SHEET_END = 'Если нужно что-то ещё — спросите, пришлю.';
export const FROM_BLANK = '[имя и фамилия, класс]';

// Разделы с ответами: [{title, items: [text], numbered}]. Пустых нет.
export function sheetSections(sheet) {
  const clean = normalizeSheet(sheet) ?? {};
  return SHEET_SECTIONS.map(section => ({ ...section, items: section.fields.map(field => clean[field]).filter(Boolean) }))
    .filter(section => section.items.length);
}

// «Мои работы»: подборки целей этого человека, если они есть; иначе —
// названия записей портфолио, как в памятке. goals — [{goalId, nameRu}].
export function sheetWorks(state, goals) {
  const spotlights = (goals ?? []).filter(goal => goal?.goalId && spotlightOf(state, goal.goalId))
    .map(goal => spotlightText(state, goal.goalId, { programName: goal.nameRu || goal.goalId, name: '' })).filter(Boolean);
  if (spotlights.length) return { kind: 'spotlight', texts: spotlights };
  const titles = portfolioOf(state).experiences.filter(entry => entry?.title).slice(0, 15)
    .map(entry => entry.period ? `${entry.title} (${entry.period})` : entry.title);
  return titles.length ? { kind: 'titles', titles } : null;
}

// Подпись ученика: имя из подборки, если оно записано; иначе место для имени.
export const sheetFrom = state => spotlightName(state) || '';

export function entryLine(item) {
  const way = channelText(item.channels), how = way ? `, отправлять ${way}` : '';
  return `${item.nameRu || item.nameEn}: ${item.closes ? `до ${formatDate(item.closes)}` : 'срок ещё не объявлен'}${how}`;
}

// Текст шпаргалки. entries — те же, что у памятки ({nameRu, nameEn, closes,
// channels}); works — из sheetWorks.
export function bragSheetText({ teacher, role, from, entries, sheet, works }) {
  const lines = [SHEET_TITLE, '', `Кому: ${[teacher, role].filter(Boolean).join(' · ')}`, `От: ${from || FROM_BLANK}`, '', SHEET_INTRO];
  const list = (entries ?? []).filter(item => item && (item.nameRu || item.nameEn));
  if (list.length) { lines.push('', 'Куда подаюсь:'); for (const item of list) lines.push(`— ${entryLine(item)}`); }
  for (const section of sheetSections(sheet)) {
    lines.push('', `${section.title}:`);
    section.items.forEach((text, index) => lines.push(section.numbered ? `${index + 1}. ${text}` : text));
  }
  if (works?.kind === 'spotlight') { lines.push('', 'Мои работы:'); for (const text of works.texts) lines.push('', text); }
  if (works?.kind === 'titles') { lines.push('', 'Мои работы:'); for (const title of works.titles) lines.push(`— ${title}`); }
  lines.push('', SHEET_END);
  return lines.join('\n');
}
