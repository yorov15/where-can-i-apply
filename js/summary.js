// Сводка над карточками: сколько можно прямо сейчас и что поменять, чтобы
// стало больше. Считает только программы с незакрытым приёмом.
import { evaluate } from './verdict.js';
import { deadlineState } from './lib/deadline.js';
import { formatDate, plural } from './lib/format.js';
import { testName } from './wording.js';

const programsWord = (n) => plural(n, 'программу', 'программы', 'программ');

const FILL = {
  citizenship: 'гражданство', schoolCountry: 'страну школы', schoolYears: 'число лет школы',
  graduationYear: 'год выпуска', age: 'дату рождения', gpa: 'средний балл',
};
const BLOCKER = {
  citizenship: 'Гражданство', schoolCountry: 'Страна школы', schoolYears: 'Число лет школы',
  graduationYear: 'Год выпуска', age: 'Возраст', gpa: 'Средний балл', language: 'Результат экзамена',
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

export function summaryLines(profile, programs, today) {
  const open = programs.filter((p) => deadlineState(p.deadline, today) !== 'closed');
  const rows = open.map((program) => ({ program, verdict: evaluate(profile, program, today) }));
  const lines = [];

  const ready = rows.filter((row) => row.verdict.status === 'yes');
  if (ready.length) {
    let line = `Можешь подать в ${ready.length} ${programsWord(ready.length)}.`;
    const next = ready
      .filter((row) => row.program.deadline?.closes)
      .sort((a, b) => (a.program.deadline.closes < b.program.deadline.closes ? -1 : 1))[0];
    if (next) {
      line += ` Ближайший срок — ${formatDate(next.program.deadline.closes)}, ${next.program.name?.ru ?? next.program.id}.`;
    }
    lines.push(line);
  } else {
    lines.push('Прямо сейчас подать некуда — ниже видно, что поменять.');
  }

  const ladder = examLadder(profile, open, today);
  if (ladder.steps.length) {
    const [first, ...rest] = ladder.steps;
    let line = `Наберёшь ${testName(ladder.test)} ${first.score} — можно будет подавать ещё в ${first.gained} ${programsWord(first.gained)}`;
    for (const step of rest) line += `, ${step.score} — ещё в ${step.gained}`;
    lines.push(`${line}.`);
  }

  const missing = topField(rows, (r) => r.status === 'unknown' && r.code?.endsWith('.no-value') && FILL[r.field]);
  if (missing) {
    lines.push(`Укажи ${FILL[missing.field]} — без этого не проверить ${missing.count} ${programsWord(missing.count)}.`);
  }

  const blocker = topField(rows, (r) => r.status === 'fail');
  if (blocker) {
    const ways = rows.filter(
      (row) =>
        row.verdict.reasons.some((r) => r.status === 'fail' && r.field === blocker.field) &&
        (row.program.workaroundFields ?? []).includes(blocker.field),
    ).length;
    const tail = ways ? `, у ${ways} из них есть обходной путь` : '';
    lines.push(`${BLOCKER[blocker.field]} закрывает ${blocker.count} ${programsWord(blocker.count)}${tail}.`);
  }

  return lines;
}
