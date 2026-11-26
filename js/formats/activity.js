// Строка активности для форм вроде Common App: роль, что сделал, результат.
// Часы, недели и классы формы спрашивают отдельными полями — их отсутствие
// показываем в missing, но в текст строки не вписываем.
import { measure, sentence } from './measure.js';

export function activityLine(entry, limit = {}) {
  const missing = [];
  if (!entry?.role) missing.push('role');
  if (!entry?.actions) missing.push('actions');
  if (!entry?.result) missing.push('result');
  if (entry?.hoursPerWeek == null) missing.push('hours');
  if (entry?.weeksPerYear == null) missing.push('weeks');
  if (!entry?.grades?.length) missing.push('grades');
  return { ...measure(sentence([entry?.role, entry?.actions, entry?.result]), limit), missing };
}
