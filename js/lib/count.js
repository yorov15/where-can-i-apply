// Обезличенный счёт главных шагов для статистики Vercel. На тарифе Hobby своих
// событий нет, а «просмотр страницы» с адресом /event/… есть: в отчёте Vercel
// он виден как страница с числом посетителей. Уходит только этот адрес —
// анкета, план и даты остаются на устройстве.
//
// Каждый шаг считаем один раз на устройство: тогда число в отчёте — это
// число людей, а не нажатий. Отметка «уже посчитан» лежит здесь же, в
// localStorage, и личного в ней ничего нет.
export const COUNT_KEY = 'nerio-counted';
export const COUNTED_STEPS = ['check-done', 'plan-added', 'link-shared', 'mentor-asked', 'mentor-step', 'returned-7d'];
// День первой проверки (только дата, без времени) — чтобы понять, вернулся ли
// человек через неделю. Лежит рядом с отметкой счёта, личного в нём нет.
export const COUNT_SINCE_KEY = 'nerio-counted-since';
export const RETURN_DAYS = 7;

export function countStep(name, { storage = globalThis.localStorage, send = globalThis.window?.va, today = '' } = {}) {
  if (!COUNTED_STEPS.includes(name) || typeof send !== 'function') return false;
  try {
    const done = new Set(JSON.parse(storage.getItem(COUNT_KEY) ?? '[]'));
    if (done.has(name)) return false;
    send('pageview', { route: `/event/${name}`, path: `/event/${name}` });
    done.add(name);
    storage.setItem(COUNT_KEY, JSON.stringify([...done]));
    if (name === 'check-done' && today && !storage.getItem(COUNT_SINCE_KEY)) storage.setItem(COUNT_SINCE_KEY, today);
    return true;
  } catch {
    // Приватный режим или испорченная отметка: статистика не важнее сайта.
    return false;
  }
}

// «Вернулся»: сайт открыт через 7+ дней после первой проверки. Один раз на
// устройство. Кто прошёл проверку до появления этого счёта, у того дня нет:
// берём за начало сегодняшний день, и неделя отсчитывается от него.
export function countReturn({ storage = globalThis.localStorage, send = globalThis.window?.va, today } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today ?? '')) return false;
  try {
    const done = new Set(JSON.parse(storage.getItem(COUNT_KEY) ?? '[]'));
    if (!done.has('check-done') || done.has('returned-7d')) return false;
    const since = storage.getItem(COUNT_SINCE_KEY);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since ?? '')) { storage.setItem(COUNT_SINCE_KEY, today); return false; }
    const days = (Date.parse(today) - Date.parse(since)) / 86400000;
    if (!(days >= RETURN_DAYS)) return false;
    return countStep('returned-7d', { storage, send });
  } catch {
    return false;
  }
}
