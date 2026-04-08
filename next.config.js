const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'supabase-api', expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
    },
    {
      urlPattern: /\/api\/.*/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache', expiration: { maxEntries: 100, maxAgeSeconds: 300 } },
    },
    {
      urlPattern: /\.(png|jpg|jpeg|svg|gif|ico|webp)$/i,
      handler: 'CacheFirst',
      options: { cacheName: 'image-cache', expiration: { maxEntries: 50, maxAgeSeconds: 2592000 } },
    },
    {
      urlPattern: /\.(js|css|woff|woff2)$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-cache', expiration: { maxEntries: 100, maxAgeSeconds: 2592000 } },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = withPWA(nextConfig)
