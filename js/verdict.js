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
// today нужен одному правилу — возрасту, и только когда программа не
// объявила дат приёма. Считать возраст не на чем, а «сегодня» ошибается
// не больше чем на год, что правило и учитывает.
//
// Относительная граница по году выпуска такой подмены не делает
// намеренно: год подачи может отличаться от текущего, и ошибка там
// отсеяла бы человека молча.
export function evaluate(profile, program, today = null) {
  const ctx = { deadline: program.deadline ?? null, today };
  const results = FIELDS.map(([field, fn]) => ({
    field,
    ...fn(profile, program.eligibility?.[field] ?? null, ctx),
  }));

  const fails = results.filter((x) => x.status === 'fail');
  const unknowns = results.filter((x) => x.status === 'unknown');

  // Поля, про которые человек написал «требования нет», возвращаются
  // отдельно от причин. На цвет они не влияют, но и молчать о них нельзя:
  // «программа этого не требует» — полезный факт, и человек вправе знать,
  // что за ним стоит чужая подпись, а не цитата из источника.
  const attested = FIELDS.filter(
    ([field]) => program.eligibility?.[field]?.noLimit === true
  ).map(([field]) => field);

  const status = fails.length ? 'no' : unknowns.length ? 'check' : 'yes';
  return { status, reasons: [...fails, ...unknowns], attested };
}
