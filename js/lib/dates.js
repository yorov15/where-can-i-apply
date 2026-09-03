// Полных лет на дату onDate. Обе даты — строки YYYY-MM-DD.
// Строки, а не Date: Date в браузере тянет часовой пояс, и человек,
// родившийся 1 января, в другом поясе оказывается на год моложе.
export function ageAt(birthDate, onDate) {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = onDate.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return age;
}
