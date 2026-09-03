// Состояние приёма — отдельный признак карточки, а не часть вердикта.
// Не пройти по возрасту и опоздать на две недели — разные вещи с разными
// действиями, и красить их одним цветом значит врать.
//
// Даты в формате YYYY-MM-DD сравниваются как строки: лексикографический
// порядок совпадает с хронологическим, парсить не нужно.
export function deadlineState(deadline, today) {
  if (!deadline || !deadline.closes) return 'unknown';
  if (today > deadline.closes) return 'closed';
  if (deadline.opens && today < deadline.opens) return 'upcoming';
  return 'open';
}
