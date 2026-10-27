import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buildCombinedRoute } from '../js/route-combined.js';
import { loadRouteState, reconcileProgress, toggleStep } from '../js/route-state.js';
import { taskKey } from '../js/plan.js';
const root = new URL('../data/', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const documents = Object.fromEntries(readdirSync(new URL('prep/docs/', root)).map(file => [file.slice(0, -5), read(`prep/docs/${file}`)]));
const profile = { citizenship: 'TJ', schoolCountry: 'TJ', schoolYears: 11, graduationYear: 2027, birthDate: '2008-08-09', gpa: { value: 4.8, scale: 'TJ_5' }, languageTests: [{ test: 'IELTS', score: 6 }], exams: [] };
const context = id => { const program = read(`programs/${id}.json`); return { program, conditions: program.textConditions, prepared: read(`prep/${id}.json`) }; };
const build = (contexts, state = loadRouteState(), library = documents) => buildCombinedRoute({ contexts, state, documents: library, profile, today: '2026-10-27' });

test('Nazarbayev retains the sourced IELTS section minima and a shared recommendation cannot raise them', () => {
  const route = build([context('nazarbayev'), context('kaist')]);
  const english = route.steps.find(step => step.id === 'test:ielts');
  assert.equal(english.target.min, 6);
  assert.equal(english.target.recommendedMin, 6.5);
  assert.deepEqual(english.target.perPart, { L:5.5, R:5.5, W:6, S:5.5 });
});

test('all prepared document conditions have short actions and supported codes; none is silently left as a paragraph', () => {
  const ids = readdirSync(new URL('prep/', root)).filter(file => file.endsWith('.json')).map(file => file.slice(0, -5));
  for (const id of ids) {
    const ctx = context(id);
    for (const condition of ctx.conditions.filter(c => c.kind === 'documents' && !c.test)) {
      assert.ok(documents[condition.doc], `${id}: missing document classification`);
      assert.ok(condition.docTitle.length <= 80, `${id}: ${condition.docTitle}`);
    }
    const route = build([ctx]);
    for (const step of route.steps) {
      assert.ok(step.title.length <= 80, `${id}: ${step.title}`);
      assert.ok(!step.title.endsWith('…'), `${id}: truncated title`);
    }
  }
});

test('KAIST documents show where, who, unknown issuing time and their source requirements', () => {
  const route = build([context('kaist')]);
  const transcript = route.steps.find(step => step.documentCode === 'transcript');
  assert.ok(transcript);
  assert.match(transcript.detail, /учебном заведении/);
  assert.match(transcript.detail, /Кто готовит:/);
  assert.match(transcript.detail, /Срок изготовления: уточни/);
  assert.match(transcript.detail, /Нужны официальные выписки/);
  assert.equal(transcript.docSource.program, 'kaist');
});

test('a compatible applicant passport copy is shared, while parents and different requirements remain separate', () => {
  const route = build([context('kaist'), context('gist-korea'), context('dgist')]);
  const common = route.steps.find(step => step.id === 'doc:passport:applicant-copy');
  assert.ok(common.programIds.includes('kaist'));
  assert.ok(common.programIds.includes('gist-korea'));
  assert.ok(!common.programIds.includes('dgist'), 'family passports must not be marked by the applicant-only checkbox');
  assert.ok(route.steps.some(step => step.documentCode === 'passport' && step.documentVariant === 'dgist-10'));
});

test('R1 text-based marks migrate to stable document variants and survive a change of title', () => {
  const ctx = context('kaist');
  const condition = ctx.conditions.find(c => c.doc === 'transcript');
  const oldId = `doc:text-${taskKey('', condition.ru).slice(1)}`;
  let state = { ...loadRouteState(), done: { [oldId]: null } };
  let route = build([ctx], state);
  state = reconcileProgress(state, route.steps);
  const step = route.steps.find(s => s.documentCode === 'transcript');
  assert.equal(state.done[step.id], null);
  assert.equal(Object.hasOwn(state.done, oldId), false);
  const changed = structuredClone(ctx);
  changed.conditions.find(c => c.doc === 'transcript').docTitle = 'Получить официальный школьный табель';
  route = build([changed], state);
  assert.equal(route.steps.find(s => s.documentCode === 'transcript').done, true);
  assert.equal(route.steps.find(s => s.documentCode === 'transcript').id, step.id);
});

test('compound requirements have separate translation and legalization actions without falsely sharing different documents', () => {
  const route = build([context('postech'), context('russia-quota')]);
  const legalization = route.steps.filter(s => s.documentCode === 'legalization');
  assert.equal(legalization.length, 2);
  assert.notEqual(legalization[0].id, legalization[1].id);
  const translations = route.steps.filter(s => s.documentCode === 'translation');
  assert.equal(translations.length, 3);
  assert.ok(translations.every(s => s.detail.includes('Требование программы:')));
});

test('failed instruction loading preserves program requirements and shows unknown guidance explicitly', () => {
  const route = build([context('kaist')], loadRouteState(), {});
  const transcript = route.steps.find(s => s.documentCode === 'transcript');
  assert.match(transcript.detail, /Инструкция не загрузилась/);
  assert.match(transcript.detail, /Нужны официальные выписки/);
  assert.equal(transcript.docSource, null);
  assert.equal(route.instructionsLoaded, false);
});

test('photo exceptions never become medical requirements and identity titles never invent an alternative document', () => {
  const photo = context('kyoto-iup').conditions[21];
  assert.equal(photo.doc, 'photo');
  assert.match(photo.docTitle, /фотографию/);
  const passport = context('kfupm').conditions[20];
  assert.equal(passport.doc, 'passport');
  assert.doesNotMatch(passport.docTitle, /или удостоверения/);
  assert.match(passport.docTitle, /паспорта/);
  const awards = context('icu-japan').conditions[40];
  assert.equal(awards.doc, 'application');
  assert.match(awards.docTitle, /в заявке/);
});
