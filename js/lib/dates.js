// Полных лет на дату onDate. Обе даты — строки YYYY-MM-DD.
// Строки, а не Date: Date в браузере тянет часовой пояс, и человек,
// родившийся 1 января, в другом поясе оказывается на год моложе.
export function ageAt(birthDate, onDate) {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = onDate.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return age;
}

// Сколько дней прошло с даты iso до today (обе — YYYY-MM-DD). Через UTC,
// чтобы переход на летнее время не давал лишний или пропавший день.
export function daysSince(iso, today) {
  const [y1, m1, d1] = iso.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

// Данные старше этого срока показываем с предупреждением: сроки и условия
// программ меняются, а главное обещание сайта — актуальность.
export const STALE_DAYS = 60;

export const isStale = (iso, today) => Boolean(iso) && daysSince(iso, today) > STALE_DAYS;
