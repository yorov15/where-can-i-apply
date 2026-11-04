// Состояние приёма — отдельный признак карточки, а не часть вердикта.
// Не пройти по возрасту и опоздать на две недели — разные вещи с разными
// действиями, и красить их одним цветом значит врать.
//
// Даты в формате YYYY-MM-DD сравниваются как строки: лексикографический
// порядок совпадает с хронологическим, парсить не нужно.
export function deadlineState(deadline, today) {
  if (!deadline || !deadline.closes) return 'unknown';
  if (today > deadline.closes) return 'closed';
  // Без даты открытия известен только срок. Раньше это считалось «приём
  // идёт», и карточка HKUST писала так в сентябре, когда система подачи
  // открывалась лишь в октябре. «Приём идёт» — утверждение, и делать его
  // можно только зная, когда приём начался.
  if (!deadline.opens) return 'due';
  if (today < deadline.opens) return 'upcoming';
  return 'open';
}

// Для фильтра каталога. «Идёт» — только когда программа назвала и начало, и
// конец приёма (см. выше). «Скоро» — до срока не больше 30 дней, включая
// сегодняшний: это видно по одной дате закрытия.
export const SOON_DAYS = 30;

export function deadlineWindow(deadline, today) {
  const state = deadlineState(deadline, today);
  if (state === 'unknown' || state === 'closed') return { open: false, soon: false };
  const [y, m, d] = today.split('-').map(Number);
  const limit = new Date(Date.UTC(y, m - 1, d + SOON_DAYS)).toISOString().slice(0, 10);
  return { open: state === 'open', soon: deadline.closes <= limit };
}

// Следующий набор у прошедшего срока: тот же месяц через год. Это оценка по
// прошлому году, и подписывать её надо именно так. Если программа называла
// начало приёма, оценка — по нему: человеку важно, когда подача откроется.
// Без даты срока или без пометки «каждый год» оценки нет. Месяц, который и
// через год уже прошёл, не показываем: по открытию — берём срок, по сроку —
// данные устарели, не угадываем.
const plusYear = (iso) => {
  const [y, m] = iso.split('-').map(Number);
  return { year: y + 1, month: m };
};
const monthKey = ({ year, month }) => `${year}-${String(month).padStart(2, '0')}`;

export function nextIntake(deadline, today) {
  if (deadlineState(deadline, today) !== 'closed' || deadline.recurring !== 'annual') return null;
  for (const iso of [deadline.opens, deadline.closes]) {
    if (!iso) continue;
    const next = plusYear(iso);
    if (monthKey(next) >= today.slice(0, 7)) return next;
  }
  return null;
}
