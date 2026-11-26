import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadProfile, profileReady, emptyProfile, STORAGE_KEY } from '../js/profile.js';
import { importState, exportState } from '../js/route-state.js';

const BASE = new URL('./fixtures/students/', import.meta.url);
const read = (file) => readFileSync(new URL(file, BASE), 'utf8');
const json = (file) => JSON.parse(read(file));
const storage = (value) => ({ getItem: (key) => key === STORAGE_KEY ? JSON.stringify(value) : null });

const index = json('index.json');

test('индекс перечисляет 10 учеников и 6 файлов истории', () => {
  assert.equal(index.students.length, 10);
  assert.equal(index.history.length, 6);
  for (const student of index.students) {
    assert.match(student.id, /^\d{2}-[a-z-]+$/);
    assert.ok(student.name.trim(), `${student.id}: пустое имя`);
    assert.ok(student.scenario.trim(), `${student.id}: пустой сценарий`);
    for (const file of [student.profile, student.route]) {
      assert.doesNotThrow(() => read(file), `${student.id}: нет файла ${file}`);
    }
  }
  for (const item of index.history) {
    assert.match(item.commit, /^[0-9a-f]{7}$/);
    assert.ok(item.era.trim(), `${item.file}: пустое описание`);
    assert.doesNotThrow(() => read(item.file), `${item.file}: нет файла`);
  }
});

for (const student of index.students) {
  test(`анкета ${student.id}: текущий код читает без потерь`, () => {
    const profile = json(student.profile);
    assert.deepEqual(Object.keys(profile).sort(), Object.keys(emptyProfile()).sort(),
      `${student.profile}: набор полей не совпадает с анкетой сайта`);
    assert.equal(profileReady(profile), true, `${student.profile}: анкета не готова`);
    assert.deepEqual(loadProfile(storage(profile)), profile,
      `${student.profile}: loadProfile потерял поля`);
  });

  test(`маршрут ${student.id}: текущий импорт без потерь`, () => {
    const text = read(student.route);
    const saved = JSON.parse(text);
    const imported = importState(text);
    assert.ok(imported, `${student.route}: importState вернул null`);
    assert.deepEqual(imported, saved, `${student.route}: импорт потерял записи`);
    assert.equal(exportState(imported), JSON.stringify(saved), `${student.route}: повторный экспорт отличается`);
  });
}

for (const item of index.history) {
  test(`история ${item.file}: текущий импорт без потерь (${item.commit})`, () => {
    const text = read(item.file);
    const saved = JSON.parse(text);
    const imported = importState(text);
    assert.ok(imported,
      `${item.file}: текущий код не принимает файл из коммита ${item.commit} (${item.era})`);
    assert.deepEqual(imported, saved,
      `${item.file}: текущий импорт потерял записи из коммита ${item.commit} (${item.era})`);
  });
}
