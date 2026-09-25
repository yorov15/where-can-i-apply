// Переключатель темы. Обычный скрипт (не модуль) и стоит в <head>: модуль
// выполняется после первой отрисовки, и тёмный выбор мигал бы светлым.
// CSP запрещает встроенные скрипты, поэтому это отдельный файл.
(function () {
  var KEY = 'theme';
  var root = document.documentElement;
  var dark = matchMedia('(prefers-color-scheme: dark)');

  function stored() {
    try {
      var value = localStorage.getItem(KEY);
      return value === 'dark' || value === 'light' ? value : null;
    } catch (e) {
      return null;
    }
  }

  function current() {
    return root.getAttribute('data-theme') || (dark.matches ? 'dark' : 'light');
  }

  var saved = stored();
  if (saved) root.setAttribute('data-theme', saved);

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('theme-toggle');
    if (!button) return;

    // Кнопка называет то, что случится по нажатию, а не то, что включено сейчас.
    function paint() {
      var next = current() === 'dark' ? 'light' : 'dark';
      button.setAttribute('data-to', next);
      button.textContent = next === 'dark' ? 'Тёмная тема' : 'Светлая тема';
      button.setAttribute('aria-label', next === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему');
    }

    button.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* режим без хранилища: тема живёт до закрытия вкладки */ }
      paint();
    });
    dark.addEventListener('change', paint);
    button.hidden = false;
    paint();
  });
})();
