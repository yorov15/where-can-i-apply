// Короткое обучение по месту. Заставку из нескольких экранов перед сайтом
// люди пролистывают, не читая (NN/g, «Mobile-App Onboarding»), поэтому
// подсказка одна строка и появляется там, где нужна: на экране, куда
// человек попал впервые. «Понятно» убирает её навсегда на этом устройстве.
export const TIPS_KEY = 'nerio-tips';

export const TIPS = {
  answer: 'Это каталог. Сверху те, куда ты подходишь по условиям. Нажми на программу — увидишь срок и что собрать, а «В мой путь» добавит её в план.',
  program: 'Сверху — срок и что оплачивает программа. «В мой путь» добавит её в твой план, «Открыть сайт программы» ведёт на официальную страницу.',
  path: 'Здесь твой план: дела на эту неделю и сроки. Сделал дело — отметь его. Не знаешь, с чего начать, — нажми «Спросить Неро».',
};

export function readSeen(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(TIPS_KEY) ?? '[]');
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

export function markSeen(name, storage = globalThis.localStorage) {
  const seen = readSeen(storage);
  seen.add(name);
  try { storage.setItem(TIPS_KEY, JSON.stringify([...seen])); } catch { /* приватный режим: покажем ещё раз */ }
}

// Какую подсказку показать: экран сайта → ключ TIPS или null.
// Пока виден блок «Шаг 1 из 2», вторую подсказку не добавляем.
export function tipFor(screen, { hasPlan, guided, seen }) {
  if (guided) return null;
  const key = screen === 'answer' ? 'answer'
    : screen === 'program' ? 'program'
      : (screen === 'today' || screen === 'route') && hasPlan ? 'path' : null;
  return key && !seen.has(key) ? key : null;
}

export function renderTip(box, key, onClose) {
  box.textContent = '';
  box.hidden = !key;
  if (!key) return;
  const text = document.createElement('span');
  text.textContent = `${TIPS[key]} `;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'link-button';
  close.textContent = 'Понятно';
  close.addEventListener('click', () => { onClose(key); box.hidden = true; });
  box.append(text, close);
}
