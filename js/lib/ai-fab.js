// Кнопка «Спросить ИИ»: когда её показывать и что открыть в панели.
// Чистые функции, их проверяет tests/ai-fab.test.js. Работа с DOM — в js/ai-fab.js.

// screen — document.body.dataset.screen; landing — на «Сегодня» стоит первый экран.
// На анкете и на первом экране кнопка мешала бы главному действию.
export function fabShown({ screen, landing = false, enabled = true }) {
  if (!enabled || !screen || screen === 'profile' || screen === 'start') return false;
  return !(screen === 'today' && landing);
}

// В «Моём пути» и на «Сегодня» нужнее наставник, в каталоге и на программе — объяснение.
export const fabMode = (screen) => (screen === 'today' || screen === 'route' ? 'mentor' : 'explain');

// Что может «Объяснить» на этом экране. block — блок объяснения на странице программы:
// null — его нет, иначе { button, disabled, answer }: есть ли кнопка, занята ли она, есть ли ответ.
export function explainState({ program = false, block = null }) {
  if (!program) return 'catalog';
  if (!block) return 'profile';
  if (block.answer || !block.button || block.disabled) return 'shown';
  return 'run';
}

// Что может «Наставник». block — блок наставника на «Сегодня»: { button, disabled, answer }.
export function mentorState({ screen, on = true, block = null }) {
  if (!on) return 'off';
  if (screen === 'route') return 'go';
  if (screen !== 'today') return 'today';
  if (!block) return 'empty';
  if (block.answer || !block.button || block.disabled) return 'shown';
  return 'run';
}
