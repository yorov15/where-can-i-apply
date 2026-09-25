// Пошаговая анкета. Один длинный список полей на первом экране отпугивал
// и заваливал ответом пустого профиля; здесь человек отвечает на пару
// вопросов за раз, а ответ ему показывают только когда он закончил.
//
// Логика шагов — чистые функции наверху, они покрыты тестами. Ниже
// setupWizard: он только переключает видимость и фокус, и, как вся работа
// с DOM в проекте, тестами не покрыт.

// Что нужно на каждом шаге. Совпадает с profileReady (проверяется тестом):
// без этих четырёх полей ответ не имеет смысла. Баллы и экзамены можно
// пропустить — программа тогда покажет, чего не хватает.
export const STEP_REQUIRED = [
  ['citizenship', 'schoolCountry', 'schoolYears'],
  ['graduationYear'],
  [],
  [],
];

const ASK = {
  citizenship: 'Выбери гражданство',
  schoolCountry: 'Выбери страну, где оканчиваешь школу',
  schoolYears: 'Выбери, сколько лет длится школа',
  graduationYear: 'Укажи год выпуска',
};

export const askText = (name) => ASK[name] ?? 'Заполни это поле';

export function firstMissing(step, values) {
  const need = STEP_REQUIRED[step] ?? [];
  return need.find((name) => values[name] == null || values[name] === '') ?? null;
}

export function stepView(step, total) {
  return {
    progressText: `Шаг ${step + 1} из ${total}`,
    showBack: step > 0,
    showNext: step < total - 1,
    showFinish: step === total - 1,
  };
}

// Подпись над индикатором: номер шага и его название, чтобы человек видел
// не только «где он», но и «о чём этот шаг».
export function progressWithTitle(view, title) {
  return `${view.progressText} · ${title}`;
}

// Мастер включается только пока человек впервые заполняет анкету. Когда он
// нажал «Показать», анкета становится обычной: все поля разом, как при
// правке. Так «изменить» не заставляет идти по шагам заново.
export function setupWizard({ box, form, progress, progressLabel, back, next, finish, error }) {
  const steps = [...form.querySelectorAll('.step')];
  let step = 0;
  let active = false;

  const values = () => Object.fromEntries(STEP_REQUIRED.flat().map((name) => [name, form.elements[name]?.value ?? '']));

  function paint(moveFocus) {
    const view = stepView(step, steps.length);
    steps.forEach((node, i) => node.classList.toggle('is-current', i === step));
    [...progress.children].forEach((segment, i) => {
      segment.classList.toggle('is-done', i < step);
      segment.classList.toggle('is-current', i === step);
    });
    progressLabel.textContent = progressWithTitle(view, steps[step].querySelector('legend').textContent);
    back.hidden = !view.showBack;
    next.hidden = !view.showNext;
    finish.hidden = !view.showFinish;
    error.textContent = '';
    if (moveFocus) {
      const legend = steps[step].querySelector('legend');
      legend.tabIndex = -1;
      legend.focus();
      box.scrollIntoView({ block: 'start' });
    }
  }

  function setActive(on) {
    active = on;
    box.classList.toggle('wizard', on);
    for (const node of [progress, progressLabel, back, next]) node.hidden = !on;
    if (on) paint(false);
    else finish.hidden = false;
  }

  next.addEventListener('click', () => {
    const missing = firstMissing(step, values());
    if (missing) {
      error.textContent = askText(missing);
      form.elements[missing].focus();
      return;
    }
    step += 1;
    paint(true);
  });

  back.addEventListener('click', () => {
    step -= 1;
    paint(true);
  });

  return {
    start() { step = 0; setActive(true); },
    end() { setActive(false); },
    // На последнем шаге человек мог вернуться назад и стереть обязательное,
    // поэтому «Показать» проверяет всё ещё раз и при пропуске возвращает
    // на тот шаг, где не хватает.
    canFinish() {
      const now = values();
      const at = STEP_REQUIRED.findIndex((_, i) => firstMissing(i, now));
      if (at === -1) return true;
      step = at;
      paint(true);
      error.textContent = askText(firstMissing(at, now));
      return false;
    },
    get active() { return active; },
  };
}
