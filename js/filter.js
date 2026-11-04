// Поиск и фильтры каталога. 56 карточек одним списком — стена: человек
// ищет «Гарвард» или «что-нибудь в Корее», а не листает всё подряд.
//
// Логика (норма, совпадение, счётчики) — чистые функции наверху, они
// покрыты тестами. Ниже — привязка к DOM: она только прячет и показывает
// уже нарисованные карточки и, как вся работа с DOM в проекте, тестами
// не покрыта.

import { KINDS, KIND_FILTER, KIND_LABEL } from './lib/kinds.js';

export const COUNTRY_RU = {
  US: 'США', TR: 'Турция', TJ: 'Таджикистан', KR: 'Южная Корея', AZ: 'Азербайджан',
  JP: 'Япония', DE: 'Германия', CN: 'Китай', HK: 'Гонконг', UZ: 'Узбекистан',
  KZ: 'Казахстан', AE: 'ОАЭ', IT: 'Италия', FR: 'Франция', PL: 'Польша', CA: 'Канада', KG: 'Кыргызстан',
  BN: 'Бруней', CZ: 'Чехия', EE: 'Эстония', LT: 'Литва', IN: 'Индия', SG: 'Сингапур', MY: 'Малайзия',
  GB: 'Великобритания', QA: 'Катар', RO: 'Румыния', RU: 'Россия', RS: 'Сербия',
  SK: 'Словакия', HU: 'Венгрия',
  FI: 'Финляндия', SE: 'Швеция', NL: 'Нидерланды', AT: 'Австрия', SI: 'Словения',
  CH: 'Швейцария', BE: 'Бельгия', DK: 'Дания', AR: 'Аргентина', AU: 'Австралия',
  TW: 'Тайвань', NZ: 'Новая Зеландия', SA: 'Саудовская Аравия',
};

// Незнакомый код показывается как есть: лучше «BR» в списке, чем страна,
// которой там нет.
export const countryName = (code) => COUNTRY_RU[code] ?? code;

// Регистр, «ё» и диакритика (Türkiye) не должны мешать поиску: разложение
// NFD отделяет значки от букв, и они отбрасываются с обеих сторон.
export const norm = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

// Только явный список принимаемых экзаменов: упоминание в тексте может быть запретом.
export const acceptsDuolingo = program => (program.eligibility?.language?.anyOf ?? []).some(option => option.test === 'DUOLINGO');

export function matchesFilter(item, { query, bucket, country, kind, duolingo, noFee, deadline }) {
  if (bucket === 'plan' ? !item.plan : bucket !== 'all' && item.bucket !== bucket) return false;
  if (deadline === 'open' && !item.open) return false;
  if (deadline === 'soon' && !item.soon) return false;
  if (country && item.country !== country) return false;
  if (kind && item.kind !== kind) return false;
  if (duolingo && item.duolingo !== true) return false;
  if (noFee && item.feeFree !== true) return false;
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  // Тип показан в карточке словами, поэтому его можно и набрать.
  const haystack = norm(`${item.title} ${item.orig ?? ''} ${countryName(item.country)} ${KIND_LABEL[item.kind] ?? ''}`);
  return words.every((word) => haystack.includes(word));
}

// Порядок «сначала ближайший срок»: открытые сроки по дате, затем закрытые
// (по дате закрытия — в том же порядке идёт и оценка следующего набора),
// в конце программы без срока. Внутри равных — прежний порядок (sort стабилен).
const deadlineRank = (item) => (!item.closes ? 2 : item.closed ? 1 : 0);

export function byDeadline(a, b) {
  const rank = deadlineRank(a) - deadlineRank(b);
  if (rank !== 0) return rank;
  return a.closes < b.closes ? -1 : a.closes > b.closes ? 1 : 0;
}

// Сколько карточек группы показывать сразу. Длинный список (94 и 99
// программы) превращал страницу в 50 000 пикселей прокрутки, а нужное человек
// находит поиском и фильтрами, которые сразу показывают всё найденное.
export const PAGE = 12;

export const pageLimit = (limit, filtered) => (filtered ? Infinity : limit);

export function bucketCounts(items, filters) {
  if (filters) items = items.filter(item => matchesFilter(item, { ...filters, bucket: 'all' }));
  const counts = { all: items.length, plan: 0, yes: 0, likely: 0, check: 0, no: 0 };
  for (const item of items) {
    // У гостевой карточки вердикта нет, её корзина — «all»: в «Все» она уже посчитана.
    if (item.bucket !== 'all') counts[item.bucket] += 1;
    if (item.plan) counts.plan += 1;
  }
  return counts;
}

export const DEADLINE_FILTER = { open: 'Приём идёт сейчас', soon: 'Закрывается за 30 дней' };

// ——— DOM ———

const state = { query: '', bucket: 'all', country: '', kind: '', duolingo: false, noFee: false, deadline: '', sort: '' };
let ui = null;
// Сколько карточек открыто в каждой группе (по классу группы). Хранится вне
// перерисовки: renderResults пересобирает список на каждое нажатие в анкете.
const shownIn = new Map();

const itemOf = (card) => ({
  title: card.dataset.title ?? '',
  orig: card.dataset.orig ?? '',
  country: card.dataset.country ?? '',
  bucket: card.dataset.bucket ?? '',
  kind: card.dataset.kind ?? '',
  plan: card.dataset.plan === '1',
  duolingo: card.dataset.duolingo === '1',
  feeFree: card.dataset.feeFree === '1',
  open: card.dataset.open === '1',
  soon: card.dataset.soon === '1',
  closes: card.dataset.closes ?? '',
  closed: card.dataset.closed === '1',
});

// Перекладывает карточки группы в нужном порядке. Кнопка «Показать ещё»
// остаётся последней. Исходный порядок хранится в data-order.
function reorder(group) {
  const cards = [...group.querySelectorAll('.card')];
  const sorted = state.sort === 'deadline'
    ? [...cards].sort((a, b) => byDeadline(itemOf(a), itemOf(b)) || a.dataset.order - b.dataset.order)
    : [...cards].sort((a, b) => a.dataset.order - b.dataset.order);
  if (sorted.every((card, i) => card === cards[i])) return;
  const more = group.querySelector('.group-more');
  for (const card of sorted) group.insertBefore(card, more);
}

// При порядке по сроку перед первой видимой программой без срока стоит
// строка-пометка: дальше даты нет, торопить нечем.
function markUndated(group) {
  group.querySelector('[data-role="undated"]')?.remove();
  if (state.sort !== 'deadline') return;
  const first = [...group.querySelectorAll('.card')].find((card) => !card.hidden && !card.dataset.closes);
  if (!first) return;
  const note = document.createElement('p');
  note.className = 'fineprint';
  note.dataset.role = 'undated';
  note.textContent = 'Дальше — программы без срока: дату они не назвали.';
  group.insertBefore(note, first);
}

function apply() {
  if (!ui) return;
  for (const group of ui.resultsNode.querySelectorAll('.group')) reorder(group);
  // Отложенные («Не моё») живут в своём списке внизу и в фильтре не участвуют.
  const cards = [...ui.resultsNode.querySelectorAll('.group .card')];
  const items = cards.map(itemOf);

  // Счётчик у каждой кнопки — сколько станет, если её нажать: с учётом
  // поиска и страны, но без выбранного вердикта.
  const counts = bucketCounts(items, state);
  for (const chip of ui.chips) {
    chip.setAttribute('aria-pressed', String(chip.dataset.bucket === state.bucket));
    const count = counts[chip.dataset.bucket] ?? 0;
    chip.querySelector('.chip-count').textContent = String(count);
    // Пустой фильтр только сбивает: «Похоже, можно · 0» ничего не открывает.
    // Выбранный остаётся, чтобы его можно было снять.
    chip.hidden = count === 0 && chip.dataset.bucket !== 'all' && chip.dataset.bucket !== state.bucket;
  }

  // Так же и у типов: сколько программ станет, если выбрать этот тип, при
  // прочих выбранных условиях.
  const byKind = items.filter((item) => matchesFilter(item, { ...state, kind: '' }));
  for (const option of ui.kind.options) {
    if (option.value) option.textContent = `${KIND_FILTER[option.value]} (${byKind.filter((item) => item.kind === option.value).length})`;
  }
  const byWindow = items.filter((item) => matchesFilter(item, { ...state, deadline: '' }));
  for (const option of ui.deadline.options) {
    if (option.value) option.textContent = `${DEADLINE_FILTER[option.value]} (${byWindow.filter((item) => item[option.value]).length})`;
  }

  const searching = state.query.trim() !== '' || state.country !== '' || state.kind !== '' || state.duolingo || state.noFee || state.deadline !== '';
  const active = searching || state.bucket !== 'all';

  let shown = 0;
  cards.forEach((card, i) => {
    const match = matchesFilter(items[i], state);
    card.dataset.match = match ? '1' : '0';
    card.hidden = !match;
    if (match) shown += 1;
  });

  for (const group of ui.resultsNode.querySelectorAll('.group')) {
    const matched = [...group.querySelectorAll('.card')].filter((card) => card.dataset.match === '1');
    group.hidden = matched.length === 0;
    const title = group.querySelector('.group-title');
    if (title?.dataset.base) title.textContent = `${title.dataset.base} (${matched.length})`;

    const key = group.className;
    const limit = pageLimit(shownIn.get(key) ?? PAGE, searching);
    matched.forEach((card, i) => { card.hidden = i >= limit; });
    const rest = Math.max(matched.length - limit, 0);
    let more = group.querySelector('.group-more');
    if (rest > 0) {
      if (!more) {
        more = document.createElement('button');
        more.type = 'button';
        more.className = 'button button-quiet group-more';
        more.addEventListener('click', () => {
          shownIn.set(key, (shownIn.get(key) ?? PAGE) + PAGE * 2);
          apply();
        });
        group.append(more);
      }
      more.textContent = `Показать ещё ${Math.min(rest, PAGE * 2)} из ${rest}`;
    } else if (more) {
      more.remove();
    }
    markUndated(group);
  }

  ui.reset.hidden = !active && state.sort === '';
  // Без фильтров строка нужна, пока список обрезан: так видно, сколько всего программ.
  const visible = cards.filter((card) => !card.hidden).length;
  ui.status.textContent = !active
    ? (visible < cards.length ? `Показано ${visible} из ${cards.length}` : '')
    : shown === 0 ? 'Ничего не нашлось. Попробуй убрать фильтр.' : `Показано ${shown} из ${cards.length}`;
  ui.status.dataset.empty = String(active && shown === 0);
}

export function resetFilter() {
  state.query = '';
  state.bucket = 'all';
  state.country = '';
  state.kind = '';
  state.duolingo = false;
  state.noFee = false;
  state.deadline = '';
  state.sort = '';
  if (ui) {
    ui.deadline.value = '';
    ui.sort.value = '';
    ui.search.value = '';
    ui.country.value = '';
    ui.kind.value = '';
    ui.duolingo.checked = false;
    ui.noFee.checked = false;
  }
  apply();
}

// Сколько в каждой стране программ и сколько из них про конкретный вуз.
// «Вузом» считается запись типа «университет» или «помощь по достатку»;
// страновые программы и госстипендии — нет, иначе Германия сводилась бы к
// одной записи. Две цифры взяты решением Мурода 29.09.2026: одна цифра
// программ читалась как число вузов и вводила в заблуждение.
function countByCountry(programs) {
  const counts = new Map();
  for (const program of programs) {
    if (!program.hostCountry) continue;
    const current = counts.get(program.hostCountry) ?? { programs: 0, universities: 0 };
    current.programs += 1;
    if (program.kind === 'university' || program.kind === 'need-aid') current.universities += 1;
    counts.set(program.hostCountry, current);
  }
  return counts;
}

// Страны берутся из самих программ и сортируются по русскому названию:
// список не надо вести руками, и лишних стран в нём не бывает. Подписи
// пересобираются при каждой перерисовке: данные могли приехать позже, а
// счётчики должны совпадать с тем, что реально в списке.
function fillCountries(programs) {
  const counts = countByCountry(programs);
  const codes = [...counts.keys()].sort((a, b) => countryName(a).localeCompare(countryName(b), 'ru'));
  ui.country.textContent = '';
  ui.country.append(new Option('Все страны', ''));
  for (const code of codes) {
    const count = counts.get(code);
    ui.country.append(
      new Option(`${countryName(code)} · ${count.programs} программ / ${count.universities} вузов`, code),
    );
  }
}

// Типы берутся в порядке из kinds.js, и только те, что есть в данных: пустой
// пункт «Университеты (0)» сбивал бы с толку. В подписи — число программ.
function fillKinds(programs) {
  const counts = new Map();
  for (const program of programs) counts.set(program.kind, (counts.get(program.kind) ?? 0) + 1);
  ui.kind.textContent = '';
  ui.kind.append(new Option('Все типы', ''));
  for (const kind of KINDS) {
    if (!counts.has(kind)) continue;
    ui.kind.append(new Option(`${KIND_FILTER[kind]} (${counts.get(kind)})`, kind));
  }
}

// Вызывается после каждой перерисовки карточек: пересчёт идёт на каждое
// нажатие в анкете, и без этого фильтр слетал бы вместе с карточками.
export function refreshFilter(programs) {
  if (!ui) return;
  fillCountries(programs);
  fillKinds(programs);
  // Выбранное могло пропасть из данных (программу сняли). Оставить фильтр
  // по несуществующему значению нельзя: список стал бы пустым, а в списке
  // стояло бы «Все страны» — это выглядело как поломка фильтра.
  const has = (select, value) => [...select.options].some((option) => option.value === value);
  if (state.country && !has(ui.country, state.country)) state.country = '';
  if (state.kind && !has(ui.kind, state.kind)) state.kind = '';
  ui.country.value = state.country;
  ui.kind.value = state.kind;
  apply();
}

export function setupCatalogFilter({ root, resultsNode }) {
  ui = {
    resultsNode,
    search: root.querySelector('#catalog-search'),
    chips: [...root.querySelectorAll('.chip')],
    country: root.querySelector('#catalog-country'),
    kind: root.querySelector('#catalog-kind'),
    duolingo: root.querySelector('#catalog-duolingo'),
    noFee: root.querySelector('#catalog-no-fee'),
    deadline: root.querySelector('#catalog-deadline'),
    sort: root.querySelector('#catalog-sort'),
    status: root.querySelector('#catalog-status'),
    reset: root.querySelector('#catalog-reset'),
  };
  ui.search.addEventListener('input', () => { state.query = ui.search.value; apply(); });
  ui.country.addEventListener('change', () => { state.country = ui.country.value; apply(); });
  ui.kind.addEventListener('change', () => { state.kind = ui.kind.value; apply(); });
  ui.duolingo.addEventListener('change', () => { state.duolingo = ui.duolingo.checked; apply(); });
  ui.noFee.addEventListener('change', () => { state.noFee = ui.noFee.checked; apply(); });
  ui.deadline.addEventListener('change', () => { state.deadline = ui.deadline.value; apply(); });
  ui.sort.addEventListener('change', () => { state.sort = ui.sort.value; apply(); });
  for (const chip of ui.chips) chip.addEventListener('click', () => { state.bucket = chip.dataset.bucket; apply(); });
  ui.reset.addEventListener('click', resetFilter);
  return {
    reset: resetFilter,
    showBucket(bucket) { state.bucket = bucket; apply(); },
  };
}
