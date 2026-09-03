import {
  checkCitizenship,
  checkSchoolCountry,
  checkSchoolYears,
  checkGraduationYear,
  checkAge,
  checkGpa,
  checkLanguage,
} from './rules.js';

// Порядок полей задаёт порядок причин в выдаче.
export const FIELDS = [
  ['citizenship', checkCitizenship],
  ['schoolCountry', checkSchoolCountry],
  ['schoolYears', checkSchoolYears],
  ['graduationYear', checkGraduationYear],
  ['age', checkAge],
  ['gpa', checkGpa],
  ['language', checkLanguage],
];

// Одно fail перевешивает всё. Процентов совпадения здесь нет намеренно:
// если недостающая часть — это гражданство, любые проценты равны нулю.
// textConditions в цвет не входят: они есть почти у каждой программы, и
// если каждое красит в жёлтый, светофор перестаёт различать.
export function evaluate(profile, program) {
  const ctx = { deadline: program.deadline ?? null };
  const results = FIELDS.map(([field, fn]) => ({
    field,
    ...fn(profile, program.eligibility?.[field] ?? null, ctx),
  }));

  const fails = results.filter((x) => x.status === 'fail');
  const unknowns = results.filter((x) => x.status === 'unknown');

  const status = fails.length ? 'no' : unknowns.length ? 'check' : 'yes';
  return { status, reasons: [...fails, ...unknowns] };
}
