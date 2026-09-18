// Индекс — всё для ответа, сводки и свёрнутых карточек. Детали — тексты
// раскрытой карточки; грузятся следом и ответ не задерживают.
async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Не удалось загрузить данные: ${res.status}`);
  return res.json();
}

export const loadIndex = () => loadJson('data/index.json');
export const loadDetails = () => loadJson('data/details.json');
