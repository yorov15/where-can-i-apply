// Сравнение программ из плана рядом. Ничего не считает заново: каждая
// ячейка — те же строки, что уже видны в карточке (ответ, срок, что
// покрывает), плюс требование к экзамену прямо из правил допуска.
import { cardModel } from './card-model.js';
import { testName, joinOr } from './wording.js';
import { feeOf, feeCell } from './cost.js';

// Что программа просит по SAT и ACT. Пустое правило — программа про
// экзамен не говорит или не просит: обещать «не нужен» мы не вправе.
export function examCell(rule) {
  if (!rule) return 'Не указан';
  const options = joinOr((rule.anyOf ?? []).map((o) => (o.min == null ? testName(o.test) : `${testName(o.test)} от ${o.min}`)));
  return rule.optional ? `Не обязателен (${options} по желанию)` : `Нужен ${options}`;
}

// entries — [{ program, verdict, deadline }], как строки каталога.
// Возвращает столбцы (по программе) и строки (по признаку).
export function compareTable(entries, details, today) {
  const models = entries.map((entry) => ({
    entry,
    model: cardModel(entry, details.programs?.[entry.program.id] ?? null, today),
  }));
  const row = (label, pick) => ({ label, cells: models.map(pick) });
  return {
    columns: models.map(({ model }) => ({ id: model.id, title: model.title })),
    rows: [
      row('Подходишь ли', ({ model }) => ({ text: model.headline })),
      row('Срок', ({ model }) => ({ text: model.deadlineLine })),
      row('Что покрывает', ({ model }) => ({ text: model.coverageLine })),
      row('Экзамен', ({ entry }) => ({ text: examCell(entry.program.eligibility?.exam) })),
      row('Плата за подачу', ({ model }) => ({ text: feeCell(feeOf(details.programs?.[model.id])) })),
      row('Сайт', ({ model }) => ({ text: model.applyUrl ? 'Открыть' : '—', href: model.applyUrl })),
    ],
  };
}
