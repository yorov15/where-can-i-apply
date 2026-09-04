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

// Третье состояние правила помимо «есть требование» и null.
//
// null означает «в источнике этого нет» — мы не смотрели или не нашли.
// noLimit означает «человек прочитал страницу и требования там нет».
// Без него почти каждая запись выходила жёлтой: на страницах программ
// обычно нет абзаца «возрастных ограничений не установлено», отсутствие
// требования подтверждает человек, а не фраза.
//
// Ручаться так можно только за отсутствие ограничения. Как только
// появляется число, валидатор снова требует дословную цитату — соврать
// «возраст до 25, я проверил» этим нельзя.
function noLimit(rule) {
  return rule.noLimit === true;
}

function countryRule(value, rule, labels) {
  if (!rule) return r('unknown', labels.noRule);
  if (noLimit(rule)) return r('pass');
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
  if (noLimit(rule)) return r('pass');
  if (profile.schoolYears == null) return r('unknown', 'Ты не указал, сколько лет учился в школе');
  if (rule.min == null) return r('pass');
  if (profile.schoolYears < rule.min) {
    return r('fail', `Программа требует ${rule.min} лет школы, у тебя ${profile.schoolYears}`);
  }
  return r('pass');
}

export function checkGraduationYear(profile, rule, ctx) {
  if (!rule) return r('unknown', 'Программа не указывает, в каком году нужно окончить школу');
  if (noLimit(rule)) return r('pass');
  if (profile.graduationYear == null) return r('unknown', 'Ты не указал год выпуска');

  if (rule.min != null && profile.graduationYear < rule.min) {
    return r('fail', `Программа берёт выпускников не раньше ${rule.min} года, у тебя ${profile.graduationYear}`);
  }

  // «Окончи школу к году подачи» — правило почти всех стипендий, и оно
  // привязано к циклу, а не к числу. Записанное числом, оно устаревает
  // через год и врёт молча: заявка на 2028 год сверялась бы с 2027-м.
  if (rule.maxRelative === 'applicationYear') {
    const closes = ctx?.deadline?.closes;
    if (!closes) {
      return r('unknown', 'Год приёма неизвестен, поэтому крайний год выпуска не посчитать');
    }
    const max = Number(closes.slice(0, 4));
    if (profile.graduationYear > max) {
      return r('fail', `Программа берёт тех, кто оканчивает школу к году подачи — к ${max}, у тебя ${profile.graduationYear}`);
    }
    return r('pass');
  }

  if (rule.max != null && profile.graduationYear > rule.max) {
    return r('fail', `Программа берёт выпускников не позже ${rule.max} года, у тебя ${profile.graduationYear}`);
  }
  return r('pass');
}

export function checkAge(profile, rule, ctx) {
  if (!rule) return r('unknown', 'Программа не указывает ограничение по возрасту');
  if (noLimit(rule)) return r('pass');
  if (!profile.birthDate) return r('unknown', 'Ты не указал дату рождения');

  // Источник часто не говорит, на какой момент считается возраст.
  // Придумывать дату нельзя, но и молчать необязательно: если ответ
  // одинаков при любой правдоподобной дате, он не «неизвестен».
  // Программы редко публикуют точные даты за год вперёд: их дали Türkiye
  // Bursları, но не ЦВЭ и не GKS. Без даты возраст посчитать не на чем,
  // поэтому в крайнем случае считаем на сегодня — с оговоркой ниже.
  const asOf = rule.asOf ?? 'deadline';
  const on = asOf === 'deadline'
    ? (ctx?.deadline?.closes ?? ctx?.today ?? null)
    : asOf;
  if (!on) return r('unknown', 'Дата, на которую программа считает возраст, неизвестна');

  const age = ageAt(profile.birthDate, on);

  // Дата отсчёта шаткая, когда её нет вовсе, когда приём не подтверждён
  // или когда источник не сказал, на какой момент считать. Во всех трёх
  // случаях ошибиться можно самое большее на год — столько и допускаем.
  const shaky =
    asOf === 'deadline' &&
    (!ctx?.deadline?.closes ||
      ctx?.deadline?.confidence !== 'confirmed' ||
      rule.asOf == null);

  // maxExclusive записывает «under 21» как есть. В max пришлось бы писать
  // 20 при цитате «21» — и первый же читатель принял бы это за опечатку.
  const maxInclusive = rule.maxExclusive != null ? rule.maxExclusive - 1 : rule.max;

  const usingToday = asOf === 'deadline' && !ctx?.deadline?.closes;

  if (maxInclusive != null) {
    // Когда считаем на сегодня, к подаче возраст может только вырасти —
    // и самое большее на год. Значит сомнение возникает ровно на пределе:
    // кто уже старше, не пройдёт наверняка, и говорить ему «проверь» —
    // отнимать время. Когда дата есть, но шаткая, она может сдвинуться в
    // обе стороны, и полоса симметричная.
    const uncertain = usingToday
      ? age === maxInclusive
      : shaky && Math.abs(age - maxInclusive) <= 1;

    if (uncertain) {
      const why = usingToday
        ? 'даты приёма ещё не объявлены, и к подаче тебе может стать больше'
        : rule.asOf == null
          ? 'источник не говорит, на какой момент считается возраст'
          : 'дата приёма ещё не подтверждена';
      return r('unknown', `На дату приёма тебе будет около ${age} при пределе ${maxInclusive}, а ${why} — проверь на сайте`);
    }
    if (age > maxInclusive) {
      return r('fail', rule.maxExclusive != null
        ? `На дату приёма тебе будет ${age}, программа берёт младше ${rule.maxExclusive}`
        : `На дату приёма тебе будет ${age}, программа берёт до ${rule.max}`);
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
  if (noLimit(rule)) return r('pass');
  if (!profile.gpa || profile.gpa.value == null) return r('unknown', 'Ты не указал средний балл');
  if (rule.min == null) return r('pass');

  const mine = toPercent(profile.gpa.value, profile.gpa.scale);
  const need = toPercent(rule.min, rule.scale);

  if (Math.abs(mine - need) <= GPA_BAND) {
    return r('unknown', 'Твой балл близко к порогу программы, а шкалы разные — проверь на сайте программы');
  }
  if (mine < need) {
    // Обе величины в процентах: человек ввёл 4,8 по пятибалльной, а
    // программа требует 70 — сравнить их в исходном виде невозможно.
    // Название шкалы вроде PERCENT в текст не идёт: это имя из кода.
    return r('fail', `Твой балл — ${mine}%, программе нужно ${need}%`);
  }
  return r('pass');
}

// Сертификата нет — unknown, а не fail: экзамен можно сдать, и человеку
// нужно видеть, какие двери откроются после него. fail только когда
// сертификат есть и результат ниже порога.
export function checkLanguage(profile, rule, ctx) {
  if (!rule) return r('unknown', 'Программа не указывает требование к языку');
  if (noLimit(rule)) return r('pass');
  const need = rule.anyOf ?? [];
  if (need.length === 0) return r('pass');

  const mine = profile.languageTests ?? [];
  let sawEmpty = false;
  let sawBelow = false;

  for (const req of need) {
    const got = mine.find((x) => x.test === req.test);
    if (!got) continue;
    if (got.score == null) { sawEmpty = true; continue; }
    if (got.score >= req.min) return r('pass');
    sawBelow = true;
  }

  const list = need.map((x) => `${x.test} ${x.min}`).join(' или ');
  if (sawEmpty) return r('unknown', `Ты отметил экзамен без результата. Нужен ${list}`);
  if (sawBelow) return r('fail', `Нужен ${list}, твой результат ниже`);
  return r('unknown', `Нужен ${list}. Сертификата у тебя пока нет — экзамен можно сдать`);
}
