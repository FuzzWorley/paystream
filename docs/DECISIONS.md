# Decisions

Deliberate changes to the product brief or engineering spec, newest last. Each entry says what
was decided, why, and what evidence it rests on. Code comments reference an entry (`D3`)
instead of restating it.

## D1 — Everything computed in the browser; no sign-in required (2026-10-17)

All maths runs client-side, and the app is fully usable without an account: type a salary and
watch. Signed out, nothing typed is sent anywhere; inputs live in browser storage and an opt-in
share link keeps its data in the `#fragment`, which browsers never send. *Amended by D7: an
optional account syncs settings and scores across devices.*

## D2 — Federal and FICA calculated, state typed in, for v1 (2026-10-17)

Federal brackets, Social Security and Medicare are one dataset each; fifty states are fifty.
A typed state rate keeps v1 small and honest. Every calculated rate is also overridable.

## D3 — Tax tables ship dated and unconfirmed (2026-10-17)

Carried from Satsuma: an assistant's recollection of current-year thresholds is not a source,
and a stale bracket is a plausible wrong number. Tables carry `taxYear`, `source` and
`confirmed`; nothing shows from an unconfirmed table. In a public app, confirmation is done
once per year by the repo owner, in code, against the IRS/SSA release.

## D4 — Skins: River (default) and Arcade, both in v1 (2026-10-17)

The owner liked all three wireframe directions and wanted users to choose. A skin owns its
tokens and its rendering of the hero stream; everything else is shared and themed. River is
the first-visit default; Arcade, the owner's favourite, is one tap away; a returning user's
choice is remembered. Both ship in v1, River built first — the second skin is what proves the
boundary holds. Mint's look was rejected. See `docs/design/README.md`.

## D5 — "Your numbers" and the salary-vs-gains comparison exist in every skin (2026-10-17)

The owner wants both screens available whatever skin is chosen. They are shared screens themed
by the skin's tokens, not per-skin designs.

## D6 — "Your things": user-editable comparisons (2026-10-17)

Kept from the Mint wireframe. A list of name + amount items, defaulting to a coffee and a
month's rent; users rename, re-price, add and remove them ("A week of groceries every 2.3
days"). Shown alongside *Since you got here*.

## D7 — Optional accounts, username + password, in their own phase (2026-10-17)

Reason: the same settings on a work computer, a personal computer and a phone, and game scores
that survive clearing browser data. Safari also deletes script-written storage after about
seven days without a visit (unless the site is installed to the home screen), so storage alone
would lose people's settings.

- **Optional, never required.** Signed out, D1 holds unchanged. Signed in, settings and scores
  are stored server-side; the copy says so ("Saved to your account so it follows you").
- **Username + password, no email.** The owner's call: a lost account costs settings and a high
  score, nothing serious, so no recovery flow. Passwords are still hashed properly, because
  people reuse them and a leak would expose their other accounts.
- **Measure first:** the Workers free plan allows 10 ms CPU per request. The phase starts by
  measuring the cost of an adequate WebCrypto PBKDF2 setting on the free plan; if it doesn't
  fit, the owner chooses between a lighter setting and Workers Paid ($5/month).
- Rate-limit sign-in attempts; a short privacy page; a "delete my account" button.
- Rejected: Cloudflare Access (what Satsuma uses) — free only up to 50 users and puts
  Cloudflare's login page in front of the app. Email codes sent by the app itself — Cloudflare's
  Email Sending is beta and needs Workers Paid for arbitrary recipients (docs checked
  2026-10-17); a third-party sender would work if email is ever wanted.
- Placed after the core v1 and before the games, so scores have a home from the start.

## D8 — Tax tables are confirmed at build time, not at runtime (2026-10-17)

*Amends D3.* The owner pointed out that users should only ever type their state rate. They're
right: the D3 runtime rule ("an unconfirmed table produces no figure") put a developer check
in front of users. Now:

- Claude transcribes each year's figures from the published IRS revenue procedure and SSA fact
  sheet, fetched and cited with page numbers, never from recollection. The owner ticks off a
  short checklist of figure-beside-page, and Claude flips `confirmed` in the same commit.
- The app uses the newest confirmed table for the current year or earlier and labels its year.
  A new year's draft can sit in the repo unconfirmed; it's simply not used.
- **`npm run check` fails if no table is confirmed, and every deploy runs it.** Users always
  see calculated figures; there is
  no "no figure" state to design.

## D9 — Dark only in v1, both skins (2026-10-17)

The owner doesn't need light mode for Arcade (a light CRT makes no sense) and isn't sure River
needs it. Each theme has to be designed and reviewed, not inverted, so a second theme doubles
the visual work for little gain now. Skins declare `schemes: ['dark']`; the screenshot and
review workflow captures what a skin declares. A light River later is a token set, contained
in `src/skins/river/`.

## D10 — Stack: Vite + Preact + signals + TypeScript, static assets only (2026-10-17)

Satsuma's toolchain (Vite, strict TS, Vitest, ESLint, Prettier, Playwright) carries over. UI is
Preact rather than React: the same API at a tenth of the size, and `@preact/signals` updates
per-frame numbers without re-rendering. No Worker script until v1.5 or accounts need one.
Fonts are self-hosted, so loading the page makes no third-party request.

## D11 — Social Security and Additional Medicare follow the real calendar (2026-10-17)

The brief wants the Social Security stream to visibly stop at the wage cap. That needs a
position in the year: wages to date are `salary × yearFraction(now)`, so Social Security runs
at 6.2% until they reach the wage base and then stops until 1 Jan (and take-home speeds up).
Additional Medicare starts at its threshold the same way. Federal and state flow evenly.
Averaging over the year was simpler, but the stop would never be seen.

## D12 — Defaults for v1 (2026-10-17)

- First visit uses the around-the-clock clock.
- No pre-tax deductions (401(k), HSA) in v1; overrides cover them for now.
- Married filing jointly assumes one earner's wages (the wage base is per person).
- The typed state rate is a percentage of gross wages.
- The hero figure is take-home ("To you"), not gross. The brief's "a penny every 4.2 s" at
  $75k is the gross rate; the wireframes' 5.4 s is take-home.

## D13 — The games are real games (2026-10-17)

The owner wants most of the arcade games to be actually playable and fun, not animations.
Each gets a skill input, a score, and a short round. Numbers still come from the core: a game's
odds are honest, and skill is how you beat them. Paychinko keeps the real split as its bin
widths, so a ball left to chance lands in proportion (watch mode shows exactly that) while a
well-timed plunger and nudges beat the taxman. Details in `ENGINEERING_SPEC.md` §8.

## D14 — Show rates per penny, minute, hour or day (2026-10-17)

*Interaction superseded by D17 (steppers replace tap-to-cycle); the money unit still picks
itself.*

The owner wants users to choose "per minute", "per hour", "per day". The penny view ("1¢ every
5.5 s") is the fun one; an amount per unit ("$6.60 an hour") is the one people compare with
their lives. Both are the same rate, so this is a display unit:

- Tap the hero figure to cycle penny → minute → hour → day; the same choice sits on the Numbers
  screen; it applies to every lane and Arcade's RATE column, and is remembered. "Every penny"
  is the first-visit default, and the next-penny countdown stays visible in every unit.
- Users choose only the timeframe; the amount picks its money unit, as the penny view picks
  its coin: under $1 in cents ("11¢ a minute"), else dollars and cents ("$6.60 an hour"),
  whole dollars from $1,000. Choosing both would be two settings for one idea.
- On the work clock, an hour is a working hour and a day is a workday (weekly hours ÷ 5).
- Figures are the rate right now: a stopped Social Security stream reads $0, with the reason.

## D15 — The river draws only what flows; the rest is a note beneath it (2026-10-17)

The owner disliked lanes that sit still: an unset State lane, a capped Social Security lane.
A still lane reads as broken, so a river (in any skin) draws only streams with money moving.
Beneath it, shared notes say the rest:

- **State, unanswered:** a dashed prompt, "Add your state's income tax", with a `%` field and
  "None in my state". A rate makes State join the river in its usual place; its "State · 5%"
  label reopens the prompt. "None" leaves no lane, just "No state income tax · change".
  "Not answered" (`null`) and "none" (`0`) are stored apart so each is shown honestly.
- **Social Security past the wage cap:** "paid up for 2026", the date, the maximum paid, and
  that take-home sped up — the river losing a branch is the moment itself.

Lanes show rates compactly ("1¢ / 5.1 s", "$7.03 / hour"); the hero keeps the sentence
("1¢ every 5.1 s"), the line people read aloud and screenshot.

## D16 — A dot's size is its coin; tap a coin to change it for the whole river (2026-10-17)

*Dot sizing and the one shared coin stand; tap-to-cycle is superseded by D17.*

The owner noticed that take-home's dots were always bigger, even when every lane counted in
the same coin. Size now encodes value only: 1¢, 10¢, $1, $10 and $100 each have one dot size in
every lane, and every rail has the same thickness. Tapping any coin (in the hero or a lane)
cycles one choice for the whole river: auto (each stream picks a readable coin), then each coin
at which take-home lands between every 0.2 s and every hour, skipping one that would look the
same as auto. One shared coin, not one per lane, because then equal dots are equal money and
faster dots are simply more of it. In the hero, the coin and the time are separate controls.

## D17 — Two independent steppers: unit and time (2026-10-17)

The owner wanted up and down for unit size and time size instead of cycling, and — after a
first attempt where one control fixed a side and the other followed — that **each control
always means one thing**:

- **Unit** is the coin money arrives in: 1¢ … $100. It sets the dot size (D16) and the
  headline "1¢ every 5.1 s". On first visit it is 'auto', take-home's readable coin, shared by
  every lane, until the user steps.
- **Time** is the frame amounts are shown over: second, minute, hour, day, week, month, year
  (working time on the work clock; a month is a twelfth of the earning year). It sets the
  second line, "$7.03 every hour", and every lane's figure ("$0.88 / hour"), so the taxes
  compare in one frame.
- The two are independent; neither ever shows a value derived from the other. The hero is
  plain text: no hidden taps.
- *Since you got here* is today's settings over the whole visit, so flipping 24 h / At work
  (or changing the salary) shows that version of the same minutes, beside the time on the
  page. It replaced banking each stretch at the old setting.
