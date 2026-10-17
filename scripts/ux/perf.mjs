// Frame rate of the Stream screen in every skin, on a phone-sized viewport with the CPU slowed
// 4× (Chrome's mid-range mobile preset), and the size of what a first visit downloads.
//
//     npm run ux:perf
//
// Measured in local headless Chromium, so it is a regression signal, not a real phone.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { BASE, SKINS, openScreen } from './capture.mjs';

const SECONDS = 5;
const browser = await chromium.launch();

for (const skin of SKINS) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await openScreen(page, { name: 'Stream', path: '/' }, skin);
  await page.clock.resume();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const frames = await page.evaluate(
    (seconds) =>
      new Promise((resolve) => {
        const gaps = [];
        let last = performance.now();
        const end = last + seconds * 1000;
        const tick = (t) => {
          gaps.push(t - last);
          last = t;
          if (t < end) requestAnimationFrame(tick);
          else resolve(gaps);
        };
        requestAnimationFrame(tick);
      }),
    SECONDS,
  );
  frames.shift();
  const fps = frames.length / SECONDS;
  const long = frames.filter((g) => g > 1000 / 30).length;
  const worst = Math.max(...frames);
  console.log(
    `${skin.id.padEnd(8)} ${fps.toFixed(0)} fps · ${String(long)} frames over 33 ms · worst ${worst.toFixed(0)} ms`,
  );
  await context.close();
}
await browser.close();

// What the first visit to / downloads: the entry script and stylesheet (River ships inside).
const assets = new URL('../../dist/assets/', import.meta.url).pathname;
for (const f of readdirSync(assets).filter((n) => /^index-.*\.(js|css)$/.test(n))) {
  const raw = readFileSync(assets + f);
  console.log(
    `${f.padEnd(24)} ${(statSync(assets + f).size / 1024).toFixed(1)} KB · ${(gzipSync(raw).length / 1024).toFixed(1)} KB gzip`,
  );
}
console.log(`(measured against ${BASE})`);
