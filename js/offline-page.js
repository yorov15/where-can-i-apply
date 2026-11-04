// Сохраняем справочную страницу уже при первом заходе. Воркер начинает
// контролировать вкладку после загрузки, поэтому сам этот заход он не видит.
export async function cacheReferencePage(modules = []) {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return false;
  try {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    const assets = [location.pathname, '/css/style.css', '/js/theme.js',
      '/js/offline-page.js', '/manifest.webmanifest', '/icons/icon-192.png',
      ...['onest-cyrillic', 'onest-latin', 'literata-cyrillic', 'literata-latin'].map(name => `/fonts/${name}.woff2`),
      ...modules];
    const cache = await caches.open('kuda-podat-v1');
    await cache.addAll([...new Set(assets)]);
    document.documentElement.dataset.referenceCached = 'true';
    return true;
  } catch { return false; }
}
