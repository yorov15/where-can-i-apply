// Кнопка «Спросить Nero»: когда её показывать и какие быстрые кнопки дать в панели.
// Чистые функции, их проверяет tests/ai-fab.test.js. Работа с DOM — в js/ai-fab.js.

// screen — document.body.dataset.screen; landing — на «Сегодня» стоит первый экран.
// На анкете и на первом экране кнопка мешала бы главному действию.
export function fabShown({ screen, landing = false, enabled = true }) {
  if (!enabled || !screen || screen === 'profile' || screen === 'start') return false;
  return !(screen === 'today' && landing);
}

// Быстрые кнопки над чатом. program — открыта страница программы (#program/…):
// там «Объясни мне эту программу»; на «Сегодня» и в «Моём пути» — «Разложи мою неделю».
export function quickActions({ screen, program = false, mentorOn = true }) {
  if (program) return ['explain'];
  if (mentorOn && (screen === 'today' || screen === 'route')) return ['week'];
  return [];
}

// Что может «Объясни мне эту программу». block — блок объяснения на странице программы:
// null — его нет, иначе { button, disabled, answer }: есть ли кнопка, занята ли она, есть ли ответ.
export function explainState({ program = false, block = null }) {
  if (!program) return 'catalog';
  if (!block) return 'profile';
  if (block.answer || !block.button || block.disabled) return 'shown';
  return 'run';
}

// «Разложи мою неделю» на вкладке Nero. block — блок наставника: { button, disabled, answer }.
// Готовый ответ и занятую кнопку только показываем: новый вопрос съел бы дневной предел.
export function weekState(block) {
  if (!block) return 'wait';
  if (block.answer || !block.button || block.disabled) return 'show';
  return 'run';
}
