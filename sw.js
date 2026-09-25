// Сначала сеть, кэш только когда сети нет или она слишком медленная.
// Кэш здесь — запасной выход для плохого интернета, а не источник данных:
// главное обещание сайта — свежие сроки, поэтому при живой сети всегда
// отвечает сервер. Если что-то сломалось: выложить вместо этого файла
// воркер из одной строки `self.registration.unregister()` — удаление файла
// не поможет, браузер оставит старый воркер работать.
const CACHE = 'kuda-podat-v1';
const SLOW_MS = 4000;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Кладём копию ответа в кэш. Ошибка кэша не должна ломать сам ответ.
function store(request, response) {
  const copy = response.clone();
  caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
  return response;
}

async function respond(request) {
  const cached = await caches.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok) return store(request, response);
    // Сервер ответил ошибкой, а прежняя копия есть — лучше она.
    if (cached) throw new Error('bad response');
    return response;
  });
  if (!cached) return network;
  const slow = new Promise((resolve) => setTimeout(resolve, SLOW_MS, cached));
  return Promise.race([network, slow]).catch(() => cached);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Только свои GET: анкета никуда не уходит, ИИ-объяснялка живёт на другом
  // адресе и в кэш не попадает.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(respond(request));
});
