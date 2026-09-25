// Сколько стоит подать заявки из плана. Считаем только то, что программа
// прямо называет: сумма и валюта лежат в разметке условия `fee` вместе с
// цитатой. Валюты не переводим — курс придумали бы мы. Где плата нигде не
// названа, так и говорим, а не считаем нулём.
const CURRENCY = {
  USD: 'долл. США', EUR: 'евро', GBP: 'фунтов', AZN: 'манатов', SGD: 'сингапурских долл.',
  KZT: 'тенге', KRW: 'вон', JPY: 'иен', CNY: 'юаней', HKD: 'гонконгских долл.',
  TRY: 'лир', UZS: 'сумов', AED: 'дирхамов', QAR: 'риалов',
};

// 10000 → «10 000» с неразрывным пробелом: сумма не переносится на две строки.
const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const money = (amount, currency) => `${group(amount)} ${CURRENCY[currency] ?? currency}`;

// Первая размеченная плата в условиях программы или null, если её нигде нет.
export function feeOf(extra) {
  return (extra?.textConditions ?? []).find((c) => c.fee)?.fee ?? null;
}

// Для таблицы сравнения.
export function feeCell(fee) {
  if (!fee) return 'Не указана';
  if (fee.amount === 0) return 'Нет';
  return `${money(fee.amount, fee.currency)}${fee.waivedForAid ? ', снимается при заявке на помощь' : ''}`;
}

const shortName = (program) => (program.name?.ru ?? program.id).split(' — ')[0];

// planned — программы плана, details — подробности по id.
export function planCost(planned, details) {
  const totals = new Map();
  const paid = [];
  const free = [];
  const waived = [];
  const unknown = [];
  for (const program of planned) {
    const fee = feeOf(details.programs?.[program.id]);
    const name = shortName(program);
    if (!fee) unknown.push(name);
    else if (fee.amount === 0) free.push(name);
    else if (fee.waivedForAid) waived.push(`${name} (${money(fee.amount, fee.currency)})`);
    else {
      totals.set(fee.currency, (totals.get(fee.currency) ?? 0) + fee.amount);
      paid.push(name);
    }
  }
  return {
    totals: [...totals].map(([currency, amount]) => ({ currency, amount })),
    paid, free, waived, unknown,
  };
}

// Строка для плана. Пустая, если сказать нечего.
export function costText(cost) {
  const parts = [];
  if (cost.totals.length) {
    const sum = cost.totals.map((t) => money(t.amount, t.currency)).join(' + ');
    parts.push(`Плата за подачу: ${sum} (${cost.paid.join(', ')}).`);
  }
  if (cost.free.length) parts.push(`Без платы: ${cost.free.join(', ')}.`);
  if (cost.waived.length) parts.push(`Плату снимают сами, если просишь финансовую помощь: ${cost.waived.join(', ')}.`);
  if (cost.unknown.length) {
    const n = cost.unknown.length;
    parts.push(`Плату ${n === 1 ? 'этой программы' : 'этих программ'} на собранных страницах не нашли, итог может быть больше: ${cost.unknown.join(', ')}.`);
  }
  if (parts.length && cost.totals.length) parts.push('У части вузов плату можно снять, если она тяжела для семьи: смотри «Что подготовить».');
  return parts.join(' ');
}
