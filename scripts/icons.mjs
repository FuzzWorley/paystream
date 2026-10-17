// Renders public/icon.svg to the PNG sizes installs need (home screens, iOS touch icon).
//
//     node scripts/icons.mjs
//
// Run after changing icon.svg; the PNGs are committed so builds need no browser.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const SIZES = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

const browser = await chromium.launch();
for (const { file, size } of SIZES) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${String(size)}px;height:${String(size)}px}</style>${svg}`,
  );
  await page.screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname });
  await page.close();
  console.log(`public/${file}`);
}
await browser.close();
