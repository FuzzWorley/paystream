---
name: playwright-ui-review
description: How UI is checked and reviewed in this repo — Playwright screenshots at desktop and 390px in every skin and the colour schemes it declares (dark only in v1), a layout-width measurement that fails CI, and design reviews published as an artifact. Use after any UI change and whenever asked to review the design.
---

# Playwright UI review

The repo owner judges layout from screenshots, not code, and treats the phone as its own
design problem. This is the workflow that worked on Satsuma; carry it over intact.

## The scripts (create them in phase 0 — reference copies are in `reference/`)

| Command | What it does |
|---|---|
| `npm run ux:up` | Builds and serves the app on a fixed port (e.g. :8790) for screenshots. |
| `npm run ux:shots` | Every screen at **1440px and 390px**, in **every skin and each scheme it declares** (dark only in v1, D9), as JPEGs in `$TMPDIR/paystream-ux/shots`, plus `problems.txt` with console errors. `-- Name` captures one screen. |
| `npm run ux:measure` | Lays out every screen in every skin on a 390px phone and **exits non-zero if any is wider**, naming the elements whose right edge sticks out. Runs in CI. |
| `npm run ux:down` | Stops the server on that port, and only that port. |

`reference/capture.mjs` and `reference/measure.mjs` are Satsuma's versions. Adapt `BASE`, the
screen list and `openTab` to this app's navigation; drop `assertDemo` unless a server-side
identity ever exists. Keep `playwright` as a **pinned** dev dependency; browsers are shared in
`~/Library/Caches/ms-playwright`.

## Rules learned the hard way

- **Measure, don't eyeball.** Width per screen found what screenshots hid. Playwright's
  `isMobile` widens the layout viewport, so `scrollWidth − innerWidth` reads 0 — compare against
  the device width (390) instead, and use a **fresh browser context per screen**, because a
  widened phone viewport never narrows again.
- Elements inside a scroll container or a fixed bar can't widen the page; exclude them when
  naming culprits.
- **Tap real controls** to reach a screen rather than setting state; an overlapping bar once
  intercepted a tap, and the screenshot run is what caught it.
- Let animations settle before a still shot, and for this app also freeze the clock
  (`page.clock`) so screenshots are reproducible frame to frame.
- **Never real personal data** in screenshots. Use obviously fabricated inputs (e.g. a $75,000
  salary) and never a figure the user has told you about themselves.
- **Look at every screenshot before claiming anything**, and verify a suspected bug in the code.

## Showing the user

- The user often can't see images inline in the editor. **Open them for them** with `open <file>`
  on macOS, or publish them in an artifact.
- When a phase produces visible UI, say so and show it without being asked.

## A design review

When asked to review the design: screenshots of every screen, desktop and phone, every skin
and declared scheme, judged as a senior UI/UX designer; findings ranked by impact against effort, each with a
crop beside it; proposals mocked in HTML using the product's own tokens; **published as an
artifact**. Keep the review out of the repo; the decisions it produces go in `docs/DECISIONS.md`.

## Cleanup — after every feature

Delete leftover screenshots and temp outputs in the same turn the feature is committed:
`find "$TMPDIR/paystream-ux/shots" -type f -delete` and the scratchpad's `*.png`/`*.jpg`. Use
`find … -delete`, never `rm` globs: zsh aborts the whole `rm` when one glob matches nothing.
Keep the scripts.
