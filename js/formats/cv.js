// CV из записей: награды отдельной секцией, остальное — по видам записей.
// order — порядок записей под цель (portfolio.order[goalId]); записи вне
// него идут следом в прежнем порядке.
import { EXPERIENCE_KINDS } from '../portfolio.js';
import { sentence, clean } from './measure.js';

export function ordered(entries, order = []) {
  const list = Array.isArray(entries) ? entries : [];
  const rank = new Map((Array.isArray(order) ? order : []).map((id, i) => [id, i]));
  return list.map((entry, i) => ({ entry, i })).sort((a, b) =>
    (rank.get(a.entry.id) ?? rank.size + a.i) - (rank.get(b.entry.id) ?? rank.size + b.i)).map(({ entry }) => entry);
}

function line(entry) {
  const head = [clean(entry.title), clean(entry.role)].filter(Boolean).join(' — ');
  const when = clean(entry.period);
  return sentence([when ? `${head} (${when})` : head, entry.actions, entry.result]);
}

export function cv(entries, { order = [] } = {}) {
  const list = ordered(entries, order);
  const sections = [];
  const awards = list.filter(entry => entry.level);
  if (awards.length) sections.push({ title: 'Награды', lines: awards.map(entry => ({ entryId: entry.id, text: line(entry) })) });
  for (const [kind, title] of EXPERIENCE_KINDS) {
    const lines = list.filter(entry => !entry.level && entry.kind === kind).map(entry => ({ entryId: entry.id, text: line(entry) }));
    if (lines.length) sections.push({ title, lines });
  }
  const text = sections.map(section => [section.title, ...section.lines.map(item => `• ${item.text}`)].join('\n')).join('\n\n');
  return { sections, text };
}
