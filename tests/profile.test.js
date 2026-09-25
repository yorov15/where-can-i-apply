import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProfile, saveProfile, loadProfile, missingFields, profileSummary, profileReady } from '../js/profile.js';

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
}

const filled = {
  citizenship: 'TJ',
  schoolCountry: 'TJ',
  schoolYears: 11,
  graduationYear: 2027,
  birthDate: '2008-08-09',
  gpa: { value: 4.8, scale: 'TJ_5' },
  languageTests: [{ test: 'IELTS', score: 7.0 }],
  exams: [],
};

test('пустой профиль содержит все восемь ключей', () => {
  assert.deepEqual(Object.keys(emptyProfile()).sort(), [
    'birthDate', 'citizenship', 'exams', 'gpa', 'graduationYear',
    'languageTests', 'schoolCountry', 'schoolYears',
  ]);
});

test('профиль переживает запись и чтение', () => {
  const s = fakeStorage();
  saveProfile(filled, s);
  assert.deepEqual(loadProfile(s), filled);
});

test('пустое хранилище даёт пустой профиль, а не падение', () => {
  assert.deepEqual(loadProfile(fakeStorage()), emptyProfile());
});

test('битый JSON в хранилище даёт пустой профиль, а не падение', () => {
  const s = fakeStorage({ 'eligibility-profile': '{не json' });
  assert.deepEqual(loadProfile(s), emptyProfile());
});

test('заполненный профиль ничего не требует', () => {
  assert.deepEqual(missingFields(filled), []);
});

test('незаполненные поля перечисляются поимённо', () => {
  const partial = { ...filled, birthDate: null, gpa: { value: null, scale: 'TJ_5' } };
  const got = missingFields(partial);
  assert.ok(got.includes('birthDate'));
  assert.ok(got.includes('gpa'));
});

test('пустой список сертификатов — это заполненный ответ, а не пропуск', () => {
  assert.deepEqual(missingFields({ ...filled, languageTests: [] }), []);
});

test('строка профиля для свёрнутой анкеты', () => {
  const p = {
    ...emptyProfile(),
    citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11, graduationYear: 2027,
    gpa: { value: 4.8, scale: 'TJ_5' }, languageTests: [{ test: 'IELTS', score: null }],
  };
  assert.equal(profileSummary(p), 'Таджикистан · 11 лет школы · выпуск 2027 · балл 4.8 · IELTS не сдан');
});

test('страна школы в строке, только если отличается от гражданства', () => {
  const p = { ...emptyProfile(), citizenship: 'TJ', schoolCountry: 'RU', languageTests: [{ test: 'TOEFL_IBT_2026', score: 5 }] };
  assert.equal(profileSummary(p), 'Таджикистан · школа в России · TOEFL 5');
});

test('пустой профиль просит заполнить анкету', () => {
  assert.equal(profileSummary(emptyProfile()), 'Заполни анкету');
});

test('анкета готова, когда есть гражданство, страна, годы и выпуск', () => {
  const p = { ...emptyProfile(), citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11 };
  assert.equal(profileReady(p), false);
  assert.equal(profileReady({ ...p, graduationYear: 2027 }), true);
});
