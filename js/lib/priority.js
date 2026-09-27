// Приоритеты человека: какие страны и какие направления он поставил выше.
// Здесь только арифметика порядка — чистые функции, без DOM.
//
// Порядок задаёт сам человек: первое нажатие в анкете — первый приоритет.
// Страна весит больше направления: для того, кто уезжает учиться,
// «куда» решает больше, чем «на кого», и предсказуемее — сначала все
// программы первой страны, внутри них уже по направлению. Если человек
// выбрал только направления, страна у всех одна и та же (не выбрана), и
// порядок задаёт направление.
import { hasMajor, coversAnyMajor } from './majors.js';

// Место программы в списке человека. Infinity — «человек этого не выбирал».
const placeIn = (list, value) => {
  const at = list.indexOf(value);
  return at < 0 ? Infinity : at;
};

// Место по направлению. Три ступени, и порядок между ними существенный:
//
//   1. направление названо у самой записи — она идёт первой, по месту в
//      списке человека;
//   2. запись покрывает вуз целиком («любое направление») — направление
//      там выбирается внутри, значит и это тоже; но выше той записи, что
//      назвала другое направление, её ставить не за что;
//   3. названо другое направление — эта запись человека не ждёт.
//
// Без средней ступени выбор «Информатика и IT» не делал бы ничего: ни одна
// запись не назвала её прямо, и все оказались бы на третьей ступени.
const majorPlace = (list, majors) => {
  const at = list.findIndex((wanted) => hasMajor(majors, wanted));
  if (at >= 0) return at;
  return coversAnyMajor(majors) ? list.length : Infinity;
};

export function priorityRank(program, { countries = [], majors = [] } = {}) {
  return {
    country: placeIn(countries, program.hostCountry),
    major: majorPlace(majors, program.majors),
  };
}

// Устойчивая сортировка: программы с одинаковым приоритетом остаются в том
// порядке, в каком их отдал движок, — иначе список прыгал бы между
// перерисовками.
export function orderByPriority(rows, priorities) {
  const ranked = rows.map((row, index) => ({ row, index, rank: priorityRank(row.program, priorities) }));
  ranked.sort((a, b) => {
    if (a.rank.country !== b.rank.country) return a.rank.country - b.rank.country;
    if (a.rank.major !== b.rank.major) return a.rank.major - b.rank.major;
    return a.index - b.index;
  });
  return ranked.map((item) => item.row);
}

// Выбрал ли человек хоть что-нибудь.
export const hasPriorities = ({ countries = [], majors = [] } = {}) => countries.length > 0 || majors.length > 0;
