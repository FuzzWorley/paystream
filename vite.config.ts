import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [preact()],
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
