// Индекс — всё для ответа, сводки и свёрнутых карточек. Детали — ссылка на
// подачу, источник и заметка о деньгах: без них не собрать план. Тексты
// условий едут отдельным файлом на программу и только когда карточку
// раскрыли: раньше они приезжали вместе с деталями, и за них платил каждый.
async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Не удалось загрузить данные: ${res.status}`);
  return res.json();
}

export const loadIndex = () => loadJson('data/index.json');
export const loadDetails = () => loadJson('data/details.json');

// Копия держится в памяти: карточку можно раскрыть и закрыть несколько раз,
// и каждый раз идти в сеть незачем. В кэш кладётся промис, а не результат,
// чтобы второе раскрытие не начало вторую загрузку.
const conditions = new Map();

// Список условий программы или null, если файл не приехал. null отличается
// от пустого списка: пустой значит «условий нет», null — «ещё не знаем», и
// карточка не должна выдавать второе за первое.
export function loadConditions(id) {
  if (!conditions.has(id)) {
    conditions.set(
      id,
      loadJson(`data/conditions/${encodeURIComponent(id)}.json`)
        .then((data) => data.textConditions ?? [])
        .catch(() => null),
    );
  }
  return conditions.get(id);
}
