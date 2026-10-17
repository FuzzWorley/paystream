# Design

Wireframes (live, interactive): https://claude.ai/artifact/ANYgymqJ4D8FjuiG6YAztF — private to
the owner. Sources are in `wireframes/` for reference; they are Design-canvas components, not app
code, and their cross-links still use the canvas's original file names.

## What was chosen (2026-10-17)

The owner liked all three directions and asked for **skins the user can switch between** (D4).

| Wireframe | Verdict |
|---|---|
| `River.dc.html` | **Skin 1, the default.** Dark, calm; one stream splitting into lanes whose dots flow at their real speed; a big serif "1¢ every 5.4 s". |
| `Arcade.dc.html` | **Skin 2, the owner's favourite.** CRT cabinet; the recipients are players on a high-score table with live penny scores; INSERT SALARY, PRESS START. |
| `RiverCompare.dc.html` | **Shared screen, every skin** (D5): salary vs long-term gains side by side, live race of what each has earned. |
| `MintSettings.dc.html` | **Shared screen, every skin** (D5): "Your numbers" — filing status, state %, overridable rates, clock, currency, sound. |
| `ArcadeGames.dc.html` | v3 game select; pachinko bin widths are the real tax split. |
| `Mint.dc.html` | **Look rejected** ("the pennies / buckets don't look good"). Keep two ideas from it: *Since you got here* and the coffee / rent comparisons — now user-editable "your things" (D6). |

## Ideas to keep whatever the skin

- **"Next penny in…" progress per stream.** On the 24-hour clock Medicare drops a penny about
  every five minutes at $75k; without a countdown that stream looks broken.
- **Two clocks**: around the clock (every second of the year) vs while I work (hours × weeks).
- **Since you got here**: what you and each tax have earned since the page opened.
- **Your things**: "A week of groceries every 2.3 days" — name and amount, editable.
- The privacy line beside the salary field, and the year/source footnote under tax figures.

## Skin rules (for the engineering spec)

- A skin owns its tokens (colour, type, radius, motion) and its rendering of the **hero stream**.
- Everything else — numbers, settings, the shared screens, your things, since-you-got-here — is
  shared and only *themed* by the skin's tokens.
- In Arcade, the pixel face is for headings and scores; forms and running text use VT323 so the
  shared screens stay readable.
- Adding a skin must not touch `src/core/` or the shared screens. The second skin is the test.
