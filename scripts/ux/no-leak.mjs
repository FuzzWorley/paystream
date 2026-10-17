// Rule 1, checked: type distinctive values everywhere a user can, visit every screen in every
// skin, and fail if any request the page makes carries one of them (spec §5).
//
//     npm run ux:noleak
//
// Runs in CI against the built app (npm run ux:up first).
import { chromium } from 'playwright';
import { BASE, SKINS } from './capture.mjs';

// Unusual enough not to appear in any asset by chance.
const SALARY = '123457';
const STATE = '6.789';
const THING = 'Zebracorn saddle';
const PRICE = '4321';
const NEEDLES = [SALARY, '123,457', STATE, '0.06789', THING, encodeURIComponent(THING), PRICE];

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const requests = [];
page.on('request', (r) => {
  requests.push({ url: r.url(), body: r.postData() ?? '', headers: JSON.stringify(r.headers()) });
});

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.getByLabel('Salary').fill(SALARY);
await page.getByLabel('Your state income tax rate, in percent').fill(STATE);
await page.getByLabel('Your state income tax rate, in percent').press('Enter');
await page.getByRole('link', { name: 'Your numbers' }).click();
await page.getByLabel('Federal income tax rate, in percent').fill('17');
await page.getByRole('button', { name: '+ Add a thing' }).click();
await page.getByLabel('Thing', { exact: true }).last().fill(THING);
await page.getByLabel(`Price of ${THING}, in dollars`).fill(PRICE);
for (const skin of SKINS) {
  await page.getByRole('button', { name: skin.name, exact: true }).click();
  await page.waitForFunction((id) => document.documentElement.dataset.skin === id, skin.id);
}
await page.getByRole('link', { name: 'Back to the stream' }).click();
await page.reload({ waitUntil: 'networkidle' });
await page.goto(`${BASE}/privacy`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await browser.close();

const leaks = requests.filter((r) =>
  NEEDLES.some((n) => r.url.includes(n) || r.body.includes(n) || r.headers.includes(n)),
);
const offsite = requests.filter((r) => !r.url.startsWith(BASE));
console.log(`${String(requests.length)} requests recorded.`);
for (const r of leaks) console.log(`LEAK  ${r.url}`);
for (const r of offsite) console.log(`OFFSITE  ${r.url}`);
if (leaks.length > 0 || offsite.length > 0) process.exit(1);
console.log('Nothing typed left the page, and every request stayed on this site.');
