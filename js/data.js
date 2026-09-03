// Индекс — один файл со всем, что нужно для вердикта. Цитаты и источники
// в него не входят: они нужны только когда человек открыл карточку.
export async function loadIndex() {
  const res = await fetch('data/index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Не удалось загрузить данные: ${res.status}`);
  return res.json();
}
