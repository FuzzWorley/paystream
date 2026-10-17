# Paystream — engineering spec

How paystream is built, in phases. The product is in `PRODUCT_BRIEF.md`, the look in
`design/README.md`; deliberate changes to either are in `DECISIONS.md` and referenced here as
`D#`. When this spec and a decision disagree, the newer decision wins and this file gets fixed.

## 1. Shape of the thing

A static single-page app on Cloudflare Workers static assets (free, and static requests don't
count against the shared 100k/day). **No Worker script exists until something needs a server**:
exchange-rate caching (v1.5, only if fetching from the browser proves unreliable) and accounts
(D7). Until then `wrangler.jsonc` has an `assets` block and no `main`.

| Layer | Choice | Why (D10) |
|---|---|---|
| Build | Vite + TypeScript (strict, as Satsuma's tsconfig) | Same toolchain as Satsuma |
| UI | Preact + `@preact/signals` | React's API at ~4 KB instead of ~45; signals let per-frame numbers update without re-rendering the tree |
| Routing | `preact-iso` | Small; real paths, lazy routes for games |
| Tests | Vitest; `fast-check` for the seeded property sweep; Playwright for screens | |
| Lint / format | ESLint (typescript-eslint) + Prettier, Satsuma's config | |
| Fonts | Self-hosted woff2 (Latin subset) | Works offline once installed, and no third-party request at all on load |
| Offline / install | `vite-plugin-pwa` (generated service worker + manifest) | Precache with correct cache-busting; hand-rolled SWs get this wrong |

One npm project at the root (Satsuma's separate `web/` existed because of its Worker; we have
none yet). Node 22 in CI.

### Layout

```
src/
  core/          pure maths: no Preact, DOM, fetch, storage or clock (time is an argument)
    tables/      dated tax tables, one file per year (2026.ts)
    tax.ts       annual breakdown for a salary + settings
    stream.ts    amount-at-time and rate-at-time per stream
    cadence.ts   "1¢ every 4.2 s" — picks coin and time unit
  lib/
    format.ts    the one formatter for every amount and unit
    clock.ts     rAF loop as a signal; pauses on visibilitychange
    settings.ts  the settings model, validation, localStorage load/save
  ui/            shared components, styled only through tokens
  screens/       Stream (shell + skin's hero), Numbers, Compare (v2), Games (v3), Privacy
  skins/
    index.ts     the registry — the one shared file a new skin touches
    river/       tokens.css, Hero.tsx, fonts
    arcade/      tokens.css, Hero.tsx, fonts
  styles/        base.css, tokens.css (token names + shared scale; skins set the values)
  main.tsx
scripts/ux/      up, capture, measure, down (adapted from the playwright-ui-review references)
```

**Boundaries are enforced, not hoped for** (ESLint `no-restricted-imports`): `core/` imports
only `core/`; `ui/` and `screens/` never import `skins/*` except through the registry's
interface; skins import from `core/`, `lib/`, `ui/`.

## 2. The model

### Inputs (`Settings`, saved in the browser)

| Field | Default | Notes |
|---|---|---|
| `salary` | empty → shows a $75,000 example, clearly marked as an example | Annual gross wages, USD |
| `filingStatus` | single | MFJ assumes **one earner's** wages (D12) |
| `stateRate` | 0%, with a nudge to type yours | Percent of gross wages (D12) |
| `overrides` | none | Per stream: a flat % of gross that replaces the calculation |
| `clock` | `around` | `around` = every second of the year; `work` = hours × weeks (default 40 × 52) |
| `workWeek` | 40 × 52 | the work clock's hours, kept while the 24-hour clock is on (D23) |
| `combineTaxes` | false | draw the taxes as one stream (D18) |
| `things` | coffee $5, a month's rent $1,500 | Name + amount (D6) |
| `coin` | auto | the unit: 1¢ … $100, or take-home's readable coin (D17) |
| `timeUnit` | hour | the time frame: second … year (D17) |
| `skin` | river | |
| `sound` | off | |

`settings.ts` validates on load (hand-written, no schema library) and falls back field by field
to defaults, so a corrupt or older save never breaks the page. Stored under one versioned key.

### Annual breakdown (`core/tax.ts`)

For tax year *Y*, using the newest **confirmed** table with `taxYear ≤ Y` (D8):

- **Federal income tax**: brackets applied to `salary − standardDeduction[status]`, floored at 0.
- **Social Security**: 6.2% of wages up to the wage base.
- **Medicare**: 1.45% of all wages, plus 0.9% on wages above the Additional Medicare threshold
  for the filing status.
- **State**: `stateRate × salary`.
- **Take-home**: salary minus the four.

An override replaces a stream's calculation with `rate × salary`, with no cap, and the
Numbers screen says so. If overrides push take-home below zero the stream stops and the screen
explains why; no negative stream is ever drawn.

### Over time (`core/stream.ts`, D11)

Federal and state flow evenly through the year. **Social Security and Additional Medicare follow
the real calendar**: wages to date at instant *t* are `salary × yearFraction(t)` (local time,
Jan 1 to Jan 1, leap years exact). Social Security flows at 6.2% of the gross rate until wages
to date reach the wage base, then stops until Jan 1. Additional Medicare starts when they cross
its threshold. Take-home is gross minus the taxes, so **your stream speeds up the moment Social
Security stops**. That's the moment the brief wants people to see. The Numbers screen gives the
date ("Social Security stops on 3 Aug for you").

`yearFraction` is calendar time on both clocks. The clock only sets how fast the streams flow
while you watch: per real second (`annual / secondsInYear`) or per working second
(`annual / (hours × weeks × 3600)`). On the work clock the page shows the rate as if you're at
work now.

Every displayed amount is **a closed-form function of (settings, start, now)**. Rates are
piecewise constant, so the integral is exact and nothing accumulates per frame. Core exports:

- `rateAt(settings, table, t)` → per-second rate for each stream
- `earnedBetween(settings, table, t0, t1)` → amount for each stream
- `nextPennyIn(...)` → seconds until each stream's next whole coin

### Cadence (`core/cadence.ts`)

"1¢ every 4.2 s". Coin ladder 1¢ → 10¢ → $1 → $10 → $100, time ladder s → min → h → days. Pick
the smallest coin whose interval is ≥ 1 s, and then the time unit that keeps the figure between
1 and 100. A stream at zero says why ("stopped for 2026: wage cap reached"), never "every ∞".
The same function phrases your things ("A month's rent every 9.4 days").

The time-frame amount (D17) is the rate times the frame's seconds: plain clock time
around the clock; on the work clock a day is `hoursPerWeek / 5` hours and a week
`hoursPerWeek`; a month is always a twelfth of the earning year.

### Money in, money out

Taxes are worked out in USD (rule 5). A display currency (v1.5) is a conversion at
`format.ts` time, never an input to `core/`.

## 3. Rendering

- `lib/clock.ts` holds the single `requestAnimationFrame` loop and exposes `now` as a signal.
  It stops on `visibilitychange` → hidden and restarts on visible. Because amounts are derived,
  a tab shown again after an hour is simply correct, with no burst of coins.
- Per-frame values come from computed signals in `lib/model.ts`. Only the components that
  show moving numbers (the skin's hero, *Since you got here*) re-render each frame; the shell,
  salary field and settings don't. Phase 5 measures it on a mid-range phone profile.
- **The hero belongs to the skin.** River: lanes of dots positioned by transform from derived
  values (DOM/SVG, five lanes is small). Arcade: the high-score table with block meters. Each
  skin's hero takes the same props: the per-stream values and rates as signals.
- At high rates a lane switches from discrete dots to a continuous flow; particle count is
  capped per lane.
- A visually hidden table carries every stream's rate and total for screen readers. It is
  announced on change of settings, never per tick.
- `prefers-reduced-motion`: counters tick, no movement; every number stays.
- Sound (Arcade's clink) is off by default and loads only when switched on.

## 4. Skins

A skin is `{ id, name, schemes, load() }` plus a `tokens.css` scoped to
`[data-skin="<id>"]`. `load()` brings its Hero, coin voice, fonts and CSS lazily, so River users
never download Press Start 2P; the screen switches skin once the module has loaded (D21). `schemes` is `['dark']` for both skins in v1 (D9). The token names live in
`styles/tokens.css`; shared screens use only those names.

Colour per recipient (you, federal, state, Social Security, Medicare) is fixed per skin and
checked as a set with the dataviz palette validator against that skin's background. River's
are the wireframe hues brought to OKLCH lightness 0.66, the validator's dark band. Lane labels
use text colours; the coloured marks beside them carry identity.

The skin switch is in the header on the Stream screen (D22) and on the Numbers screen. The
clock, unit, taxes and time controls share one panel between the headline and the river (D26). A returning
visitor gets their last skin; a first visit gets River.

## 5. Privacy, by construction

- The app makes **no network request carrying user input**. There are no analytics in v1. If
  analytics are ever added, they count page views only.
- Settings live in `localStorage`. After the first salary is typed, the app calls
  `navigator.storage.persist()`. Installing to the home screen avoids Safari's seven-day
  eviction, and the install prompt says so.
- A share link (later) is opt-in and puts its data after `#`.
- A Playwright check in CI types a salary, records every request the page makes, and fails if
  any request contains it.

## 6. Quality gates

`npm run check` = typecheck, lint, format check, `vitest run --coverage`, build. CI runs `check`,
then `ux:measure` and `ux:noleak` against the built app. `ux:perf` is run by hand (D25).

- **Coverage**: `src/core/**` and `src/lib/format.ts` at 100% lines and branches. They're small,
  and they're the part that can be wrong about money.
- **Table-driven tests** for `tax.ts` against worked examples (see §7 for where those come from),
  with the wage base exactly at, one dollar under and one dollar over.
- **One seeded property sweep** (`fast-check`, fixed seed, committed): at every instant,
  take-home plus taxes equals gross. Each stream integrated over the year equals its annual
  figure. Raising salary never lowers any tax. Every amount is finite and never negative.
- **The table gate** (D8): a test fails if no shipped table is `confirmed: true`, and
  `npm run deploy` runs the whole check first.
- **`ux:measure`**: every screen in every skin fits 390px, or CI fails.
- **No-leak check** (§5).

## 7. Tax tables (D8)

One file per year in `core/tables/`, each with `taxYear`, `source` (URLs, page numbers) and
`confirmed`. For each new year:

1. Claude transcribes the figures **from the published documents, fetched and cited**: the IRS
   revenue procedure for brackets and the standard deduction, and the SSA's annual fact sheet for
   the wage base. Recollection never counts. The 6.2% / 1.45% / 0.9% rates and the Additional
   Medicare thresholds are statutory and cited as such.
2. Claude writes a short checklist: each figure beside the page it came from.
3. The owner ticks it off (about ten minutes) and Claude sets `confirmed: true` in the same
   commit.

The app uses the newest confirmed table for the current year or earlier and labels it ("2026
tax tables"). On 1 Jan, before the new table lands, it keeps showing last year's, labelled as
such. Satsuma's draft 2026 table is a cross-check during step 1, not a source.

## 8. Phases

Each phase ends green, with screenshots shown and a commit approved by the owner. Phases 0–5 are
v1.

### Phase 0: scaffold and first deploy
Vite + Preact + TS; ESLint, Prettier, Vitest; the folder layout and import boundaries; a single
placeholder screen (wordmark and "Stays in your browser") in River's tokens; `wrangler.jsonc`
(assets only, SPA fallback); GitHub Actions CI; `scripts/ux/*` adapted (serve `vite preview`
on :8790, no demo identity); README status. **Deploy** and verify by HTTP status at
`https://paystream.bitcopia.workers.dev`.

### Phase 1: the core
`core/tables/2026.ts` transcribed and confirmed per §7; `tax.ts`, `stream.ts`, `cadence.ts`,
`lib/format.ts`; table-driven tests, the property sweep, 100% coverage. No UI. The owner's
confirmation checklist comes with this phase.

### Phase 2: the Stream screen in River
Salary field (streams start as you type), clock toggle, River's hero, "next penny in…" per
stream, unit and time steppers (D17), *Since you got here*, settings persisted, reduced motion, the screen-reader table,
pause on hidden. Palette validated. This is the first time it's fun, so the owner plays with it
on a phone.

### Phase 3: Your numbers and your things
The Numbers screen (filing status, state %, overrides, clock hours × weeks, sound,
skin) and
the editable your-things list shown beside *Since you got here*. The wage-cap date. The year
and source footnote.

### Phase 4: Arcade
The second skin: tokens, fonts, the high-score hero, the clink. **Without touching `core/`,
`ui/` or `screens/`.** If it needs to, the boundary is wrong and gets fixed before Arcade lands.
The skin switch.

### Phase 5: installable and polished, so v1 ships
PWA manifest and service worker, persistent storage, the no-leak check, a performance pass
(60 fps measured on a mid-range phone profile, main bundle size recorded), a design review round
if the owner wants one. Privacy page.

### Later phases (each specified in detail when it starts)
- **v1.5: currencies.** Public rates fetched from the browser with no user input, shown with
  their age, last good rate kept on failure. A Worker cache only if direct fetching is
  unreliable (measured from the deployed site, not a laptop).
- **v2: salary vs capital gains.** Long-term gains brackets join the table; the Compare screen
  (shared, every skin).
- **Accounts (D7).** First a Worker + D1, and measure PBKDF2 cost against the free plan's 10 ms
  CPU. Then sign-up and sign-in, sync of settings and scores, rate limiting, delete-my-account.
- **v3: games (D13).** Real games, each fun on its own terms: a skill input, a score worth
  beating, juice, and a 60-second-or-so round. `mount(canvas, inputs) → unmount`,
  lazy-loaded, keyboard + touch, pause on blur, scores saved (and synced when signed in). The
  numbers come from `core/`. A game's *odds* are honest; skill is how you beat them.
  - **Paychinko** first: a launch plunger (hold for power, release to fire) and three nudges a
    round. The bins at the bottom are sized by your real split. A ball left to chance lands in
    proportion, so watch mode shows the true split, and good shots beat the taxman. Score is
    what reaches your bin.
  - **Coin catcher**: your coins fall at your real rate; slide your jar to catch them before the
    taxman's buckets do.
  - **Snake**: eats coins worth your per-second pay; each tax is a segment you carry.
  - The order after Paychinko and the exact rules are set when the phase starts, by prototyping
    each and keeping what's fun.
