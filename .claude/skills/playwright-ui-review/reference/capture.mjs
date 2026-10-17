// Every screen of the demo instance at desktop and phone width, light and dark.
//
//     npm run ux:shots              # all tabs
//     npm run ux:shots -- History   # one tab
//
// Writes JPEGs to $TMPDIR/satsuma-ux/shots, plus problems.txt with console errors.
// Fabricated data only: it refuses to run unless the instance is signed in as the demo user.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

export const BASE = 'http://localhost:8799';
export const TABS = [
  'Dashboard',
  'Positions',
  'History',
  'Sales',
  'Taxes',
  'Rebalance',
  'Categories',
  'Import',
  'Settings',
];

export async function assertDemo() {
  const me = await (await fetch(`${BASE}/api/me`)).json().catch(() => null);
  if (me?.email !== 'demo@satsuma.test') {
    throw new Error(`Not the demo instance (signed in as ${String(me?.email)}). Run npm run ux:up first.`);
  }
}

/**
 * Tabs are state, not URLs, so they are tapped — for real, which is itself a check: on a
 * phone an overlapping tab bar once intercepted the tap. Secondary tabs sit under More there.
 */
export async function openTab(page, tab) {
  const nav = page.getByRole('navigation', { name: 'Sections' });
  const direct = nav.getByRole('button', { name: tab, exact: true });
  if (await direct.isVisible()) {
    await direct.click();
  } else {
    await nav.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('menuitem', { name: tab, exact: true }).click();
  }
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700); // chart animations settle
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await assertDemo();
  const only = process.argv[2];
  const OUT = `${process.env.TMPDIR ?? '/tmp'}/satsuma-ux/shots/`;
  mkdirSync(OUT, { recursive: true });

  const VIEWPORTS = [
    { key: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    { key: 'mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  ];
  const problems = [];
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    for (const scheme of ['light', 'dark']) {
      const context = await browser.newContext({ ...vp, colorScheme: scheme });
      const page = await context.newPage();
      page.on('console', (m) => {
        if (m.type() === 'error') problems.push(`${vp.key}/${scheme}: ${m.text().slice(0, 300)}`);
      });
      page.on('pageerror', (e) => problems.push(`${vp.key}/${scheme}: ${e.message}`));
      await page.goto(BASE, { waitUntil: 'networkidle' });

      for (const tab of TABS) {
        if (only && tab !== only) continue;
        await openTab(page, tab);
        await page.screenshot({ path: `${OUT}${tab.toLowerCase()}-${vp.key}-${scheme}.jpg`, fullPage: true, type: 'jpeg', quality: 78 });
      }
      if (vp.key === 'mobile' && !only) {
        await openTab(page, 'Dashboard');
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `${OUT}fold-mobile-${scheme}.jpg`, type: 'jpeg', quality: 80 });
      }
      await context.close();
    }
  }
  await browser.close();
  writeFileSync(`${OUT}problems.txt`, problems.join('\n') + '\n');
  console.log(`Screenshots in ${OUT} — ${String(problems.length)} console problems logged.`);
}
