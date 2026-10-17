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

Anyone curious where their pay goes. Public, and fully usable without an account. Signed out,
**"your numbers never leave this page" is a feature to say out loud**, true by construction; an
optional account syncs across devices for people who want it.

## Decided so far

| Topic | Decision |
|---|---|
| Name | **paystream** |
| Hosting | Cloudflare Workers static assets, free; `paystream.bitcopia.workers.dev` |
| Repo | Public on GitHub |
| Accounts | Optional, never required: username + password to sync settings and scores across devices (D7). Signed out, everything stays in the browser |
| Look | Switchable skins: **River** (default) and **Arcade**, both in v1 (D4). Mint's look dropped |
| Taxes, v1 | Federal income tax, Social Security and Medicare **calculated** for a chosen filing status; **state typed in** as a percentage; every rate overridable |
| Tax data | Dated tables with source, confirmed by the owner before any figure shows |
| Currency | Taxes always in USD; currency is the unit you watch the stream in |

## Scope by version (to be firmed up in the engineering spec)

**v1 — the salary stream, in two skins**
- Type a salary → streams start immediately: take-home, federal, state, Social Security,
  Medicare. Each shows "1¢ every …" and a "next penny in …" countdown.
- Filing status; state rate typed in; any rate overridable ("Your numbers" screen).
- Two clocks: around the clock, or while I work (hours × weeks). At $75k: a penny every 4.2 s
  versus about a penny every second.
- *Since you got here*, and **your things** — editable name + amount comparisons, defaulting
  to a coffee and a month's rent (D6).
- Social Security's wage cap shown as the moment that stream stops for the year.
- **Skins: River (default), then Arcade** (D4). "Your numbers" and the comparison screen exist
  in every skin (D5).
- Saved in the browser, kept permanently where the browser allows, installable to the home
  screen; phone first; reduced-motion version.

**v1.5 — currencies**
- Watch the stream in USD, sats/BTC, gold (grams or troy ounces), and major currencies
  (EUR, GBP, JPY, CAD…). Public rates, fetched without any user input, shown with their age.

**v2 — capital gains vs salary**
- Enter long-term gains over a period; same stream treatment.
- Side by side with an equal salary: no Social Security or Medicare on gains, different rates.
  Wireframed as `RiverCompare`; a shared screen in every skin.

**Accounts (between v2 and v3)**
- Optional username + password; syncs settings and scores; delete-my-account; privacy page (D7).

**v3 — arcade games**
- Mini-games built on the same numbers. Ideas: a **pachinko board** whose coins land in your jar
  and the tax jars in the real proportions; **coin catcher** (beat the taxman's bucket);
  **snake** eating your per-second coins.

**Small delights (anywhere they fit)**
- A shareable card (opt-in, salary optionally rounded or hidden — percentages only).
- More skins later; the skin boundary makes each one a contained piece of work.

## Out of scope

- Non-US tax systems (a currency is a display unit, not a jurisdiction).
- Required sign-in; analytics that see inputs.
- Tax advice. Figures are estimates and say so.

## Open questions

- Which clock is the default on first visit?
- Pre-tax deductions (401(k), HSA) in v1, or later?
- Which states, if any, get calculated rather than typed (later)?
- Global game leaderboards (would need nicknames; v3+).
