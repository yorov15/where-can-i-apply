import { reasonText, orderReasons, headline, bucketOf } from './wording.js';
import { deadlineLine, coverageLine, formatDate } from './lib/format.js';
import { isStale } from './lib/dates.js';

// В именительном падеже — для строк вида «Страна школы: ...».
const FIELD_TITLES = {
  citizenship: 'Гражданство',
  schoolCountry: 'Страна школы',
  schoolYears: 'Годы школы',
  graduationYear: 'Год выпуска',
  age: 'Возраст',
  gpa: 'Средний балл',
  language: 'Язык',
  exam: 'Экзамен',
};

// По строке на каждое поле, со словами человека, который проверял.
//
// Раньше это была одна строка «не ограничивает: страну школы, годы
// школы, возраст», а заметки из подписей вырезались ещё при сборке. В
// заметках и лежала информация — «таджикский аттестат назван в таблице
// по странам», «японский заранее не нужен» — и человек, не видя её,
// читал карточку как «данных нет».
//
// Подпись ассистента помечается прямо в строке. Человек, решающий по
// карточке, вправе знать, что страницу читала модель, а не человек, —
// иначе доверие к строке было бы взято взаймы.
export function notLimitedItems(program, fields) {
  return fields.map((field) => {
    const title = FIELD_TITLES[field] ?? field;
    const rule = program.eligibility?.[field];
    const line = rule?.note ? `${title}: ${rule.note}` : `${title}: не ограничено`;
    return rule?.checkedBy === 'assistant' ? `${line} (проверил ассистент)` : line;
  });
}

// Состояния, при которых программа описала требование словами: под
// причиной показываем, что именно она пишет. Это не то же самое, что
// PROGRAM_SIDE_STATES в wording.js: там — «человеку делать нечего», и
// минимумов по частям экзамена в том списке нет, потому что свои баллы
// человек как раз сверить может.
const SAYS_STATES = new Set(['not-measured', 'by-institution', 'missing-rule', 'parts-unknown']);

// К лёгкой записи программы подмешиваются её условия. Пока файл не приехал,
// textConditions остаётся undefined, и карточка знает, что программу ещё не
// прочитали, — вместо «условий нет». Значение null значит «файл не приехал»:
// это тоже не «условий нет», и карточка их различает.
//
// Доступ один на всех: и карточка, и план, и сравнение читают условия отсюда,
// иначе после переезда условий в отдельный файл кто-нибудь из них молча
// показывал бы пустоту.
export function extraFor(details, id) {
  const entry = details?.programs?.[id];
  if (!entry) return null;
  const list = details.conditions?.[id];
  return { ...entry, textConditions: list, conditionsPending: list === undefined };
}

export function cardModel({ program, verdict, deadline }, extra, today) {
  const hasDetails = extra != null;
  // Условия едут отдельным файлом. Пока их нет — это не «условий нет», а
  // «ещё не прочитали»: разница видна там, где карточка утверждает, что
  // обходного пути не существует.
  const conditionsPending = extra?.conditionsPending === true;
  const conditionsFailed = extra?.textConditions === null;
  const conditions = (extra?.textConditions ?? []).filter((c) => c.ru);
  const used = new Set();

  // Забирает подходящие условия, которые ещё нигде не показаны. Порядок
  // вызовов задаёт приоритет: сначала причины, потом разделы.
  const take = (match) => {
    const out = [];
    conditions.forEach((c, i) => {
      if (!used.has(i) && c.kind && match(c)) {
        used.add(i);
        out.push(c.ru);
      }
    });
    return out;
  };

  const reasons = orderReasons(verdict.reasons).map((reason) => {
    const text = reasonText(reason);
    const state = reason.code.split('.')[1];
    const workarounds = take((c) => c.kind === 'workaround' && c.field === reason.field);
    const says = SAYS_STATES.has(state)
      ? take((c) => (c.kind === 'must' || c.kind === 'note') && c.field === reason.field)
      : [];
    return {
      field: reason.field,
      status: reason.status,
      code: reason.code,
      params: reason.params ?? {},
      title: text.title,
      detail: text.detail,
      workarounds,
      says,
      noWorkaround: hasDetails && !conditionsPending && reason.status === 'fail' && workarounds.length === 0,
      seeBelow: hasDetails && !conditionsPending && SAYS_STATES.has(state) && says.length === 0 && workarounds.length === 0,
    };
  });

  const must = take((c) => c.kind === 'must');
  const money = take((c) => c.kind === 'money');
  const steps = take((c) => c.kind === 'steps');
  const documents = take((c) => c.kind === 'documents');
  const notes = take((c) => c.kind === 'note' || c.kind === 'workaround');
  const untagged = conditions.filter((c) => !c.kind).map((c) => c.ru);

  // Документы — что вуз просит приложить. Раздел идёт до «Что ещё
  // потребуется»: это отдельный список к сборке, а не условие допуска, и
  // среди условий он терялся бы.
  const sections = [
    { key: 'documents', title: 'Документы', items: documents },
    { key: 'must', title: 'Что ещё потребуется', items: must },
    { key: 'money', title: 'Деньги', items: [extra?.coverageNote, ...money].filter(Boolean) },
    { key: 'steps', title: 'Как подавать', items: steps },
    { key: 'untagged', title: 'Условия программы', items: untagged },
  ].filter((s) => hasDetails && s.items.length);

  const attested = verdict.status !== 'no' && verdict.attested?.length
    ? notLimitedItems(program, verdict.attested)
    : [];

  const checked = extra?.source?.lastVerified;
  const stale = isStale(checked, today);
  const source = checked
    ? `Проверено по сайту программы ${formatDate(checked)}${extra.source.approvedBy === 'assistant' ? ', проверял ассистент' : ''}${stale ? '. Данные давние: сверь условия и сроки на сайте' : ''}`
    : null;

  return {
    id: program.id,
    status: verdict.status,
    bucket: bucketOf(verdict),
    closed: deadline === 'closed',
    title: program.name?.ru ?? program.id,
    headline: headline(verdict, program),
    deadlineLine: deadlineLine(program.deadline, today),
    coverageLine: coverageLine(program.coverage),
    hasDetails,
    conditionsPending,
    conditionsFailed,
    reasons,
    sections,
    more: { notes, attested },
    applyUrl: extra?.applyUrl ?? null,
    sourceUrl: extra?.source?.url ?? null,
    source,
    stale,
  };
}
