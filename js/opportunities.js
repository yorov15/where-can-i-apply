// Стоимость, доступность и сроки — отдельные факты. Неизвестный срок
// не превращается в открытый набор, бесплатная регистрация не бессрочна.
function dayAt(when, zone) {
  if (typeof when === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(when)) return when;
  const date = new Date(when);
  const parts = new Intl.DateTimeFormat('en', { ...(zone && zone !== 'local' ? { timeZone: zone } : {}), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = kind => parts.find(p => p.type === kind).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function expired(day, instant, zone, when) {
  if (instant && !(typeof when === 'string' && when.length === 10)) return new Date(when).getTime() > Date.parse(instant);
  return Boolean(day && day < dayAt(when, zone));
}
export const freeRegistrationClosed = (item, when) => expired(item.freeUntil, item.freeUntilAt, item.deadlineZone, when);

export function opportunityStatus(item, today) {
  if (item.state === 'closed' || expired(item.deadline, item.deadlineAt, item.deadlineZone, today)) return 'closed';
  if (!item.deadline || item.state !== 'confirmed') return 'unknown';
  if (item.opens && item.opens > dayAt(today, item.deadlineZone)) return 'upcoming';
  return 'open';
}

export function opportunityCostText(item, today) {
  if (item.cost !== 'free') return 'Стоимость участия не подтверждена.';
  const status = opportunityStatus(item, today);
  if (status === 'closed') return 'В этом выпуске участие было бесплатным.';
  if (freeRegistrationClosed(item, today)) return 'Бесплатный срок регистрации прошёл. Текущую стоимость уточни у организатора.';
  return 'Участие бесплатно.';
}

export function selectOpportunities(items, { query = '', type = '', openOnly = true, freeOnly = true, today }) {
  const words = query.toLocaleLowerCase('ru').trim().split(/\s+/).filter(Boolean);
  return items.filter(item => {
    if (type && item.type !== type) return false;
    if (openOnly && opportunityStatus(item, today) !== 'open') return false;
    if (freeOnly && (item.cost !== 'free' || freeRegistrationClosed(item, today))) return false;
    const text = [item.name, item.organizer, item.action, item.eligibility].join(' ').toLocaleLowerCase('ru');
    return words.every(word => text.includes(word));
  }).sort((a, b) => (a.freeUntil || a.deadline || '9999').localeCompare(b.freeUntil || b.deadline || '9999') || a.name.localeCompare(b.name));
}
