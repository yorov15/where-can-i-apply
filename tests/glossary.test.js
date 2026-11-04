import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { TERMS, GROUPS, searchTerms, segmentText, findTerms, normalize, termById, termHref } from '../js/glossary.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const ids = (list) => list.map((term) => term.id);
const marked = (parts) => parts.filter((part) => part.id).map((part) => [part.text, part.id]);

test('test-blind и test-flexible не получают совет приложить SAT/ACT как test-optional', () => {
  assert.deepEqual(marked(segmentText('We are test-blind and test-flexible.')), []);
  assert.equal(marked(segmentText('We are test-optional.'))[0][1], 'test-optional');
});

test('в словаре 25–40 терминов, у каждого английское слово, русский вариант и объяснение', () => {
  assert.ok(TERMS.length >= 25 && TERMS.length <= 40, `терминов ${TERMS.length}`);
  assert.equal(new Set(ids(TERMS)).size, TERMS.length, 'повтор id');
  const groups = new Set(GROUPS.map(([key]) => key));
  for (const term of TERMS) {
    assert.match(term.id, /^[a-z0-9-]+$/, term.id);
    assert.ok(groups.has(term.group), `${term.id}: группа`);
    assert.ok(term.en && term.ru && term.text, term.id);
    assert.ok(term.match.length, `${term.id}: нет форм для поиска в тексте`);
    // Одна-две фразы, иногда с третьей короткой: не абзац.
    const sentences = term.text.split(/[.!?](?:\s|$)/).filter((s) => s.trim()).length;
    assert.ok(sentences <= 3, `${term.id}: ${sentences} предложений`);
    assert.ok(term.text.length <= 260, `${term.id}: ${term.text.length} знаков`);
    assert.equal(termById(term.id), term);
    assert.equal(termHref(term.id), `glossary.html#${term.id}`);
  }
});

test('поиск по английскому слову ставит сам термин первым', () => {
  assert.equal(searchTerms('waitlist')[0].id, 'waitlist');
  assert.equal(searchTerms('Early Decision')[0].id, 'early-decision');
  assert.equal(searchTerms('fee waiver')[0].id, 'fee-waiver');
  assert.equal(searchTerms('GPA')[0].id, 'gpa');
  // Регистр и дефисы не важны.
  assert.equal(searchTerms('NEED BLIND')[0].id, 'need-blind');
  assert.equal(searchTerms('test optional')[0].id, 'test-optional');
});

test('поиск по-русски находит термин по русскому варианту и по объяснению', () => {
  assert.equal(searchTerms('лист ожидания')[0].id, 'waitlist');
  assert.equal(searchTerms('апостиль')[0].id, 'apostille');
  assert.ok(ids(searchTerms('виза')).includes('student-visa'));
  assert.equal(searchTerms('средний балл')[0].id, 'gpa');
  // ё и е — одно и то же.
  assert.ok(ids(searchTerms('перезачет')).includes('credit-transfer'));
  assert.ok(ids(searchTerms('ПЕРЕЗАЧЁТ')).includes('credit-transfer'));
  // Слово из объяснения находит термин, но ниже совпадений в названии.
  const found = ids(searchTerms('посольств'));
  assert.ok(found.includes('legalization') && found.includes('student-visa'));
});

test('пустой запрос показывает весь словарь, бессмыслица — ничего', () => {
  assert.equal(searchTerms('').length, TERMS.length);
  assert.equal(searchTerms('   ').length, TERMS.length);
  assert.deepEqual(searchTerms('qwzxv'), []);
  assert.equal(normalize(' Need-Blind / Ёж '), 'need blind еж');
});

test('подсказка — только у первого вхождения термина в блоке', () => {
  const text = 'Early Decision deadline is November 1. Early Decision is binding.';
  assert.deepEqual(marked(segmentText(text)), [['Early Decision', 'early-decision']]);
  // Один набор seen на весь блок: во втором текстовом узле того же блока термин уже не размечается.
  const seen = new Set();
  assert.equal(marked(segmentText('Submit your transcript.', seen)).length, 1);
  assert.deepEqual(marked(segmentText('The transcript must be official.', seen)), []);
  // Новый блок — новый набор.
  assert.equal(marked(segmentText('The transcript must be official.')).length, 1);
});

test('разные термины в одном блоке размечаются каждый один раз, длинный выигрывает у короткого', () => {
  const text = 'Restrictive Early Action and Regular Decision; a fee waiver for the application fee.';
  assert.deepEqual(marked(segmentText(text)), [
    ['Restrictive Early Action', 'restrictive-early-action'],
    ['Regular Decision', 'regular-decision'],
    ['fee waiver', 'fee-waiver'],
    ['application fee', 'application-fee'],
  ]);
  assert.deepEqual(marked(segmentText('application fee waiver')), [['application fee waiver', 'fee-waiver']]);
});

test('слово внутри другого слова, адреса и почты не размечается', () => {
  assert.deepEqual(findTerms('The interviewer called.'), []);
  assert.deepEqual(findTerms('Apply at portal.edu.az today.'), []);
  assert.deepEqual(findTerms('Write to cv@uni.edu'), []);
  assert.deepEqual(findTerms('Deferred Action for Childhood Arrivals'), []);
  assert.deepEqual(findTerms('a bank deposit of 10,000'), []);
  assert.deepEqual(marked(segmentText('Нужен апостиль на аттестат.')), [['апостиль', 'apostille']]);
});

test('разметка не меняет текст: склейка кусков равна цитате для всех цитат и условий в данных', () => {
  const quotes = [];
  const walk = (value, key) => {
    if (Array.isArray(value)) value.forEach((item) => walk(item, key));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => walk(v, k));
    else if (typeof value === 'string' && (key === 'quote' || key === 'ru')) quotes.push(value);
  };
  for (const dir of ['programs', 'conditions']) {
    for (const file of readdirSync(new URL(`../data/${dir}/`, import.meta.url))) {
      walk(JSON.parse(read(`data/${dir}/${file}`).replace(/^﻿/, '')));
    }
  }
  assert.ok(quotes.length > 1000, `цитат ${quotes.length}`);
  let withTerms = 0;
  for (const quote of quotes) {
    const parts = segmentText(quote);
    assert.equal(parts.map((part) => part.text).join(''), quote);
    if (parts.some((part) => part.id)) withTerms += 1;
    // Кусок-термин — ровно та строка, что стоит в цитате, без правки регистра.
    for (const part of parts) if (part.id) assert.ok(quote.includes(part.text));
  }
  assert.ok(withTerms > 200, `цитат с терминами ${withTerms}`);
});

test('словарь открыт из «Помощи» и из подвала главной, страница подписана', () => {
  assert.match(read('faq.html'), /href="glossary\.html"/);
  assert.match(read('index.html'), /<footer[\s\S]*href="glossary\.html"[\s\S]*<\/footer>/);
  const page = read('glossary.html');
  assert.match(page, /Простые объяснения Nerio, не условия программы/);
  assert.match(page, /<input type="search" id="glossary-search"/);
  assert.match(page, /<script type="module" src="js\/glossary-page\.js"><\/script>/);
});
