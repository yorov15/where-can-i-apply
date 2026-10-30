// Нижняя панель вкладок: Сегодня, Куда можно, Мой путь. Большой
// палец достаёт до низа экрана, а до кнопки «Назад» вверху и до кнопки посреди
// ответа нет. Вкладки не заводят новых экранов: «Сегодня», «Куда можно»
// (итог и каталог) и «Мой путь» — экраны одного файла.
//
// Выбор вкладки — чистая функция, она покрыта тестом. setupTabbar только
// слушает нажатия и, как вся работа с DOM в проекте, тестами не покрыта.

export function activeTab(hash) {
  if (hash === '#start') return 'today';
  if (hash === '#profile') return 'profile';
  if (hash === '#today' || hash.startsWith('#today/work/')) return 'today';
  if (hash === '#route' || hash.startsWith('#route/')) return 'route';
  if (!hash) return 'today';
  return 'answer';
}

// bar — сама панель; hash и bucket говорят, что сейчас на экране;
// go(name) переключает экран; watch — узел, нажатия в котором меняют фильтр.
export function setupTabbar({ bar, hash, go, watch }) {
  const tabs = [...bar.querySelectorAll('[data-tab]')];
  const count = bar.querySelector('.tab-count');

  const sync = () => {
    const now = activeTab(hash());
    for (const tab of tabs) {
      if (tab.dataset.tab === now) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    }
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      go(tab.dataset.tab);
      sync();
    });
  }
  // Фильтр меняется своим обработчиком на кнопке; мы стоим выше и успеваем после него.
  watch?.addEventListener('click', sync);

  return {
    sync,
    setPlanCount(n) { count.textContent = n > 0 ? String(n) : ''; },
    show(on) { bar.hidden = !on; },
  };
}
