// Every screen at desktop and phone width, in every skin and each scheme it declares.
//
//     npm run ux:shots            # all screens
//     npm run ux:shots -- Stream  # one screen
//
// Writes JPEGs to $TMPDIR/paystream-ux/shots, plus problems.txt with console errors.
// Inputs are fabricated by the script (a $75,000 salary), never anyone's real figures.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

export const BASE = 'http://localhost:8790';

export const SCREENS = [{ name: 'Stream', path: '/' }];

// Mirrors src/skins (D9: dark only in v1). Phase 4 adds Arcade and selects it by tapping
// the skin switch, like a person would.
export const SKINS = [{ id: 'river', schemes: ['dark'] }];

// A fixed instant, so streams derived from the clock draw the same frame every run.
export const FROZEN_AT = new Date('2026-03-02T10:00:00');

export async function openScreen(page, screen) {
  await page.clock.install({ time: FROZEN_AT });
  await page.goto(`${BASE}${screen.path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv[2];
  const OUT = `${process.env.TMPDIR ?? '/tmp'}/paystream-ux/shots/`;
  mkdirSync(OUT, { recursive: true });

  const VIEWPORTS = [
    { key: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    {
      key: 'mobile',
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
  ];
  const problems = [];
  const browser = await chromium.launch();

  for (const skin of SKINS) {
    for (const scheme of skin.schemes) {
      for (const vp of VIEWPORTS) {
        for (const screen of SCREENS) {
          if (only && screen.name !== only) continue;
          const tag = `${screen.name.toLowerCase()}-${skin.id}-${scheme}-${vp.key}`;
          const context = await browser.newContext({ ...vp, colorScheme: scheme });
          const page = await context.newPage();
          page.on('console', (m) => {
            if (m.type() === 'error') problems.push(`${tag}: ${m.text().slice(0, 300)}`);
          });
          page.on('pageerror', (e) => problems.push(`${tag}: ${e.message}`));
          await openScreen(page, screen);
          const shot = { type: 'jpeg', quality: 80, animations: 'disabled' };
          await page.screenshot({ ...shot, path: `${OUT}${tag}.jpg`, fullPage: true });
          if (vp.key === 'mobile') await page.screenshot({ ...shot, path: `${OUT}${tag}-fold.jpg` });
          await context.close();
        }
      }
    }
  }
  await browser.close();
  writeFileSync(`${OUT}problems.txt`, problems.join('\n') + '\n');
  console.log(`Screenshots in ${OUT} — ${String(problems.length)} console problems logged.`);
}
