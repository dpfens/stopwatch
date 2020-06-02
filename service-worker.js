importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

// Cache Google Fonts with a stale-while-revalidate strategy, with
// a maximum number of entries.
workbox.routing.registerRoute(function(request) {
    return request.url.origin === 'https://fonts.googleapis.com' || request.url.origin === 'https://fonts.gstatic.com';
  },
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'google-fonts',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 20,
      })
    ]
  })
);


workbox.routing.registerRoute(function(request) {
    return request.url.origin === 'https://fonts.googleapis.com' || request.url.origin === 'https://fonts.gstatic.com';
  },
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'google-fonts',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 20,
      })
    ]
  })
);

workbox.routing.registerRoute(function (request) {
        return request.request.destination === 'image';
    },
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    }),
  );

workbox.routing.registerRoute(function(request) {
        return request.request.destination === 'script' || request.request.destination === 'style';
    },
    new workbox.strategies.StaleWhileRevalidate()
);

workbox.googleAnalytics.initialize();
