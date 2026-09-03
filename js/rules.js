// Семь функций правил, по одной на поле профиля. Каждая знает про своё
// поле и больше ни про что: ошибку в правиле возраста нельзя занести в
// правило языка. Ни одна из них не трогает DOM, сеть и localStorage.
//
// Каждая возвращает { status, message }, где status — 'pass', 'fail' или
// 'unknown'. У pass сообщение пустое: человеку не нужно читать семь строк
// о том, что у него всё в порядке.
//
// rule === null означает «в источнике этого нет» и даёт unknown. Явное
// «ограничения нет» записывается объектом с пустыми значениями и цитатой,
// которая это подтверждает, — такой объект даёт pass.

const r = (status, message = '') => ({ status, message });

function countryRule(value, rule, labels) {
  if (!rule) return r('unknown', labels.noRule);
  if (!value) return r('unknown', labels.noValue);
  if (Array.isArray(rule.deny) && rule.deny.includes(value)) return r('fail', labels.denied);
  if (rule.allow === '*') return r('pass');
  if (Array.isArray(rule.allow) && rule.allow.includes(value)) return r('pass');
  return r('fail', labels.notInList);
}

export function checkCitizenship(profile, rule, ctx) {
  return countryRule(profile.citizenship, rule, {
    noRule: 'Программа не указывает, граждан каких стран принимает',
    noValue: 'Ты не указал гражданство',
    denied: 'Программа не принимает граждан твоей страны',
    notInList: 'Твоего гражданства нет в списке стран программы',
  });
}

export function checkSchoolCountry(profile, rule, ctx) {
  return countryRule(profile.schoolCountry, rule, {
    noRule: 'Программа не указывает, в какой стране должна быть окончена школа',
    noValue: 'Ты не указал, в какой стране окончил школу',
    denied: 'Программа не принимает аттестаты твоей страны',
    notInList: 'Твоей страны школы нет в списке программы',
  });
}
