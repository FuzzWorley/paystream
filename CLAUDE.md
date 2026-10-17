# Paystream — orientation

Type in a salary, watch it arrive by the second — and watch federal, state, Social Security
and Medicare take their share in streams beside it. In switchable skins (River, Arcade). Later:
compare a salary against long-term capital gains, watch it in sats or gold, an optional account
to sync across devices, and arcade mini-games built on the same numbers.

A public site hosted free on Cloudflare Workers. **Everything is computed in the browser, sign-in
is never required, and signed out nothing the user types is sent anywhere.**

**Read before changing anything:**

| Where | What |
|---|---|
| `docs/PRODUCT_BRIEF.md` | What we're building, in the owner's words, with scope by version |
| `docs/design/` | Wireframes and the chosen visual direction (once picked) |
| `docs/ENGINEERING_SPEC.md` | The phased build plan (written after the design is chosen) |
| `docs/DECISIONS.md` | Every deliberate change to the spec, with the reason |
| `.claude/skills/` | How to build it (`paystream-frontend`) and how to check it (`playwright-ui-review`) |

## State

Designed, not built. The direction is chosen (`docs/design/README.md`, D4–D7): **River skin
(default) and Arcade skin**, shared "Your numbers" and salary-vs-gains screens, editable "your
things", optional username + password accounts in a later phase. No app code yet. Next: write
`docs/ENGINEERING_SPEC.md` as a phased plan, then phase 0 (scaffold, CI, first deploy).

## The rules that bite

1. **Signed out, nothing typed leaves the browser.** No salary in a request, log, analytics
   event or a URL the server sees. A share link is opt-in and keeps its data in the `#fragment`.
   Exchange-rate fetches carry no user input. Signed in (D7), settings and scores sync to the
   account and nowhere else — never into logs.
2. **Skins own their tokens and the hero stream; nothing else.** Adding or changing a skin must
   not touch `src/core/` or the shared screens (D4, D5).
3. **Tax tables are dated and must be confirmed.** Each carries `taxYear`, `source` and
   `confirmed`; an unconfirmed table produces no figure. An assistant's recollection of
   brackets, the standard deduction or the Social Security wage base is **not a source** — a
   stale one is a believable wrong number. The repo owner confirms against the IRS/SSA release.
   (Satsuma has a 2026 draft table in `src/services/tax/brackets.ts`, still unconfirmed, source
   `irs.gov/pub/irs-drop/rp-25-32.pdf` — a starting point to check, not a source.)
4. **Derive every displayed amount from elapsed time**, never by accumulating per-frame
   increments. Pause on `visibilitychange`.
5. **Taxes are US and in dollars.** A currency (sats, BTC, gold, EUR…) is a display unit
   converted at the end, never an input to the tax maths.
6. **Every screen fits a 390px phone, in every skin** — `npm run ux:measure` enforces it once it
   exists.
7. **Name where a measurement was taken, not just what it returned.** A request that fails from
   a laptop on a VPN says nothing about Cloudflare's egress.

## Hosting

Cloudflare free plan, account `bitcopia` (shared with other projects): up to 100 Workers;
100,000 Worker requests a day shared across them; **static-asset requests are free and
unlimited** and don't count. A Worker script exists only if something needs a server (e.g.
caching exchange rates), and it never receives user input. Expected URL:
`https://paystream.bitcopia.workers.dev`. Deploy with `wrangler deploy` after a build; verify a
deploy by HTTP status, never by anything a user entered.

## Working agreements

- **Edit files with Edit/Write, never through Bash** (no heredocs, `sed -i`, `cat >`). Bash is
  for running things.
- **Work in phases; recap and get approval before each commit.** Small fixes can share one.
- **No AI attribution in commit messages.**
- Conventional commits. Each commit leaves everything green.
- Ask before running a review round; when one runs, ask it to leave a committed, seeded sweep.
- Comments: short, the non-obvious fact and why. Long reasoning goes in `docs/DECISIONS.md`.
- When UI changes, show it — screenshots opened with `open`, or an artifact — without being asked.
- Delete leftover screenshots after every feature (`find … -delete`, not `rm` globs).
- Prefer the simplest honest model; if the owner says it's overcomplicated, look for the
  concept to delete.
- `.claude/` holds a permission gate: destructive commands and anything outside this directory
  ask first, and so does editing the gate. `bash .claude/hooks/gate-check.sh` tests it.
