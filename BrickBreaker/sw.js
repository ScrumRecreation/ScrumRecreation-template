/**
 * BrickBreaker Service Worker
 *
 * キャッシュ戦略:
 *   - ローカルアセット（HTML / CSS / JS / アイコン）: Cache First
 *     → 初回アクセス後はキャッシュから即座に返し、バックグラウンドで更新確認しない。
 *       バージョンアップ時は CACHE_VERSION を変更してキャッシュを刷新する。
 *   - CDN アセット（Phaser）: Network First with Cache Fallback
 *     → 常に最新を取りに行き、ネットワーク失敗時のみキャッシュを返す。
 *   - オフライン時: キャッシュ済み index.html をフォールバックとして提供する。
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `brickbreaker-${CACHE_VERSION}`;
const CDN_CACHE_NAME = `brickbreaker-cdn-${CACHE_VERSION}`;

/** インストール時にキャッシュするアプリシェル（ローカルファイル） */
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/layouts.js',
  './js/config.js',
  './js/constants.js',
  './js/render.js',
  './js/sound.js',
  './js/phaser-game.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
];

/** 事前にキャッシュする CDN アセット */
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js',
];

/* =========================================================
   Install: アプリシェルと CDN アセットを事前キャッシュ
   ========================================================= */
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // ローカルアセット
      caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
      // CDN アセット（失敗してもインストールを止めない）
      caches.open(CDN_CACHE_NAME).then((cache) =>
        Promise.allSettled(
          CDN_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[SW] CDN キャッシュ失敗:', url, err);
            })
          )
        )
      ),
    ])
  );
  // 既存の SW を即座に置き換える
  self.skipWaiting();
});

/* =========================================================
   Activate: 古いバージョンのキャッシュを削除
   ========================================================= */
self.addEventListener('activate', (event) => {
  const validCaches = [CACHE_NAME, CDN_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => {
            console.log('[SW] 古いキャッシュを削除:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // 新しい SW をすぐに全クライアントへ適用
  self.clients.claim();
});

/* =========================================================
   Fetch: リクエストへの応答戦略
   ========================================================= */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // POST などのキャッシュ非対象リクエストはスキップ
  if (request.method !== 'GET') return;

  // ---- CDN アセット: Network First with Cache Fallback ----
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(networkFirstWithCacheFallback(request, CDN_CACHE_NAME));
    return;
  }

  // ---- 同一オリジンのローカルアセット: Cache First ----
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstWithNetworkFallback(request));
    return;
  }
});

/* =========================================================
   キャッシュ戦略ヘルパー関数
   ========================================================= */

/**
 * Cache First with Network Fallback
 * キャッシュにあれば即座に返す。なければネットワークから取得してキャッシュに追加。
 * オフラインかつキャッシュ未ヒットの場合は index.html をフォールバック返却。
 */
async function cacheFirstWithNetworkFallback(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // オフライン時は index.html をフォールバックとして返す
    const fallback = await caches.match('./index.html');
    return fallback || new Response('オフラインです。再度接続してください。', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/**
 * Network First with Cache Fallback
 * 常にネットワークを試みる。失敗した場合はキャッシュから返す。
 * キャッシュもない場合はエラーレスポンスを返す。
 */
async function networkFirstWithCacheFallback(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // JS ファイルへのフォールバック（ゲームは動かないが構文エラーにならない）
    return new Response('/* オフライン: CDN リソースを取得できませんでした */', {
      status: 503,
      headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
    });
  }
}
