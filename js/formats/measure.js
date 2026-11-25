// Счётчик для любого формата: сколько занято и сколько лишнего.
// Текст Nerio не сокращает и не дописывает: резать до предела — дело ученика.
export const MISSING_LABELS = [['role', 'роль'], ['actions', 'что сделал'], ['result', 'результат'], ['hours', 'часов в неделю'],
  ['weeks', 'недель в году'], ['grades', 'в каких классах'], ['level', 'уровень награды'], ['place', 'место'],
  ['proof', 'подтверждение'], ['period', 'когда']];

// chars — символы Юникода с пробелами, words — куски между пробелами.
export function count(text, unit) {
  const value = String(text ?? '');
  if (unit === 'words') return value.trim() ? value.trim().split(/\s+/u).length : 0;
  return [...value].length;
}

export function measure(text, { unit = 'chars', max = null, limitSource = null } = {}) {
  const value = String(text ?? '');
  const known = Number.isInteger(max) && max > 0;
  const used = count(value, unit);
  return { text: value, unit, max: known ? max : null, used, over: known ? Math.max(0, used - max) : 0,
    limitSource: known && limitSource ? { evidence: limitSource.evidence, url: limitSource.url } : null };
}

// Поля ученика склеиваются как есть, без хвостовой точки перед следующей частью.
export const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim().replace(/[.;,]+$/u, '');
export const sentence = parts => parts.map(clean).filter(Boolean).join('. ');
