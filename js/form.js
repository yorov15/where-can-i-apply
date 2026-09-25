// Единственный файл, который знает про поля формы. Читает и пишет
// профиль в той же форме, что описана в js/profile.js.
import { emptyProfile, profileSummary, profileReady } from './profile.js';
import { SCORE_LIMITS, GPA_LIMITS, scoreProblem, gpaProblem, graduationYearProblem, birthDateProblem } from './lib/limits.js';

// TOEFL_IBT — старая шкала 0–120 (сдан до 21 января 2026), TOEFL_IBT_2026 —
// новая шкала 1–6. Сохранённые раньше профили знают только первый, и
// это верно: до этой правки анкета принимала лишь баллы 0–120.
const LANG_TESTS = ['IELTS', 'TOEFL_IBT', 'TOEFL_IBT_2026', 'DUOLINGO'];

const num = (v) => (v === '' || v == null ? null : Number(v));

const today = () => new Date().toISOString().slice(0, 10);

// Что не так в анкете: список {name, message}. name — имя поля формы.
// Пустое поле не ошибка, ошибка — значение вне границ (js/lib/limits.js).
export function formProblems(root) {
  const f = root.elements;
  const found = [];
  const add = (name, message) => { if (message) found.push({ name, message }); };
  add('graduationYear', graduationYearProblem(num(f.graduationYear.value)));
  add('birthDate', birthDateProblem(f.birthDate.value, today()));
  add('gpaValue', gpaProblem(num(f.gpaValue.value), f.gpaScale.value));
  for (const t of LANG_TESTS) add(`score-${t}`, scoreProblem(t, num(f[`score-${t}`].value)));
  return found;
}

// Значение с ошибкой в профиль не попадает: ответ считается так, будто
// поле пустое, а не по числу, которого не бывает.
export function readForm(root) {
  const f = root.elements;
  const profile = emptyProfile();
  const bad = new Set(formProblems(root).map((p) => p.name));
  const clean = (name, value) => (bad.has(name) ? null : value);

  profile.citizenship = f.citizenship.value || null;
  profile.schoolCountry = f.schoolCountry.value || null;
  profile.schoolYears = num(f.schoolYears.value);
  profile.graduationYear = clean('graduationYear', num(f.graduationYear.value));
  profile.birthDate = clean('birthDate', f.birthDate.value || null);
  profile.gpa = { value: clean('gpaValue', num(f.gpaValue.value)), scale: f.gpaScale.value };

  profile.languageTests = LANG_TESTS
    .filter((t) => f[`has-${t}`].checked)
    .map((t) => ({ test: t, score: clean(`score-${t}`, num(f[`score-${t}`].value)) }));

  return profile;
}

// Границы полей берутся из limits.js: и подсказка мобильной клавиатуре, и
// стрелки в поле идут по настоящим значениям.
export function applyLimits(root) {
  const f = root.elements;
  for (const [test, limit] of Object.entries(SCORE_LIMITS)) {
    const input = f[`score-${test}`];
    input.min = limit.min;
    input.max = limit.max;
    input.step = limit.step;
  }
  const gpa = GPA_LIMITS[f.gpaScale.value] ?? GPA_LIMITS.TJ_5;
  f.gpaValue.min = gpa.min;
  f.gpaValue.max = gpa.max;
  f.gpaValue.step = 'any';
  f.gpaValue.placeholder = gpa.example;
  const year = today().slice(0, 4);
  f.birthDate.max = `${Number(year) - 10}-12-31`;
  f.birthDate.min = '1985-01-01';
}

// Красная рамка у неверного поля и одна строка объяснения в своём шаге.
export function paintProblems(root) {
  const problems = formProblems(root);
  const badNames = new Set(problems.map((p) => p.name));
  for (const input of root.querySelectorAll('input, select')) {
    if (badNames.has(input.name)) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  for (const step of root.querySelectorAll('.step')) {
    const note = step.querySelector('.field-error');
    if (!note) continue;
    note.textContent = problems
      .filter((p) => step.querySelector(`[name="${p.name}"]`))
      .map((p) => p.message)
      .join('. ');
  }
  return problems;
}

export function writeForm(root, profile) {
  const f = root.elements;

  f.citizenship.value = profile.citizenship ?? '';
  f.schoolCountry.value = profile.schoolCountry ?? '';
  f.schoolYears.value = profile.schoolYears ?? '';
  f.graduationYear.value = profile.graduationYear ?? '';
  f.birthDate.value = profile.birthDate ?? '';
  f.gpaValue.value = profile.gpa?.value ?? '';
  f.gpaScale.value = profile.gpa?.scale ?? 'TJ_5';

  for (const t of LANG_TESTS) {
    const got = (profile.languageTests ?? []).find((x) => x.test === t);
    f[`has-${t}`].checked = Boolean(got);
    f[`score-${t}`].value = got?.score ?? '';
  }
  applyLimits(root);
  paintProblems(root);
}

export function onProfileChange(root, handler) {
  const fire = () => {
    applyLimits(root);
    paintProblems(root);
    handler(readForm(root));
  };
  root.addEventListener('input', fire);
  root.addEventListener('change', fire);
}

// Анкета сворачивается в строку, когда главное уже заполнено, — и не
// сворачивается сама, пока человек печатает.
export function setupProfileBox({ box, summary, button, target }, profile) {
  box.open = !profileReady(profile);
  summary.textContent = profileSummary(profile);
  button.addEventListener('click', () => {
    box.open = false;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  });
  return {
    update(next) {
      summary.textContent = profileSummary(next);
    },
  };
}
