// Календарь сроков для экрана ответа.
//
// Инструмент не знает, куда человека возьмут: в данных есть страна,
// деньги, сроки и условия допуска — и ничего про конкурс. Поэтому
// наверх идёт не «лучшее», а ближайшее по времени: даты взяты с сайтов
// программ и подтверждены цитатой, в отличие от любой оценки шансов.
//
// Горизонт считается от сегодня, а не по календарным месяцам: «до конца
// месяца» 30 сентября значит один день, а 1 сентября — тридцать.
import { daysBetween } from './lib/format.js';
import { bucketOf } from './wording.js';

const HORIZONS = [
  { key: 'soon', title: 'Закрывается в ближайший месяц', within: 30 },
  { key: 'quarter', title: 'Следующие три месяца', within: 90 },
  { key: 'later', title: 'Позже', within: Infinity },
];

const UNKNOWN = { key: 'unknown', title: 'Срок пока не объявлен' };

export function horizonOf(program, today) {
  const closes = program.deadline?.closes;
  if (!closes) return UNKNOWN.key;
  const days = daysBetween(today, closes);
  if (days < 0) return UNKNOWN.key;
  return HORIZONS.find((h) => days <= h.within).key;
}

export function agenda(rows, today) {
  const open = rows.filter((row) => row.deadline !== 'closed' && bucketOf(row.verdict) === 'yes');

  return [...HORIZONS, UNKNOWN]
    .map(({ key, title }) => ({
      key,
      title,
      rows: open
        .filter((row) => horizonOf(row.program, today) === key)
        .sort((a, b) => (a.program.deadline?.closes ?? '') < (b.program.deadline?.closes ?? '') ? -1 : 1),
    }))
    .filter((group) => group.rows.length);
}
