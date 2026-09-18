// Семь функций правил, по одной на поле профиля. Каждая знает про своё
// поле и больше ни про что: ошибку в правиле возраста нельзя занести в
// правило языка. Ни одна из них не трогает DOM, сеть и localStorage.
//
// Каждая возвращает { status, code, params }, где status — 'pass', 'fail'
// или 'unknown', code — «поле.состояние», params — числа для текста.
// Тексты собирает js/wording.js. У pass кода нет: человеку не нужно
// читать семь строк о том, что у него всё в порядке.
//
// rule === null означает «в источнике этого нет» и даёт unknown. Явное
// «ограничения нет» записывается объектом с пустыми значениями и цитатой,
// которая это подтверждает, — такой объект даёт pass.

import { ageAt } from './lib/dates.js';
import { toPercent } from './lib/scales.js';

const r = (status, code = null, params = {}) => ({ status, code, params });

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

// Четвёртое состояние: требование есть, но устанавливает его принимающий
// вуз, а не программа. Написать сюда null было бы враньём — карточка
// сказала бы «программа не указывает», хотя она указывает и прямо
// отсылает к вузу. Человек прочёл бы «не указывает» и решил, что не
// спросят.
function delegated(rule) {
  return rule.definedBy === 'institution';
}

// Пятое состояние: требование есть, названо в источнике, но инструмент
// его не считает — потому что в анкете нет такого поля и не будет.
// Итальянский B2 у Полимеха, «все пятёрки» у UBC, документы о доходах.
//
// Раньше такое поле оставляли пустым, и карточка говорила «программа не
// указывает требование к языку». Это прямая ложь: программа указывает,
// и очень громко. Пустота означает «мы не смотрели», а здесь смотрели и
// нашли — просто посчитать нечем.
function notMeasured(rule) {
  return rule.notMeasured === true;
}

// Ближайшее такое число, начиная с сегодняшнего дня.
function nextMonthDay(monthDay, today) {
  if (!today) return null;
  const year = Number(today.slice(0, 4));
  const candidate = `${year}-${monthDay}`;
  return candidate >= today ? candidate : `${year + 1}-${monthDay}`;
}

// Дата отсчёта, привязанная к циклу приёма, а не записанная числом.
// «18 лет на 31 августа 2026» в следующем цикле означает 31 августа 2027;
// записанное числом, правило начнёт молча ошибаться на пограничных людях.
function resolveAsOf(asOf, deadline, today) {
  if (asOf == null || asOf === 'deadline') return deadline?.closes ?? null;
  if (typeof asOf === 'string') return asOf;
  if (asOf.relativeTo === 'applicationYear' && asOf.monthDay) {
    const closes = deadline?.closes;
    // Программа может не публиковать дат приёма вовсе — так у стипендий
    // ICCR: возраст считается на 1 июля, а когда подача, объявляет
    // посольство. Тогда год берём по ближайшему такому числу впереди.
    // Ответ помечается шатким, но это лучше молчания: без даты правило
    // не срабатывало ни для кого, и семнадцатилетний не узнавал, что к
    // подаче ему исполнится восемнадцать.
    if (!closes) return nextMonthDay(asOf.monthDay, today);
    return `${closes.slice(0, 4)}-${asOf.monthDay}`;
  }
  return null;
}

function countryRule(value, rule, field) {
  if (!rule) return r('unknown', `${field}.missing-rule`);
  if (noLimit(rule)) return r('pass');
  if (delegated(rule)) return r('unknown', `${field}.by-institution`);
  if (notMeasured(rule)) return r('unknown', `${field}.not-measured`);
  if (!value) return r('unknown', `${field}.no-value`);
  if (Array.isArray(rule.deny) && rule.deny.includes(value)) return r('fail', `${field}.denied`);
  if (rule.allow === '*') return r('pass');
  if (Array.isArray(rule.allow) && rule.allow.includes(value)) return r('pass');
  return r('fail', `${field}.not-in-list`);
}

export function checkCitizenship(profile, rule, ctx) {
  return countryRule(profile.citizenship, rule, 'citizenship');
}

export function checkSchoolCountry(profile, rule, ctx) {
  return countryRule(profile.schoolCountry, rule, 'schoolCountry');
}

export function checkSchoolYears(profile, rule, ctx) {
  if (!rule) return r('unknown', 'schoolYears.missing-rule');
  if (noLimit(rule)) return r('pass');
  if (delegated(rule)) return r('unknown', 'schoolYears.by-institution');
  if (notMeasured(rule)) return r('unknown', 'schoolYears.not-measured');
  if (profile.schoolYears == null) return r('unknown', 'schoolYears.no-value');
  if (rule.min == null) return r('pass');
  if (profile.schoolYears < rule.min) {
    return r('fail', 'schoolYears.below-min', { min: rule.min, mine: profile.schoolYears });
  }
  return r('pass');
}

export function checkGraduationYear(profile, rule, ctx) {
  if (!rule) return r('unknown', 'graduationYear.missing-rule');
  if (noLimit(rule)) return r('pass');
  if (delegated(rule)) return r('unknown', 'graduationYear.by-institution');
  if (notMeasured(rule)) return r('unknown', 'graduationYear.not-measured');
  if (profile.graduationYear == null) return r('unknown', 'graduationYear.no-value');

  if (rule.min != null && profile.graduationYear < rule.min) {
    return r('fail', 'graduationYear.too-early', { min: rule.min, mine: profile.graduationYear });
  }

  // «Окончи школу к году подачи» — правило почти всех стипендий, и оно
  // привязано к циклу, а не к числу. Записанное числом, оно устаревает
  // через год и врёт молча: заявка на 2028 год сверялась бы с 2027-м.
  if (rule.maxRelative === 'applicationYear') {
    const closes = ctx?.deadline?.closes;
    if (!closes) {
      return r('unknown', 'graduationYear.cycle-unknown');
    }
    const max = Number(closes.slice(0, 4));
    if (profile.graduationYear > max) {
      return r('fail', 'graduationYear.after-cycle', { max, mine: profile.graduationYear });
    }
    return r('pass');
  }

  if (rule.max != null && profile.graduationYear > rule.max) {
    return r('fail', 'graduationYear.too-late', { max: rule.max, mine: profile.graduationYear });
  }
  return r('pass');
}

export function checkAge(profile, rule, ctx) {
  if (!rule) return r('unknown', 'age.missing-rule');
  if (noLimit(rule)) return r('pass');
  if (delegated(rule)) return r('unknown', 'age.by-institution');
  if (notMeasured(rule)) return r('unknown', 'age.not-measured');
  if (!profile.birthDate) return r('unknown', 'age.no-value');

  // Источник часто не говорит, на какой момент считается возраст.
  // Придумывать дату нельзя, но и молчать необязательно: если ответ
  // одинаков при любой правдоподобной дате, он не «неизвестен».
  // Программы редко публикуют точные даты за год вперёд: их дали Türkiye
  // Bursları, но не ЦВЭ и не GKS. Без даты возраст посчитать не на чем,
  // поэтому в крайнем случае считаем на сегодня — с оговоркой ниже.
  const fromDeadline = rule.asOf == null || rule.asOf === 'deadline';
  const on =
    resolveAsOf(rule.asOf, ctx?.deadline, ctx?.today) ??
    (fromDeadline ? ctx?.today ?? null : null);
  if (!on) return r('unknown', 'age.asof-unknown');

  const age = ageAt(profile.birthDate, on);

  // Дата отсчёта шаткая, когда её нет вовсе, когда приём не подтверждён
  // или когда источник не сказал, на какой момент считать. Дата,
  // посчитанная из года приёма, шатается вместе с самим приёмом.
  const computedFromCycle = typeof rule.asOf === 'object' && rule.asOf !== null;
  const shaky =
    (fromDeadline || computedFromCycle) &&
    (!ctx?.deadline?.closes ||
      ctx?.deadline?.confidence !== 'confirmed' ||
      rule.asOf == null);

  // maxExclusive записывает «under 21» как есть. В max пришлось бы писать
  // 20 при цитате «21» — и первый же читатель принял бы это за опечатку.
  const maxInclusive = rule.maxExclusive != null ? rule.maxExclusive - 1 : rule.max;

  const usingToday = fromDeadline && !ctx?.deadline?.closes;

  const why = usingToday
    ? 'no-dates'
    : !ctx?.deadline?.closes
      ? 'cycle-guessed'
      : rule.asOf == null
        ? 'asof-unknown'
        : 'unconfirmed';

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
      return r('unknown', 'age.near-max', { age, limit: maxInclusive, why });
    }
    if (age > maxInclusive) {
      return r('fail', 'age.over-max', rule.maxExclusive != null
        ? { age, maxExclusive: rule.maxExclusive }
        : { age, max: rule.max });
    }
  }
  if (rule.min != null && age < rule.min) {
    // К подаче возраст подрастёт, а дата отсчёта шаткая — у самой
    // границы это сомнение, а не отказ. Иначе семнадцатилетнему
    // выпускнику закрывали бы почти всё, куда он подаст следующим летом.
    if (shaky && age >= rule.min - 1) {
      return r('unknown', 'age.near-min', { age, min: rule.min, why });
    }
    return r('fail', 'age.under-min', { age, min: rule.min });
  }
  return r('pass');
}

// Полоса неопределённости в процентных пунктах. Внутри неё движок
// отказывается давать точный ответ, потому что точного ответа там нет:
// перевод шкал приблизителен, а балл за четверть не равен баллу аттестата.
export const GPA_BAND = 5;

export function checkGpa(profile, rule, ctx) {
  if (!rule) return r('unknown', 'gpa.missing-rule');
  if (noLimit(rule)) return r('pass');
  if (delegated(rule)) return r('unknown', 'gpa.by-institution');
  if (notMeasured(rule)) return r('unknown', 'gpa.not-measured');
  if (!profile.gpa || profile.gpa.value == null) return r('unknown', 'gpa.no-value');
  if (rule.min == null) return r('pass');

  const mine = toPercent(profile.gpa.value, profile.gpa.scale);
  const need = toPercent(rule.min, rule.scale);

  // Полоса сомнения нужна только там, где балл пересчитан из чужой
  // шкалы: 4,8 по пятибалльной и 94% — это разные системы оценивания, и
  // пересчёт в них приблизителен. Когда шкала одна и та же, сравнение
  // точное, и говорить «шкалы разные» — врать: у Университета Халифы
  // порог 4,0 по пятибалльной, и балл 4,2 проходит его прямо.
  const sameScale = profile.gpa.scale === rule.scale;
  if (!sameScale && Math.abs(mine - need) <= GPA_BAND) {
    return r('unknown', 'gpa.near-threshold', { mine, need });
  }
  if (mine < need) {
    // Обе величины в процентах: человек ввёл 4,8 по пятибалльной, а
    // программа требует 70 — сравнить их в исходном виде невозможно.
    // Название шкалы вроде PERCENT в текст не идёт: это имя из кода.
    //
    // advisory — тот же случай, что и у языка: HKUST называет свои 4,5
    // «reference information to reflect the intake quality», а не
    // порогом. Отказывать по справочному числу нельзя. Но причины бывают
    // разные: у Bilkent это порог для подачи с аттестатом, в обход
    // которого есть SAT и IB. Поэтому сообщение не объясняет, почему, а
    // отсылает к условиям карточки.
    if (rule.advisory === true) {
      return r('unknown', 'gpa.below-advisory', { mine, need });
    }
    return r('fail', 'gpa.below', { mine, need });
  }
  return r('pass');
}

// Сертификата нет — unknown, а не fail: экзамен можно сдать, и человеку
// нужно видеть, какие двери откроются после него. fail только когда
// сертификат есть и результат ниже порога.
export function checkLanguage(profile, rule, ctx) {
  if (!rule) return r('unknown', 'language.missing-rule');
  if (noLimit(rule)) return r('pass');
  if (delegated(rule)) return r('unknown', 'language.by-institution');
  if (notMeasured(rule)) return r('unknown', 'language.not-measured');
  const need = rule.anyOf ?? [];
  if (need.length === 0) return r('pass');

  const mine = profile.languageTests ?? [];
  // Какие из названных программой экзаменов человек отметил, но не вписал
  // балл: по ним карточка скажет, какой балл нужен именно здесь.
  const marked = [];
  let sawBelow = false;
  // Вариант, где общего балла хватает, но программа требует ещё и
  // минимумы по частям. Частей анкета не спрашивает: их четыре у каждого
  // экзамена, и спрашивать их у всех ради трёх программ — плохая сделка.
  // Зелёная карточка по одному общему баллу была бы враньём, поэтому
  // такой вариант даёт «проверь», а сами числа стоят условием рядом.
  let byParts = null;

  for (const req of need) {
    const got = mine.find((x) => x.test === req.test);
    if (!got) continue;
    if (got.score == null) { marked.push(req.test); continue; }
    if (got.score >= req.min) {
      if (!req.parts) return r('pass');
      byParts = byParts ?? req;
      continue;
    }
    sawBelow = true;
  }

  if (byParts) {
    return r('unknown', 'language.parts-unknown', { test: byParts.test, min: byParts.min });
  }

  const options = need.map(({ test, min }) => ({ test, min }));
  const advisory = rule.advisory === true;
  if (marked.length) {
    return r('unknown', 'language.score-missing', { options, advisory, marked });
  }
  if (sawBelow) {
    // Часть программ публикует не порог, а рекомендацию: KAIST пишет над
    // своей таблицей «Recommended Score». Красная карточка на таких
    // числах — прямая ложь: подавать документы человеку не запрещено.
    if (advisory) {
      return r('unknown', 'language.below-advisory', { options });
    }
    return r('fail', 'language.below', { options });
  }
  // Экзамен сдан, но программа его не называет — чаще всего TOEFL по
  // новой шкале там, где опубликован только старый порог. «Сертификата
  // у тебя нет» здесь было бы неправдой, а отказ — выдумкой.
  const other = mine.filter((x) => x.score != null);
  if (other.length) {
    return r('unknown', 'language.other-test', { tests: other.map((x) => x.test), options, advisory });
  }
  return r('unknown', 'language.no-certificate', { options, advisory });
}
