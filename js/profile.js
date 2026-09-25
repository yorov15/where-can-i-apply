// Профиль живёт только в браузере пользователя и никуда не отправляется.
// Бэкенда у инструмента нет физически: часть пользователей несовершеннолетние,
// и единственный надёжный способ сохранить их данные — не собирать их.
//
// storage передаётся аргументом, а не берётся из глобального localStorage:
// так файл проверяется тестом без браузера.

export const STORAGE_KEY = 'eligibility-profile';

export function emptyProfile() {
  return {
    citizenship: null,
    schoolCountry: null,
    schoolYears: null,
    graduationYear: null,
    birthDate: null,
    gpa: { value: null, scale: 'TJ_5' },
    languageTests: [],
    exams: [],
  };
}

export function saveProfile(profile, storage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function loadProfile(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyProfile();
    return { ...emptyProfile(), ...JSON.parse(raw) };
  } catch {
    return emptyProfile();
  }
}

// Пустой список сертификатов — осмысленный ответ «у меня их нет»,
// поэтому в пропуски не попадает.
export function missingFields(profile) {
  const out = [];
  for (const key of ['citizenship', 'schoolCountry', 'schoolYears', 'graduationYear', 'birthDate']) {
    if (profile[key] == null || profile[key] === '') out.push(key);
  }
  if (!profile.gpa || profile.gpa.value == null) out.push('gpa');
  if (!Array.isArray(profile.languageTests)) out.push('languageTests');
  return out;
}

const COUNTRY = { TJ: 'Таджикистан', UZ: 'Узбекистан', KG: 'Кыргызстан', KZ: 'Казахстан', TM: 'Туркменистан', RU: 'Россия' };
const COUNTRY_IN = { TJ: 'Таджикистане', UZ: 'Узбекистане', KG: 'Кыргызстане', KZ: 'Казахстане', TM: 'Туркменистане', RU: 'России' };
const TEST_SHORT = { IELTS: 'IELTS', TOEFL_IBT: 'TOEFL', TOEFL_IBT_2026: 'TOEFL', DUOLINGO: 'Duolingo', SAT: 'SAT', ACT: 'ACT' };

// Одна строка вместо свёрнутой анкеты: человек видит, по какому профилю
// посчитан ответ, и не листает форму ради этого.
export function profileSummary(profile) {
  const parts = [];
  if (profile.citizenship) parts.push(COUNTRY[profile.citizenship] ?? profile.citizenship);
  if (profile.schoolCountry && profile.schoolCountry !== profile.citizenship) {
    parts.push(`школа в ${COUNTRY_IN[profile.schoolCountry] ?? profile.schoolCountry}`);
  }
  if (profile.schoolYears != null) parts.push(`${profile.schoolYears} лет школы`);
  if (profile.graduationYear != null) parts.push(`выпуск ${profile.graduationYear}`);
  if (profile.gpa?.value != null) parts.push(`балл ${profile.gpa.value}`);
  for (const t of [...(profile.languageTests ?? []), ...(profile.exams ?? [])]) {
    const name = TEST_SHORT[t.test] ?? t.test;
    parts.push(t.score == null ? `${name} не сдан` : `${name} ${t.score}`);
  }
  return parts.length ? parts.join(' · ') : 'Заполни анкету';
}

export function profileReady(profile) {
  return Boolean(
    profile.citizenship && profile.schoolCountry && profile.schoolYears != null && profile.graduationYear != null,
  );
}
