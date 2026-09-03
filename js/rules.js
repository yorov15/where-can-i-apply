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

import { ageAt } from './lib/dates.js';
import { toPercent } from './lib/scales.js';

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

export function checkSchoolYears(profile, rule, ctx) {
  if (!rule) return r('unknown', 'Программа не указывает, сколько лет школы нужно');
  if (profile.schoolYears == null) return r('unknown', 'Ты не указал, сколько лет учился в школе');
  if (rule.min == null) return r('pass');
  if (profile.schoolYears < rule.min) {
    return r('fail', `Программа требует ${rule.min} лет школы, у тебя ${profile.schoolYears}`);
  }
  return r('pass');
}

export function checkGraduationYear(profile, rule, ctx) {
  if (!rule) return r('unknown', 'Программа не указывает, в каком году нужно окончить школу');
  if (profile.graduationYear == null) return r('unknown', 'Ты не указал год выпуска');
  if (rule.min != null && profile.graduationYear < rule.min) {
    return r('fail', `Программа берёт выпускников не раньше ${rule.min} года, у тебя ${profile.graduationYear}`);
  }
  if (rule.max != null && profile.graduationYear > rule.max) {
    return r('fail', `Программа берёт выпускников не позже ${rule.max} года, у тебя ${profile.graduationYear}`);
  }
  return r('pass');
}

export function checkAge(profile, rule, ctx) {
  if (!rule) return r('unknown', 'Программа не указывает ограничение по возрасту');
  if (!profile.birthDate) return r('unknown', 'Ты не указал дату рождения');

  const on = rule.asOf === 'deadline' ? ctx?.deadline?.closes : rule.asOf;
  if (!on) return r('unknown', 'Дата, на которую программа считает возраст, неизвестна');

  const age = ageAt(profile.birthDate, on);
  const shaky = ctx?.deadline?.confidence !== 'confirmed' && rule.asOf === 'deadline';

  if (rule.max != null) {
    if (shaky && Math.abs(age - rule.max) <= 1) {
      return r('unknown', `На дату приёма тебе будет около ${age}, предел программы ${rule.max}, но дата приёма ещё не подтверждена — проверь на сайте`);
    }
    if (age > rule.max) {
      return r('fail', `На дату приёма тебе будет ${age}, программа берёт до ${rule.max}`);
    }
  }
  if (rule.min != null && age < rule.min) {
    return r('fail', `На дату приёма тебе будет ${age}, программа берёт с ${rule.min}`);
  }
  return r('pass');
}

// Полоса неопределённости в процентных пунктах. Внутри неё движок
// отказывается давать точный ответ, потому что точного ответа там нет:
// перевод шкал приблизителен, а балл за четверть не равен баллу аттестата.
export const GPA_BAND = 5;

export function checkGpa(profile, rule, ctx) {
  if (!rule) return r('unknown', 'Программа не указывает требование к среднему баллу');
  if (!profile.gpa || profile.gpa.value == null) return r('unknown', 'Ты не указал средний балл');
  if (rule.min == null) return r('pass');

  const mine = toPercent(profile.gpa.value, profile.gpa.scale);
  const need = toPercent(rule.min, rule.scale);

  if (Math.abs(mine - need) <= GPA_BAND) {
    return r('unknown', 'Твой балл близко к порогу программы, а шкалы разные — проверь на сайте программы');
  }
  if (mine < need) {
    return r('fail', `Программа требует ${rule.min} по шкале ${rule.scale}, твой балл ниже`);
  }
  return r('pass');
}
