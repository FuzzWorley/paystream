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

// Each screen is reached with real controls (typing, tapping), never by setting state.
export const SCREENS = [
  { name: 'Stream', path: '/' },
  {
    // Past the wage base by mid-October: shows the stopped Social Security lane.
    name: 'Stream-250k',
    path: '/',
    setup: (page) => page.getByLabel('Salary').fill('250000'),
  },
  {
    name: 'Stream-state-set',
    path: '/',
    setup: async (page) => {
      const field = page.getByLabel('Your state income tax rate, in percent');
      await field.fill('5');
      await field.press('Enter');
    },
  },
  {
    // Auto coins: take-home in 10¢ drops beside the taxes' 1¢ drops.
    name: 'Stream-170k-work',
    path: '/',
    setup: async (page) => {
      await page.getByLabel('Salary').fill('170000');
      await page.getByRole('button', { name: 'Work', exact: true }).click();
    },
  },
  {
    // Unit + once: 10¢ → $1, every stream counted in dollars.
    name: 'Stream-170k-dollars',
    path: '/',
    setup: async (page) => {
      await page.getByLabel('Salary').fill('170000');
      await page.getByRole('button', { name: 'Work', exact: true }).click();
      await page.getByRole('button', { name: 'Bigger unit' }).click();
    },
  },
  { name: 'Stream-reduced-motion', path: '/', context: { reducedMotion: 'reduce' } },
  {
    // Time + once: hour → day.
    name: 'Stream-per-day',
    path: '/',
    setup: (page) => page.getByRole('button', { name: 'Longer time' }).click(),
  },
  {
    // All taxes as one lane, with the state rate said beneath the river.
    name: 'Stream-combined',
    path: '/',
    setup: async (page) => {
      const field = page.getByLabel('Your state income tax rate, in percent');
      await field.fill('5');
      await field.press('Enter');
      await page.getByRole('button', { name: 'All', exact: true }).click();
    },
  },
  { name: 'Numbers', path: '/numbers' },
  {
    // A typed federal rate, a state rate, the work clock and a third thing.
    name: 'Numbers-edited',
    path: '/numbers',
    setup: async (page) => {
      await page.getByLabel('Salary').fill('250000');
      await page.getByLabel('Federal income tax rate, in percent').fill('22');
      await page.getByLabel('Your state income tax rate, in percent').fill('5.75');
      await page.getByLabel('While I work').check();
      await page.getByRole('button', { name: '+ Add a thing' }).click();
      await page.getByLabel('Thing', { exact: true }).last().fill('A week of groceries');
      await page.getByLabel('Price of A week of groceries, in dollars').fill('180');
    },
  },
  { name: 'Privacy', path: '/privacy' },
];

// Mirrors src/skins (D9: dark only in v1). A skin is chosen by tapping the switch on Your
// numbers, like a person would.
export const SKINS = [
  { id: 'river', name: 'River', schemes: ['dark'] },
  { id: 'arcade', name: 'Arcade', schemes: ['dark'] },
];

// A fixed instant, so streams derived from the clock draw the same frame every run.
export const FROZEN_AT = new Date('2026-10-17T10:00:00');
// How long the visitor has been watching when the shot is taken.
const WATCHED_MS = 4 * 60_000;

export async function openScreen(page, screen, skin = SKINS[0]) {
  // Time runs freely while the skin is chosen, then stops at FROZEN_AT, so every screen opens
  // at the same instant however long choosing took.
  await page.clock.install({ time: FROZEN_AT.getTime() - 120_000 });
  if (skin !== SKINS[0]) {
    await page.goto(`${BASE}/numbers`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: skin.name, exact: true }).click();
    await page.waitForFunction((id) => document.documentElement.dataset.skin === id, skin.id);
  }
  await page.clock.pauseAt(FROZEN_AT);
  await page.goto(`${BASE}${screen.path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await screen.setup?.(page);
  await page.clock.fastForward(WATCHED_MS);
  await page.clock.runFor(1000);
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
          const context = await browser.newContext({ ...vp, colorScheme: scheme, ...screen.context });
          const page = await context.newPage();
          page.on('console', (m) => {
            if (m.type() === 'error') problems.push(`${tag}: ${m.text().slice(0, 300)}`);
          });
          page.on('pageerror', (e) => problems.push(`${tag}: ${e.message}`));
          await openScreen(page, screen, skin);
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
