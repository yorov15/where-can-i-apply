// Четыре раздела сайта: Подобрать (анкета), Каталог (программы и конкурсы),
// Мой путь (Сегодня и дела по целям) и Справка (вопросы, словарь,
// конфиденциальность). На телефоне это нижняя панель: большой палец достаёт
// до низа экрана. Та же панель стоит на отдельных страницах, там вкладки —
// обычные ссылки на index.html. Решение Мурода 26.11.2026, этап 2.
//
// Выбор вкладки — чистая функция, она покрыта тестом. setupTabbar только
// слушает нажатия и, как вся работа с DOM в проекте, тестами не покрыта.

// home — вкладка для пустого адреса: у вернувшегося с целями там «Сегодня»,
// то есть «Мой путь», а у нового человека — главная, где вкладка не горит.
export function activeTab(hash, home = null) {
  if (!hash) return home;
  if (hash === '#profile') return 'profile';
  if (hash === '#start' || hash === '#today' || hash.startsWith('#today/')) return 'route';
  if (hash === '#route' || hash.startsWith('#route/')) return 'route';
  return 'answer';
}

// bar — сама панель; hash и bucket говорят, что сейчас на экране;
// go(name) переключает экран; watch — узел, нажатия в котором меняют фильтр.
export function setupTabbar({ bar, hash, go, watch, home = () => null }) {
  const tabs = [...bar.querySelectorAll('[data-tab]')];
  const count = bar.querySelector('.tab-count');

  const sync = () => {
    const now = activeTab(hash(), home());
    for (const tab of tabs) {
      if (tab.dataset.tab === now) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    }
  };

  for (const tab of tabs) {
    tab.addEventListener('click', (event) => {
      // «Справка» — отдельная страница: ссылка работает сама.
      if (tab.dataset.tab === 'help') return;
      event.preventDefault();
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
