// Обезличенный счёт главных шагов для статистики Vercel. На тарифе Hobby своих
// событий нет, а «просмотр страницы» с адресом /event/… есть: в отчёте Vercel
// он виден как страница с числом посетителей. Уходит только этот адрес —
// анкета, план и даты остаются на устройстве.
//
// Каждый шаг считаем один раз на устройство: тогда число в отчёте — это
// число людей, а не нажатий. Отметка «уже посчитан» лежит здесь же, в
// localStorage, и личного в ней ничего нет.
export const COUNT_KEY = 'nerio-counted';
export const COUNTED_STEPS = ['check-done', 'plan-added', 'link-shared', 'mentor-asked', 'mentor-step'];

export function countStep(name, { storage = globalThis.localStorage, send = globalThis.window?.va } = {}) {
  if (!COUNTED_STEPS.includes(name) || typeof send !== 'function') return false;
  try {
    const done = new Set(JSON.parse(storage.getItem(COUNT_KEY) ?? '[]'));
    if (done.has(name)) return false;
    send('pageview', { route: `/event/${name}`, path: `/event/${name}` });
    done.add(name);
    storage.setItem(COUNT_KEY, JSON.stringify([...done]));
    return true;
  } catch {
    // Приватный режим или испорченная отметка: статистика не важнее сайта.
    return false;
  }
}
