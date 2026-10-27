// Маршрут до оффера: что человеку осталось сделать, чтобы подать документы.
//
// Движок чистый: ни DOM, ни сети, ни localStorage — хранилище приходит
// аргументом, данные уже проверены и лежат в индексе программ, условиях и
// треках подготовки. Тексты и даты не сочиняются: срок берётся из данных
// программы, документы и деньги — из её условий, экзамен — из правил.
// Если данных нет, шаг не появляется, а не заполняется догадкой.
import { evaluate } from './verdict.js';
import { testName } from './wording.js';
import { formatDate, daysBetween } from './lib/format.js';
import { deadlineState } from './lib/deadline.js';

export const ROUTE_STATE_KEY = 'eligibility-route';
export const ROUTE_VERSION = 1;

// Больше пяти дел — это уже весь маршрут, а не «эта неделя».
const WEEK_MAX = 5;
// Месяц до срока: подача перестаёт быть «когда-нибудь».
const SOON_DAYS = 30;
// Длиннее этого текст для родителей не читают.
const TEXT_MAX = 1200;

// Порядок фаз: он же порядок шагов в маршруте и подсказка для недели.
const PHASES = ['tests', 'inquiry', 'docs', 'money', 'apply', 'after'];

// ——— состояние ———

// Состояние: {version, goal: string|null, done: string[]}.
// Цель и отметки живут на устройстве и переживают перезагрузку; чужие
// отметки от прошлой версии не подставляются к новым шагам молча.
function freshState() {
  return { version: ROUTE_VERSION, goal: null, done: [] };
}

// Всё, что пришло из хранилища или из файла, проходит одну проверку:
// своя версия, цель — строка или null, отметки — список строк. Остальное —
// не наше состояние, а мусор; лучше пустое, чем упавшая страница.
function normalize(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.version !== ROUTE_VERSION) return null;
  const goal = value.goal ?? null;
  if (goal !== null && typeof goal !== 'string') return null;
  if (!Array.isArray(value.done)) return null;
  const done = [...new Set(value.done.filter((id) => typeof id === 'string'))];
  return { version: ROUTE_VERSION, goal, done };
}

const asState = (state) => normalize(state) ?? freshState();

function copyState(state) {
  const base = asState(state);
  return { version: ROUTE_VERSION, goal: base.goal, done: [...base.done] };
}

export function loadRouteState(storage) {
  try {
    const stored = storage?.getItem(ROUTE_STATE_KEY) ?? null;
    return normalize(JSON.parse(stored)) ?? freshState();
  } catch {
    return freshState();
  }
}

export function saveRouteState(state, storage) {
  try {
    storage?.setItem(ROUTE_STATE_KEY, JSON.stringify(copyState(state)));
  } catch { /* приватный режим: сохранение не должно ломать страницу */ }
}

export function setGoal(state, id) {
  return { ...copyState(state), goal: typeof id === 'string' ? id : null };
}

export function toggleStep(state, stepId) {
  const next = copyState(state);
  if (typeof stepId !== 'string' || !stepId) return next;
  next.done = next.done.includes(stepId)
    ? next.done.filter((id) => id !== stepId)
    : [...next.done, stepId];
  return next;
}

export function clearProgress(state) {
  return { ...copyState(state), done: [] };
}

export function exportState(state) {
  const base = copyState(state);
  return JSON.stringify({ version: ROUTE_VERSION, goal: base.goal, done: base.done });
}

// Чужой или битый файл не должен стирать маршрут наполовину: либо
// разобралось целиком, либо null.
export function importState(text) {
  if (typeof text !== 'string') return null;
  try {
    return normalize(JSON.parse(text));
  } catch {
    return null;
  }
}

export function isDone(state, stepId) {
  return Array.isArray(state?.done) && state.done.includes(stepId);
}

// ——— шаги ———

// djb2 — тот же, что в js/plan.js: отметка привязана к тексту, а не к
// номеру шага. Перепишут условия — старая галочка пропадёт, но не встанет
// на чужое дело. Своя копия, потому что plan.js хеш не экспортирует.
function hash(text) {
  let h = 5381;
  for (const ch of text) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  return h.toString(36);
}

function makeStep(program, { phase, kind, title, detail = '', due = null, track = null }) {
  return {
    id: `${program.id}:${kind}:${hash(title)}`,
    phase,
    kind,
    title,
    detail,
    due,
    track,
  };
}

// «или» — та же связка, что в текстах причин; здесь своя, чтобы не тащить
// из wording.js больше одного имени.
function joinOr(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} или ${items.at(-1)}`;
}

const optionText = (option) => (option.min == null
  ? testName(option.test)
  : `${testName(option.test)} от ${option.min}`);

// Код трека не совпадает с кодом экзамена из правил: IELTS → ielts, а две
// шкалы TOEFL ведут в один трек toefl. Коды вроде mext/eju в правилах не
// встречаются — они приходят только из prepared.tests и в этой карте не
// нужны.
const TRACK_OF = {
  IELTS: 'ielts',
  TOEFL_IBT: 'toefl',
  TOEFL_IBT_2026: 'toefl',
  DUOLINGO: 'duolingo',
  SAT: 'sat',
  ACT: 'act',
  TOPIK: 'topik',
  HSK: 'hsk',
};

// Вид экзамена: альтернативы одного вида — один шаг с «или», как anyOf в
// правилах. Иначе IELTS, TOEFL и Duolingo выглядели бы тремя отдельными
// делами, хотя человеку нужен один сертификат.
const TRACK_GROUP = {
  ielts: 'english',
  toefl: 'english',
  duolingo: 'english',
  pte: 'english',
  sat: 'standard',
  act: 'standard',
  eju: 'standard',
  // NUET и тест UCA — не отдельные обязанности, а замена SAT/ACT: вуз
  // принимает один из них на выбор, и человеку нужен один шаг.
  nuet: 'standard',
  'uca-test': 'standard',
  topik: 'korean',
  hsk: 'chinese',
  jlpt: 'japanese',
  testdaf: 'german',
  dsh: 'german',
  goethe: 'german',
};

const groupOf = (code) => TRACK_GROUP[code] ?? code;
const languageGroup = (group) => ['english', 'korean', 'chinese', 'japanese', 'german', 'language'].includes(group);

const trackOf = (test) => TRACK_OF[test] ?? null;

const optionsOf = (rule) => (Array.isArray(rule?.anyOf) ? rule.anyOf : []);

// Первый вариант, для которого трек уже загружен. Если ни одного трека нет
// (UI ещё не догрузил), track остаётся null — выдумывать код нельзя.
function firstTrack(options, tracks) {
  for (const option of options) {
    const code = trackOf(option.test);
    if (code && tracks?.[code]) return code;
  }
  return null;
}

// Коды треков, которые уже названы правилами программы: их не надо
// добавлять из prepared.tests второй раз.
function ruleTrackCodes(eligibility) {
  const codes = new Set();
  for (const field of ['language', 'exam']) {
    for (const option of optionsOf(eligibility?.[field])) {
      const code = trackOf(option.test);
      if (code) codes.add(code);
    }
  }
  return codes;
}

// Условия нужного вида в порядке файла и без повторов текста: одно дело не
// должно требовать двух галочек и получать два одинаковых id.
function conditionsOf(conditions, kind) {
  const out = [];
  const seen = new Set();
  for (const condition of conditions ?? []) {
    if (condition?.kind !== kind) continue;
    if (typeof condition.ru !== 'string' || !condition.ru.trim()) continue;
    if (seen.has(condition.ru)) continue;
    seen.add(condition.ru);
    out.push(condition);
  }
  return out;
}

// Экзамены: по шагу на поле language/exam, но только если evaluate по нему
// не pass. Pass означает, что сертификат уже подходит: ни причины, ни шага.
// У любого правила-экзамена альтернативы лежат в anyOf, поэтому один шаг
// закрывает всё поле сразу, а варианты перечисляются в detail.
function testSteps({ program, gaps, prepared, tracks, conditions }) {
  const steps = [];
  for (const field of ['language', 'exam']) {
    const rule = program.eligibility?.[field] ?? null;
    const options = optionsOf(rule);
    const gap = gaps.find((reason) => reason.field === field);
    if (!gap || !options.length) continue;
    const variants = options.map(optionText);
    steps.push({ ...makeStep(program, {
      phase: 'tests',
      kind: 'test',
      title: `Сдать ${optionText(options[0])}`,
      detail: `${rule.advisory === true ? 'Программа советует' : 'Подойдёт'} ${joinOr(variants)}.`,
      track: firstTrack(options, tracks),
    }), testGroup: groupOf(trackOf(options[0].test)) ?? field });
  }

  // Проверенная разметка документов: сертификат может требоваться даже
  // при рекомендованном пороге. Сохраняем условные пути и альтернативы
  // дословно; названия экзаменов из свободного текста не угадываем.
  const taggedGroups = new Set();
  for (const condition of conditionsOf(conditions, 'documents')) {
    const requirement = condition.test;
    if (!requirement?.group || !requirement.title) continue;
    taggedGroups.add(requirement.group);
    const same = steps.find((step) => step.testGroup === requirement.group
      || (requirement.group === 'language' && languageGroup(step.testGroup)));
    if (same) {
      // Идентичность уже существующего шага остаётся привязана к правилу,
      // даже если уточняем его заголовок из проверенных условий.
      same.title = requirement.title;
      same.detail = [same.detail, condition.ru].filter(Boolean).join(' ');
      continue;
    }
    const code = (prepared?.tests ?? []).find((code) => groupOf(code) === requirement.group && tracks?.[code]);
    steps.push({ ...makeStep(program, {
      phase: 'tests', kind: 'test', title: requirement.title,
      detail: condition.ru, track: code ?? null,
    }), testGroup: requirement.group });
  }

  // Трек, которого в правилах нет: программе он нужен (файл подготовки
  // сверен руками), а правило об этом молчит. Название берём из трека, не
  // из головы; пока трек не загружен, шага нет — его добавит перезагрузка.
  // Один вид экзамена — один шаг: IELTS и TOEFL в нём альтернативы, а не
  // два разных дела.
  const inRules = ruleTrackCodes(program.eligibility);
  const extras = (prepared?.tests ?? [])
    .filter((code) => !inRules.has(code) && !taggedGroups.has(groupOf(code))
      && !(taggedGroups.has('language') && languageGroup(groupOf(code))) && tracks?.[code]?.name);
  const groups = new Map();
  for (const code of extras) {
    const key = groupOf(code);
    groups.set(key, [...(groups.get(key) ?? []), code]);
  }
  for (const codes of groups.values()) {
    const names = codes.map((code) => tracks[code].name);
    const join = joinOr(names);
    const same = steps.find((step) => step.track && groupOf(step.track) === groupOf(codes[0]));
    if (same) {
      same.detail = [same.detail, `Или ${join}.`].filter(Boolean).join(' ');
      continue;
    }
    steps.push(makeStep(program, {
      phase: 'tests',
      kind: 'test',
      title: `Сдать ${names[0]}`,
      detail: names.length > 1 ? `Подойдёт ${join}.` : '',
      track: codes[0],
    }));
  }
  return steps;
}

// Одиннадцатилетняя школа: правила говорят про число лет школы только
// через отказ или «не измерено», и решает это приёмная комиссия. Обходные
// пути — текстовые условия kind='workaround': заголовок — сам текст
// условия, ни одного нового слова.
function inquirySteps({ program, gaps, profile, conditions }) {
  const steps = [];
  const schoolYears = gaps.find((reason) => reason.field === 'schoolYears');
  const askable = schoolYears
    && (schoolYears.status === 'fail' || schoolYears.status === 'unknown');
  if (askable && profile?.schoolYears === 11) {
    steps.push(makeStep(program, {
      phase: 'inquiry',
      kind: 'inquiry',
      title: 'Уточнить у приёмной комиссии, принимают ли 11-летнюю школу',
    }));
  }
  for (const condition of conditionsOf(conditions, 'workaround')) {
    steps.push(makeStep(program, {
      phase: 'inquiry',
      kind: 'inquiry',
      title: condition.ru,
    }));
  }
  return steps;
}

const DOCS_FALLBACK = 'Запросить список документов на странице приёма';
const MONEY_FALLBACK = 'Уточнить плату за подачу на странице приёма';

// Документы: по шагу на условие, один и тот же текст — одна галочка.
// null — условия ещё не приехали. Врать «документов нет» нельзя, а
// перезапросить их может только UI: ждём его и шагов не строим.
function documentSteps({ program, conditions }) {
  if (conditions === null) return [];
  const documents = conditionsOf(conditions, 'documents');
  if (documents.length) {
    return documents.filter((condition) => !condition.test).map((condition) => makeStep(program, {
      phase: 'docs',
      kind: 'document',
      title: condition.ru,
    }));
  }
  return [makeStep(program, { phase: 'docs', kind: 'document', title: DOCS_FALLBACK })];
}

function moneySteps({ program, conditions }) {
  const fees = conditionsOf(conditions, 'money');
  if (fees.length) {
    return fees.map((condition) => makeStep(program, {
      phase: 'money',
      kind: 'fee',
      title: condition.ru,
    }));
  }
  return [makeStep(program, { phase: 'money', kind: 'fee', title: MONEY_FALLBACK })];
}

// Срок подачи — единственный шаг с датой. Ожидаемая дата помечается:
// на неё нельзя опираться как на объявленную. Без «сегодня» закрытость
// срока не утверждаем: в guard-вызовах today нет, а соврать про закрытый
// приём дороже, чем попросить сверить дату.
function applyStep({ program, today }) {
  const deadline = program.deadline ?? null;
  const state = today ? deadlineState(deadline, today) : null;
  if (deadline?.closes && state !== 'closed') {
    const expected = deadline.confidence !== 'confirmed';
    return makeStep(program, {
      phase: 'apply',
      kind: 'apply',
      title: `Подать заявку до ${formatDate(deadline.closes)}`,
      detail: today == null
        ? 'дату сверь на сайте программы'
        : expected
          ? 'дата ожидаемая: вуз ещё не объявил её на этот цикл'
          : 'дата подтверждена',
      due: deadline.closes,
    });
  }
  if (deadline?.closes) {
    return makeStep(program, {
      phase: 'apply',
      kind: 'apply',
      title: `Приём закрыт ${formatDate(deadline.closes)}`,
    });
  }
  return makeStep(program, {
    phase: 'apply',
    kind: 'apply',
    title: 'Срок подачи не объявлен — следи за страницей приёма',
  });
}

function buildSteps(context) {
  const steps = [
    ...testSteps(context),
    ...inquirySteps(context),
    ...documentSteps(context),
    ...moneySteps(context),
    applyStep(context),
  ];
  return steps.map((step) => ({ ...step, done: isDone(context.state, step.id) }));
}

// ——— маршрут ———

function deadlineOf(program, today) {
  const deadline = program.deadline ?? null;
  const closes = deadline?.closes ?? null;
  const state = deadlineState(deadline, today);
  // Просроченный срок — не «минус семь дней»: дней до него больше нет.
  const daysLeft = closes && today && state !== 'closed'
    ? daysBetween(today, closes)
    : null;
  return { closes, confidence: deadline?.confidence ?? null, state, daysLeft };
}

// Неделя — не второй маршрут, а его первые пять дел. Подача сама по себе
// в неделю не попадает: это дедлайн, а не недельное дело. Но когда до него
// осталось меньше месяца, она встаёт в конец списка, чтобы не потеряться.
// До полноценного планировщика R4–R6 берём только явные действия.
// Описательные условия остаются в полном маршруте, экзамен на месяцы
// нельзя выдавать за дело на ближайшую неделю.
const WEEK_ACTION = /^(?:Уточнить|Запросить|Подготовить|Заказать|Получить|Попросить|Заполнить|Загрузить|Приложить|Оплатить|Проверить|Связаться|Отправить|Перевести|Собрать|Зарегистрироваться)(?:\s|$)/u;

function weekOf(steps, goal) {
  const undone = steps.filter((step) => !step.done && step.kind !== 'apply'
    && step.kind !== 'test' && WEEK_ACTION.test(step.title));
  const sorted = [...undone].sort((a, b) => {
    const dueDiff = (a.due ? 0 : 1) - (b.due ? 0 : 1);
    if (dueDiff !== 0) return dueDiff;
    return PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase);
  });
  const week = sorted.slice(0, WEEK_MAX);
  const apply = steps.find((step) => step.kind === 'apply');
  const daysLeft = goal.deadline.daysLeft;
  const soon = daysLeft != null && daysLeft <= SOON_DAYS;
  if (soon && apply && !apply.done) {
    if (week.length >= WEEK_MAX) week.length = WEEK_MAX - 1;
    week.push(apply);
  }
  return week;
}

function statsOf(steps) {
  const total = steps.length;
  const done = steps.filter((step) => step.done).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return { total, done, percent: Math.min(100, Math.max(0, percent)) };
}

export function buildRoute({
  program,
  conditions = null,
  profile = null,
  today = null,
  prepared = null,
  tracks = null,
  state = null,
} = {}) {
  const verdict = evaluate(profile, program, today);
  const goal = {
    name: program.name?.ru ?? program.id,
    country: program.hostCountry ?? null,
    kind: program.kind ?? null,
    deadline: deadlineOf(program, today),
    coverage: program.coverage ?? null,
  };
  const context = {
    program,
    conditions,
    profile,
    today,
    prepared,
    tracks,
    state,
    gaps: verdict.reasons,
    gapNotes: conditionsOf(conditions, 'documents')
      .filter((condition) => condition.test?.group === 'english'
        && verdict.reasons.some((reason) => reason.field === 'language'))
      .map((condition) => condition.ru),
  };
  const steps = buildSteps(context);
  return {
    id: program.id,
    prepared: Boolean(prepared),
    // false значит: условия ещё не приехали, и UI должен их перезапросить.
    conditionsLoaded: conditions !== null,
    goal,
    // Причины — ровно то, что сказал evaluate: своих формулировок о том,
    // чего не хватает, маршрут не придумывает.
    gaps: verdict.reasons,
    gapNotes: context.gapNotes,
    steps,
    week: weekOf(steps, goal),
    applyNotes: conditionsOf(conditions, 'steps').map((condition) => condition.ru),
    notes: prepared?.note ? [prepared.note] : [],
    stats: statsOf(steps),
  };
}

// ——— текст для родителя ———

const clip = (text, max) => {
  const value = String(text ?? '');
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
};

function deadlineText(deadline) {
  if (!deadline?.closes) return 'не объявлен';
  if (deadline.state === 'closed') return `приём закрыт ${formatDate(deadline.closes)}`;
  const tail = deadline.confidence === 'confirmed' ? '' : ' (ожидаемая дата)';
  return `до ${formatDate(deadline.closes)}${tail}`;
}

// Текст для мессенджера: цель, срок, чего не хватает, первые дела недели и
// счёт. Адреса сайта здесь нет — в индексе его тоже нет, а придумывать
// ссылку нельзя. Длинные заголовки условий подрезаются: родитель читает
// абзац, а не файл условий.
export function routeText(route) {
  const goal = route?.goal ?? {};
  const steps = route?.steps ?? [];
  const week = route?.week ?? [];
  const stats = route?.stats ?? { done: 0, total: 0 };
  const lines = [
    `Цель: ${clip(goal.name ?? '—', 240)}`,
    `Срок: ${deadlineText(goal.deadline)}`,
  ];
  const missing = steps
    .filter((step) => !step.done && (step.phase === 'tests' || step.phase === 'inquiry'))
    .slice(0, 3);
  if (missing.length) {
    lines.push(`Чего не хватает: ${missing.map((step) => clip(step.title, 100)).join('; ')}.`);
  }
  const now = week.slice(0, 3);
  if (now.length) {
    lines.push(`Сейчас: ${now.map((step, i) => `${i + 1}. ${clip(step.title, 90)}`).join('; ')}.`);
  }
  lines.push(`Сделано ${stats.done} из ${stats.total}.`);
  const text = lines.join('\n');
  return text.length <= TEXT_MAX ? text : `${text.slice(0, TEXT_MAX - 1)}…`;
}
