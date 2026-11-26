// Проверка перед отправкой, без ИИ. ok: true — пройдено, false — есть что
// поправить, null — нечего проверять (нет строк, эссе или рекомендаций).
// Переводы подтверждений здесь не проверяются: они в библиотеке документов.
import { ordered } from './cv.js';

const ESSAY_LIST = 3;
const title = entry => String(entry?.title ?? '').trim().toLowerCase();

export function preflight({ goalId, table, entries = [], order = [], recommenders, lines = [], essays = [] } = {}) {
  // Записи под цель: из порядка шага 4б, а пока его нет — связанные с целью.
  const chosen = order.length ? ordered(entries, order).filter(entry => order.includes(entry.id))
    : entries.filter(entry => (entry.goals ?? []).some(item => item.goalId === goalId));
  const checks = [];

  const long = lines.filter(item => item.over > 0);
  checks.push({ rule: 'limits', ok: lines.length ? !long.length : null, entryIds: long.map(item => item.entryId).filter(Boolean),
    ru: lines.length ? (long.length ? 'Не всё влезает в предел формы.' : 'Все строки влезают.') : 'Строк ещё нет.' });

  const thin = chosen.filter(entry => !entry.actions || !entry.result);
  checks.push({ rule: 'content', ok: chosen.length ? !thin.length : null, entryIds: thin.map(entry => entry.id),
    ru: chosen.length ? (thin.length ? 'У части записей нет «что сделал» или результата.' : 'У каждой записи есть действие и результат.') : 'Записей под цель нет.' });

  const texts = essays.map(text => String(text ?? '').toLowerCase()).filter(Boolean);
  const listed = texts.length ? chosen.filter(entry => title(entry).length >= 4 && texts.some(text => text.includes(title(entry)))) : [];
  const overlap = listed.length >= ESSAY_LIST;
  checks.push({ rule: 'essayOverlap', ok: texts.length ? !overlap : null, entryIds: overlap ? listed.map(entry => entry.id) : [],
    ru: texts.length ? (overlap ? 'Эссе перечисляет записи подряд — это уже есть в списке активностей.' : 'Эссе не повторяет список активностей.') : 'Эссе ещё нет.' });

  const unproved = chosen.filter(entry => entry.level && !entry.url && (!entry.proof || entry.proof === 'none'));
  const awards = chosen.filter(entry => entry.level);
  checks.push({ rule: 'proof', ok: awards.length ? !unproved.length : null, entryIds: unproved.map(entry => entry.id),
    ru: awards.length ? (unproved.length ? 'У части наград нет подтверждения.' : 'У каждой награды есть подтверждение.') : 'Наград в списке нет.' });

  const asked = table?.rows?.filter(row => row.type === 'recommendation')
    .flatMap(row => row.goals.filter(item => item.goalId === goalId && item.need !== 'optional')) ?? [];
  const need = asked.reduce((sum, item) => sum + (item.count ?? 1), 0);
  const people = (recommenders?.people ?? []).filter(person => person.goals.some(item => item.goalId === goalId));
  const sent = people.filter(person => person.goals.some(item => item.goalId === goalId && item.status === 'sent'));
  const pending = people.filter(person => !sent.includes(person));
  checks.push({ rule: 'recommenders', ok: need ? sent.length >= need && !pending.length : null, entryIds: [],
    ru: need ? `Письма отправлены: ${sent.length} из ${need}.` : 'Программа не просит рекомендаций или мы этого не знаем.' });

  return checks;
}
