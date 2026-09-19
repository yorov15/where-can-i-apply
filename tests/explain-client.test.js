import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainPayload, explainKey, askExplain, cachedAnswer, parseAnswer, ExplainError, HEADINGS } from '../js/explain.js';

const model = (id = 'oxford-reach') => ({
  id,
  title: 'Оксфорд',
  headline: 'Пока нельзя',
  // Всё, чего в запросе быть не должно, лежит рядом с тем, что должно.
  profile: { birthDate: '2009-03-01', gpa: { value: 4.8 } },
  reasons: [
    { field: 'schoolCountry', status: 'fail', code: 'schoolCountry.denied', params: {}, title: 'Страна школы', detail: 'подробность', workarounds: ['путь'], says: [] },
    { field: 'language', status: 'unknown', code: 'language.below-advisory', params: { options: [{ test: 'IELTS', min: 7.5 }] }, title: 'Язык', detail: 'x' },
  ],
});

const ok = (text) => async () => ({ status: 200, ok: true, json: async () => ({ text }) });

test('в запрос уходят только поле, статус, код и числа причин — ни анкеты, ни текстов', () => {
  const payload = explainPayload(model());
  assert.deepEqual(Object.keys(payload).sort(), ['programId', 'reasons']);
  assert.deepEqual(Object.keys(payload.reasons[0]).sort(), ['code', 'field', 'params', 'status']);
  const wire = JSON.stringify(payload);
  assert.doesNotMatch(wire, /birthDate|2009|4\.8|подробность|Оксфорд|путь/);
});

test('успешный ответ возвращается и запоминается: второй раз в сеть не идём', async () => {
  let calls = 0;
  const fetchImpl = async (...args) => { calls += 1; return ok('Почему так\nТекст')(...args); };
  const m = model('cache-test');
  assert.equal(cachedAnswer(m), null);
  assert.equal((await askExplain(m, { url: '/x', fetchImpl })).text, 'Почему так\nТекст');
  assert.equal((await askExplain(m, { url: '/x', fetchImpl })).text, 'Почему так\nТекст');
  assert.equal(calls, 1);
  assert.equal(cachedAnswer(m), 'Почему так\nТекст');
});

test('запрос — POST с JSON на нужный адрес', async () => {
  let seen;
  const fetchImpl = async (url, init) => { seen = { url, init }; return ok('Текст')(); };
  await askExplain(model('post-test'), { url: 'https://p.example/api/explain', fetchImpl });
  assert.equal(seen.url, 'https://p.example/api/explain');
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers['Content-Type'], 'application/json');
  assert.equal(JSON.parse(seen.init.body).programId, 'post-test');
});

test('ошибки называются по-человечески: лимит, выключено, сеть, модель', async () => {
  const kind = async (fetchImpl) => {
    try {
      await askExplain(model('err-' + Math.random()), { url: '/x', fetchImpl });
    } catch (e) {
      assert.ok(e instanceof ExplainError);
      return e.kind;
    }
    return null;
  };
  assert.equal(await kind(async () => ({ status: 429, ok: false })), 'rate');
  assert.equal(await kind(async () => ({ status: 503, ok: false })), 'off');
  assert.equal(await kind(async () => ({ status: 502, ok: false })), 'model');
  assert.equal(await kind(async () => { throw new TypeError('offline'); }), 'network');
  assert.equal(await kind(async () => ({ status: 200, ok: true, json: async () => ({}) })), 'model');
  assert.equal(await kind(async () => ({ status: 200, ok: true, json: async () => ({ text: '   ' }) })), 'model');
  assert.equal(await kind(async () => ({ status: 200, ok: true, json: async () => { throw new Error('bad json'); } })), 'model');
});

test('неудача в кэш не попадает', async () => {
  const m = model('fail-then-ok');
  await assert.rejects(askExplain(m, { url: '/x', fetchImpl: async () => ({ status: 502, ok: false }) }));
  assert.equal(cachedAnswer(m), null);
  assert.equal((await askExplain(m, { url: '/x', fetchImpl: ok('Теперь можно') })).text, 'Теперь можно');
});

test('ключ зависит от причин, а не от порядка полей объекта', () => {
  assert.equal(explainKey(model()), explainKey(model()));
  assert.notEqual(explainKey(model()), explainKey(model('other')));
});

test('ответ делится на секции по трём заголовкам', () => {
  const sections = parseAnswer('Почему так\nОксфорд не принимает аттестат.\n\nКак это обойти\nСдай IB.\nИли A-level.\n\nЧто сделать сейчас\nНапиши в приёмную.');
  assert.deepEqual(sections.map((s) => s.heading), HEADINGS);
  assert.deepEqual(sections[1].lines, ['Сдай IB.', 'Или A-level.']);
});

test('заголовки с разметкой и двоеточием тоже узнаются, разметка в текст не попадает', () => {
  const sections = parseAnswer('**Почему так:**\n# Просто строка\n\n## Как это обойти');
  assert.equal(sections[0].heading, 'Почему так');
  assert.deepEqual(sections[0].lines, ['Просто строка']);
  assert.equal(sections[1].heading, 'Как это обойти');
});

test('текст без заголовков не теряется', () => {
  const sections = parseAnswer('Просто абзац.\nВторая строка.');
  assert.equal(sections.length, 1);
  assert.equal(sections[0].heading, null);
  assert.equal(sections[0].lines.length, 2);
});

test('теги в ответе остаются текстом: parseAnswer ничего не интерпретирует', () => {
  const [section] = parseAnswer('<img src=x onerror=alert(1)>');
  assert.equal(section.lines[0], '<img src=x onerror=alert(1)>');
});

// Так отвечает настоящая модель: заголовок в начале абзаца, а не отдельной
// строкой.
test('заголовок в начале абзаца, через двоеточие, тоже открывает секцию', () => {
  const sections = parseAnswer('Почему так: Оксфорд не принимает аттестат.\n\nКак это обойти: Сдай IB.\n\nЧто сделать сейчас: Напиши им.');
  assert.deepEqual(sections.map((s) => s.heading), HEADINGS);
  assert.deepEqual(sections[0].lines, ['Оксфорд не принимает аттестат.']);
  assert.deepEqual(sections[1].lines, ['Сдай IB.']);
});

test('слово из заголовка внутри обычного предложения секцию не открывает', () => {
  const sections = parseAnswer('Почему так\nЭто объясняет, почему так вышло.');
  assert.equal(sections.length, 1);
  assert.deepEqual(sections[0].lines, ['Это объясняет, почему так вышло.']);
});

test('справка без ИИ показывается, но в кэш не попадает: следующая попытка пойдёт к модели', async () => {
  const m = model('fallback-test');
  const fetchImpl = async () => ({ status: 200, ok: true, json: async () => ({ text: 'Почему так\nСправка', fallback: true }) });
  const answer = await askExplain(m, { url: '/x', fetchImpl });
  assert.deepEqual(answer, { text: 'Почему так\nСправка', fallback: true });
  assert.equal(cachedAnswer(m), null);
});

test('слишком длинный ответ сервера считается сбоем', async () => {
  const fetchImpl = ok('я'.repeat(6000));
  await assert.rejects(askExplain(model('too-long'), { url: '/x', fetchImpl }), (e) => e.kind === 'model');
});
