// Даты и числа так, как их говорит человек. Даты приходят строками
// YYYY-MM-DD и так и считаются: Date в браузере тянет часовой пояс.
import { deadlineState } from './deadline.js';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// Плитка даты для календаря сроков: число и месяц тремя буквами.
export function dateTile(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return { day: String(d), month: MONTHS[m - 1].slice(0, 3) };
}

export function plural(n, one, few, many) {
  const tens = Math.abs(n) % 100;
  const ones = tens % 10;
  if (tens > 10 && tens < 20) return many;
  if (ones === 1) return one;
  if (ones >= 2 && ones <= 4) return few;
  return many;
}

export function daysBetween(from, to) {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function timeLeft(today, date) {
  const days = daysBetween(today, date);
  if (days < 0) return null;
  if (days === 0) return 'сегодня последний день';
  if (days < 14) {
    return `${plural(days, 'остался', 'осталось', 'осталось')} ${days} ${plural(days, 'день', 'дня', 'дней')}`;
  }
  if (days <= 60) {
    const weeks = Math.floor(days / 7);
    return `осталось ${weeks} ${plural(weeks, 'неделя', 'недели', 'недель')}`;
  }
  const months = Math.floor(days / 30);
  if (days - months * 30 >= 15) return `осталось ${months},5 месяца`;
  return `осталось ${months} ${plural(months, 'месяц', 'месяца', 'месяцев')}`;
}

export function joinAnd(words) {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} и ${words.at(-1)}`;
}

export function deadlineLine(deadline, today) {
  const state = deadlineState(deadline, today);
  if (state === 'unknown') return 'Сроки программа не объявила';
  if (state === 'closed') {
    const again = deadline.recurring === 'annual' ? ', обычно повторяется каждый год' : '';
    return `Приём закрыт ${formatDate(deadline.closes)}${again}`;
  }
  const tail = deadline.confidence !== 'confirmed' ? ' (ожидаемая дата)' : '';
  if (state === 'upcoming') {
    return `Приём с ${formatDate(deadline.opens)}, до ${formatDate(deadline.closes)}${tail}`;
  }
  return `Подать до ${formatDate(deadline.closes)} · ${timeLeft(today, deadline.closes)}${tail}`;
}

const PARTS = [['tuition', 'учёбу'], ['living', 'жильё'], ['travel', 'перелёт']];

export function coverageLine(coverage) {
  const c = coverage ?? {};
  const covered = PARTS.filter(([key]) => c[key] === true).map(([, word]) => word);
  const own = PARTS.filter(([key]) => c[key] === false).map(([, word]) => word);
  if (!covered.length && !own.length) return 'Что покрывает — в подробностях';
  const ownText = own.length ? `${joinAnd(own)} — за свой счёт` : '';
  if (!covered.length) return ownText.charAt(0).toUpperCase() + ownText.slice(1);
  return `Покрывает ${joinAnd(covered)}${ownText ? `; ${ownText}` : ''}`;
}
