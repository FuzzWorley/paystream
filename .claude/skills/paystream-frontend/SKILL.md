---
name: paystream-frontend
description: How to design and build paystream — the stance of a senior product designer and front-end engineer making a playful, arcade-flavoured toy. Motion, game feel, visual identity, performance, accessibility, and the few things that must stay true. Apply to all UI and code work.
---

# Building paystream

You're the designer-engineer on a small, joyful product: type in a salary and **watch your
money arrive**, second by second, with the taxman's share peeling off beside it. People should
grin, screenshot it, and send it to a friend. Later there are arcade mini-games.

Design it like a toy and engineer it like an instrument. The fun is the point; the number
inside the fun has to be right, or the joke stops being funny.

## The feel we're going for

- **Instant gratification.** The first coin should move within a second of typing a salary.
  No sign-up, no wizard, no "Calculate" button — the stream starts as you type.
- **One hero moment per screen.** The stream is the hero. Everything else is quiet supporting
  cast: small labels, plain numbers, generous space. Spend boldness in one place.
- **Arcade, with taste.** Borrow the energy of coin-ops — chunky numerals, a satisfying
  *clink*, a high-score feel — without pastiche. A wink, not a costume.
- **Delight lives in the details**: a coin that squashes slightly on landing, a jar that
  wobbles when it fills, the Social Security stream that visibly *stops* the day you hit the
  wage cap. These are the moments people share.

## Motion and game feel

- **Ease everything.** Nothing linear except the clock. Use anticipation and follow-through on
  landings; 150–250 ms for UI transitions, physics for coins.
- **Juice, then restraint.** Add feedback (bounce, glow, sound) until it feels alive, then take
  one thing away.
- **Sound is opt-in** and off by default, with a visible toggle. Never autoplay audio.
- **`prefers-reduced-motion`** gets a designed alternative, not a broken one: counters that tick
  and a still chart. Same numbers, no motion.
- At high rates, switch from individual coins to a flowing stream; never let particle count
  run away.

## Visual identity

- **Skins** (River, Arcade — `docs/design/README.md`). A skin is a set of tokens plus its own
  rendering of the hero stream. Shared screens ("Your numbers", the comparison, your things)
  are built once and themed by tokens, so each must look deliberate in every skin, not just the
  one it was built in. Screenshot every screen in every skin.
- Give it a real point of view: a display face with character for the big numbers, a clean
  face for labels, tabular figures everywhere digits change (so they don't jitter).
- Every colour, size, radius and duration is a token in `src/styles/tokens.css`. Light and dark
  are each designed, not inverted.
- Each recipient (you, federal, state, Social Security, Medicare) owns one colour, fixed by
  identity, checked as a set for colour-blind separation in both themes, and always labelled.
  The dataviz skill's palette validator settles it; don't eyeball it.
- Say cadence in units a person can feel: "a penny every 4.2 seconds", "a coffee every 4
  minutes". Pick the unit that keeps the figure between about 1 and 100.

## Front-end engineering

- **Every frame is derived from elapsed time**: `amount = ratePerSecond × (now − start)`, drawn
  on `requestAnimationFrame`. Never add `rate × dt` per frame — it drifts, and a tab woken after
  an hour would dump a million coins at once.
- **Pause on `visibilitychange`**, resume from the derived value.
- Canvas for particles and games; HTML/SVG for text and anything a screen reader must reach.
  Hold 60 fps on a mid-range phone; measure it, don't assume it.
- The maths lives in `src/core/` as plain functions with no React, DOM, `fetch` or clock inside
  (time is passed in). That keeps it trivially testable and lets games reuse it.
- **Games** are self-contained modules behind one interface (`mount(canvas, inputs) → unmount`),
  lazy-loaded so the main page stays light, with keyboard and touch controls and pause on blur.
  Physics can be playful, but **any number a game claims comes from the core** — a pachinko
  board that says it shows your tax split lands coins in the real proportions.
- Small dependency budget. Every library has to earn its bytes.

## The few things that must stay true

1. **Signed out, nothing typed leaves the browser.** No salary in a request, a log, an analytics
   event, or a URL the server sees. A share link is opt-in and keeps its data in the
   `#fragment`, which browsers never send. Say so beside the field: "Stays in your browser."
   Signed in, say instead that it's saved to the account so it follows you.
2. **Tax tables are dated and confirmed.** Brackets, standard deduction and the Social Security
   wage base change yearly; an assistant's memory of them is not a source. Each table carries
   its `taxYear`, `source` URL and `confirmed` flag, ships `confirmed: false`, and an
   unconfirmed table produces no figure — the UI says why and offers typed-in rates instead.
   The repo owner flips it after checking the source. Show the year in a footnote.
3. **Exchange rates show their age.** A failed fetch keeps the last rate with its old
   timestamp; never show it as live, never show 0.
4. **One formatter module** (`src/lib/format.ts`) for every amount and unit — dollars, sats,
   BTC, gold, euros. No `-0`, no inline `toFixed`.

## Testing, lightly but where it counts

- Vitest on `src/core/`, table-driven against published examples, including the wage cap
  exactly at, one dollar under and one over.
- **One seeded property test over the core**, committed: take-home plus every tax stream equals
  gross at every instant, each stream sums to its yearly figure over a year, and raising salary
  never lowers a tax. On Satsuma a sweep like this beat a fully green suite twice.
- Playwright for screens and layout (see `playwright-ui-review`).

## Before calling a screen done

- [ ] Fun in the first second? One hero, everything else quiet?
- [ ] Light and dark, desktop and 390px, all looked at?
- [ ] Reduced-motion version designed, with every number intact?
- [ ] Tab hidden for an hour, then shown: right total, no burst?
- [ ] Keyboard and touch both work; a text/table equivalent exists for anything animated?
- [ ] Nothing typed leaves the page?
