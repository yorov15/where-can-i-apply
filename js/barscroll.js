// Липкая панель поиска и фильтров на телефоне занимает пятую часть экрана,
// пока человек читает карточку. Поэтому она уходит вверх, когда он листает
// вниз, и возвращается при первом движении назад.
//
// Решение — чистая функция, она покрыта тестом. setupBarHide только слушает
// прокрутку и, как вся работа с DOM в проекте, тестами не покрыта.

const STEP = 6;

// Возвращает {away, last}: спрятана ли панель и от какой точки считать
// следующий сдвиг. Пока сдвиг меньше шага, точка отсчёта стоит на месте,
// чтобы медленная прокрутка тоже набрала шаг.
export function nextBarState({ away, last }, y, barHeight) {
  if (y < barHeight) return { away: false, last: y };
  const delta = y - last;
  if (delta > STEP) return { away: true, last: y };
  if (delta < -STEP) return { away: false, last: y };
  return { away, last };
}

export function setupBarHide(bar, query = '(max-width: 63.99rem)') {
  if (!bar || !window.matchMedia) return;
  const phone = window.matchMedia(query);
  let state = { away: false, last: window.scrollY };
  // Браузер и так шлёт scroll не чаще раза за кадр, отдельная очередь не нужна.
  window.addEventListener('scroll', () => {
    const height = bar.offsetHeight;
    state = phone.matches && height
      ? nextBarState(state, window.scrollY, height)
      : { away: false, last: window.scrollY };
    bar.classList.toggle('is-away', state.away);
  }, { passive: true });
}
