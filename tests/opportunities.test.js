import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { opportunityStatus, opportunityCostText, selectOpportunities } from '../js/opportunities.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const items = JSON.parse(read('data/opportunities.json'));
const today = '2026-11-04';

test('по умолчанию показываются только пять подтверждённых открытых бесплатных конкурсов', () => {
  const visible = selectOpportunities(items, { today });
  assert.equal(visible.length, 5);
  assert.equal(visible[0].id, 'aldevere-question');
  assert.ok(visible.every(item => item.cost === 'free' && item.deadline && item.state === 'confirmed'));
});

test('закрытый набор и национальная олимпиада без даты не становятся открытыми', () => {
  assert.equal(opportunityStatus(items.find(i => i.id === 'immerse-essay'), today), 'closed');
  assert.equal(opportunityStatus(items.find(i => i.id === 'tajikistan-biology'), today), 'unknown');
  assert.equal(selectOpportunities(items, { today, type: 'olympiad' }).length, 0);
  assert.equal(selectOpportunities(items, { today, type: 'olympiad', openOnly: false, freeOnly: false }).length, 2);
});

test('срок бесплатной регистрации отделён от срока подачи и перестаёт обещать бесплатность', () => {
  const horizon = items.find(i => i.id === 'horizon-essay');
  assert.equal(opportunityStatus(horizon, '2027-01-17'), 'open');
  assert.equal(opportunityStatus(horizon, '2027-01-18'), 'open');
  assert.equal(opportunityStatus(horizon, '2027-01-25'), 'closed');
  assert.equal(selectOpportunities([horizon], { today: '2027-01-18', openOnly: false }).length, 0);
  assert.equal(selectOpportunities([horizon], { today: '2027-01-18', freeOnly: false }).length, 1);
  assert.doesNotMatch(opportunityCostText(horizon, '2027-01-18'), /Участие бесплатно\./);
  assert.match(opportunityCostText(horizon, '2027-01-18'), /срок регистрации прошёл/);
});

test('сроки UK, Eastern и AoE не закрываются раньше в часовом поясе Душанбе', () => {
  const ted = items.find(i => i.id === 'ted-speaking');
  assert.equal(opportunityStatus(ted, '2027-01-11T00:30:00+05:00'), 'open');
  assert.equal(opportunityStatus(ted, '2027-01-11T05:00:00+05:00'), 'closed');
  const horizon = items.find(i => i.id === 'horizon-essay');
  assert.match(opportunityCostText(horizon, '2027-01-18T01:00:00+05:00'), /^Участие бесплатно/);
  assert.doesNotMatch(opportunityCostText(horizon, '2027-01-18T10:00:00+05:00'), /^Участие бесплатно/);
  const aldevere = items.find(i => i.id === 'aldevere-question');
  assert.equal(opportunityStatus(aldevere, '2026-11-16T12:00:00+05:00'), 'open');
});

test('поиск работает по русскому описанию и названию без учёта регистра', () => {
  assert.equal(selectOpportunities(items, { today, query: 'ЭССЕ сложный' })[0].id, 'aldevere-question');
  assert.equal(selectOpportunities(items, { today, query: 'LUMIERE' })[0].id, 'lumiere-essay');
  assert.equal(selectOpportunities(items, { today, type: 'speaking' })[0].id, 'ted-speaking');
});

test('у опубликованных записей источник одобрен, цитаты совпадают со снимком и его хешем', () => {
  const registry = JSON.parse(read('tools/opportunity-sources.json'));
  assert.equal(registry.approvedBy, 'human');
  assert.equal(registry.sources.length, 10);
  assert.equal(new Set(items.map(i => i.id)).size, items.length);
  for (const item of items) {
    const source = item.source;
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(registry.sources.some(s => s.domain === url.hostname && s.url === source.url), item.id);
    const text = read(source.snapshot).replace(/\r\n/g, '\n');
    assert.equal(createHash('sha256').update(text).digest('hex'), source.sha256, item.id);
    for (const quote of source.quotes) assert.ok(text.includes(quote), item.id);
    assert.match(source.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    if (item.state === 'confirmed') assert.match(item.deadline, /^\d{4}-\d{2}-\d{2}$/);
  }
});
