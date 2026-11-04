// Сводка над карточками: сколько можно прямо сейчас и что поменять, чтобы
// стало больше. Считает только программы с незакрытым приёмом.
import { deadlineState } from './lib/deadline.js';
import { formatDate, plural } from './lib/format.js';
import { SCALES } from './lib/scales.js';
import { evaluate, FIELDS } from './verdict.js';
import { testName, programSideOnly } from './wording.js';
import { GPA_BAND } from './rules.js';

const programsWord = (n) => plural(n, 'программу', 'программы', 'программ');
// «Подходишь к …» требует дательного падежа.
const programsTo = (n) => plural(n, 'программе', 'программам', 'программам');

const FILL = {
  citizenship: 'гражданство', schoolCountry: 'страну школы', schoolYears: 'число лет школы',
  graduationYear: 'год выпуска', age: 'дату рождения', gpa: 'средний балл',
};
const BLOCKER = {
  citizenship: 'Гражданство', schoolCountry: 'Страна школы', schoolYears: 'Число лет школы',
  graduationYear: 'Год выпуска', age: 'Возраст', gpa: 'Средний балл', language: 'Результат экзамена', exam: 'Экзамен SAT или ACT',
};

function withScore(profile, test, score) {
  const others = (profile.languageTests ?? []).filter((t) => t.test !== test);
  return { ...profile, languageTests: [...others, { test, score }] };
}

const readyIds = (profile, programs, today) =>
  new Set(programs.filter((p) => evaluate(profile, p, today).status === 'yes').map((p) => p.id));

// Баллы подставляются по возрастанию. Программа засчитывается шагу, на
// котором впервые стала зелёной: иначе 7.0 приписал бы себе всё, что уже
// открыл 6.5.
export function examLadder(profile, programs, today) {
  const mine = profile.languageTests ?? [];
  const test = mine[0]?.test ?? 'IELTS';
  const current = mine.find((t) => t.test === test)?.score ?? -Infinity;

  let seen = readyIds(profile, programs, today);
  const candidates = [
    ...new Set(
      programs
        .filter((p) => !seen.has(p.id))
        .flatMap((p) => (p.eligibility?.language?.anyOf ?? []).filter((o) => o.test === test).map((o) => o.min)),
    ),
  ]
    .filter((min) => min > current)
    .sort((a, b) => a - b);

  const steps = [];
  for (const score of candidates) {
    const now = readyIds(withScore(profile, test, score), programs, today);
    const gained = [...now].filter((id) => !seen.has(id)).length;
    if (gained > 0) steps.push({ score, gained });
    seen = new Set([...seen, ...now]);
  }
  return { test, steps: steps.slice(0, 3) };
}

// Сколько программ откроет сам факт сдачи SAT или ACT. Считается только то,
// что откроется наверняка: у программ с порогом отметка без балла не
// засчитывается (см. checkExam), и они сюда не попадают.
export function examGain(profile, programs, today) {
  const have = new Set((profile.exams ?? []).map((x) => x.test));
  if (have.has('SAT') || have.has('ACT')) return 0;
  const before = readyIds(profile, programs, today);
  const after = readyIds({ ...profile, exams: [...(profile.exams ?? []), { test: 'SAT', score: null }] }, programs, today);
  return [...after].filter((id) => !before.has(id)).length;
}

function topField(rows, match) {
  const counts = new Map();
  for (const { verdict } of rows) {
    for (const reason of verdict.reasons) {
      if (match(reason)) counts.set(reason.field, (counts.get(reason.field) ?? 0) + 1);
    }
  }
  let best = null;
  for (const [field, count] of counts) if (!best || count > best.count) best = { field, count };
  return best;
}

// Главное число ответа: к скольким открытым программам подходишь и какой срок
// ближайший. Экран показывает его крупно, а первая строка сводки берёт его же,
// чтобы цифра и фраза не разошлись.
export function readySummary(profile, programs, today) {
  const open = programs.filter((p) => deadlineState(p.deadline, today) !== 'closed');
  const ready = open.filter((program) => evaluate(profile, program, today).status === 'yes');
  const next = ready
    .filter((program) => program.deadline?.closes)
    .sort((a, b) => (a.deadline.closes < b.deadline.closes ? -1 : 1))[0];
  return {
    count: ready.length,
    next: next ? { date: next.deadline.closes, name: next.name?.ru ?? next.id } : null,
  };
}

export function summaryLines(profile, programs, today) {
  const open = programs.filter((p) => deadlineState(p.deadline, today) !== 'closed');
  const rows = open.map((program) => ({ program, verdict: evaluate(profile, program, today) }));
  const lines = [];

  const { count, next } = readySummary(profile, programs, today);
  if (count) {
    let line = `По условиям подходишь к ${count} ${programsTo(count)}.`;
    if (next) line += ` Ближайший срок — ${formatDate(next.date)}, ${next.name}.`;
    lines.push(line);
  } else {
    lines.push('Прямо сейчас подать некуда — ниже видно, что поменять.');
  }

  // Эти программы в список дел не идут: доделывать в них нечего, и
  // человеку важно знать, что жёлтых карточек у него не тридцать шесть.
  const likely = rows.filter((row) => programSideOnly(row.verdict));
  if (likely.length) {
    lines.push(`Ещё ${likely.length} ${programsWord(likely.length)} — похоже, можно: точных требований они не называют, но в твоей анкете ничего не мешает.`);
  }

  const ladder = examLadder(profile, open, today);
  if (ladder.steps.length) {
    const [first, ...rest] = ladder.steps;
    let line = `Наберёшь ${testName(ladder.test)} ${first.score} — будешь подходить ещё к ${first.gained} ${programsTo(first.gained)}`;
    for (const step of rest) line += `, ${step.score} — ещё к ${step.gained}`;
    lines.push(`${line}.`);
  }

  const gain = examGain(profile, open, today);
  if (gain > 0) {
    lines.push(`Сдашь SAT или ACT — станет доступно ещё ${gain} ${plural(gain, 'программа', 'программы', 'программ')}: без этого экзамена они не принимают.`);
  }

  const missing = topField(rows, (r) => r.status === 'unknown' && r.code?.endsWith('.no-value') && FILL[r.field]);
  if (missing) {
    lines.push(`Укажи ${FILL[missing.field]} — без этого не проверить ${missing.count} ${programsWord(missing.count)}.`);
  }

  // Главная преграда раньше стояла здесь одной строкой. Теперь все
  // преграды показывает блок «Почему не подходят» (reasonGroups) над
  // списком неподходящих программ, а здесь — только то, что поменять.
  const best = bestChange(profile, open, today, ladder, gain);
  if (best) lines.push(`Больше всего программ откроет ${best.what}: подойдёшь ещё к ${best.gained} ${programsTo(best.gained)}.`);

  return lines;
}

// Порог, общий для причины: ключ для сравнения и текст. Берётся только из
// params причины — то есть из правила программы. Где числа нет
// (гражданство, страна школы), порога нет и в тексте.
function scoredOptions(options, mine) {
  const have = new Set(mine.filter((t) => t.score != null).map((t) => t.test));
  return options.filter((o) => have.has(o.test) && o.min != null);
}

function thresholdOf(reason, profile) {
  const p = reason.params ?? {};
  switch (reason.code) {
    case 'schoolYears.below-min':
      return { key: `min:${p.min}`, text: `Нужно ${p.min} ${plural(p.min, 'год', 'года', 'лет')} школы` };
    case 'graduationYear.too-early':
      return { key: `from:${p.min}`, text: `Берут выпускников с ${p.min} года` };
    case 'graduationYear.after-cycle':
      return { key: `cycle:${p.max}`, text: `Нужно окончить школу к ${p.max}` };
    case 'graduationYear.too-late':
      return { key: `to:${p.max}`, text: `Берут выпускников до ${p.max} года` };
    case 'age.over-max':
      return p.maxExclusive != null
        ? { key: `lt:${p.maxExclusive}`, text: `Возраст: берут младше ${p.maxExclusive}` }
        : { key: `le:${p.max}`, text: `Возраст: берут до ${p.max}` };
    case 'age.under-min':
      return { key: `ge:${p.min}`, text: `Возраст: берут с ${p.min}` };
    case 'gpa.below':
      return { key: `gpa:${p.need}`, text: `Средний балл ниже ${p.need}%` };
    case 'language.below':
    case 'exam.below': {
      const mine = reason.field === 'language' ? profile.languageTests ?? [] : profile.exams ?? [];
      const hit = scoredOptions(p.options ?? [], mine);
      if (!hit.length) return null;
      // loose — тот же экзамен без числа: пороги в группе разные, но
      // «IELTS ниже порога» всё равно точнее, чем «Результат экзамена».
      return {
        key: hit.map((o) => `${o.test}:${o.min}`).sort().join('|'),
        text: hit.map((o) => `${testName(o.test)} ниже ${o.min}`).join(' и '),
        loose: { key: hit.map((o) => o.test).sort().join('|'), text: `${hit.map((o) => testName(o.test)).join(' и ')} ниже порога` },
      };
    }
    default:
      return null;
  }
}

export const REASON_GROUPS_MAX = 5;

// Почему не подходят: группы по полю отказа, по убыванию числа программ.
// Одна программа может попасть в несколько групп (например, и по возрасту,
// и по языку), поэтому числа групп не складываются в общее — и интерфейс
// их не складывает. Считаются только программы с незакрытым приёмом.
export function reasonGroups(profile, programs, today) {
  const open = programs.filter((p) => deadlineState(p.deadline, today) !== 'closed');
  const groups = new Map();
  for (const program of open) {
    for (const reason of evaluate(profile, program, today).reasons) {
      if (reason.status !== 'fail') continue;
      const group = groups.get(reason.field)
        ?? { field: reason.field, count: 0, workarounds: 0, keys: new Set(), text: null, looseKeys: new Set(), looseText: null };
      group.count += 1;
      if ((program.workaroundFields ?? []).includes(reason.field)) group.workarounds += 1;
      const threshold = thresholdOf(reason, profile);
      group.keys.add(threshold?.key ?? null);
      group.text = threshold?.text ?? null;
      group.looseKeys.add(threshold?.loose?.key ?? null);
      group.looseText = threshold?.loose?.text ?? null;
      groups.set(reason.field, group);
    }
  }
  const order = FIELDS.map(([field]) => field);
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || order.indexOf(a.field) - order.indexOf(b.field))
    .slice(0, REASON_GROUPS_MAX)
    .map(({ field, count, workarounds, keys, text, looseKeys, looseText }) => ({
      field,
      count,
      workarounds,
      // Порог называем, только если он один у всех программ группы.
      threshold: keys.size === 1 && !keys.has(null) ? text
        : looseKeys.size === 1 && !looseKeys.has(null) ? looseText : null,
    }));
}

export function reasonLine({ field, count, workarounds, threshold }) {
  const tail = workarounds ? `, у ${workarounds} из них есть обходной путь` : '';
  return `${threshold ?? BLOCKER[field]} — ${count} ${plural(count, 'программа', 'программы', 'программ')}${tail}`;
}

// Какое одно изменение в анкете откроет больше всего программ. Язык и
// сдача SAT/ACT уже названы строками examLadder и examGain: если лучшее
// изменение из них, строки нет. Гражданство, страну школы, возраст и год
// выпуска анкетой не поменять — их здесь нет.
export function bestChange(profile, programs, today, ladder = examLadder(profile, programs, today), satGain = examGain(profile, programs, today)) {
  const before = readyIds(profile, programs, today);
  const gainOf = (patched) => [...readyIds(patched, programs, today)].filter((id) => !before.has(id)).length;

  // Уже названное: язык (высший балл открывает всё, что открывают низшие,
  // поэтому весь экзамен считаем названным лестницей) и сдача SAT или ACT.
  let named = satGain;
  if (ladder.steps.length) {
    const mins = programs.flatMap((p) => (p.eligibility?.language?.anyOf ?? [])
      .filter((o) => o.test === ladder.test && o.min != null).map((o) => o.min));
    named = Math.max(named, gainOf(withScore(profile, ladder.test, Math.max(...mins))));
  }

  const candidates = [];
  const seen = new Set();
  const add = (key, what, patched) => {
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ what, gained: gainOf(patched) });
  };
  for (const program of programs) {
    for (const reason of evaluate(profile, program, today).reasons) {
      if (reason.status !== 'fail') continue;
      const p = reason.params ?? {};
      if (reason.code === 'schoolYears.below-min') {
        add(`years:${p.min}`, `${p.min} ${plural(p.min, 'год', 'года', 'лет')} школы`, { ...profile, schoolYears: p.min });
      } else if (reason.code === 'gpa.below' && profile.gpa?.scale in SCALES) {
        const { scale } = profile.gpa;
        const max = SCALES[scale];
        // Наименьший балл в шкале человека, который не ниже порога. Десятые
        // доли — как в анкете; у процентов — целые.
        const digits = scale === 'PERCENT' ? 1 : 10;
        // Второй кандидат — за полосой сомнения: при разных шкалах балл ровно
        // на пороге даёт «сверь», а не «подходишь» (см. checkGpa).
        for (const need of [p.need, p.need + GPA_BAND + 0.1]) {
          const value = Math.ceil(((need * max) / 100) * digits - 1e-9) / digits;
          if (value <= max) add(`gpa:${value}`, `средний балл ${value}`, { ...profile, gpa: { value, scale } });
        }
      } else if (reason.code === 'exam.below') {
        for (const o of scoredOptions(p.options ?? [], profile.exams ?? [])) {
          const others = (profile.exams ?? []).filter((x) => x.test !== o.test);
          add(`exam:${o.test}:${o.min}`, `${testName(o.test)} ${o.min}`, { ...profile, exams: [...others, { test: o.test, score: o.min }] });
        }
      }
    }
  }
  const best = candidates.filter((c) => c.gained > 0).sort((a, b) => b.gained - a.gained)[0];
  // Не больше уже названного — значит, лучшее изменение уже есть в сводке.
  return best && best.gained > named ? best : null;
}
