// Общий маршрут: разделяем один экзамен только там, где есть общий
// принимаемый вариант. TOEFL по разным шкалам не сравниваем как числа.
import { buildRoute, weekOf } from './route.js';
import { isDone } from './route-state.js';
import { taskKey } from './plan.js';
import { testName } from './wording.js';

const TRACK = { IELTS: 'ielts', TOEFL_IBT: 'toefl', TOEFL_IBT_2026: 'toefl', SAT: 'sat', ACT: 'act', DUOLINGO: 'duolingo', HSK: 'hsk', TOPIK: 'topik' };
const TEST = { ielts: 'IELTS', toefl: 'TOEFL_IBT_2026', sat: 'SAT', act: 'ACT', duolingo: 'DUOLINGO', hsk: 'HSK', topik: 'TOPIK' };
const GROUP = { ielts: 'english', toefl: 'english', duolingo: 'english', sat: 'standard', act: 'standard', nuet: 'standard', 'uca-test': 'standard', eju: 'standard', hsk: 'chinese', topik: 'korean' };
const hash = text => taskKey('', text).slice(1);
const uniq = values => [...new Set(values)];
const phaseOrder = ['tests', 'inquiry', 'docs', 'money', 'apply', 'after'];

export function buildCombinedRoute({ contexts = [], profile, today, tracks = {}, state }) {
  const routes = contexts.map(context => ({ context, route: buildRoute({ ...context, profile, today, tracks, state }) }));
  const shared = new Map();
  const exams = [];
  for (const { context, route } of routes) {
    const { program, conditions } = context;
    for (const original of route.steps) {
      const group = original.testGroup ?? GROUP[original.track] ?? original.track;
      const sourceConditions = (conditions ?? []).filter(condition => original.kind === 'test'
        ? condition.test?.group === group || (condition.test?.group === 'language' && group === 'english')
        : condition.ru === original.title);
      const legacyIds = [original.id, ...sourceConditions.flatMap(condition => [
        `${program.id}:${condition.kind === 'documents' ? 'document' : original.kind}:${hash(condition.ru)}`,
        taskKey(program.id, condition.ru),
        ...(condition.kind === 'documents' && !condition.test ? [`doc:text-${hash(condition.ru)}`] : []),
      ])];
      const member = { programId: program.id, name: program.name?.ru ?? program.id, detail: original.detail,
        advisory: program.eligibility?.[group === 'standard' ? 'exam' : 'language']?.advisory === true,
        options: original.options ?? program.eligibility?.[group === 'standard' ? 'exam' : 'language']?.anyOf ?? [] };
      if (original.kind === 'test') {
        // Не добавляем IELTS, если исходное правило разрешает только TOEFL.
        const options = member.options.filter(option => (GROUP[TRACK[option.test]] ?? group) === group);
        const candidates = original.referenceOnly ? [] : options.length ? uniq(options.map(option => option.test))
          : original.track ? [TEST[original.track] ?? original.track] : [];
        const compatible = candidates.length && exams.find(entry => entry.group === group
          && entry.candidates.some(code => candidates.includes(code)));
        if (compatible) {
          compatible.candidates = compatible.candidates.filter(code => candidates.includes(code));
          compatible.members.push(member);
          compatible.legacyIds.push(...legacyIds);
        } else exams.push({ ...original, group, candidates, members: [member], legacyIds });
        continue;
      }
      const doc = sourceConditions.find(condition => typeof condition.doc === 'string')?.doc;
      const id = original.kind === 'document' ? `doc:${doc ?? `text-${hash(original.title)}`}`
        : original.kind === 'apply' ? `apply:${program.id}` : `${original.kind}:${program.id}:${hash(original.title)}`;
      const same = shared.get(id);
      if (same) { same.members.push(member); same.legacyIds.push(...legacyIds); }
      else shared.set(id, { ...original, id, members: [member], legacyIds });
    }
  }
  for (const entry of exams) {
    const have = [...(profile?.languageTests ?? []), ...(profile?.exams ?? [])];
    const choice = entry.candidates.find(code => have.some(result => result.test === code && Number.isFinite(result.score)
      && entry.members.every(member => member.advisory || member.options
        .filter(option => option.test === code).every(option => option.min == null || result.score >= option.min))))
      ?? entry.candidates.find(code => have.some(result => result.test === code))
      ?? entry.candidates.find(code => code === 'TOEFL_IBT_2026') ?? entry.candidates[0];
    const track = TRACK[choice] ?? (choice && tracks[choice] ? choice : entry.track);
    const targets = entry.members.flatMap(member => member.options.filter(option => option.test === choice));
    const minimums = entry.members.filter(member => !member.advisory)
      .flatMap(member => member.options.filter(option => option.test === choice).map(option => option.min))
      .filter(value => typeof value === 'number' && Number.isFinite(value));
    const minimum = minimums.length ? Math.max(...minimums) : null;
    const recommendations = entry.members.filter(member => member.advisory)
      .flatMap(member => member.options.filter(option => option.test === choice).map(option => option.min))
      .filter(value => typeof value === 'number' && Number.isFinite(value));
    const recommended = recommendations.length ? Math.max(...recommendations) : null;
    const idCode = choice === 'TOEFL_IBT' ? 'toefl-legacy' : TRACK[choice] ?? choice;
    const id = idCode ? `test:${idCode}` : `test:${entry.group ?? 'unknown'}:${entry.members[0].programId}`;
    const label = choice ? testName(choice) : null;
    shared.set(id, { ...entry, id, track,
      title: label && entry.members.length > 1 ? `Подготовить ${label}${minimum != null ? ` от ${minimum}` : recommended != null ? ` (рекомендуют ${recommended})` : ''}` : entry.title,
      target: choice ? { test: choice, min: minimum, parts: targets.some(option => option.parts === true),
        ...(recommended != null ? { recommendedMin: recommended } : {}) } : null });
  }
  const steps = [...shared.values()].map(step => ({ ...step,
    programIds: uniq(step.members.map(member => member.programId)),
    legacyIds: uniq(step.legacyIds),
    done: isDone(state, step.id) || step.legacyIds.some(id => isDone(state, id)),
    detail: step.members.length > 1 ? step.members.map(member => `${member.name}: ${member.detail || step.title}`).join('\n') : step.detail,
  })).sort((a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase));
  const goals = routes.map(({ route, context }) => ({ ...route.goal, id: route.id, prepared: route.prepared,
    conditionsLoaded: route.conditionsLoaded, note: context.prepared?.note ?? null }));
  const nearest = goals.filter(goal => goal.deadline.state !== 'closed' && goal.deadline.closes)
    .sort((a, b) => a.deadline.closes.localeCompare(b.deadline.closes))[0];
  const goal = goals.length === 1 ? goals[0] : { name: `${goals.length} целей поступления`, deadline: nearest?.deadline ?? { closes: null, state: 'unknown', daysLeft: null } };
  const total = steps.length;
  const done = steps.filter(step => step.done).length;
  return { id: goals.map(goal => goal.id).join(','), goal, goals, steps,
    prepared: goals.every(goal => goal.prepared), conditionsLoaded: goals.every(goal => goal.conditionsLoaded),
    gaps: routes.flatMap(({ route }) => route.gaps.map(reason => ({ ...reason, programName: route.goal.name }))),
    gapNotes: uniq(routes.flatMap(({ route }) => route.gapNotes ?? [])),
    applyNotes: routes.flatMap(({ route }) => route.applyNotes.map(note => `${route.goal.name}: ${note}`)),
    notes: uniq(routes.flatMap(({ route }) => route.notes)),
    week: weekOf(steps, goal, today), stats: { total, done, percent: total ? Math.round(done / total * 100) : 0 },
  };
}
