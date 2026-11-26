// Общие данные шагов 2–4б портфолио: материалы целей, режим по сроку, пробелы.
// Логика — в materials-plan.js и formats/ (A2); здесь только сборка входа из
// состояния маршрута и подписи, которые одинаковы на всех трёх экранах.
import { loadMaterials } from './materials-data.js';
import { materialsTable, portfolioMode, materialGaps, MATERIAL_TYPES, NEED_LABELS, GAP_KINDS } from './materials-plan.js';
import { portfolioOf } from './portfolio.js';
import { recommendersOf, leadWeeksOf } from './recommenders.js';
import { applicationsOf } from './application.js';
import { formatDate, daysBetween, plural } from './lib/format.js';

export const typeLabel = type => MATERIAL_TYPES.find(([code]) => code === type)?.[1] ?? type;
export const needLabel = need => NEED_LABELS.find(([code]) => code === need)?.[1] ?? need;
export const gapLabel = kind => GAP_KINDS.find(([code]) => code === kind)?.[1] ?? kind;
// Плашка требования: жёлтая — нужно, сиреневая — нужно не всем, голубая — по желанию,
// серая — программа молчит или мы не знаем.
export const needTone = need => ({ required: 'tag need-required', some: 'tag need-some', optional: 'tag need-optional' })[need] ?? 'tag tag-draft';

export const shortName = program => (program?.name?.ru ?? program?.id ?? '').split(' — ')[0].split(':')[0].trim();

// Карточки целей в форме, которую ждёт materials-plan: {id: {deadline}}.
export function goalCards(programs, goals) {
  return Object.fromEntries(goals.map(id => [id, programs.find(item => item.id === id)]).filter(([, card]) => card));
}

const MODE_TEXT = {
  pack: 'Время упаковывать: новые работы не начинаем, оформляем то, что есть.',
  one: 'Хватит времени на одну новую работу. Остальное — упаковать.',
  grow: 'Время растить портфолио: можно вести работу спокойно, шаг за шагом.',
};

// Подпись режима над шагами. null — у целей нет будущего срока.
export function modeLine(mode, programs) {
  if (!mode) return null;
  const name = shortName(programs.find(item => item.id === mode.goalId));
  return { days: mode.days, lead: `${mode.days} ${plural(mode.days, 'день', 'дня', 'дней')} до срока ${name}`, text: MODE_TEXT[mode.mode], mode: mode.mode };
}

export function dueLine(gap, today) {
  if (gap.done) return 'Готово';
  const when = gap.due ?? gap.closes;
  if (!when) return '';
  const days = daysBetween(today, when);
  if (days < 0) return gap.due ? `Опаздываем: успеть надо было до ${formatDate(when)}. Начни сейчас` : `Срок цели прошёл ${formatDate(when)}`;
  return `${gap.due ? 'Успеть до' : 'Срок цели'} ${formatDate(when)} · ${days} ${plural(days, 'день', 'дня', 'дней')}`;
}

// Куда ведёт кнопка у пробела. Внешние ссылки — только на страницы программ.
export function gapAction(gap) {
  switch (gap.kind) {
    case 'recommenders': return { href: '#route/preparation', text: 'К рекомендателям' };
    case 'proof': return { href: '#route', text: 'Открыть запись', entryId: gap.entryId };
    case 'records': return { href: '#route', text: 'Заполнить записи' };
    case 'awards': return { href: 'opportunities.html', text: 'Найти конкурс' };
    case 'story': return { href: '#route/stories', text: 'Записать историю' };
    case 'unchecked': return gap.goalIds[0] ? { href: `#program/${encodeURIComponent(gap.goalIds[0])}`, text: 'Открыть программу' } : null;
    default: return null;
  }
}

export function essaysFor(state, goalId) {
  return applicationsOf(state).materials.filter(item => item.goalId === goalId)
    .map(item => item.versions.at(-1)).filter(version => version?.kind === 'essay').map(version => version.text);
}

// Всё, что нужно шагам 2–4б, одним объектом. Материалы грузятся по сети,
// поэтому функция асинхронная; ошибка одного файла не роняет остальные.
export async function loadPlan({ programs, routeState, today }, load = loadMaterials) {
  const goals = (routeState?.goals ?? []).filter(id => programs.some(item => item.id === id));
  const cards = goalCards(programs, goals);
  const urls = Object.fromEntries(goals.map(id => [id, `#program/${encodeURIComponent(id)}`]));
  const materials = await load(goals);
  const table = materialsTable({ goals, materials, cards, urls });
  const mode = portfolioMode({ goals, cards, today });
  const portfolio = portfolioOf(routeState);
  const gaps = materialGaps({ table, portfolio, recommenders: recommendersOf(routeState),
    stories: routeState?.applicationNotes?.stories ?? [], mode: mode?.mode ?? null, today, leadWeeks: leadWeeksOf(routeState) });
  return { goals, cards, table, mode, gaps, portfolio };
}
