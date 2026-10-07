// Выбор приоритетов: страны и направления по порядку.
//
// Порядок задаётся нажатием, а не перетаскиванием: перетаскивание на
// телефоне то и дело превращается в прокрутку, а пальцем по кнопке
// попасть легко. Первое нажатие — первый приоритет; номер стоит прямо в
// подписи кнопки, поэтому отдельной строки «что выбрано» не нужно.
// Повторное нажатие снимает выбор и перенумеровывает остальные.
//
// В форму выбор уходит скрытыми полями в том же порядке: их читает
// js/form.js, так что об этом файле знает только он.
import { countryName } from './filter.js';
import { plural } from './lib/format.js';
import { CHOSEN_MAJORS, majorLabel } from './lib/majors.js';

const NAME = { countries: 'priorityCountry', majors: 'priorityMajor' };

// Подпись страны — с двумя числами: сколько всего программ и сколько из них
// называют конкретный вуз. Одна только цифра программ вводила в заблуждение:
// «Германия · 10» читалось как «10 вузов», хотя часть записей — страновые
// программы, покрывающие десятки вузов. Решение Мурода 29.09.2026.
const countryLabel = (value, count) => {
  const name = countryName(value);
  if (!count) return { name, note: '' };
  const { programs, universities } = count;
  return {
    name,
    note: `${programs} ${plural(programs, 'программа', 'программы', 'программ')} · ${universities} ${plural(universities, 'вуз', 'вуза', 'вузов')}`,
  };
};

// Счётчик направления включает и записи «любое направление» (вуз целиком):
// факультеты у такого вуза есть, и человек, выбрав «Инженерия», должен
// видеть, что под неё подходит и он. Раньше такие записи не считались нигде,
// и числа были крошечными. Решение Мурода 29.09.2026.
const majorLabelWithCount = (value, count) => {
  const name = majorLabel(value) ?? value;
  return { name, note: count === undefined ? '' : String(count) };
};

function setupOne(node, key, changed, format) {
  const list = node.querySelector('[data-role="list"]');
  const order = [];
  let choices = [];
  let counts = new Map();

  // Сколько программ стоит за кнопкой. Человек иначе не поймёт, почему
  // выбор не сдвинул список: «Информатика и IT» размечена у нуля записей,
  // и это видно прямо на кнопке, а не выясняется догадкой.
  const label = (value) => format(value, counts.get(value));

  // Скрытые поля в порядке очереди — это и есть приоритет.
  const hidden = () => {
    for (const input of node.querySelectorAll(`input[type="hidden"][name="${NAME[key]}"]`)) input.remove();
    for (const value of order) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = NAME[key];
      input.value = value;
      node.append(input);
    }
  };

  const paint = () => {
    for (const button of list.children) {
      const at = order.indexOf(button.dataset.value);
      const on = at >= 0;
      const { name, note } = label(button.dataset.value);
      button.replaceChildren(
        Object.assign(document.createElement('span'), { className: 'chip-name', textContent: on ? `${at + 1}. ${name}` : name }),
        ...(note ? [Object.assign(document.createElement('small'), { className: 'chip-note', textContent: note })] : []),
      );
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      const spoken = note ? `${name}, ${note}` : name;
      button.setAttribute('aria-label', on ? `${spoken}: приоритет ${at + 1}` : `${spoken}: не выбран`);
    }
    hidden();
  };

  const toggle = (value) => {
    const at = order.indexOf(value);
    if (at < 0) order.push(value);
    else order.splice(at, 1);
    paint();
    changed();
  };

  return {
    build(values, countsByValue) {
      choices = values;
      counts = countsByValue ?? new Map();
      // Уже выбранное сохраняется: список стран приезжает из данных после
      // того, как профиль прочитан из хранилища.
      list.textContent = '';
      for (const value of values) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chip';
        button.dataset.value = value;
        button.addEventListener('click', () => toggle(value));
        list.append(button);
      }
      paint();
    },
    set(values) {
      order.length = 0;
      for (const value of values ?? []) {
        if (!order.includes(value)) order.push(value);
      }
      paint();
    },
    // Выбранное, чего больше нет в данных: о нём надо сказать, а не
    // потерять молча.
    missing: () => order.filter((value) => !choices.includes(value)),
  };
}

// countries — коды, которые есть в данных: показывать страну без программ
// незачем. onPick зовётся только на действие человека, а не на построение
// списка, иначе первый же показ страницы перерисовывал бы ответы подряд.
export function setupPriority({ countriesNode, majorsNode, countries, onPick }) {
  const changed = () => { if (onPick) onPick(); };
  const pickers = {
    countries: setupOne(countriesNode, 'countries', changed, countryLabel),
    majors: setupOne(majorsNode, 'majors', changed, majorLabelWithCount),
  };
  pickers.countries.build(countries);
  pickers.majors.build(CHOSEN_MAJORS);

  return {
    // Для каждой страны считаем и программы, и вузы: «вузом» считается
    // запись про конкретное учебное заведение (тип «университет» или
    // «помощь по достатку»), а страновые программы и госстипендии — нет,
    // иначе Германия выглядела бы одним вузом.
    setCountries(values, programs = []) {
      const counts = new Map();
      for (const program of programs) {
        if (!program.hostCountry) continue;
        const current = counts.get(program.hostCountry) ?? { programs: 0, universities: 0 };
        current.programs += 1;
        if (program.kind === 'university' || program.kind === 'need-aid') current.universities += 1;
        counts.set(program.hostCountry, current);
      }
      pickers.countries.build(values, counts);
    },
    // Запись «любое направление» покрывает вуз целиком, поэтому идёт в счёт
    // каждого направления; записи с названным направлением — в своё.
    setMajorCounts(programs = []) {
      const counts = new Map(CHOSEN_MAJORS.map((key) => [key, 0]));
      for (const program of programs) {
        const majors = program.majors ?? [];
        const any = majors.includes('any');
        for (const key of CHOSEN_MAJORS) {
          if (any || majors.includes(key)) counts.set(key, counts.get(key) + 1);
        }
      }
      pickers.majors.build(CHOSEN_MAJORS, counts);
    },
    set(profile) {
      pickers.countries.set(profile.priorityCountries);
      pickers.majors.set(profile.priorityMajors);
    },
    lost() {
      return [...pickers.countries.missing(), ...pickers.majors.missing()];
    },
  };
}
