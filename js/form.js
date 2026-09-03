// Единственный файл, который знает про поля формы. Читает и пишет
// профиль в той же форме, что описана в js/profile.js.
import { emptyProfile } from './profile.js';

const LANG_TESTS = ['IELTS', 'TOEFL_IBT'];

const num = (v) => (v === '' || v == null ? null : Number(v));

export function readForm(root) {
  const f = root.elements;
  const profile = emptyProfile();

  profile.citizenship = f.citizenship.value || null;
  profile.schoolCountry = f.schoolCountry.value || null;
  profile.schoolYears = num(f.schoolYears.value);
  profile.graduationYear = num(f.graduationYear.value);
  profile.birthDate = f.birthDate.value || null;
  profile.gpa = { value: num(f.gpaValue.value), scale: f.gpaScale.value };

  profile.languageTests = LANG_TESTS
    .filter((t) => f[`has-${t}`].checked)
    .map((t) => ({ test: t, score: num(f[`score-${t}`].value) }));

  return profile;
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
}

export function onProfileChange(root, handler) {
  const fire = () => handler(readForm(root));
  root.addEventListener('input', fire);
  root.addEventListener('change', fire);
}
