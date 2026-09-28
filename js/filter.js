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
  BN: 'Бруней', CZ: 'Чехия', EE: 'Эстония', IN: 'Индия', SG: 'Сингапур', MY: 'Малайзия',
  GB: 'Великобритания', QA: 'Катар', RO: 'Румыния', RU: 'Россия', RS: 'Сербия',
  SK: 'Словакия', HU: 'Венгрия',
  FI: 'Финляндия', SE: 'Швеция', NL: 'Нидерланды', AT: 'Австрия', SI: 'Словения',
};

// Незнакомый код показывается как есть: лучше «BR» в списке, чем страна,
// которой там нет.
export const countryName = (code) => COUNTRY_RU[code] ?? code;

// Регистр, «ё» и диакритика (Türkiye) не должны мешать поиску: разложение
// NFD отделяет значки от букв, и они отбрасываются с обеих сторон.
export const norm = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export function matchesFilter(item, { query, bucket, country, kind }) {
  if (bucket === 'plan' ? !item.plan : bucket !== 'all' && item.bucket !== bucket) return false;
  if (country && item.country !== country) return false;
  if (kind && item.kind !== kind) return false;
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  // Тип показан в карточке словами, поэтому его можно и набрать.
  const haystack = norm(`${item.title} ${item.orig ?? ''} ${countryName(item.country)} ${KIND_LABEL[item.kind] ?? ''}`);
  return words.every((word) => haystack.includes(word));
}

export function bucketCounts(items) {
  const counts = { all: items.length, plan: 0, yes: 0, likely: 0, check: 0, no: 0 };
  for (const item of items) {
    counts[item.bucket] += 1;
    if (item.plan) counts.plan += 1;
  }
  return counts;
}

// ——— DOM ———

const state = { query: '', bucket: 'all', country: '', kind: '' };
let ui = null;

const itemOf = (card) => ({
  title: card.dataset.title ?? '',
  orig: card.dataset.orig ?? '',
  country: card.dataset.country ?? '',
  bucket: card.dataset.bucket ?? '',
  kind: card.dataset.kind ?? '',
  plan: card.dataset.plan === '1',
});

function apply() {
  if (!ui) return;
  const cards = [...ui.resultsNode.querySelectorAll('details.card')];
  const items = cards.map(itemOf);

  // Счётчик у каждой кнопки — сколько станет, если её нажать: с учётом
  // поиска и страны, но без выбранного вердикта.
  const counts = bucketCounts(items.filter((item) => matchesFilter(item, { ...state, bucket: 'all' })));
  for (const chip of ui.chips) {
    chip.setAttribute('aria-pressed', String(chip.dataset.bucket === state.bucket));
    chip.querySelector('.chip-count').textContent = `(${counts[chip.dataset.bucket] ?? 0})`;
  }

  // Так же и у типов: сколько программ станет, если выбрать этот тип, при
  // прочих выбранных условиях.
  const byKind = items.filter((item) => matchesFilter(item, { ...state, kind: '' }));
  for (const option of ui.kind.options) {
    if (option.value) option.textContent = `${KIND_FILTER[option.value]} (${byKind.filter((item) => item.kind === option.value).length})`;
  }

  let shown = 0;
  cards.forEach((card, i) => {
    const show = matchesFilter(items[i], state);
    card.hidden = !show;
    if (show) shown += 1;
  });

  for (const group of ui.resultsNode.querySelectorAll('.group')) {
    const visible = group.querySelectorAll('details.card:not([hidden])').length;
    group.hidden = visible === 0;
    const title = group.querySelector('.group-title');
    if (title?.dataset.base) title.textContent = `${title.dataset.base} (${visible})`;
  }

  const active = state.query.trim() !== '' || state.bucket !== 'all' || state.country !== '' || state.kind !== '';
  ui.reset.hidden = !active;
  ui.status.textContent = !active
    ? ''
    : shown === 0 ? 'Ничего не нашлось. Попробуй убрать фильтр.' : `Показано ${shown} из ${cards.length}`;
  ui.status.dataset.empty = String(active && shown === 0);
}

export function resetFilter() {
  state.query = '';
  state.bucket = 'all';
  state.country = '';
  state.kind = '';
  if (ui) {
    ui.search.value = '';
    ui.country.value = '';
    ui.kind.value = '';
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
    status: root.querySelector('#catalog-status'),
    reset: root.querySelector('#catalog-reset'),
  };
  ui.search.addEventListener('input', () => { state.query = ui.search.value; apply(); });
  ui.country.addEventListener('change', () => { state.country = ui.country.value; apply(); });
  ui.kind.addEventListener('change', () => { state.kind = ui.kind.value; apply(); });
  for (const chip of ui.chips) chip.addEventListener('click', () => { state.bucket = chip.dataset.bucket; apply(); });
  ui.reset.addEventListener('click', resetFilter);
  return {
    reset: resetFilter,
    showBucket(bucket) { state.bucket = bucket; apply(); },
  };
}
