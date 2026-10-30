import test from 'node:test';
import assert from 'node:assert/strict';
import { activeTab } from '../js/tabbar.js';
import { routeSection } from '../js/route-view.js';

test('«Куда можно» активна на итоге и в каталоге', () => {
  assert.equal(activeTab('#programs'), 'answer');
  assert.equal(activeTab('#programs-x'), 'answer');
});

test('на экране маршрута активен «Мой путь»', () => {
  assert.equal(activeTab('#route'), 'route');
  assert.equal(activeTab('#route/applications'), 'route');
});

test('на экране «Сегодня» активна «Сегодня»', () => {
  assert.equal(activeTab('#today'), 'today');
  assert.equal(activeTab(''), 'today');
});

test('анкета не выдаётся за открытую вкладку каталога', () => {
  assert.equal(activeTab('#profile'), 'profile');
});

test('ссылки на разделы пути открывают нужный слой, неизвестная ссылка возвращает работы', () => {
  assert.equal(routeSection('#route'), 'works');
  assert.equal(routeSection('#route/new'), 'works');
  assert.equal(routeSection('#route/preparation'), 'preparation');
  assert.equal(routeSection('#route/applications'), 'applications');
  assert.equal(routeSection('#route/files'), 'files');
  assert.equal(routeSection('#route/unknown'), 'works');
});
