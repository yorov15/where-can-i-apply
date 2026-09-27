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
import { CHOSEN_MAJORS, majorLabel } from './lib/majors.js';

const NAME = { countries: 'priorityCountry', majors: 'priorityMajor' };

function setupOne(node, key, changed) {
  const list = node.querySelector('[data-role="list"]');
  const order = [];
  let choices = [];
  let counts = new Map();

  // Сколько программ стоит за кнопкой. Человек иначе не поймёт, почему
  // выбор не сдвинул список: «Информатика и IT» размечена у нуля записей,
  // и это видно прямо на кнопке, а не выясняется догадкой.
  const label = (value) => {
    const name = key === 'countries' ? countryName(value) : majorLabel(value) ?? value;
    const n = counts.get(value);
    return n === undefined ? name : `${name} · ${n}`;
  };

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
      button.textContent = on ? `${at + 1}. ${label(button.dataset.value)}` : label(button.dataset.value);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.setAttribute('aria-label', on
        ? `${label(button.dataset.value)}: приоритет ${at + 1}`
        : `${label(button.dataset.value)}: не выбран`);
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
    countries: setupOne(countriesNode, 'countries', changed),
    majors: setupOne(majorsNode, 'majors', changed),
  };
  pickers.countries.build(countries);
  pickers.majors.build(CHOSEN_MAJORS);

  return {
    // Счётчики считаются по программам, а по направлению — только по тем
    // записям, где направление названо: «любое направление» подходит под
    // любое желание и в счётчике одной кнопки ничего не значило бы.
    setCountries(values, programs = []) {
      const counts = new Map();
      for (const program of programs) {
        counts.set(program.hostCountry, (counts.get(program.hostCountry) ?? 0) + 1);
      }
      pickers.countries.build(values, counts);
    },
    setMajorCounts(programs = []) {
      const counts = new Map(CHOSEN_MAJORS.map((key) => [key, 0]));
      for (const program of programs) {
        for (const key of program.majors ?? []) {
          if (counts.has(key)) counts.set(key, counts.get(key) + 1);
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
