// How wide each screen lays out on a 390px phone, and what is responsible.
//
//     npm run ux:measure
//
// Exits non-zero while any screen is wider than the phone — the check A48 left behind.
// Baseline before it, 2026-10-14: 557px to 860px on every screen.
import { chromium } from 'playwright';
import { BASE, TABS, assertDemo, openTab } from './capture.mjs';

const PHONE = 390;
await assertDemo();

const browser = await chromium.launch();

let failures = 0;
for (const tab of TABS) {
  // A fresh page per screen: a phone's layout viewport, once widened, does not narrow
  // again, so measuring tabs in sequence reported one screen's width against the next.
  const context = await browser.newContext({
    viewport: { width: PHONE, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await openTab(page, tab);

  const m = await page.evaluate(() => {
    // Content inside a scroll container cannot widen the page, and a fixed bar only
    // stretches to whatever width the page already has — neither is a culprit.
    const clipped = (e) => {
      if (getComputedStyle(e).position === 'fixed') return true;
      for (let a = e.parentElement; a; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.position === 'fixed' || ['auto', 'hidden', 'scroll'].includes(cs.overflowX)) return true;
      }
      return false;
    };
    const free = [...document.querySelectorAll('body *')].filter((e) => !clipped(e));
    free.sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
    return {
      width: Math.round(Math.max(window.innerWidth, document.documentElement.scrollWidth)),
      culprits: free
        .slice(0, 3)
        .map((e) => `${String(Math.round(e.getBoundingClientRect().right))}px  ${e.tagName.toLowerCase()}.${(e.className?.toString() || '').split(' ')[0]} "${(e.textContent ?? '').trim().slice(0, 30)}"`),
    };
  });

  const ok = m.width <= PHONE;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'WIDE'} ${tab.padEnd(11)} ${String(m.width)}px`);
  if (!ok) for (const c of m.culprits) console.log(`       right edge ${c}`);
  await context.close();
}
await browser.close();

console.log(failures === 0 ? '\nEvery screen fits a 390px phone.' : `\n${String(failures)} of ${String(TABS.length)} screens are wider than ${String(PHONE)}px.`);
process.exit(failures === 0 ? 0 : 1);
