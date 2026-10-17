import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    preact(),
    // Installable and offline once visited. Installing also exempts the site from Safari's
    // seven-day storage eviction (spec §5).
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'paystream',
        short_name: 'paystream',
        description: 'Watch your pay arrive by the second, with taxes taking their share beside it.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0b1020',
        theme_color: '#0b1020',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Both skins' fonts and chunks, so switching skin works offline too.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  build: {
    // Served by Cloudflare as static assets (wrangler.jsonc).
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  // The ux:* scripts screenshot the built app here.
  preview: { port: 8790, strictPort: true },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Calendar maths is local time; pin a zone with DST so results don't depend on the machine.
    env: { TZ: 'America/Chicago' },
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/lib/format.ts'],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
