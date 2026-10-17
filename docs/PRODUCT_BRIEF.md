# Paystream — product brief

## The idea, in the owner's words

> I'd like to be able to just type in my salary, and see a visual representation of how much
> I'm being paid by the second. For instance, I type in $75,000, and the app will show like
> 1 penny going to me every second, one penny to the federal gov every 4 seconds, 1 penny to
> social security every 6 seconds, 1 penny to the state every 5 seconds… the app should auto
> calculate fed / state / medicare / soc. security flows, or we could have the user type them in.

> Another option, where a user can type in theoretical long term capital gains over x period
> of time, and see the same type of flowing stream. And then the user could compare the salary
> against capital gains.

> The currency to be selectable too… satoshis / bitcoin, gold, maybe some other major
> currencies. And some little mini games in the app too, like retro arcade style.

## Who it's for

Anyone curious where their pay goes. Public, no account, nothing stored on a server. People
will be wary of typing a salary into a website, so **"your numbers never leave this page" is a
feature to say out loud**, and it's true by construction.

## Decided so far

| Topic | Decision |
|---|---|
| Name | **paystream** |
| Hosting | Cloudflare Workers static assets, free; `paystream.bitcopia.workers.dev` |
| Repo | Public on GitHub |
| Accounts | None. Inputs remembered in the browser (`localStorage`); optional share link |
| Taxes, v1 | Federal income tax, Social Security and Medicare **calculated** for a chosen filing status; **state typed in** as a percentage; every rate overridable |
| Tax data | Dated tables with source, confirmed by the owner before any figure shows |
| Currency | Taxes always in USD; currency is the unit you watch the stream in |

## Scope by version (to be firmed up in the engineering spec)

**v1 — the salary stream**
- Type a salary → streams start immediately: take-home, federal, state, Social Security,
  Medicare.
- Filing status; state rate typed in; any rate overridable.
- Cadence in human words ("a penny every 4.2 s") plus per-hour/day/year amounts.
- Choice of clock: every second of the year, or only working seconds (to explore in
  wireframes — at $75k the gap is a penny every 4.2 s versus about a penny every second).
- Social Security's wage cap shown as the moment that stream stops for the year.
- Light and dark; phone first; reduced-motion version.

**v1.5 — currencies**
- Watch the stream in USD, sats/BTC, gold (grams or troy ounces), and major currencies
  (EUR, GBP, JPY, CAD…). Public rates, fetched without any user input, shown with their age.

**v2 — capital gains vs salary**
- Enter long-term gains over a period; same stream treatment.
- Side by side with an equal salary: no Social Security or Medicare on gains, different rates.

**v3 — arcade**
- Mini-games built on the same numbers. Ideas: a **pachinko board** whose coins land in your jar
  and the tax jars in the real proportions; **coin catcher** (beat the taxman's bucket);
  **snake** eating your per-second coins.

**Small delights (anywhere they fit)**
- "While you've been on this page you earned $X."
- "You earn a coffee every 4 minutes, rent every 9 days."
- A shareable card (opt-in, salary optionally rounded or hidden — percentages only).

## Out of scope

- Non-US tax systems (a currency is a display unit, not a jurisdiction).
- Accounts, server storage, analytics that see inputs.
- Tax advice. Figures are estimates and say so.

## Open questions

- Which clock is the default (calendar vs working time) — or both side by side?
- Pre-tax deductions (401(k), HSA) in v1, or later?
- Which states, if any, get calculated rather than typed (later)?
