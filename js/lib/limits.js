// Допустимые значения полей анкеты. Одно место, из которого берутся и
// атрибуты полей (min, max, step), и проверка: браузер не мешает напечатать
// 45 в IELTS, поэтому границы проверяются в коде.
//
// Пустое поле — не ошибка: анкету можно пропустить частично.

export const SCORE_LIMITS = {
  IELTS: { name: 'IELTS', min: 1, max: 9, step: 0.5 },
  TOEFL_IBT: { name: 'TOEFL iBT (старая шкала)', min: 0, max: 120, step: 1 },
  TOEFL_IBT_2026: { name: 'TOEFL iBT (новая шкала)', min: 1, max: 6, step: 0.5 },
  DUOLINGO: { name: 'Duolingo', min: 10, max: 160, step: 5 },
};

// Балл аттестата. Шаг не задаём: средний балл бывает 4.85 или 8.63.
export const GPA_LIMITS = {
  TJ_5: { min: 1, max: 5, example: '4.8' },
  TJ_10: { min: 1, max: 10, example: '8.5' },
  PERCENT: { min: 1, max: 100, example: '85' },
  GPA_4: { min: 0, max: 4, example: '3.5' },
  GPA_4_5: { min: 0, max: 4.5, example: '4.0' },
};

export const GRADUATION_YEARS = { min: 2020, max: 2035 };
export const BIRTH_YEARS = { min: 1985, youngest: 10 };

const say = (n) => String(n).replace('.', ',');
const onStep = (value, step) => Math.abs(value / step - Math.round(value / step)) < 1e-9;
const blank = (value) => value == null || value === '' || Number.isNaN(value);

export function scoreProblem(test, value) {
  const limit = SCORE_LIMITS[test];
  if (!limit || blank(value)) return null;
  if (value < limit.min || value > limit.max) {
    return `${limit.name}: балл от ${say(limit.min)} до ${say(limit.max)}`;
  }
  if (!onStep(value, limit.step)) {
    return `${limit.name}: балл идёт с шагом ${say(limit.step)}`;
  }
  return null;
}

export function gpaProblem(value, scale) {
  const limit = GPA_LIMITS[scale];
  if (!limit || blank(value)) return null;
  if (value < limit.min || value > limit.max) {
    return `Средний балл по этой шкале — от ${say(limit.min)} до ${say(limit.max)}`;
  }
  return null;
}

export function graduationYearProblem(value) {
  if (blank(value)) return null;
  const { min, max } = GRADUATION_YEARS;
  if (!Number.isInteger(value) || value < min || value > max) return `Год выпуска — от ${min} до ${max}`;
  return null;
}

// today — строка ГГГГ-ММ-ДД. Самый молодой абитуриент — десятилетний.
export function birthDateProblem(iso, today) {
  if (blank(iso)) return null;
  const newest = Number(today.slice(0, 4)) - BIRTH_YEARS.youngest;
  const year = Number(iso.slice(0, 4));
  if (year < BIRTH_YEARS.min || year > newest) {
    return `Проверь дату рождения: год от ${BIRTH_YEARS.min} до ${newest}`;
  }
  return null;
}
