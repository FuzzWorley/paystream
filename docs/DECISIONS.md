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
