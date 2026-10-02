// Нижняя панель вкладок на телефоне: Итог, Программы, План. Большой палец
// достаёт до низа экрана, а до кнопки «Назад» вверху и до кнопки посреди
// ответа нет. Вкладки не заводят новых экранов: «Итог» и «Программы» — это
// те же два экрана, «План» — каталог с фильтром «В плане».
//
// Выбор вкладки — чистая функция, она покрыта тестом. setupTabbar только
// слушает нажатия и, как вся работа с DOM в проекте, тестами не покрыта.

export function activeTab(onCatalog, bucket) {
  if (!onCatalog) return 'answer';
  return bucket === 'plan' ? 'plan' : 'catalog';
}

// bar — сама панель; isCatalog и bucket говорят, что сейчас на экране;
// go(name) переключает экран; watch — узел, нажатия в котором меняют фильтр.
export function setupTabbar({ bar, isCatalog, bucket, go, watch }) {
  const tabs = [...bar.querySelectorAll('[data-tab]')];
  const count = bar.querySelector('.tab-count');

  const sync = () => {
    const now = activeTab(isCatalog(), bucket());
    for (const tab of tabs) {
      if (tab.dataset.tab === now) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    }
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      if (tab.getAttribute('aria-current') === 'page') window.scrollTo({ top: 0 });
      else go(tab.dataset.tab);
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
