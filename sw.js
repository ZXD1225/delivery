// 配送电子点货 - 离线缓存 Service Worker
// 策略：HTML 与 Gist 数据均"网络优先，失败回退缓存"，保证在线永远最新、离线可用
const CACHE = 'delivery-v1';
const ASSETS = [
  './',
  './driver.html',
  './delivery_admin.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 只处理 GET（POST 是部署写操作，不缓存）
  if (e.request.method !== 'GET') return;

  // Gist 数据接口：网络优先，失败回退缓存（离线时可看上次数据）
  if (url.hostname === 'api.github.com' && url.pathname.indexOf('/gists') === 0) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            const cp = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, cp));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 站点静态资源：网络优先，失败回退缓存
  if (ASSETS.some(a => url.pathname.endsWith(a.replace('./', '')) || url.pathname === '/' + a.replace('./', ''))) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 其他请求：正常网络
  return;
});
