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
