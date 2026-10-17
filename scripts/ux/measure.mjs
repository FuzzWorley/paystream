// How wide each screen lays out on a 390px phone, in every skin, and what is responsible.
//
//     npm run ux:measure
//
// Exits non-zero while any screen is wider than the phone. Runs in CI.
import { chromium } from 'playwright';
import { SCREENS, SKINS, openScreen } from './capture.mjs';

const PHONE = 390;
const browser = await chromium.launch();

let failures = 0;
let checked = 0;
for (const skin of SKINS) {
  for (const screen of SCREENS) {
    // A fresh context per screen: a phone's layout viewport, once widened, never narrows
    // again, so measuring in sequence reports one screen's width against the next.
    const context = await browser.newContext({
      viewport: { width: PHONE, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: skin.schemes[0],
    });
    const page = await context.newPage();
    await openScreen(page, screen);

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
          .map(
            (e) =>
              `${String(Math.round(e.getBoundingClientRect().right))}px  ${e.tagName.toLowerCase()}.${(e.className?.toString() || '').split(' ')[0]} "${(e.textContent ?? '').trim().slice(0, 30)}"`,
          ),
      };
    });

    checked += 1;
    const ok = m.width <= PHONE;
    if (!ok) failures += 1;
    console.log(`${ok ? 'ok  ' : 'WIDE'} ${`${skin.id}/${screen.name}`.padEnd(20)} ${String(m.width)}px`);
    if (!ok) for (const c of m.culprits) console.log(`       right edge ${c}`);
    await context.close();
  }
}
await browser.close();

console.log(
  failures === 0
    ? `\nEvery screen fits a ${String(PHONE)}px phone.`
    : `\n${String(failures)} of ${String(checked)} screens are wider than ${String(PHONE)}px.`,
);
process.exit(failures === 0 ? 0 : 1);
