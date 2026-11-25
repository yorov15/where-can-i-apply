// Строка награды: название, место, уровень, когда. Только то, что написал ученик.
import { measure, clean } from './measure.js';
import { LEVEL_LABELS } from '../materials-plan.js';

export function awardLine(entry, limit = {}) {
  const level = LEVEL_LABELS.find(([code]) => code === entry?.level)?.[1] ?? '';
  const missing = [];
  if (!level) missing.push('level');
  if (!entry?.place) missing.push('place');
  if (!entry?.period) missing.push('period');
  if (!entry?.url && (!entry?.proof || entry.proof === 'none')) missing.push('proof');
  const text = [entry?.title, entry?.place, level && `уровень: ${level}`, entry?.period].map(clean).filter(Boolean).join(', ');
  return { ...measure(text, limit), missing };
}
