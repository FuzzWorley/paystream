# Decisions

Deliberate changes to the product brief or engineering spec, newest last. Each entry says what
was decided, why, and what evidence it rests on. Code comments reference an entry (`D3`)
instead of restating it.

## D1 — No accounts; everything computed in the browser (2026-10-17)

A salary is the input people are most wary of typing into a website. Computing everything
client-side means nothing exists on a server to leak, and the operator can't see it either.
Sign-in would only be needed for saving across devices, and would require storing salaries
server-side. Remembering inputs in `localStorage` and an opt-in share link (data in the
`#fragment`, which browsers never send) cover what sign-in would have given.

## D2 — Federal and FICA calculated, state typed in, for v1 (2026-10-17)

Federal brackets, Social Security and Medicare are one dataset each; fifty states are fifty.
A typed state rate keeps v1 small and honest. Every calculated rate is also overridable.

## D3 — Tax tables ship dated and unconfirmed (2026-10-17)

Carried from Satsuma: an assistant's recollection of current-year thresholds is not a source,
and a stale bracket is a plausible wrong number. Tables carry `taxYear`, `source` and
`confirmed`; nothing shows from an unconfirmed table. In a public app, confirmation is done
once per year by the repo owner, in code, against the IRS/SSA release.
