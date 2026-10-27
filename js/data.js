// Индекс — всё для ответа, сводки и свёрнутых карточек. Детали — ссылка на
// подачу, источник и заметка о деньгах: без них не собрать план. Тексты
// условий едут отдельным файлом на программу и только когда карточку
// раскрыли: раньше они приезжали вместе с деталями, и за них платил каждый.
async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Не удалось загрузить данные: ${res.status}`);
  return res.json();
}

// Запрос мог стартовать раньше, из early.js. Берём его один раз; если он не
// удался или ответил ошибкой, грузим обычным путём.
export async function loadIndex() {
  const early = globalThis.__nerioIndex;
  globalThis.__nerioIndex = null;
  if (early) {
    const res = await early;
    if (res && res.ok) return res.json();
  }
  return loadJson('data/index.json');
}
export const loadDetails = () => loadJson('data/details.json');

// Маршрут: один маленький файл со списком программ, у которых маршрут
// сверен, и с кодами треков подготовки. Треки грузятся по одному и только
// тогда, когда у цели есть экзамен: за все 13 файлов платить незачем.
export const loadRoute = () => loadJson('data/route.json');

const essaySpecs = new Map();
export function loadEssaySpec(id) {
  if(!essaySpecs.has(id)) essaySpecs.set(id,loadJson(`data/prep/${encodeURIComponent(id)}.json`).catch(()=>{essaySpecs.delete(id);return null;}));
  return essaySpecs.get(id);
}

const tracks = new Map();

export function loadTrack(code) {
  if (!tracks.has(code)) {
    tracks.set(code, loadJson(`data/prep/exams/${encodeURIComponent(code)}.json`).catch(() => {
      tracks.delete(code);
      return null;
    }));
  }
  return tracks.get(code);
}

const documents = new Map();
export function loadDocument(code) {
  if (!documents.has(code)) documents.set(code,
    loadJson(`data/prep/docs/${encodeURIComponent(code)}.json`).catch(() => {
      documents.delete(code);
      return null;
    }));
  return documents.get(code);
}

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

// Файл условий не приехал: забываем неудачную попытку, иначе «Повторить»
// вернёт тот же null из памяти и ничего не перезапросит.
export function forgetConditions(id) {
  conditions.delete(id);
}
