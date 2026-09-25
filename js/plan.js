// «Мой план»: программы, которые человек отметил, чтобы к ним вернуться.
// Хранятся только id, в браузере, отдельно от анкеты. Из плана делаются
// две вещи, ради которых он нужен: файл календаря с напоминаниями и текст
// для родителей или учителя.
import { formatDate, plural } from './lib/format.js';
import { deadlineState } from './lib/deadline.js';
import { safeHttpUrl } from './lib/url.js';

export const PLAN_KEY = 'eligibility-plan';

export function loadPlan(storage) {
  try {
    const ids = JSON.parse(storage.getItem(PLAN_KEY) ?? '[]');
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function savePlan(ids, storage) {
  try { storage.setItem(PLAN_KEY, JSON.stringify(ids)); } catch { /* приватный режим */ }
}

// Возвращает новый список: включает программу, если её не было, иначе убирает.
export function togglePlan(ids, id) {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

// Только те программы плана, что ещё есть в данных: id мог исчезнуть после
// обновления, и тогда молча пропускаем его, а не падаем.
export function planPrograms(programs, ids) {
  const byId = new Map(programs.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

const nameOf = (program) => program.name?.ru ?? program.id;

// Сначала ближайший срок, без даты — в конце: торопить нечем.
function byDeadline(a, b) {
  const left = a.deadline?.closes ?? '9999-12-31';
  const right = b.deadline?.closes ?? '9999-12-31';
  return left < right ? -1 : left > right ? 1 : 0;
}

// Текст для мессенджера. Ожидаемые даты помечены: на них нельзя
// опираться как на объявленные.
// urls — адреса сайтов программ по id: в лёгком индексе их нет, они едут
// вместе с подробностями.
export function planText(programs, today, urls = {}) {
  const rows = [...programs].sort(byDeadline);
  if (!rows.length) return '';
  const lines = [`Мой план поступления (${rows.length} ${plural(rows.length, 'программа', 'программы', 'программ')}):`, ''];
  rows.forEach((program, i) => {
    const d = program.deadline;
    let when = 'срок не объявлен';
    if (d?.closes) {
      when = deadlineState(d, today) === 'closed'
        ? `приём закрыт ${formatDate(d.closes)}`
        : `до ${formatDate(d.closes)}${d.confidence === 'confirmed' ? '' : ' (ожидаемая дата)'}`;
    }
    lines.push(`${i + 1}. ${nameOf(program)} — ${when}`);
    const url = safeHttpUrl(urls[program.id] ?? program.applyUrl);
    if (url) lines.push(`   ${url}`);
  });
  lines.push('', 'Даты сверяй на сайте программы. Собрано на kuda-podat.vercel.app');
  return lines.join('\n');
}

// ——— файл календаря (RFC 5545) ———

const escapeText = (text) => text
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

// Строка календаря не длиннее 75 байт; продолжение начинается с пробела.
// Режем по символам, считая байты UTF-8, чтобы не разорвать букву.
export function fold(line) {
  const encoder = new TextEncoder();
  const out = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > limit) {
      out.push(current);
      current = ' ';
      bytes = 1;
      limit = 75;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n');
}

const compact = (iso) => iso.replaceAll('-', '');

function nextDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

// stamp — момент сборки в формате ГГГГММДДTЧЧММССZ. Напоминания: за неделю
// и за день до срока. Закрытые сроки и программы без даты не попадают.
export function buildIcs(programs, today, stamp, urls = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//kuda-podat//plan//RU',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Мой план поступления',
  ];
  let events = 0;
  for (const program of programs) {
    const d = program.deadline;
    if (!d?.closes || deadlineState(d, today) === 'closed') continue;
    const expected = d.confidence !== 'confirmed';
    const url = safeHttpUrl(urls[program.id] ?? program.applyUrl);
    const note = [
      expected ? 'Дата ожидаемая: программа ещё не объявила её на этот год. Проверь на сайте.' : 'Дата подтверждена сайтом программы, но перед подачей сверь ещё раз.',
      url ? `Сайт: ${url}` : '',
    ].filter(Boolean).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${program.id}-${d.closes}@kuda-podat`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(d.closes)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(d.closes))}`,
      `SUMMARY:${escapeText(`Дедлайн${expected ? ' (ожидаемый)' : ''}: ${nameOf(program)}`)}`,
      `DESCRIPTION:${escapeText(note)}`,
    );
    if (url) lines.push(`URL:${url}`);
    for (const before of ['P7D', 'P1D']) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(`Скоро срок: ${nameOf(program)}`)}`,
        `TRIGGER:-${before}`,
        'END:VALARM',
      );
    }
    lines.push('END:VEVENT');
    events += 1;
  }
  lines.push('END:VCALENDAR');
  return { text: `${lines.map(fold).join('\r\n')}\r\n`, events };
}
