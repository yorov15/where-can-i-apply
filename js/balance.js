// «Проверка пути»: короткие предупреждения о перекосе в наборе целей.
// Чистые функции без DOM. Берём только поля, которые уже есть у программ:
// требования к экзаменам (eligibility.language / exam), срок подачи
// (deadline.closes), покрытие учёбы (coverage.tuition) и страну (hostCountry).
// Никаких оценок программ и шансов: правило срабатывает только на то,
// что прямо видно в данных. Неизвестное поле — не «нет», а повод молчать.
import { countryName } from './filter.js';
import { testName, joinOr } from './wording.js';
import { statusOf, isSent } from './goal-status.js';
import { formatDate, plural } from './lib/format.js';

// При одной цели перекоса нет: блок не показываем вовсе.
export const MIN_GOALS = 2;
// Больше четырёх строк — уже не проверка, а стена текста.
export const MAX_WARNINGS = 4;
// «Почти все»: с четырёх целей правило про экзамен срабатывает,
// если экзамен нужен всем, кроме одной. При 2–3 целях — только всем.
export const ALMOST_ALL_FROM = 4;
// Сколько сроков в одной неделе считать скоплением.
export const CLUSTER_SIZE = 3;
// «Одна неделя» — любые семь дней подряд, а не календарная неделя:
// сроки 31 декабря и 2 января тоже приходятся на одну неделю работы.
export const CLUSTER_DAYS = 7;
// Одна страна у двух целей — обычный выбор, а не перекос.
export const SAME_COUNTRY_FROM = 3;

// Две шкалы TOEFL — один экзамен: человек сдаёт его один раз.
const FAMILY = { TOEFL_IBT: 'TOEFL', TOEFL_IBT_2026: 'TOEFL' };
const familyOf = (test) => FAMILY[test] ?? test;
const familyName = (family) => (family === 'TOEFL' ? 'TOEFL' : testName(family));
// Ключи state.examDates — коды треков подготовки (см. js/route.js TRACK_OF).
const TRACK = { IELTS: 'ielts', TOEFL: 'toefl', DUOLINGO: 'duolingo', SAT: 'sat', ACT: 'act', TOPIK: 'topik', HSK: 'hsk' };

const validDay = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const shortName = (program) => (program?.name?.ru ?? program?.id ?? '').split(' — ')[0];

// Короткая подпись набора программ: скрытое предупреждение вернётся, если
// набор целей, которых оно касается, изменится.
function signature(ids) {
  let hash = 5381;
  for (const char of [...ids].sort().join(',')) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}

const warning = (rule, detail, programs, fields) => {
  const programIds = programs.map((program) => program.id);
  return { id: `${rule}:${detail}:${signature(programIds)}`, rule, programIds,
    programNames: programs.map(shortName), ...fields };
};

// Требование, без которого заявку не подать: есть список экзаменов, и он
// не помечен как необязательный, рекомендованный или заменяемый своим
// экзаменом вуза. «Не измерено» и «решает вуз» — не требование, а пробел.
function hardRule(rule) {
  return Boolean(rule && Array.isArray(rule.anyOf) && rule.anyOf.length
    && !rule.optional && !rule.advisory && !rule.alternative
    && !rule.noLimit && !rule.notMeasured && !rule.definedBy);
}

// Сертификат отмечен в анкете (с баллом или без) — экзамен уже сдан.
// Дата записана в «Подготовке» — человек на него записан.
function covered(family, profile, state) {
  const mine = [...(profile?.languageTests ?? []), ...(profile?.exams ?? [])];
  if (mine.some((entry) => familyOf(entry?.test) === family)) return true;
  return validDay(state?.examDates?.[TRACK[family]]);
}

// Открытые требования цели: списки допустимых экзаменов, где ни один
// ещё не сдан и не записан.
function openRequirements(program, profile, state) {
  const out = [];
  for (const field of ['language', 'exam']) {
    const rule = program.eligibility?.[field];
    if (!hardRule(rule)) continue;
    const families = [...new Set(rule.anyOf.map((option) => familyOf(option.test)))];
    if (!families.some((family) => covered(family, profile, state))) out.push(families);
  }
  return out;
}

function sharedExam(active, profile, state) {
  const n = active.length;
  if (n < MIN_GOALS) return null;
  const need = n >= ALMOST_ALL_FROM ? n - 1 : n;
  const open = new Map(active.map((program) => [program.id, openRequirements(program, profile, state)]));
  const counts = new Map();
  for (const requirements of open.values()) {
    for (const family of new Set(requirements.flat())) counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  let best = null;
  for (const [family, count] of counts) if (count >= need && (!best || count > counts.get(best))) best = family;
  if (!best) return null;
  const programs = active.filter((program) => open.get(program.id).some((list) => list.includes(best)));
  // Какие ещё экзамены подходят каждой из этих целей: «IELTS или TOEFL».
  let common = null;
  for (const program of programs) {
    const accepted = new Set(open.get(program.id).filter((list) => list.includes(best)).flat());
    common = common ? common.filter((family) => accepted.has(family)) : [best, ...[...accepted].filter((f) => f !== best)];
  }
  const names = joinOr(common.slice(0, 3).map(familyName));
  const k = programs.length;
  const who = k === n
    ? (n === 2 ? 'Обе цели ждут' : `Все ${n} ${plural(n, 'цель', 'цели', 'целей')} ждут`)
    : `${k} из ${n} ${plural(n, 'цели', 'целей', 'целей')} ждут`;
  return warning('exam', best, programs, {
    text: `${who} один и тот же экзамен — подойдёт ${names}. Сертификата в анкете пока нет.`,
    action: 'Одна попытка решает сразу за все эти цели. Запишись на экзамен так, чтобы до самого раннего срока оставалось время на пересдачу.',
    basis: 'По требованиям к экзаменам из условий программ и твоей анкете.',
    // Поле даты есть только у программ с треком подготовки; ссылку показывает экран, если оно есть.
    link: { href: '#route/preparation', text: 'Указать дату экзамена в «Подготовке»' },
  });
}

function deadlineCluster(active, today) {
  const dated = active.filter((program) => validDay(program.deadline?.closes) && (!today || program.deadline.closes >= today))
    .sort((a, b) => a.deadline.closes.localeCompare(b.deadline.closes));
  let best = null;
  for (let i = 0; i < dated.length; i += 1) {
    let j = i;
    while (j + 1 < dated.length && daysBetween(dated[i].deadline.closes, dated[j + 1].deadline.closes) < CLUSTER_DAYS) j += 1;
    const size = j - i + 1;
    if (size >= CLUSTER_SIZE && (!best || size > best.length)) best = dated.slice(i, j + 1);
  }
  if (!best) return null;
  const first = best[0].deadline.closes;
  const last = best.at(-1).deadline.closes;
  const when = first === last ? `в один день, ${formatDate(first)}` : `в одну неделю: с ${formatDate(first)} по ${formatDate(last)}`;
  const expected = best.some((program) => program.deadline.confidence !== 'confirmed');
  return warning('deadlines', first, best, {
    text: `Сроки ${best.length} ${plural(best.length, 'цели', 'целей', 'целей')} — ${when}.`,
    action: 'Разнеси подготовку заранее: документы и тексты для этих заявок собери раньше, чтобы не делать всё в последнюю неделю.',
    basis: `По срокам из условий программ.${expected ? ' Часть дат ожидаемая: вуз ещё не объявил их на этот цикл.' : ''}`,
  });
}

// Только если покрытие учёбы известно у каждой цели и везде «нет».
// Хоть одно неизвестное — молчим: «не нашли» не значит «не платят».
function noTuitionCover(goals) {
  if (goals.length < MIN_GOALS) return null;
  if (!goals.every((program) => program.coverage?.tuition === false)) return null;
  const n = goals.length;
  return warning('coverage', 'tuition', goals, {
    text: n === 2 ? 'Ни одна из двух целей не покрывает плату за учёбу.' : `Ни одна из ${n} целей не покрывает плату за учёбу.`,
    action: 'Если семье учёбу не оплатить, добавь цель, где учёбу покрывают, или проверь стипендии в условиях этих программ.',
    basis: 'По данным о финансировании программ («Что покрывает» у каждой цели).',
  });
}

function sameCountry(goals) {
  if (goals.length < SAME_COUNTRY_FROM) return null;
  const country = goals[0].hostCountry;
  if (!country || !goals.every((program) => program.hostCountry === country)) return null;
  return warning('country', country, goals, {
    text: `Все ${goals.length} ${plural(goals.length, 'цель', 'цели', 'целей')} — в одной стране: ${countryName(country)}.`,
    action: 'Визовые правила и правила для иностранцев одной страны касаются всех этих заявок сразу. Если подходит, добавь запасную цель в другой стране.',
    basis: 'По стране каждой программы.',
  });
}

// goals — программы из индекса в порядке целей; state — состояние v2
// (статусы, даты экзаменов); profile — анкета; today — ISO-дата.
// Поданные цели не учитываются в правилах про экзамен и сроки: по ним
// ничего уже не готовят. В правилах про деньги и страну они остаются —
// это всё ещё варианты, между которыми человек выбирает.
export function balanceWarnings({ goals = [], profile = null, state = null, today = null } = {}) {
  const all = goals.filter((program) => program && typeof program.id === 'string');
  if (all.length < MIN_GOALS) return [];
  const active = all.filter((program) => !isSent(statusOf(state, program.id).status));
  return [
    sharedExam(active, profile, state),
    deadlineCluster(active, today),
    noTuitionCover(all),
    sameCountry(all),
  ].filter(Boolean).slice(0, MAX_WARNINGS);
}

// Что показать: без скрытых человеком («Понятно, скрыть»).
export function visibleBalance(warnings, state) {
  const hidden = new Set(state?.balanceHidden ?? []);
  return warnings.filter((item) => !hidden.has(item.id));
}
